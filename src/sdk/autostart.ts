import { userInfo } from "node:os"
import { $, write } from "bun"

import ora from "ora"

import type { Arguments } from "#/cli"
import { PATHS } from "#/utils"
import { SERVICE_NAME } from "#/utils/paths"

export async function autostart(_: null, { verbose }: Arguments) {
	const cwd = process.cwd()
	const user = userInfo().username
	const spinner = verbose ? ora().start() : null

	if (process.getuid?.() !== 0) {
		spinner?.fail("Run this script with sudo.")
		return false
	}

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

	spinner?.succeed("Service installed and enabled.")
	return true
}
