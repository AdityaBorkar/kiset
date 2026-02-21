import { $ } from "bun"

import { CADDY_PORT, DNSMASQ_PORT } from "#/utils/constants"
import {
	checkDnsHealth,
	checkHttpHealth,
	getPaths,
	readPidWithBackwardsCompat,
	type ServiceStatus
} from "../utils"

export async function status(verbose: boolean = false) {
	const paths = getPaths()
	const services = [
		{
			name: "dnsmasq",
			pidPath: paths.dnsmasq_pid,
			port: DNSMASQ_PORT,
			statePath: paths.dnsmasq_state
		},
		{
			name: "caddy",
			pidPath: paths.caddy_pid,
			port: CADDY_PORT,
			statePath: paths.caddy_state
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
				const { working, error } =
					service.name === "dnsmasq"
						? await checkDnsHealth(service.port)
						: await checkHttpHealth(service.port)

				results.push({
					healthy: working,
					name: service.name,
					pid: String(pid),
					port: service.port,
					running: true,
					...(service.name === "dnsmasq"
						? { dnsWorking: working }
						: { httpWorking: working }),
					...(error ? { error } : {})
				})

				if (verbose) {
					const healthText = working ? "healthy" : `unhealthy (${error})`
					console.log(
						`${service.name.padEnd(8)} ${working ? "✓" : "✗"} running (PID: ${pid}, Port: ${service.port}) - ${healthText}`
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
