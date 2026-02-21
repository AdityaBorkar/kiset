import { $, file } from "bun"

import { DNSMASQ_PORT } from "#/utils"
import { logger } from "#/utils/logger"
import { getPaths } from "#/utils/paths"

const CADDY_ADMIN_API = "http://127.0.0.1:2519"

type CaddyRoute = {
	match: Array<{ host?: string[] }>
	handle: Array<{ handler: string; upstreams?: Array<{ dial: string }> }>
}

type CaddyConfig = {
	apps?: {
		http?: {
			servers?: {
				srv0?: {
					listen?: string[]
					routes?: CaddyRoute[]
				}
			}
		}
	}
}

async function reloadDnsmasq(): Promise<void> {
	try {
		// biome-ignore lint/complexity/useLiteralKeys: <- Required for TypeScript index signature
		const home = process.env["HOME"] || process.env["USERPROFILE"]
		if (!home) return
		const pidFile = file(`${home}/.local/state/kiset/dnsmasq.pid`)
		if (await pidFile.exists()) {
			const pid = (await pidFile.text()).trim()
			await $`kill -HUP ${pid}`.quiet()
		}
	} catch {}
}

async function getCaddyConfig(): Promise<CaddyConfig | null> {
	try {
		const response = await fetch(`${CADDY_ADMIN_API}/config/`, {
			headers: { "Content-Type": "application/json" },
			method: "GET"
		})

		if (!response.ok) {
			throw new Error(`Failed to get Caddy config: ${response.statusText}`)
		}

		return (await response.json()) as CaddyConfig
	} catch (error) {
		logger.warn(`Failed to get current Caddy config: ${error}`)
		return null
	}
}

async function updateCaddyConfig(config: CaddyConfig): Promise<void> {
	try {
		const response = await fetch(`${CADDY_ADMIN_API}/config/`, {
			body: JSON.stringify(config, null, 2),
			headers: { "Content-Type": "application/json" },
			method: "POST"
		})

		if (!response.ok) {
			console.log("Failed Caddy config update response:", await response.text())
			throw new Error(`Failed to update Caddy config: ${response.statusText}`)
		}

		logger.info("Caddy configuration updated successfully")
	} catch (error) {
		logger.error(`Failed to update Caddy config: ${error}`)
		throw error
	}
}

function ensureCaddyServer(config: CaddyConfig) {
	if (!config.apps) config.apps = {}
	if (!config.apps.http) config.apps.http = { servers: {} }
	if (!config.apps.http.servers) config.apps.http.servers = {}
	if (!config.apps.http.servers.srv0) config.apps.http.servers.srv0 = {}
}

async function removeCaddyRoutes(domains: string[]): Promise<void> {
	try {
		const config = await getCaddyConfig()
		if (!config) return

		const server = config?.apps?.http?.servers?.srv0
		if (!server?.routes) return

		const updatedRoutes = server.routes.filter((route) => {
			const matchHosts = route?.match?.flatMap((m) => m?.host || []) || []
			return !domains.some((domain) => matchHosts.includes(domain))
		})

		if (server.routes.length === updatedRoutes.length) return

		ensureCaddyServer(config)
		if (config.apps?.http?.servers?.srv0) {
			config.apps.http.servers.srv0.routes = updatedRoutes
		}
		await updateCaddyConfig(config)
		logger.info(
			`Removed ${server.routes.length - updatedRoutes.length} old routes from Caddy`
		)
	} catch (error) {
		logger.warn(`Failed to remove old Caddy routes: ${error}`)
	}
}

