import { createServer } from "node:http"
import { $, sleep } from "bun"

import { PATHS } from "#/constants"

export const SUPPORTED_PLATFORMS = [
	"darwin",
	"ubuntu",
	"debian",
	"fedora",
	"rhel",
	"centos",
	"arch",
	"manjaro"
] as const

export type Platform = (typeof SUPPORTED_PLATFORMS)[number]

export async function getPlatform(): Promise<Platform> {
	const platform = process.platform
	if (platform === "darwin") {
		return "darwin" as Platform
	}
	if (platform === "linux") {
		const osRelease = await $`cat /etc/os-release`.text()
		const idMatch = osRelease.match(/^ID="?([^"\n]+)"?/m)
		const id = idMatch?.[1] as Platform
		if (!id || !SUPPORTED_PLATFORMS.includes(id)) {
			throw new Error(`Unsupported platform: ${id}`)
		}
		return id
	}
	throw new Error(`Unsupported platform: ${platform}`)
}

export function isInstalled(packageName: string) {
	return $`which ${packageName}`
		.quiet()
		.then(() => true)
		.catch(() => false)
}

export async function isRunningProcess(pid: number): Promise<boolean> {
	try {
		await $`kill -0 ${pid} 2>/dev/null`
		return true
	} catch {
		return false
	}
}

export async function getProcessName(pid: number): Promise<string | null> {
	try {
		const result = await $`ps -p ${pid} -o comm=`.quiet().text()
		return result.trim() || null
	} catch {
		return null
	}
}

export async function killProcess(
	pid: string | number,
	options?: { expectedName?: string }
): Promise<boolean> {
	const numPid = typeof pid === "string" ? Number.parseInt(pid, 10) : pid

	if (options?.expectedName) {
		const actualName = await getProcessName(numPid)
		if (!actualName || actualName !== options.expectedName) {
			return false
		}
	}

	await $`kill ${numPid} 2>/dev/null || true`
	return true
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
		if (await isPortAvailable({ hostname, port })) return
		await sleep(200)
	}

	throw new Error(
		`Service ${pid} did not become ready on port ${port} within ${timeout}ms`
	)
}

interface Options {
	hostname?: string
	port: number
	signal?: AbortSignal
}

export function isPortAvailable({
	port,
	hostname: host = "::",
	signal
}: Options): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const server = createServer()

		const cleanup = () => {
			server.removeAllListeners()
		}

		if (signal?.aborted) {
			cleanup()
			return reject(new Error("Aborted"))
		}

		signal?.addEventListener("abort", () => {
			cleanup()
			server.close()
			reject(new Error("Aborted"))
		})

		server.once("error", (err: NodeJS.ErrnoException) => {
			cleanup()
			// EADDRINUSE → definitely not available
			if (err.code === "EADDRINUSE") return resolve(false)
			// EACCES → permission issue (treat as unavailable)
			if (err.code === "EACCES") return resolve(false)
			// Other errors → propagate
			reject(err)
		})

		server.once("listening", () => {
			server.close(() => {
				cleanup()
				resolve(true)
			})
		})

		server.listen({ exclusive: true, host, port })
	})
}

export async function waitForPort(
	port: number,
	host: string = "127.0.0.1",
	timeout: number = 30000
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		if (await isPortAvailable({ hostname: host, port })) {
			return
		}
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	throw new Error(`Port ${port} did not become ready within ${timeout}ms`)
}

export async function cleanup(pids: number[] = []) {
	for (const pid of pids) {
		await killProcess(pid)
	}
	await $`rm -f ${PATHS.STATE_DIR} ${PATHS.LOCKFILE} 2>/dev/null || true`
}
