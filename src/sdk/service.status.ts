import { file } from "bun"

import ora from "ora"

import type { Arguments } from "#/cli"
import { PATHS } from "#/constants"
import { isRunningProcess } from "#/utils"

interface ServiceStatus {
	error?: string | undefined
	healthy?: boolean
	name: string
	running: boolean
	state:
		| undefined
		| {
				pid?: string
				port?: number
				hostname?: string
		  }
}

export async function status(_: null, { verbose }: Arguments) {
	// Initialization
	const results: Record<string, ServiceStatus> = {}

	// Check `caddy` status
	const caddy = (async () => {
		const name = "caddy"
		const spinner = verbose ? ora().start() : null

		if (spinner) spinner.text = `Checking 'caddy' status...`
		const stateFile = file(PATHS.CADDY_STATE)
		if (!(await stateFile.exists())) {
			spinner?.fail(`'caddy' is not running.`)
			return { name, running: false, state: undefined }
		}

		const state = await stateFile.json()
		const { pid, hostname, port } = state
		const url = `http://${hostname}:${port}`
		const running = await isRunningProcess(pid)
		if (running) {
			spinner?.succeed(`'caddy' is running on ${url} (pid: ${pid})`)
		} else {
			spinner?.fail(`'caddy' is not running.`)
		}
		return { name, running, state }
	})()
	results["caddy"] = await caddy

	return results
}

// TODO: CHECK
// systemctl status kiset.service
// ls /etc/ssl/certs | grep your-cert
// powershell.exe -Command "Get-ChildItem Cert:\\LocalMachine\\Root | Where-Object { \$_.Subject -like '*YourName*' }"
