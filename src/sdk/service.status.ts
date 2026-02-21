import { file } from "bun"

import ora from "ora"

import { isRunningProcess, LOCKFILE, PATHS } from "#/utils"

interface ServiceStatus {
	error?: string | undefined
	healthy?: boolean
	name: string
	pid?: string
	port?: number
	running: boolean
}

export async function status(verbose: boolean = false) {
	// Initialization
	const results: Record<string, ServiceStatus> = {}

	// Lock to prevent multiple concurrent starts/stops
	LOCKFILE.acquire()

	// Check `caddy` status
	{
		const spinner = verbose ? ora().start() : null
		if (spinner) spinner.text = `Checking 'caddy' status...`
		const state = await file(PATHS.CADDY_STATE).json()
		const pid = state.pid ?? 0
		const port = 443 // TODO: GET FROM CONFIG. If http=80
		const name = "caddy"
		const running = await isRunningProcess(pid)
		if (running) {
			const { healthy, error } = await checkHttpHealth(port)
			spinner?.succeed(`'caddy' is running on port ${port} (pid: ${pid})`)
			if (!healthy) {
				console.error(`'caddy' health check failed: ${error}`)
			}
			results[name] = { error, healthy, name, pid, port, running }
		} else {
			spinner?.fail(`'caddy' is not running.`)
			results[name] = { name, running }
		}
	}

	// Release lock and print results
	LOCKFILE.release()
	return results
}

async function checkHttpHealth(httpPort: number): Promise<{
	healthy: boolean
	error?: string
}> {
	try {
		const response = await fetch(`http://127.0.0.1:${httpPort}`, {
			method: "GET",
			signal: AbortSignal.timeout(5000)
		})
		if (response.ok) {
			return { healthy: true }
		}
		return { error: `HTTP returned status ${response.status}`, healthy: false }
	} catch (error) {
		return { error: `HTTP request failed: ${error}`, healthy: false }
	}
}
