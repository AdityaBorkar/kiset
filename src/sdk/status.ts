import { $, file } from "bun"

import { CADDY_PORT, DNSMASQ_PORT } from "../constants"
import {
	checkDnsHealth,
	checkHttpHealth,
	getLocalportStateDir,
	type ServiceStatus
} from "../utils"

/**
 * Checks the status of dnsmasq and Caddy services.
 *
 * @param verbose - Show detailed status output (default: false)
 * @returns Promise resolving to array of service statuses
 */
export async function status(verbose: boolean = false) {
	const stateDir = getLocalportStateDir()

	const services = [
		{ name: "dnsmasq", pidPath: `${stateDir}/dnsmasq.pid`, port: DNSMASQ_PORT },
		{ name: "caddy", pidPath: `${stateDir}/caddy.pid`, port: CADDY_PORT }
	]

	const results: ServiceStatus[] = []

	for (const service of services) {
		if (await file(service.pidPath).exists()) {
			const pid = await file(service.pidPath).text()
			const pidNum = pid.trim()
			const isRunning = await $`kill -0 ${pidNum} 2>/dev/null`
				.quiet()
				.then(() => true)
				.catch(() => false)

			if (isRunning) {
				let healthy = false
				let dnsWorking = false
				let httpWorking = false
				let error: string | undefined

				if (service.name === "dnsmasq") {
					const dnsHealth = await checkDnsHealth(service.port)
					dnsWorking = dnsHealth.working
					healthy = dnsWorking
					if (!healthy) {
						error = dnsHealth.error
					}
				} else if (service.name === "caddy") {
					const httpHealth = await checkHttpHealth(service.port)
					httpWorking = httpHealth.working
					healthy = httpWorking
					if (!healthy) {
						error = httpHealth.error
					}
				}

				const statusResult: ServiceStatus = {
					dnsWorking,
					healthy,
					httpWorking,
					name: service.name,
					pid: pidNum,
					port: service.port,
					running: true
				}

				if (error !== undefined) {
					statusResult.error = error
				}

				results.push(statusResult)
				if (verbose) {
					const healthIndicator = healthy ? "✓" : "✗"
					const healthText = healthy ? "healthy" : `unhealthy (${error})`
					console.log(
						`${service.name.padEnd(8)} ${healthIndicator} running (PID: ${pidNum}, Port: ${service.port}) - ${healthText}`
					)
				}
			} else {
				const statusResult: ServiceStatus = {
					name: service.name,
					running: false
				}
				results.push(statusResult)
				if (verbose) {
					console.log(`${service.name.padEnd(8)} stopped`)
				}
			}
		} else {
			const statusResult: ServiceStatus = {
				name: service.name,
				running: false
			}
			results.push(statusResult)
			if (verbose) {
				console.log(`${service.name.padEnd(8)} stopped`)
			}
		}
	}

	return results
}
