#!/usr/bin/env bun

import { Command } from "commander"

import { autostart, revoke_autostart, revoke_trust } from "#/index"
import { list } from "#/sdk/list"
import { run } from "#/sdk/run"
import { logs } from "#/sdk/service.logs"
import { start } from "#/sdk/service.start"
import { status } from "#/sdk/service.status"
import { stop } from "#/sdk/service.stop"
import { trust } from "#/sdk/trust"
import { cleanup, LOCKFILE, type LogLevel, logger, setLogLevel } from "#/utils"

LOCKFILE.release()

const EXIT_CODES = {
	ERROR: 1,
	SUCCESS: 0,
	USAGE: 2
} as const

let isShuttingDown = false
async function handleGracefulShutdown(signal: NodeJS.Signals) {
	if (isShuttingDown) return
	isShuttingDown = true

	try {
		logger.info(`\nReceived ${signal}, shutting down gracefully...`)
		await stop(false)
		process.exit(EXIT_CODES.SUCCESS)
	} catch (error) {
		const err = error instanceof Error ? error.message : String(error)
		logger.error("Error during shutdown:", err)
		process.exit(EXIT_CODES.ERROR)
	}
}

async function handleCrash(error: unknown) {
	logger.error("\nFatal error occurred:")
	logger.error(error instanceof Error ? error.message : String(error))
	await cleanup()
	process.exit(EXIT_CODES.ERROR)
}

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"))
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"))
process.on("uncaughtException", handleCrash)
process.on("unhandledRejection", handleCrash)

const program = new Command()

program
	.name("kiset")
	.description("CLI for managing kiset")
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

let jsonOutput = false // TODO: DEPRECATE
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

const service = program.command("service").description("Manage kiset services")

service
	.command("start")
	.description("Start the service")
	.option("--foreground", "Run in foreground mode", false)
	.action(async (options) => {
		if (jsonOutput) {
			await start(!options.foreground, false)
			console.log(
				JSON.stringify({
					exitCode: EXIT_CODES.SUCCESS,
					status: "started"
				})
			)
		} else {
			await start(!options.foreground, true)
		}
	})

service
	.command("stop")
	.description("Stop the service")
	.action(async () => {
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
	})

service
	.command("status")
	.description("Show service status")
	.action(async () => {
		const results = await status(false)
		if (jsonOutput) {
			console.log(JSON.stringify(results))
		}
	})

service
	.command("logs")
	.description("Show logs from services")
	.argument("[service]", "Service name (dnsmasq or caddy)")
	.option("--follow", "Stream logs in real-time", false)
	.option("--limit <n>", "Number of log lines to show", "50")
	.action(async (service, options) => {
		const serviceTyped =
			service === "dnsmasq" || service === "caddy"
				? (service as "dnsmasq" | "caddy")
				: undefined
		const logsOptions: {
			follow: boolean
			limit: number
			service?: "dnsmasq" | "caddy"
		} = {
			follow: options.follow,
			limit: Number.parseInt(options.limit, 10) || 50
		}
		if (serviceTyped) {
			logsOptions.service = serviceTyped
		}
		await logs(logsOptions)
	})

program
	.command("trust")
	.description("Trust the local Caddy certificate (for HTTPS)")
	.action(async () => {
		const result = await trust()
		if (jsonOutput) {
			console.log(
				JSON.stringify({
					exitCode: result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR,
					status: result ? "trusted" : "failed"
				})
			)
		}
	})

program
	.command("revoke-trust")
	.description("Revoke trust for the local Caddy certificate (for HTTPS)")
	.action(async () => {
		const result = await revoke_trust()
		if (jsonOutput) {
			console.log(
				JSON.stringify({
					exitCode: result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR,
					status: result ? "revoked" : "failed"
				})
			)
		}
	})

program
	.command("autostart")
	.description("Enable autostart for the service")
	.action(async () => {
		await autostart()
		if (jsonOutput) {
			console.log(
				JSON.stringify({
					exitCode: EXIT_CODES.SUCCESS,
					status: "enabled"
				})
			)
		}
	})

program
	.command("revoke-autostart")
	.description("Disable autostart for the service")
	.action(async () => {
		await revoke_autostart()
		if (jsonOutput) {
			console.log(
				JSON.stringify({
					exitCode: EXIT_CODES.SUCCESS,
					status: "disabled"
				})
			)
		}
	})

program
	.command("list")
	.argument("[program]", "Program name to list ports for (optional)")
	.description("List port assignments")
	.action(async (program) => {
		const result = await list(program)
		if (jsonOutput) {
			console.log(JSON.stringify(result))
		} else {
			if (program) {
				const ports = result as number[]
				logger.info(`'${program}' ports: [${ports.join(", ")}]`)
			} else {
				const assignments = result as Record<string, number[]>
				const entries = Object.entries(assignments)
				if (entries.length === 0) {
					logger.info("No port assignments found")
				} else {
					for (const [prog, ports] of entries) {
						logger.info(`${prog}: [${ports.join(", ")}]`)
					}
				}
			}
		}
	})

// program
// 	.command("assign")
// 	.argument("<program>", "Program name to assign ports to")
// 	.argument("<ports...>", "Port numbers to assign")
// 	.description("Assign port(s) to a program")
// 	.action(async (program, ports) => {
// 		const portNumbers = ports.map(Number)
// 		const result = await assign(program, portNumbers)
// 		if (jsonOutput) {
// 			console.log(
// 				JSON.stringify({
// 					exitCode: EXIT_CODES.SUCCESS,
// 					ports: result,
// 					program
// 				})
// 			)
// 		} else {
// 			logger.info(`Assigned ports [${result.join(", ")}] to '${program}'`)
// 		}
// 	})

// program
// 	.command("rm")
// 	.argument("<program>", "Program name to remove ports from")
// 	.argument(
// 		"[ports...]",
// 		"Port numbers to remove (optional - removes all if not specified)"
// 	)
// 	.description("Remove port assignment(s)")
// 	.action(async (program, ports) => {
// 		if (ports.length === 0) {
// 			await removePort(program)
// 			if (jsonOutput) {
// 				console.log(
// 					JSON.stringify({
// 						exitCode: EXIT_CODES.SUCCESS,
// 						program,
// 						removed: true
// 					})
// 				)
// 			} else {
// 				logger.info(`Removed all port assignments for '${program}'`)
// 			}
// 		} else {
// 			const portNumbers = ports.map(Number)
// 			const result = await removePort(program, portNumbers)
// 			if (jsonOutput) {
// 				console.log(
// 					JSON.stringify({
// 						exitCode: EXIT_CODES.SUCCESS,
// 						ports: result as number[],
// 						program
// 					})
// 				)
// 			} else {
// 				logger.info(
// 					`Removed ports [${(result as number[]).join(", ")}] from '${program}'`
// 				)
// 			}
// 		}
// 	})

program
	.command("run")
	.argument("<command>", "Command to execute")
	.argument("[args...]", "Arguments to pass to the command")
	.description(
		"Execute a command after validating config and checking service status"
	)
	.action(async (command, args) => {
		const exitCode = await run(command, args)
		process.exit(exitCode)
	})

program.parseAsync().catch((err: unknown) => {
	const error = err instanceof Error ? err.message : String(err)
	if (jsonOutput) {
		console.error(JSON.stringify({ error, exitCode: EXIT_CODES.ERROR }))
	} else {
		logger.error(error)
	}
	process.exit(EXIT_CODES.ERROR)
})
