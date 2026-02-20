import * as net from "node:net"
import { homedir } from "node:os"
import { $, file } from "bun"

export function getXdgConfigDir(): string {
	// biome-ignore lint/complexity/useLiteralKeys: Typescript doesn't support literal keys in process.env
	return process.env["XDG_CONFIG_HOME"] ?? `${homedir()}/.config`
}

export function getXdgStateDir(): string {
	// biome-ignore lint/complexity/useLiteralKeys: Typescript doesn't support literal keys in process.env
	return process.env["XDG_STATE_HOME"] || `${homedir()}/.local/state`
}

export function getLocalportConfigDir(): string {
	return `${getXdgConfigDir()}/localport`
}

export function getLocalportStateDir(): string {
	return `${getXdgStateDir()}/localport`
}

export function getLocalportLogsDir(): string {
	return `${getLocalportStateDir()}/logs`
}

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

export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number]

export async function getPlatformId(): Promise<PlatformId> {
	const platform = process.platform
	if (platform === "darwin") {
		return "darwin" as PlatformId
	}
	if (platform === "linux") {
		const osRelease = await $`cat /etc/os-release`.text()
		const idMatch = osRelease.match(/^ID="?([^"\n]+)"?/m)
		const id = idMatch?.[1] as PlatformId
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

export async function install({
	label,
	command,
	verbose
}: {
	label: string
	command: string
	verbose?: boolean
}) {
	if (verbose) console.log(`Installing ${label} with command: ${command}`)
	$`${command}`
		.then(() => {
			if (verbose) console.log(`${label} installed successfully!`)
		})
		.catch((error) => {
			if (verbose) console.error(`Failed to install ${label}: ${error}`)
		})
}

export interface ServiceStatus {
	name: string
	running: boolean
	pid?: string
	port?: number
	healthy?: boolean
	dnsWorking?: boolean
	httpWorking?: boolean
	error?: string
}

export async function checkDnsHealth(dnsPort: number): Promise<{
	working: boolean
	error?: string
}> {
	try {
		const testDomain = "test.local"
		const result =
			await $`dig @127.0.0.1 -p ${dnsPort} +short ${testDomain}`.text()
		if (result.includes("127.0.0.1")) {
			return { working: true }
		}
		return {
			error: "DNS resolution returned unexpected result",
			working: false
		}
	} catch (error) {
		return { error: `DNS query failed: ${error}`, working: false }
	}
}

export async function checkHttpHealth(httpPort: number): Promise<{
	working: boolean
	error?: string
}> {
	try {
		const response = await fetch(`http://127.0.0.1:${httpPort}`, {
			method: "GET",
			signal: AbortSignal.timeout(5000)
		})
		if (response.ok) {
			return { working: true }
		}
		return { error: `HTTP returned status ${response.status}`, working: false }
	} catch (error) {
		return { error: `HTTP request failed: ${error}`, working: false }
	}
}

export async function isProcessRunning(pid: number): Promise<boolean> {
	try {
		await $`kill -0 ${pid} 2>/dev/null`
		return true
	} catch {
		return false
	}
}

async function checkPort(port: number, host: string): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new net.Socket()

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

export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 5,
	baseDelay: number = 100,
	maxDelay: number = 5000
): Promise<T> {
	let lastError: unknown

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error
			if (attempt < maxRetries - 1) {
				const delay = Math.min(baseDelay * 2 ** attempt, maxDelay)
				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}
	}

	throw lastError
}

export async function waitForPort(
	port: number,
	host: string = "127.0.0.1",
	timeout: number = 30000
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		if (await checkPort(port, host)) {
			return
		}
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	throw new Error(`Port ${port} did not become ready within ${timeout}ms`)
}

export async function waitForService(
	pid: number,
	port: number,
	host: string = "127.0.0.1",
	timeout: number = 30000
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		const running = await isProcessRunning(pid)
		if (!running) {
			throw new Error(`Process ${pid} exited unexpectedly`)
		}

		if (await checkPort(port, host)) {
			return
		}

		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	throw new Error(
		`Service ${pid} did not become ready on port ${port} within ${timeout}ms`
	)
}

class LockFile {
	private lockPath: string
	private acquired = false

	constructor(lockPath: string) {
		this.lockPath = lockPath
	}

	async acquire(timeout: number = 5000): Promise<void> {
		const startTime = Date.now()
		const pid = process.pid

		while (Date.now() - startTime < timeout) {
			const lockFile = file(this.lockPath)
			const exists = await lockFile.exists()

			if (!exists) {
				try {
					await lockFile.write(`${pid}\n`)
					this.acquired = true
					return
				} catch (error) {
					const err = error as NodeJS.ErrnoException
					if (err.code === "EEXIST") {
						continue
					}
					throw error
				}
			}
			await new Promise((resolve) => setTimeout(resolve, 50))
		}

		throw new Error(
			`Could not acquire lock on ${this.lockPath}. Is another operation in progress?`
		)
	}

	async release(): Promise<void> {
		if (this.acquired) {
			try {
				const lockFile = file(this.lockPath)
				await lockFile.delete()
			} catch {}
			this.acquired = false
		}
	}

	async withLock<T>(fn: () => Promise<T>): Promise<T> {
		await this.acquire()
		try {
			return await fn()
		} finally {
			await this.release()
		}
	}
}

export function createLockFile(lockPath: string): LockFile {
	return new LockFile(lockPath)
}
