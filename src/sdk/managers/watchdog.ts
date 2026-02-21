import { $, file } from "bun"

import { CADDY_PORT, DNSMASQ_PORT } from "../../constants"
import {
	checkDnsHealth,
	checkHttpHealth,
	getLocalportStateDir
} from "../../utils"
import { logger } from "../../utils/logger"

export interface WatchdogConfig {
	checkInterval?: number
	maxRestartAttempts?: number
	restartDelay?: number
}

export class ServiceWatchdog {
	private running = false
	private checkInterval: number
	private maxRestartAttempts: number
	private restartDelay: number
	private intervalId: NodeJS.Timeout | null = null
	private restartCounts = new Map<string, number>()

	constructor(config: WatchdogConfig = {}) {
		this.checkInterval = config.checkInterval ?? 30000
		this.maxRestartAttempts = config.maxRestartAttempts ?? 3
		this.restartDelay = config.restartDelay ?? 5000
		void this.restartDelay
	}

	async start(): Promise<void> {
		if (this.running) {
			logger.warn("Watchdog is already running")
			return
		}

		this.running = true
		this.restartCounts.clear()
		logger.info("Starting service watchdog...")

		this.intervalId = setInterval(() => {
			this.checkServices()
		}, this.checkInterval)

		logger.info(`Watchdog started (check interval: ${this.checkInterval}ms)`)
	}

	async stop(): Promise<void> {
		if (!this.running) {
			return
		}

		this.running = false
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}

		logger.info("Watchdog stopped")
	}

	private async checkServices(): Promise<void> {
		const stateDir = getLocalportStateDir()
		const services = [
			{
				name: "dnsmasq",
				pidPath: `${stateDir}/dnsmasq.pid`,
				port: DNSMASQ_PORT
			},
			{ name: "caddy", pidPath: `${stateDir}/caddy.pid`, port: CADDY_PORT }
		]

		for (const service of services) {
			await this.checkService(service)
		}
	}

	private async checkService(service: {
		name: string
		pidPath: string
		port: number
	}): Promise<boolean> {
		try {
			const pidFile = file(service.pidPath)
			if (!(await pidFile.exists())) {
				logger.warn(`${service.name}: PID file not found`)
				return false
			}

			const pid = await pidFile.text()
			const pidNum = pid.trim()

			const isRunning = await $`kill -0 ${pidNum} 2>/dev/null`
				.quiet()
				.then(() => true)
				.catch(() => false)

			if (!isRunning) {
				logger.warn(`${service.name}: Process ${pidNum} is not running`)
				this.restartCounts.set(
					service.name,
					(this.restartCounts.get(service.name) ?? 0) + 1
				)
				return true
			}

			const healthCheck =
				service.name === "dnsmasq" ? checkDnsHealth : checkHttpHealth
			const health = await healthCheck(service.port)

			if (!health.working) {
				logger.warn(
					`${service.name}: Unhealthy - ${health.error ?? "Unknown error"}`
				)
				this.restartCounts.set(
					service.name,
					(this.restartCounts.get(service.name) ?? 0) + 1
				)
				return true
			}

			this.restartCounts.delete(service.name)
			logger.debug(`${service.name}: Healthy`)
			return false
		} catch (error) {
			logger.error(`${service.name}: Check failed - ${error}`)
			return false
		}
	}

	getRestartCount(serviceName: string): number {
		return this.restartCounts.get(serviceName) ?? 0
	}

	shouldRestart(serviceName: string): boolean {
		return (this.restartCounts.get(serviceName) ?? 0) < this.maxRestartAttempts
	}

	isRunning(): boolean {
		return this.running
	}
}

let watchdog: ServiceWatchdog | null = null

export function getWatchdog(): ServiceWatchdog {
	if (!watchdog) {
		watchdog = new ServiceWatchdog()
	}
	return watchdog
}

export async function startWatchdog(
	config?: WatchdogConfig
): Promise<ServiceWatchdog> {
	if (!watchdog) {
		watchdog = new ServiceWatchdog(config)
	}
	await watchdog.start()
	return watchdog
}

export async function stopWatchdog(): Promise<void> {
	if (watchdog) {
		await watchdog.stop()
	}
}
