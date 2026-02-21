import { LockFile } from "#/utils/lockfile.ts"
import { getPaths } from "#/utils/paths.ts"

export { CADDY_PORT, DNSMASQ_PORT, HOSTNAME } from "./config.ts"
export { LockFile } from "./lockfile.ts"
export type { LogLevel } from "./logger.ts"
export { getLogLevel, logger, setLogLevel } from "./logger.ts"
export { getPaths } from "./paths.ts"
export type { Platform } from "./platform.ts"
export {
	getPlatform,
	install,
	isInstalled,
	SUPPORTED_PLATFORMS
} from "./platform.ts"
export {
	is_process_running,
	kill_process,
	wait_for_process
} from "./process.ts"
export { retryWithBackoff } from "./retry.ts"
export type {
	Assignments,
	ServiceInfo,
	ServiceState,
	ServiceStatus
} from "./services.ts"
export {
	cleanup as cleanupPartialState,
	readAssignments,
	writeAssignments
} from "./services.ts"

export const PATHS = getPaths()
export const LOCKFILE = new LockFile(PATHS.LOCKFILE)
