import { type } from "arktype"

export const GlobalConfigSchema = type({
	server: {
		"https?": type({
			cert: "string",
			key: "string"
		}).or("boolean"),
		"port_assignment?": {
			"deny?": "number[]"
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
			deny: []
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
