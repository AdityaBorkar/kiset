import * as path from "node:path"
import { file } from "bun"

import { LocalportConfig, type LocalportSchema } from "../config"
import { logger } from "../utils/logger"
import { status } from "./status"

async function loadConfig(): Promise<LocalportSchema> {
	const configPath = path.join(process.cwd(), "localport.config.ts")

	const configFile = file(configPath)
	if (!(await configFile.exists())) {
		throw new Error(
			`Config file not found at ${configPath}. Please create localport.config.ts in the current directory.`
		)
	}

	try {
		const module = await import(configPath)
		const config = module.default
		if (!config) {
			throw new Error("Config file must export a default configuration object.")
		}
		const validatedConfig = LocalportConfig(config)

		if (
			typeof validatedConfig === "object" &&
			validatedConfig !== null &&
			"summary" in validatedConfig
		) {
			const errors = validatedConfig as { summary: string }
			throw new Error(`Config validation failed: ${errors.summary}`)
		}

		return validatedConfig as LocalportSchema
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Config file not found")
		) {
			throw error
		}

		if (error instanceof Error) {
			throw new Error(`Failed to load config: ${error.message}`)
		}

		throw new Error("Failed to load config: Unknown error")
	}
}

async function runCommand(command: string, args: string[]): Promise<number> {
	const proc = Bun.spawn([command, ...args], {
		stderr: "inherit",
		stdin: "inherit",
		stdout: "inherit"
	})

	await proc.exited
	return proc.exitCode ?? 1
}

export async function executeCommand(
	command: string,
	args: string[]
): Promise<number> {
	logger.info("Loading configuration...")
	await loadConfig()

	logger.info("Checking service status...")
	const statusResults = await status(false)

	const allRunning = statusResults.every((service) => service.running)

	if (!allRunning) {
		const stoppedServices = statusResults
			.filter((service) => !service.running)
			.map((service) => service.name)
			.join(", ")

		throw new Error(
			`Localport services not running: ${stoppedServices}. Run \`localport start\` first.`
		)
	}

	logger.info(`Executing: ${command} ${args.join(" ")}`)
	return await runCommand(command, args)
}
