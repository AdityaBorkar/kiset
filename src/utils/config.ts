import * as path from "node:path"
import { $, file } from "bun"

import { type } from "arktype"

import { PATHS } from "#/utils/index.ts"
import { deepMerge } from "./deep-merge.ts"
import { getPaths } from "./paths.ts"

export const HTTPS = true // TODO: MOVE TO CONFIG
export const HOSTNAME = "127.0.0.1" // TODO: MOVE TO CONFIG
export const DNSMASQ_PORT = 53 // TODO: Move to config
export const CADDY_PORT = HTTPS ? 443 : 80 // TODO: Move to config

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

export type KisetConfigSchema = typeof ProjectConfigSchema.infer

export const defineConfig = (config: KisetConfigSchema) => {
	const $config = ProjectConfigSchema(config)
	return $config
}

export async function loadConfig(): Promise<KisetConfigSchema> {
	const configPath = path.join(process.cwd(), "kiset.config.ts")

	const configFile = file(configPath)
	if (!(await configFile.exists())) {
		throw new Error(
			`Config file not found at ${configPath}. Please create kiset.config.ts in the current directory.`
		)
	}

	try {
		const module = await import(configPath)
		const config = module.default
		if (!config) {
			throw new Error("Config file must export a default configuration object.")
		}
		const validatedConfig = defineConfig(config)

		if (
			typeof validatedConfig === "object" &&
			validatedConfig !== null &&
			"summary" in validatedConfig
		) {
			const errors = validatedConfig as { summary: string }
			throw new Error(`Config validation failed: ${errors.summary}`)
		}

		return validatedConfig as KisetConfigSchema
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

export async function cleanup(pids: number[] = []) {
	for (const pid of pids) {
		await $`kill ${pid} 2>/dev/null || true`.catch(() => {})
	}
	await $`rm -f ${PATHS.STATE_DIR} ${PATHS.LOCKFILE} 2>/dev/null || true`
}

export async function loadGlobalConfig(): Promise<GlobalConfigSchemaType> {
	const configPath = getPaths().GLOBAL_CONFIG
	const configFile = file(configPath)

	if (!(await configFile.exists())) {
		return DEFAULT_GLOBAL_CONFIG
	}

	const content = await configFile.json()
	const validated = GlobalConfigSchema(content)

	if ("summary" in validated) {
		throw new Error(`Invalid global config: ${validated.summary}`)
	}

	return deepMerge(
		DEFAULT_GLOBAL_CONFIG,
		validated as Partial<GlobalConfigSchemaType>
	)
}

export async function saveGlobalConfig(
	config: Partial<GlobalConfigSchemaType>
): Promise<void> {
	const configPath = getPaths().GLOBAL_CONFIG
	const configDir = getPaths().CONFIG_DIR

	await $`mkdir -p ${configDir}`

	const validated = GlobalConfigSchema(config)
	if ("summary" in validated) {
		throw new Error(`Invalid config: ${validated.summary}`)
	}

	await file(configPath).write(JSON.stringify(validated, null, 2))
}
