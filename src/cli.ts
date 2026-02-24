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
import { cleanup, LOCKFILE, logger } from "#/utils"
import { EXIT_CODES } from "#/utils/errors"

let isShuttingDown = false
async function handleGracefulShutdown(signal: NodeJS.Signals) {
	if (isShuttingDown) return
	isShuttingDown = true

	try {
		logger.info(`\nReceived ${signal}, shutting down gracefully...`)
		await stop(null, { verbose: true })
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

export type Arguments = {
	verbose: boolean
}
type CommandProgram = Command & {
	context: {
		verbose: boolean
		jsonLog: boolean
	}
}
const program = new Command() as unknown as CommandProgram

function getOptions() {
	const options = program.opts()
	const jsonLog = (options as { json?: boolean }).json ?? false
	const verbose = !jsonLog
	return { jsonLog, verbose }
}

program
	.name("kiset")
	.description("CLI for managing kiset")
	.version("1.0.0")
	.option("--json", "Output in JSON format", false)
	.exitOverride((err) => {
		if (err.code === "commander.help" || err.code === "commander.version") {
			process.exit(EXIT_CODES.SUCCESS)
		}
		process.exit(EXIT_CODES.USAGE)
	})

const service = program.command("service").description("Manage kiset services")

service
	.command("start")
	.description("Start the service")
	.option("--foreground", "Run in foreground mode", false)
	.action(async (options) => {
		const { jsonLog, verbose } = getOptions()
		const detached = !options.foreground
		const result = await start({ detached }, { verbose })
		if (jsonLog) console.log(JSON.stringify(result))
		process.exit(result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR)
	})

service
	.command("stop")
	.description("Stop the service")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const result = await stop(null, { verbose })
		if (jsonLog) console.log(JSON.stringify(result))
	})

service
	.command("status")
	.description("Show service status")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const results = await status(null, { verbose })
		if (jsonLog) console.log(JSON.stringify(results))
	})

service
	.command("logs")
	.description("Show logs from services")
	.argument("[service]", "Service name (caddy)")
	.option("--follow", "Stream logs in real-time", false)
	.option("--limit <n>", "Number of log lines to show", "50")
	.action(async (service, options) => {
		const follow = options.follow ?? false
		const limit = Number.parseInt(options.limit, 10) || 50
		const names = service === "caddy" ? "caddy" : ""
		await logs({ follow, limit, names })
	})

program
	.command("unlock")
	.description("Forcefully release the service lock")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const result = await LOCKFILE.UNSAFE_unlock({ verbose })
		if (jsonLog) {
			const status = result ? "unlocked" : "failed"
			const exitCode = result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR
			console.log(JSON.stringify({ exitCode, status }))
		}
	})

program
	.command("trust")
	.description("Trust the local Caddy certificate (for HTTPS)")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const result = await trust(null, { verbose })
		if (jsonLog) {
			const status = result ? "unlocked" : "failed"
			const exitCode = result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR
			console.log(JSON.stringify({ exitCode, status }))
		}
	})

program
	.command("revoke-trust")
	.description("Revoke trust for the local Caddy certificate (for HTTPS)")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const result = await revoke_trust(null, { verbose })
		if (jsonLog) {
			const status = result ? "unlocked" : "failed"
			const exitCode = result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR
			console.log(JSON.stringify({ exitCode, status }))
		}
	})

program
	.command("autostart")
	.description("Enable autostart for the service")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const result = await autostart(null, { verbose })
		if (jsonLog) {
			const status = result ? "enabled" : "failed"
			const exitCode = result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR
			console.log(JSON.stringify({ exitCode, status }))
		}
	})

program
	.command("revoke-autostart")
	.description("Disable autostart for the service")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const result = await revoke_autostart(null, { verbose })
		if (jsonLog) {
			const status = result ? "disabled" : "failed"
			const exitCode = result ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR
			console.log(JSON.stringify({ exitCode, status }))
		}
	})

program
	.command("list")
	.argument("[program]", "Program name to list ports for (optional)")
	.description("List port assignments")
	.action(async () => {
		const { jsonLog, verbose } = getOptions()
		const name = "maitri-global" // TODO: ANALYZE
		const result = await list({ name }, { verbose })
		if (jsonLog) {
			console.log(JSON.stringify(result))
		}
	})

program
	.command("run")
	.argument("<command>", "Command to execute")
	.argument("[args...]", "Arguments to pass to the command")
	.description(
		"Execute a command after validating config and checking service status"
	)
	.action(async (command, args) => {
		const exitCode = await run({ args, command })
		process.exit(exitCode)
	})

program.parseAsync().catch((err: unknown) => {
	const error = err instanceof Error ? err.message : String(err)
	logger.error(error)
	process.exit(EXIT_CODES.ERROR)
})
