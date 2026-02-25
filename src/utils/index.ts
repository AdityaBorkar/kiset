import { LockFile } from "#/utils/lockfile.ts"
import { getPaths } from "#/utils/paths.ts"

export const PATHS = getPaths()
export const LOCKFILE = new LockFile(PATHS.LOCKFILE)

export {
	GlobalConfigSchema,
	type GlobalConfigSchemaType,
	getGlobalConfig,
	getProjectConfig
} from "./config.ts"
export { deepMerge } from "./deep-merge.ts"
export { EXIT_CODES, logProcessExit } from "./errors.ts"
export { LockFile } from "./lockfile.ts"
export { getLogLevel, type LogLevel, logger, setLogLevel } from "./logger.ts"
export { SERVICE_NAME } from "./paths.ts"
export {
	getPortAssignments,
	getRandomAvailablePort,
	registerPortAssignment
} from "./port-assignment.ts"
export { tryCatch } from "./try-catch.ts"
export type { DeepRequired } from "./types.ts"
export {
	cleanup,
	getPlatform,
	getProcessName,
	isInstalled,
	isPortAvailable,
	isRunningProcess,
	killProcess,
	type Platform,
	SUPPORTED_PLATFORMS,
	waitForPort,
	waitForProcess
} from "./utils.ts"
export {
	setFilePermissions,
	ValidationError,
	validatePath,
	validateUsername
} from "./validation.ts"
