import { $ } from "bun"

import ora from "ora"

import { logger, PATHS } from "#/utils"
import { getServerStatus } from "#/utils/caddy"

export async function trust() {
	const spinner = ora().start()

	spinner.text = "Checking 'caddy' status..."
	const status = await getServerStatus()
	if (status !== "running") {
		if (spinner) {
			spinner.fail(`'caddy' is not running.`)
			logger.error("Run `kiset service start` to start the services.")
		}
		return false
	}

	spinner.text = "Trusting certificate with 'caddy'..."
	await $`sudo caddy trust`

	spinner.text = "Copying certificate to current directory..."
	await $`cp ${PATHS.CADDY_CERT_PATH} .`.cwd(process.cwd())

	spinner.succeed(
		"Certificate trusted and copied to current directory successfully."
	)
	return true
}
