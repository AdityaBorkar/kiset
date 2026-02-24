export async function logProcessExit({
	subprocess,
	name,
	logFilePath
}: {
	subprocess: ReturnType<typeof Bun.spawn>
	name: string
	logFilePath: string
}) {
	try {
		const exitCode = await subprocess.exited
		const reasons: Record<number, string> = {
			0: "Exited normally",
			130: "Interrupted by user (Ctrl+C)",
			137: "Killed",
			143: "Stopped via kiset stop"
		}
		const reason =
			reasons[exitCode as keyof typeof reasons] ||
			`Exited with code ${exitCode}`
		console.error(`\n${name} ${reason}.\nSee ${logFilePath} for details.`)
		process.exit(exitCode)
	} catch {}
}

export class PlatformNotSupportedError extends Error {
	constructor(platform: string) {
		super(`Platform "${platform}" is not supported`)
		this.name = "PlatformNotSupportedError"
	}
}

export class ServiceNotRunningError extends Error {
	constructor(serviceName: string) {
		super(`Service "${serviceName}" is not running`)
		this.name = "ServiceNotRunningError"
	}
}

export class LockAcquisitionError extends Error {
	constructor(lockFile: string) {
		super(`Failed to acquire lock file: ${lockFile}`)
		this.name = "LockAcquisitionError"
	}
}

export class ServiceStartError extends Error {
	constructor(serviceName: string, reason: string) {
		super(`Failed to start service "${serviceName}": ${reason}`)
		this.name = "ServiceStartError"
	}
}

export const EXIT_CODES = {
	ERROR: 1,
	SUCCESS: 0,
	USAGE: 2
} as const
