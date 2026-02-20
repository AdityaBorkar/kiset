import { $ } from "bun"

import { Command } from "commander"

import { type LogLevel, logger, setLogLevel } from "./logger"
import { start } from "./sdk/start"
import { status } from "./sdk/status"
import { stop } from "./sdk/stop"
import { getLocalportStateDir } from "./utils"

const EXIT_CODES = {
	ERROR: 1,
	SUCCESS: 0,
	USAGE: 2
} as const

let isShuttingDown = false
let jsonOutput = false

async function cleanupPidFiles() {
	const stateDir = getLocalportStateDir()
	await $`rm -f ${stateDir}/dnsmasq.pid ${stateDir}/caddy.pid ${stateDir}/localport.lock 2>/dev/null || true`
}

async function handleGracefulShutdown(signal: NodeJS.Signals) {
	if (isShuttingDown) return
	isShuttingDown = true

	logger.info(`\nReceived ${signal}, shutting down gracefully...`)
	try {
		await stop(false)
		process.exit(EXIT_CODES.SUCCESS)
	} catch (error) {
		logger.error(
			"Error during shutdown:",
			error instanceof Error ? error.message : String(error)
		)
		process.exit(EXIT_CODES.ERROR)
	}
}

async function handleCrash(error: unknown) {
	logger.error("\nFatal error occurred:")
	logger.error(error instanceof Error ? error.message : String(error))
	await cleanupPidFiles()
	process.exit(EXIT_CODES.ERROR)
}

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"))
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"))
process.on("uncaughtException", handleCrash)
process.on("unhandledRejection", handleCrash)

async function handleError(error: unknown) {
	if (jsonOutput) {
		console.error(
			JSON.stringify({
				error: error instanceof Error ? error.message : String(error),
				exitCode: EXIT_CODES.ERROR
			})
		)
	} else {
		logger.error(error instanceof Error ? error.message : String(error))
	}
	process.exit(EXIT_CODES.ERROR)
}

const program = new Command()

program
	.name("localport")
	.description("CLI for managing localport")
	.version("1.0.0")
	.option("--json", "Output in JSON format", false)
	.option(
		"--log-level <level>",
		"Set log level (debug, info, warn, error, silent)",
		"info"
	)
	.exitOverride((err) => {
		if (err.code === "commander.help" || err.code === "commander.version") {
			process.exit(EXIT_CODES.SUCCESS)
		}
		process.exit(EXIT_CODES.USAGE)
	})

program.hook("preAction", () => {
	const options = program.opts()
	if (options["log-level"] !== undefined) {
		setLogLevel(options["log-level"] as LogLevel)
	}
	jsonOutput = (options as { json?: boolean }).json ?? false
	if (jsonOutput) {
		setLogLevel("silent")
	}
})

program
	.command("start")
	.description("Start the service")
	.option("--no-detached", "Run in foreground mode")
	.action(async (options) => {
		try {
			if (jsonOutput) {
				await start(options.detached, false)
				console.log(
					JSON.stringify({
						exitCode: EXIT_CODES.SUCCESS,
						status: "started"
					})
				)
			} else {
				await start(options.detached, true)
			}
		} catch (error) {
			await handleError(error)
		}
	})

program
	.command("stop")
	.description("Stop the service")
	.action(async () => {
		try {
			if (jsonOutput) {
				await stop(false)
				console.log(
					JSON.stringify({
						exitCode: EXIT_CODES.SUCCESS,
						status: "stopped"
					})
				)
			} else {
				await stop(true)
			}
		} catch (error) {
			await handleError(error)
		}
	})

program
	.command("status")
	.description("Show service status")
	.action(async () => {
		try {
			const results = await status(false)
			if (jsonOutput) {
				console.log(JSON.stringify(results))
			} else {
				for (const service of results) {
					if (service.running) {
						const healthIndicator = service.healthy ? "✓" : "✗"
						const healthText = service.healthy
							? "healthy"
							: `unhealthy (${service.error})`
						logger.info(
							`${service.name.padEnd(8)} ${healthIndicator} running (PID: ${service.pid}, Port: ${service.port}) - ${healthText}`
						)
					} else {
						logger.info(`${service.name.padEnd(8)} stopped`)
					}
				}
			}
		} catch (error) {
			await handleError(error)
		}
	})

program.parseAsync().catch(handleError)
