import { $ } from "bun"

import ora from "ora"

import type { Arguments } from "#/cli"
import { PATHS } from "#/constants"
import { SERVICE_NAME } from "#/utils"

export async function revoke_autostart(_: null, { verbose }: Arguments) {
	const spinner = verbose ? ora().start() : undefined

	if (process.getuid?.() !== 0) {
		spinner?.fail("Run this script with sudo.")
		return false
	}

	if (spinner) spinner.text = "Disabling autostart for the service..."
	await $`sudo systemctl disable ${SERVICE_NAME}`
	await $`sudo systemctl stop ${SERVICE_NAME}`
	await $`sudo rm ${PATHS.AUTOSTART_SERVICE_PATH}`
	await $`sudo systemctl daemon-reload`

	spinner?.succeed("Service autostart disabled and removed.")
	return true
}
