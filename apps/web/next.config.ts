import path from "node:path"
import type { NextConfig } from "next"

const staticExport = process.env.MDBRAIN_WEB_STATIC_EXPORT === "true"

const nextConfig: NextConfig = {
	output: staticExport ? "export" : undefined,
	outputFileTracingRoot: path.join(__dirname, "../../"),
	reactStrictMode: true,
	images: {
		unoptimized: staticExport,
	},
	transpilePackages: ["@mdbrian/client"],
	webpack: (config) => {
		config.resolve.extensionAlias = {
			...(config.resolve.extensionAlias ?? {}),
			".js": [".ts", ".tsx", ".js", ".jsx"],
		}
		return config
	},
}

export default nextConfig
