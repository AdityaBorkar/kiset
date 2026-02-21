import { type } from "arktype"

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

export type ProjectConfigSchemaType = typeof ProjectConfigSchema.infer
const ProjectConfigSchema = type({
	environment: "string",
	infisical: {
		siteUrl: "string"
	},
	ports: {
		"[string]": {
			"dev?": "number>=1024  | 'auto'",
			"name?": "string"
		}
	},
	projectId: "string"
})

export const defineConfig = (config: ProjectConfigSchemaType) => {
	const $config = ProjectConfigSchema(config)
	return $config
}

// export async function loadConfig(): Promise<KisetConfigSchema> {
// 	const configPath = path.join(process.cwd(), "kiset.config.ts")

// 	const configFile = file(configPath)
// 	if (!(await configFile.exists())) {
// 		throw new Error(
// 			`Config file not found at ${configPath}. Please create kiset.config.ts in the current directory.`
// 		)
// 	}

// 	try {
// 		const module = await import(configPath)
// 		const config = module.default
// 		if (!config) {
// 			throw new Error("Config file must export a default configuration object.")
// 		}
// 		const validatedConfig = defineConfig(config)

// 		if (
// 			typeof validatedConfig === "object" &&
// 			validatedConfig !== null &&
// 			"summary" in validatedConfig
// 		) {
// 			const errors = validatedConfig as { summary: string }
// 			throw new Error(`Config validation failed: ${errors.summary}`)
// 		}

// 		return validatedConfig as KisetConfigSchema
// 	} catch (error) {
// 		if (
// 			error instanceof Error &&
// 			error.message.includes("Config file not found")
// 		) {
// 			throw error
// 		}

// 		if (error instanceof Error) {
// 			throw new Error(`Failed to load config: ${error.message}`)
// 		}

// 		throw new Error("Failed to load config: Unknown error")
// 	}
// }

// export async function loadGlobalConfig(): Promise<GlobalConfigSchemaType> {
// 	const configPath = getPaths().GLOBAL_CONFIG
// 	const configFile = file(configPath)

// 	if (!(await configFile.exists())) {
// 		return DEFAULT_GLOBAL_CONFIG
// 	}

// 	const content = await configFile.json()
// 	const validated = GlobalConfigSchema(content)

// 	if ("summary" in validated) {
// 		throw new Error(`Invalid global config: ${validated.summary}`)
// 	}

// 	return deepMerge(
// 		DEFAULT_GLOBAL_CONFIG,
// 		validated as Partial<GlobalConfigSchemaType>
// 	)
// }

// export async function saveGlobalConfig(
// 	config: Partial<GlobalConfigSchemaType>
// ): Promise<void> {
// 	const configPath = getPaths().GLOBAL_CONFIG
// 	const configDir = getPaths().CONFIG_DIR

// 	await $`mkdir -p ${configDir}`

// 	const validated = GlobalConfigSchema(config)
// 	if ("summary" in validated) {
// 		throw new Error(`Invalid config: ${validated.summary}`)
// 	}

// 	await file(configPath).write(JSON.stringify(validated, null, 2))
// }