async function addCaddyRoutes(
	mappings: Array<{ domain: string; port: number }>
): Promise<void> {
	try {
		const config = await getCaddyConfig()
		if (!config) {
			logger.warn("Could not get Caddy config, skipping route updates")
			return
		}

		ensureCaddyServer(config)
		const existingRoutes = config.apps?.http?.servers?.srv0?.routes || []
		const newRoutes: CaddyRoute[] = []

		for (const mapping of mappings) {
			const domains = [`${mapping.domain}.local`, `${mapping.domain}.localhost`]

			for (const domain of domains) {
				const existingRoute = existingRoutes.find((route) => {
					const matchHosts = route?.match?.flatMap((m) => m?.host || []) || []
					return matchHosts.includes(domain)
				})

				if (!existingRoute) {
					newRoutes.push({
						handle: [
							{
								handler: "reverse_proxy",
								upstreams: [{ dial: `127.0.0.1:${mapping.port}` }]
							}
						],
						match: [{ host: [domain] }]
					})
				}
			}
		}

		if (newRoutes.length === 0) return

		ensureCaddyServer(config)
		if (
			config.apps?.http?.servers?.srv0 !== undefined &&
			config.apps?.http?.servers?.srv0 !== null
		) {
			config.apps.http.servers.srv0.routes = [...existingRoutes, ...newRoutes]
		}
		await updateCaddyConfig(config)
		logger.info(`Added ${newRoutes.length} new routes to Caddy`)
	} catch (error) {
		logger.error(`Failed to add Caddy routes: ${error}`)
		throw error
	}
}

async function getDnsmasqDomains(): Promise<Set<string>> {
	const paths = getPaths()
	const configFile = file(paths.dnsmasq_config)

	if (!(await configFile.exists())) {
		return new Set()
	}

	try {
		const content = await configFile.text()
		const domains = new Set<string>()

		for (const line of content.split("\n")) {
			const match = line.match(/^address=\/(.+?)\/127\.0\.0\.1$/)
			if (match?.[1]) domains.add(match[1])
		}

		return domains
	} catch {
		return new Set()
	}
}

async function writeDnsmasqConfig(domains: Set<string>): Promise<void> {
	const paths = getPaths()
	const configFile = file(paths.dnsmasq_config)

	const lines = [
		`address=/local/127.0.0.1`,
		`port=${DNSMASQ_PORT}`,
		`listen-address=127.0.0.1`,
		`cache-size=10000`,
		`server=1.1.1.1`,
		`server=8.8.8.8`,
		`keep-in-foreground`,
		...Array.from(domains).map((domain) => `address=/${domain}/127.0.0.1`)
	]

	await configFile.write(lines.join("\n"))
}

export async function configureDnsmasq(domains: string[]): Promise<void> {
	try {
		const existingDomains = await getDnsmasqDomains()
		const allDomains = new Set([...existingDomains, ...domains])

		await writeDnsmasqConfig(allDomains)
		await reloadDnsmasq()

		logger.info(`Configured dnsmasq with ${domains.length} domain(s)`)
	} catch (error) {
		logger.error(`Failed to configure dnsmasq: ${error}`)
		throw error
	}
}

export async function configureCaddyProxy(
	mappings: Array<{ domain: string; port: number }>
): Promise<void> {
	try {
		const domains = mappings.flatMap((m) => [
			`${m.domain}.local`,
			`${m.domain}.localhost`
		])

		await removeCaddyRoutes(domains)
		await addCaddyRoutes(mappings)

		logger.info(`Configured Caddy proxy for ${mappings.length} service(s)`)
	} catch (error) {
		logger.error(`Failed to configure Caddy proxy: ${error}`)
		throw error
	}
}

export async function configureProxy(
	portAssignments: Record<string, { port: number; name?: string }>
): Promise<void> {
	const mappings: Array<{ domain: string; port: number }> = []
	const domains: string[] = []

	for (const portInfo of Object.values(portAssignments)) {
		if (portInfo.name) {
			domains.push(`${portInfo.name}.local`)
			domains.push(`${portInfo.name}.localhost`)
			mappings.push({ domain: portInfo.name, port: portInfo.port })
		}
	}

	if (domains.length === 0) {
		logger.info("No named services found, skipping proxy configuration")
		return
	}

	await configureDnsmasq(domains)
	await configureCaddyProxy(mappings)
}
