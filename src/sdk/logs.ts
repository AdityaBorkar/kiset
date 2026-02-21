import { file } from "bun"

import { getLocalportLogsDir } from "#/utils"

export interface LogsOptions {
	follow?: boolean
	limit?: number
	service?: "dnsmasq" | "caddy"
}

async function tailWithPrefix(
	logPath: string,
	prefix: string,
	lines: number
): Promise<void> {
	const proc = Bun.spawn(["tail", "-n", `${lines}`, logPath], {
		stderr: "inherit",
		stdout: "pipe"
	})

	const stdout = proc.stdout
	if (!stdout) {
		await proc.exited
		return
	}

	const text = await new Response(stdout).text()
	for (const line of text.split("\n")) {
		if (line) console.log(`${prefix} ${line}`)
	}

	await proc.exited
}

async function followLogs(
	paths: Array<{ name: string; path: string }>
): Promise<void> {
	const decoder = new TextDecoder()
	const procs = paths.map((log) =>
		Bun.spawn(["tail", "-f", log.path], { stderr: "inherit", stdout: "pipe" })
	)

	try {
		while (true) {
			const results = await Promise.all(
				procs.map(async (proc) => {
					const stdout = proc.stdout
					if (!stdout) return null
					const reader = stdout.getReader()
					const result = await reader.read()
					reader.releaseLock()
					return { proc, result }
				})
			)

			if (results.every((r) => r === null || r.result.done)) break

			for (let i = 0; i < results.length; i++) {
				const item = results[i]
				if (!item || item.result.done || !item.result.value) continue

				const text = decoder.decode(item.result.value, { stream: true })
				const prefix = `[${paths[i]?.name}]`
				for (const line of text.split("\n")) {
					if (line) console.log(`${prefix} ${line}`)
				}
			}
		}
	} finally {
		await Promise.all(procs.map((proc) => proc.exited))
	}
}

export async function logs(options?: LogsOptions): Promise<void> {
	const { service, follow = false, limit = 50 } = options ?? {}
	const logsDir = getLocalportLogsDir()

	const services = service ? [service] : ["dnsmasq", "caddy"]
	const logPaths = services.map((svc) => ({
		name: svc,
		path: `${logsDir}/${svc}.log`
	}))

	for (const { path } of logPaths) {
		if (!(await file(path).exists())) {
			throw new Error(`Log file not found: ${path}`)
		}
	}

	if (follow) {
		await followLogs(logPaths)
	} else if (logPaths.length === 1) {
		await Bun.spawn(["tail", "-n", `${limit}`, logPaths[0]?.path ?? ""], {
			stderr: "inherit",
			stdout: "inherit"
		}).exited
	} else {
		for (const item of logPaths) {
			await tailWithPrefix(item.path, `[${item.name}]`, limit)
		}
	}
}
