import { userInfo } from "node:os"
import { $, write } from "bun"

import { PATHS } from "#/utils"
import { SERVICE_NAME } from "#/utils/paths"

export async function autostart() {
	const user = userInfo().username
	const cwd = process.cwd()

	if (process.getuid?.() !== 0) {
		console.error("Run this script with sudo.")
		process.exit(1)
	}

	// TODO: Cross Platform Support

	const content = `[Unit]
Description=Proxy Service
After=network.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${cwd}
ExecStart=/usr/bin/env kiset service start
Restart=always
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
`
	write(PATHS.AUTOSTART_SERVICE_PATH, content)
	await $`sudo systemctl daemon-reload`
	await $`sudo systemctl enable ${SERVICE_NAME}`
	await $`sudo systemctl start ${SERVICE_NAME}`

	console.log("Service installed and enabled.")
}
