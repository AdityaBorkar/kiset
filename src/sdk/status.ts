import { $, file } from "bun"

import { CADDY_PORT, DNSMASQ_PORT, PATHS } from "../constants"
import { checkDnsHealth, checkHttpHealth, type ServiceStatus } from "../utils"

interface ServiceState {
	pid: number
	port: number
}

async function readServiceState(
	statePath: string
): Promise<ServiceState | null> {
	try {
		const content = await file(statePath).text()
		const state = JSON.parse(content) as ServiceState
		return state
	} catch {
		return null
	}
}

async function readPidWithBackwardsCompat(
	statePath: string,
	pidPath: string
): Promise<number | null> {
	const state = await readServiceState(statePath)
	if (state) return state.pid

	try {
		const content = await file(pidPath).text()
		return Number.parseInt(content.trim(), 10)
	} catch {
		return null
	}
}

export async function status(verbose: boolean = false) {
	const services = [
		{
			name: "dnsmasq",
			pidPath: PATHS.DNSMASQ_PID,
			port: DNSMASQ_PORT,
			statePath: PATHS.DNSMASQ_STATE
		},
		{
			name: "caddy",
			pidPath: PATHS.CADDY_PID,
			port: CADDY_PORT,
			statePath: PATHS.CADDY_STATE
		}
	]

	const results: ServiceStatus[] = []

	for (const service of services) {
		const pid = await readPidWithBackwardsCompat(
			service.statePath,
			service.pidPath
		)

		if (pid) {
			const isRunning = await $`kill -0 ${pid} 2>/dev/null`
				.quiet()
				.then(() => true)
				.catch(() => false)

			if (isRunning) {
				let healthy = false
				let error: string | undefined

				if (service.name === "dnsmasq") {
					const { working, error: err } = await checkDnsHealth(service.port)
					healthy = working
					if (!healthy) error = err
				} else {
					const { working, error: err } = await checkHttpHealth(service.port)
					healthy = working
					if (!healthy) error = err
				}

				results.push({
					healthy,
					name: service.name,
					pid: String(pid),
					port: service.port,
					running: true,
					...(service.name === "dnsmasq"
						? { dnsWorking: healthy }
						: { httpWorking: healthy }),
					...(error ? { error } : {})
				})

				if (verbose) {
					const healthText = healthy ? "healthy" : `unhealthy (${error})`
					console.log(
						`${service.name.padEnd(8)} ${healthy ? "✓" : "✗"} running (PID: ${pid}, Port: ${service.port}) - ${healthText}`
					)
				}
			} else {
				results.push({ name: service.name, running: false })
				if (verbose) console.log(`${service.name.padEnd(8)} stopped`)
			}
		} else {
			results.push({ name: service.name, running: false })
			if (verbose) console.log(`${service.name.padEnd(8)} stopped`)
		}
	}

	return results
}
