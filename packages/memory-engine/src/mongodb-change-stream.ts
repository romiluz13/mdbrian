import type {
	ChangeStream,
	ChangeStreamDocument,
	Collection,
	Document,
} from "mongodb"
import { createSubsystemLogger } from "@mdbrain/lib"

const log = createSubsystemLogger("memory:mongodb:changestream")

/**
 * Callback invoked when relevant changes are detected in the chunks collection.
 * The watcher debounces and batches events, so this is called at most once
 * per debounce window.
 */
export type ChangeStreamCallback = (event: {
	operationType: string
	paths: string[]
	timestamp: Date
	resumeToken?: unknown
}) => void

/**
 * MongoDBChangeStreamWatcher watches for changes to the chunks collection
 * and invokes a callback when relevant inserts/updates/deletes are detected.
 *
 * Requires a replica set (same as transactions). Degrades gracefully on
 * standalone topologies by simply not opening a stream.
 */
export class MongoDBChangeStreamWatcher {
	private stream: ChangeStream<Document, ChangeStreamDocument> | null = null
	private debounceTimer: NodeJS.Timeout | null = null
	private pendingPaths: Set<string> = new Set()
	private pendingOpType: string = "unknown"
	private closed = false
	/**
	 * F21: Last resume token for reconnection after restart.
	 * The manager can persist this token externally across restarts.
	 */
	private _lastResumeToken: unknown = null
	/**
	 * H1 (#26): Health-check interval that restarts the stream if it dies.
	 * Guards against silent loss of cross-instance sync after a fatal error,
	 * invalidate event, or oplog overflow.
	 */
	private healthCheckInterval: NodeJS.Timeout | null = null
	/** H1 (#26): Interval between health-check polls (ms). */
	private readonly healthCheckMs = 30_000
	/** H1 (#26): Tracks whether the watcher intentionally gave up (standalone). */
	private unsupported = false

	constructor(
		private readonly collection: Collection,
		private readonly callback: ChangeStreamCallback,
		private readonly debounceMs: number = 1000,
	) {}

	/** F21: Get the last resume token for external persistence across restarts */
	get lastResumeToken(): unknown {
		return this._lastResumeToken
	}

	/**
	 * F21: Open the change stream. Accepts an optional resumeAfter token
	 * to resume from a previously persisted position.
	 * Returns false if change streams are not supported (standalone MongoDB).
	 */
	async start(resumeAfter?: unknown): Promise<boolean> {
		if (this.closed) {
			return false
		}

		try {
			// Filter to relevant operation types only
			const watchOpts: Record<string, unknown> = {
				fullDocument: "updateLookup",
			}
			if (resumeAfter) {
				watchOpts.resumeAfter = resumeAfter
			}

			this.stream = this.collection.watch(
				[
					{
						$match: {
							operationType: { $in: ["insert", "update", "replace", "delete"] },
						},
					},
				],
				watchOpts,
			)

			this.stream.on("change", (change: ChangeStreamDocument) => {
				this.handleChange(change)
			})

			this.stream.on("error", (err: Error) => {
				const msg = err.message ?? String(err)
				if (isChangeStreamNotSupported(msg)) {
					log.info(
						"change streams not supported (standalone topology), closing watcher",
					)
					this.unsupported = true
					void this.close()
				} else {
					log.warn(`change stream error: ${msg}`)
				}
			})

			// H1 (#26): A closed stream emits no more events; clear our handle so
			// the health check can detect the death and restart it.
			this.stream.on("close", () => {
				if (!this.closed && !this.unsupported) {
					log.warn(
						"change stream closed unexpectedly; will restart via health check",
					)
				}
				this.stream = null
			})

			this.startHealthCheck()
			log.info("change stream started")
			return true
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			if (isChangeStreamNotSupported(msg)) {
				log.info("change streams not supported (standalone topology)")
				this.unsupported = true
				return false
			}
			log.warn(`failed to start change stream: ${msg}`)
			return false
		}
	}

