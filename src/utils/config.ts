import { join } from "node:path"
import { file } from "bun"

import { ArkErrors, type } from "arktype"

import { DEFAULT_GLOBAL_CONFIG } from "#/constants"
import { PATHS } from "#/utils"
import { deepMerge } from "#/utils/deep-merge"

export type GlobalConfigSchemaType = typeof GlobalConfigSchema.infer
export const GlobalConfigSchema = type({
	server: {
		"hostname?": "string",
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

export async function getGlobalConfig(): Promise<GlobalConfigSchemaType> {
	const configFile = file(PATHS.GLOBAL_CONFIG)
	const $config = (await configFile.exists()) ? await configFile.json() : {}
	const config = GlobalConfigSchema($config)
	if (config instanceof ArkErrors) {
		throw new Error(`Global config validation failed: ${config.summary}`)
	}
	return deepMerge(DEFAULT_GLOBAL_CONFIG, config)
}

export type ProjectConfigSchemaType = typeof ProjectConfigSchema.infer
const ProjectConfigSchema = type({
	environment: "string",
	infisical: {
		siteUrl: "string"
	},
	"port_assignment?": {
		"deny?": "number[]",
		"range?": type({
			end: "number<=65535",
			start: "number>=1024"
		})
	},
	ports: {
		"[string]": {
			"dev?": "number>=1024  | 'auto'",
			"name?": "string"
		}
	},
	projectId: "string"
})

export function defineProjectConfig(config: ProjectConfigSchemaType) {
	const $config = ProjectConfigSchema(config)
	return $config
}

export async function getProjectConfig(): Promise<ProjectConfigSchemaType> {
	const cwd = process.cwd()
	const configPath = join(cwd, "kiset.config.ts")
	const configFile = file(configPath)
	if (!(await configFile.exists())) {
		throw new Error(
			`Config file not found in ${cwd}. Please create kiset.config.ts in the current directory.`
		)
	}

	const $config = (await import(configPath)).default
	if (!$config) {
		throw new Error("Config file must export a default configuration object.")
	}
	const config = defineProjectConfig($config)
	if (config instanceof ArkErrors) {
		throw new Error(`Config validation failed: ${config.summary}`)
	}
	return config
}
