import { file } from "bun"

import { status } from "#/sdk/service.status"
import { logger, PATHS } from "#/utils"

export interface LogsOptions {
	follow?: boolean
	limit?: number
	names?: string
}

export async function logs(options?: LogsOptions): Promise<void> {
	const { names, follow = false, limit = 50 } = options ?? {}

	const services = names ? names.split(",") : ["caddy"]
	const statuses = await status(null, { verbose: false })

	for (const name of services) {
		const status = statuses[name]
		if (!status || !status.running) {
			logger.error(`Service '${name}' is not running.`)
			continue
		}

		const logPath = `${PATHS.LOGS_DIR}/${name}.log`
		if (!(await file(logPath).exists())) {
			logger.error(`Log file not found: ${logPath}`)
		}

		if (follow) {
			const decoder = new TextDecoder()
			const process = Bun.spawn(["tail", "-f", logPath], {
				stderr: "inherit",
				stdout: "pipe"
			})
			try {
				while (true) {
					// const stdout = process.stdout
					// if (!stdout) return null
					const reader = process.stdout.getReader()
					const result = await reader.read()
					reader.releaseLock()

					if (result.done || !result.value) continue
					const text = decoder.decode(result.value, { stream: true })
					for (const line of text.split("\n")) {
						if (line) console.log(`[${name}] ${line}`)
					}
				}
			} finally {
				await process.exited
			}
		} else {
			const process = Bun.spawn(["tail", "-n", limit.toString(), logPath], {
				stderr: "inherit",
				stdout: "pipe"
			})
			const stdout = process.stdout
			if (!stdout) {
				await process.exited
				return
			}
			const text = await new Response(stdout).text()
			for (const line of text.split("\n")) {
				if (line) console.log(`[${name}] ${line}`)
			}
			await process.exited
		}
	}
}