	/**
	 * H1 (#26): Periodic supervisor that restarts the stream if it has died.
	 * Polls every `healthCheckMs`; on a dead stream it first retries with the
	 * last resume token, and on failure restarts fresh (clearing the token).
	 */
	private startHealthCheck(): void {
		this.stopHealthCheck()
		this.healthCheckInterval = setInterval(() => {
			void this.runHealthCheck()
		}, this.healthCheckMs)
		// Don't keep the event loop alive solely for health checks.
		this.healthCheckInterval.unref?.()
	}

	private stopHealthCheck(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval)
			this.healthCheckInterval = null
		}
	}

	private async runHealthCheck(): Promise<void> {
		if (this.closed || this.unsupported) {
			return
		}
		// If the stream handle is still present, assume it's alive.
		if (this.stream) {
			return
		}
		log.warn("change stream appears dead; attempting restart with resume token")
		let started = false
		try {
			started = await this.start(this._lastResumeToken)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			log.warn(`change stream restart with token failed: ${msg}`)
		}
		if (!started) {
			log.warn("change stream restart with token failed; restarting fresh")
			// Clear the persisted token — a stale token after oplog overflow / invalidate
			// makes every resume attempt fail forever otherwise.
			this._lastResumeToken = null
			try {
				started = await this.start()
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				log.warn(`change stream fresh restart failed: ${msg}`)
			}
		}
		if (started) {
			log.info("change stream restarted successfully")
		}
	}

	private handleChange(change: ChangeStreamDocument): void {
		// F21: Persist resume token for reconnection
		if (change._id) {
			this._lastResumeToken = change._id
		}

		const opType = change.operationType

		// Extract path from the document (available for insert/update/replace)
		let changedPath: string | undefined
		if ("fullDocument" in change && change.fullDocument) {
			changedPath = change.fullDocument.path as string | undefined
		}
		if (!changedPath && "documentKey" in change && change.documentKey) {
			// For deletes, try to extract path from _id if it's a composite key
			const docId = String(change.documentKey._id)
			const pathEnd = docId.indexOf(":")
			if (pathEnd > 0) {
				changedPath = docId.slice(0, pathEnd)
			}
		}

		if (changedPath) {
			this.pendingPaths.add(changedPath)
		}
		this.pendingOpType = opType

		// Debounce: batch changes within the debounce window
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer)
		}
		this.debounceTimer = setTimeout(() => {
			this.flush()
		}, this.debounceMs)
	}

	private flush(): void {
		if (this.pendingPaths.size === 0 && this.pendingOpType === "unknown") {
			return
		}

		const paths = Array.from(this.pendingPaths)
		const opType = this.pendingOpType
		this.pendingPaths.clear()
		this.pendingOpType = "unknown"
		this.debounceTimer = null

		try {
			this.callback({
				operationType: opType,
				paths,
				timestamp: new Date(),
				resumeToken: this._lastResumeToken,
			})
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			log.warn(`change stream callback error: ${msg}`)
		}
	}

	async close(): Promise<void> {
		if (this.closed) {
			return
		}
		this.closed = true

		this.stopHealthCheck()

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer)
			this.debounceTimer = null
		}

		if (this.stream) {
			try {
				await this.stream.close()
			} catch {
				// Ignore close errors
			}
			this.stream = null
		}

		log.info("change stream closed")
	}

	get isActive(): boolean {
		return this.stream !== null && !this.closed
	}

	/**
	 * H1 (#26): True when the watcher has permanently given up because the
	 * deployment does not support change streams (standalone topology).
	 * Exposed for diagnostics; the health check will not retry in this state.
	 */
	get isUnsupported(): boolean {
		return this.unsupported
	}
}

function isChangeStreamNotSupported(msg: string): boolean {
	return (
		msg.includes("not allowed on a replica set") ||
		msg.includes("The $changeStream stage is only supported") ||
		msg.includes("not replicated") ||
		msg.includes("not a replica set")
	)
}
