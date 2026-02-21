import { $, file } from "bun"

import { CADDY_PORT, DNSMASQ_PORT, PATHS } from "../constants"
import { checkDnsHealth, checkHttpHealth, type ServiceStatus } from "../utils"

export async function status(verbose: boolean = false) {
	const services = [
		{ name: "dnsmasq", pidPath: PATHS.DNSMASQ_PID, port: DNSMASQ_PORT },
		{ name: "caddy", pidPath: PATHS.CADDY_PID, port: CADDY_PORT }
	]

	const results: ServiceStatus[] = []

	for (const service of services) {
		if (await file(service.pidPath).exists()) {
			const pid = (await file(service.pidPath).text()).trim()
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
					pid,
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
