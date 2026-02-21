import * as path from "node:path"
import { $, file } from "bun"

import { type } from "arktype"

import { getLocalportStateDir } from "."

export const GlobalConfigSchema = type({
	server: {
		"https?": type({
			cert: "string",
			key: "string"
		}).or("boolean"),
		"port_assignment?": {
			"deny?": "number[]",
			"range?": type({
				end: "number<=65535",
				start: "number>=1024"
			})
		},
		"port?": "number>=1024"
	}
})

export type GlobalConfigSchemaType = typeof GlobalConfigSchema.infer

export const DEFAULT_GLOBAL_CONFIG: GlobalConfigSchemaType = {
	server: {
		https: true,
		port: 443,
		port_assignment: {
			deny: [],
			range: {
				end: 4999,
				start: 4000
			}
		}
	}
}

const ProjectConfigSchema = type({
	ports: {
		"[string]": {
			"dev?": "number>=1024  | 'auto'",
			"name?": "string"
		}
	}
})

export type LocalportSchema = typeof ProjectConfigSchema.infer

export const LocalportConfig = (config: LocalportSchema) => {
	const $config = ProjectConfigSchema(config)
	return $config
}

export async function loadConfig(): Promise<LocalportSchema> {
	const configPath = path.join(process.cwd(), "localport.config.ts")

	const configFile = file(configPath)
	if (!(await configFile.exists())) {
		throw new Error(
			`Config file not found at ${configPath}. Please create localport.config.ts in the current directory.`
		)
	}

	try {
		const module = await import(configPath)
		const config = module.default
		if (!config) {
			throw new Error("Config file must export a default configuration object.")
		}
		const validatedConfig = LocalportConfig(config)

		if (
			typeof validatedConfig === "object" &&
			validatedConfig !== null &&
			"summary" in validatedConfig
		) {
			const errors = validatedConfig as { summary: string }
			throw new Error(`Config validation failed: ${errors.summary}`)
		}

		return validatedConfig as LocalportSchema
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Config file not found")
		) {
			throw error
		}

		if (error instanceof Error) {
			throw new Error(`Failed to load config: ${error.message}`)
		}

		throw new Error("Failed to load config: Unknown error")
	}
}

export async function cleanupPidFiles() {
	const stateDir = getLocalportStateDir()
	await $`rm -f ${stateDir}/dnsmasq.pid ${stateDir}/caddy.pid ${stateDir}/localport.lock 2>/dev/null || true`
}
