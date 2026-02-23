import { $ } from "bun"

import { PATHS } from "#/utils"
import { SERVICE_NAME } from "#/utils/paths"

export async function revoke_autostart() {
	if (process.getuid?.() !== 0) {
		console.error("Run this script with sudo.")
		process.exit(1)
	}

	// TODO: Cross Platform Support

	await $`sudo systemctl disable ${SERVICE_NAME}`
	await $`sudo systemctl stop ${SERVICE_NAME}`
	await $`sudo rm ${PATHS.AUTOSTART_SERVICE_PATH}`
	await $`sudo systemctl daemon-reload`

	console.log("Service autostart disabled and removed.")
}
