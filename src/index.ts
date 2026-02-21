/**
 * Starts dnsmasq and Caddy services for local development.
 *
 * @param detached - Run services in detached mode (default: true)
 * @param verbose - Show detailed progress messages (default: false)
 * @returns Promise that resolves when both services are started
 * @throws {ServiceStartError} If either service fails to start
 * @throws {LockAcquisitionError} If lock file cannot be acquired
 *
 * @example
 * ```typescript
 * await start(true, false) // Start in detached mode without verbose output
 * ```
 */

/**
 * Display logs from dnsmasq and Caddy services.
 *
 * @param options - Configuration options
 * @param options.service - Filter to specific service (dnsmasq or caddy)
 * @param options.follow - Stream logs in real-time with tail -f (default: false)
 * @param options.limit - Number of log lines to show (default: 50)
 * @returns Promise that resolves when logs are displayed
 *
 * @example
 * ```typescript
 * // Show last 50 lines from both services
 * await logs()
 *
 * // Show last 100 lines from dnsmasq only
 * await logs({ service: "dnsmasq", limit: 100 })
 *
 * // Stream logs from caddy in real-time
 * await logs({ service: "caddy", follow: true })
 * ```
 */
export { type LogsOptions, logs } from "./sdk/logs"
export {
	assignAutoPorts,
	findAvailablePort,
	getAssignedPorts,
	releasePorts
} from "./sdk/managers/port-manager"
export {
	configureCaddyProxy,
	configureDnsmasq,
	configureProxy
} from "./sdk/managers/proxy-manager"
/**
 * Service watchdog for monitoring and auto-restarting failed services.
 *
 * @example
 * ```typescript
 * import { getWatchdog, startWatchdog } from "localport"
 *
 * // Get watchdog instance
 * const watchdog = getWatchdog()
 *
 * // Start watchdog with custom config
 * await startWatchdog({ checkInterval: 60000, maxRestartAttempts: 5 })
 *
 * // Check restart counts
 * const dnsmasqRestarts = watchdog.getRestartCount("dnsmasq")
 *
 * // Stop watchdog
 * await stopWatchdog()
 * ```
 */
export {
	getWatchdog,
	ServiceWatchdog,
	startWatchdog,
	stopWatchdog,
	type WatchdogConfig
} from "./sdk/managers/watchdog"
export { start } from "./sdk/start"
/**
 * Checks the status of dnsmasq and Caddy services.
 *
 * @param verbose - Show detailed status output (default: false)
 * @returns Promise resolving to array of service statuses
 *
 * @example
 * ```typescript
 * const status = await status(true)
 * console.log(status)
 * // Output: [{ name: 'dnsmasq', running: true, pid: '12345', port: 5353, healthy: true, ... }]
 * ```
 */
export { status } from "./sdk/status"
/**
 * Stops dnsmasq and Caddy services.
 *
 * @param verbose - Show detailed stop messages (default: false)
 * @returns Promise that resolves when services are stopped
 *
 * @example
 * ```typescript
 * await stop(true) // Stop with verbose output
 * ```
 */
export { stop } from "./sdk/stop"
export {
	GlobalConfigSchema,
	type GlobalConfigSchemaType,
	LocalportConfig,
	type LocalportSchema
} from "./utils/config"
