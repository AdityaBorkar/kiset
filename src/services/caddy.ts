import { file } from "bun"

import { logger, PATHS } from "#/utils"

type CaddyRoute = {
	match: Array<{ host?: string[] }>
	handle: Array<{ handler: string; upstreams?: Array<{ dial: string }> }>
}

type CaddyConfig = {
	apps: {
		http: {
			servers: {
				srv0: {
					listen?: string[]
					routes?: CaddyRoute[]
				}
			}
		}
	}
}

async function $fetch(
	method: "POST" | "GET" | "PATCH",
	endpoint: string,
	body?: string
) {
	const { hostname, port } = await file(PATHS.CADDY_STATE).json()
	const response = await fetch(`http://${hostname}:${port}${endpoint}`, {
		body: body,
		headers: { "Content-Type": "application/json" },
		method,
		signal: AbortSignal.timeout(5000)
	})
	if (!response.ok) {
		console.log({
			body: await response.text(),
			status: response.status,
			statusText: response.statusText,
			url: response.url
		})
		throw new Error(`Caddy Request Failed: ${response.statusText}`)
	}
	return await response.json()
}

export const caddy = {
	cert: {
		get: getCertificate
	},
	config: {
		get: getConfig
	},
	routes: {
		add: addRoutes
		// list: listRoutes,
		// remove: removeRoutes
	},
	status: getServerStatus,
	stop: stopServer
}

async function getConfig(): Promise<CaddyConfig | null> {
	// biome-ignore lint/suspicious/noExplicitAny: Ignore
	let config = (await $fetch("GET", "/config")) as any
	if (!config) config = {}
	if (!config.apps) config.apps = {}
	if (!config.apps.http) config.apps.http = {}
	if (!config.apps.http.servers) config.apps.http.servers = {}
	if (!config.apps.http.servers.srv0) config.apps.http.servers.srv0 = {}
	if (!config.apps.http.servers.srv0.routes)
		config.apps.http.servers.srv0.routes = []
	if (!config.apps.http.servers.srv0.listen)
		config.apps.http.servers.srv0.listen = []
	return config as CaddyConfig
}

export async function getServerStatus(): Promise<"running" | "stopped"> {
	return await $fetch("GET", "/config")
		.then(() => "running" as const)
		.catch(() => "stopped" as const)
}

// async function removeRoutes(domains: string[]): Promise<void> {
// 	try {
// 		const config = await getConfig()
// 		if (!config) return

// 		const server = config?.apps?.http?.servers?.srv0
// 		if (!server?.routes) return

// 		const updatedRoutes = server.routes.filter((route) => {
// 			const matchHosts = route?.match?.flatMap((m) => m?.host || []) || []
// 			return !domains.some((domain) => matchHosts.includes(domain))
// 		})

// 		if (server.routes.length === updatedRoutes.length) return

// 		if (config.apps?.http?.servers?.srv0) {
// 			config.apps.http.servers.srv0.routes = updatedRoutes
// 		}
// 		// await updateConfig(config)
// 		logger.info(
// 			`Removed ${server.routes.length - updatedRoutes.length} old routes from Caddy`
// 		)
// 	} catch (error) {
// 		logger.warn(`Failed to remove old Caddy routes: ${error}`)
// 	}
// }

async function addRoutes({
	hostname,
	port
}: {
	hostname: string
	port: number
}): Promise<void> {
	try {
		const config = await getConfig()
		if (!config) {
			logger.warn("Could not get Caddy config, skipping route updates")
			return
		}

		const { routes = [], listen = [] } = config.apps?.http?.servers?.srv0 || {}
		const routeConfig: CaddyRoute = {
			handle: [
				{ handler: "reverse_proxy", upstreams: [{ dial: `127.0.0.1:${port}` }] }
			],
			match: [{ host: [hostname] }]
		}

		if (listen.length === 0) {
			listen.push(":443") // TODO: REMOVE HARDCODING
		}

		const existingIndex = routes.findIndex((route) => {
			const matchHosts = route?.match?.flatMap((m) => m?.host || []) || []
			return matchHosts.includes(hostname)
		})
		if (existingIndex >= 0) {
			routes[existingIndex] = routeConfig
		} else {
			routes.push(routeConfig)
		}
		config.apps.http.servers.srv0 = { listen, routes }
		await $fetch("PATCH", "/config", JSON.stringify(config))
		logger.info(`Added route to Caddy`)
	} catch (error) {
		logger.error(`Failed to add Caddy routes: ${error}`)
		throw error
	}
}

// async function listRoutes(): Promise<Array<{ domain: string; port: number }>> {
// 	const config = await getConfig()
// 	if (!config) return []

// 	const server = config.apps?.http?.servers?.srv0
// 	if (!server?.routes) return []

// 	const mappings: Array<{ domain: string; port: number }> = []
// 	for (const route of server.routes) {
// 		const matchHosts = route?.match?.flatMap((m) => m?.host || []) || []
// 		const upstreamPort =
// 			route?.handle?.[0]?.upstreams?.[0]?.dial.split(":")[1] || ""

// 		for (const host of matchHosts) {
// 			mappings.push({
// 				domain: host.replace(/\.local$|\.localhost$/, ""),
// 				port: Number(upstreamPort)
// 			})
// 		}
// 	}
// 	return mappings
// }

async function getCertificate() {
	const cert = await $fetch("GET", "/pki/ca/local")
	return cert as {
		id: string
		root_common_name: string
		root_certificate: string
		name: string
		intermediate_certificate: string
		intermediate_common_name: string
	}
}

async function stopServer() {
	return await $fetch("POST", "/stop")
}
