import { $, sleep } from "bun"

import { is_port_available } from "#/utils/port"

export async function isRunningProcess(pid: number): Promise<boolean> {
	try {
		await $`kill -0 ${pid} 2>/dev/null`
		return true
	} catch {
		return false
	}
}

export async function killProcess(pid: string | number) {
	return await $`kill ${pid} 2>/dev/null || true`
}

export async function waitForProcess(
	pid: number,
	port: number,
	hostname: string,
	timeout: number = 30000
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		const running = await isRunningProcess(pid)
		if (!running) {
			throw new Error(`Process ${pid} exited unexpectedly`)
		}
		if (await is_port_available(port, hostname)) return
		await sleep(200)
	}

	throw new Error(
		`Service ${pid} did not become ready on port ${port} within ${timeout}ms`
	)
}
