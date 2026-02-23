import { Socket } from "node:net"
import { $, sleep } from "bun"

import { PATHS } from "#/utils"

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
		if (await isPortAvailable(port, hostname)) return
		await sleep(200)
	}

	throw new Error(
		`Service ${pid} did not become ready on port ${port} within ${timeout}ms`
	)
}

export async function isPortAvailable(
	port: number,
	host: string
): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new Socket()

		socket.setTimeout(100)

		socket.on("connect", () => {
			socket.destroy()
			resolve(true)
		})

		socket.on("timeout", () => {
			socket.destroy()
			resolve(false)
		})

		socket.on("error", () => {
			socket.destroy()
			resolve(false)
		})

		socket.connect(port, host)
	})
}

export async function waitForPort(
	port: number,
	host: string = "127.0.0.1",
	timeout: number = 30000
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		if (await isPortAvailable(port, host)) {
			return
		}
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	throw new Error(`Port ${port} did not become ready within ${timeout}ms`)
}

export async function cleanup(pids: number[] = []) {
	for (const pid of pids) {
		await $`kill ${pid} 2>/dev/null || true`.catch(() => {})
	}
	await $`rm -f ${PATHS.STATE_DIR} ${PATHS.LOCKFILE} 2>/dev/null || true`
}
