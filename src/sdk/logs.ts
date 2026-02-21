import { file } from "bun"

import { getLocalportLogsDir } from "../utils"

export interface LogsOptions {
	follow?: boolean
	limit?: number
	service?: "dnsmasq" | "caddy"
}

async function readLogsWithPrefix(
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
		if (logPaths.length === 1) {
			const { path } = logPaths[0]
			const proc = Bun.spawn(["tail", "-f", path], {
				stderr: "inherit",
				stdout: "inherit"
			})
			await proc.exited
		} else {
			const dnsmasqLog = logPaths[0]
			const caddyLog = logPaths[1]
			const dnsmasqProc = Bun.spawn(["tail", "-f", dnsmasqLog.path], {
				stderr: "inherit",
				stdout: "pipe"
			})
			const caddyProc = Bun.spawn(["tail", "-f", caddyLog.path], {
				stderr: "inherit",
				stdout: "pipe"
			})

			const dnsmasqStdout = dnsmasqProc.stdout
			const caddyStdout = caddyProc.stdout

			if (!dnsmasqStdout || !caddyStdout) {
				await Promise.all([dnsmasqProc.exited, caddyProc.exited])
				return
			}

			const dnsmasqReader = dnsmasqStdout.getReader()
			const caddyReader = caddyStdout.getReader()
			const decoder = new TextDecoder()

			try {
				while (true) {
					const [
						{ done: dDone, value: dValue },
						{ done: cDone, value: cValue }
					] = await Promise.all([dnsmasqReader.read(), caddyReader.read()])

					if (dDone && cDone) break

					if (!dDone && dValue) {
						const text = decoder.decode(dValue, { stream: true })
						for (const line of text.split("\n")) {
							if (line) console.log(`[dnsmasq] ${line}`)
						}
					}

					if (!cDone && cValue) {
						const text = decoder.decode(cValue, { stream: true })
						for (const line of text.split("\n")) {
							if (line) console.log(`[caddy] ${line}`)
						}
					}
				}
			} finally {
				dnsmasqReader.releaseLock()
				caddyReader.releaseLock()
				await Promise.all([dnsmasqProc.exited, caddyProc.exited])
			}
		}
	} else {
		if (logPaths.length === 1) {
			const { path } = logPaths[0]
			const proc = Bun.spawn(["tail", "-n", `${limit}`, path], {
				stderr: "inherit",
				stdout: "inherit"
			})
			await proc.exited
		} else {
			const dnsmasqLog = logPaths[0]
			const caddyLog = logPaths[1]
			await readLogsWithPrefix(dnsmasqLog.path, "[dnsmasq]", limit)
			await readLogsWithPrefix(caddyLog.path, "[caddy]", limit)
		}
	}
}
