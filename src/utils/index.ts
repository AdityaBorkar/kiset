import { LockFile } from "#/utils/lockfile.ts"
import { getPaths } from "#/utils/paths.ts"

export const PATHS = getPaths()
export const LOCKFILE = new LockFile(PATHS.LOCKFILE)

export { cleanup } from "./cleanup.ts"
export { logProcessExit } from "./errors.ts"
export { getLogLevel, type LogLevel, logger, setLogLevel } from "./logger.ts"
export { getPlatform, isInstalled, type Platform } from "./platform.ts"
export { findAvailablePort, getAssignedPorts } from "./port-assignment.ts"
export { isRunningProcess, killProcess, waitForProcess } from "./process.ts"
export { tryCatch } from "./try-catch.ts"

// export { DNSMASQ_PORT, HOSTNAME } from "./constants.ts"
// export { retryWithBackoff } from "./retry.ts"
// export type {
// 	Assignments,
// 	ServiceInfo,
// 	ServiceState,
// 	ServiceStatus
// } from "./services.ts"
// export {
// 	readAssignments,
// 	writeAssignments
// } from "./services.ts"
