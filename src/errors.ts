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
