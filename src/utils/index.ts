import { LockFile } from "#/utils/lockfile.ts"
import { getPaths } from "#/utils/paths.ts"

export const PATHS = getPaths()
export const LOCKFILE = new LockFile(PATHS.LOCKFILE)

export { getGlobalConfig, getProjectConfig } from "./config.ts"
export { logProcessExit } from "./errors.ts"
export { getLogLevel, type LogLevel, logger, setLogLevel } from "./logger.ts"
export { getPortAssignments } from "./port-assignment.ts"
export { tryCatch } from "./try-catch.ts"
export {
	cleanup,
	getPlatform,
	isInstalled,
	isPortAvailable,
	isRunningProcess,
	killProcess,
	type Platform,
	SUPPORTED_PLATFORMS,
	waitForPort,
	waitForProcess
} from "./utils.ts"
