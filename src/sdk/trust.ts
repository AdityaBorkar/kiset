import { createHash } from "node:crypto"
import { $, file } from "bun"

import ora from "ora"

import type { Arguments } from "#/cli"
import { caddy, getServerStatus } from "#/services/caddy"
import { logger, setFilePermissions } from "#/utils"

export async function trust(_: null, { verbose }: Arguments) {
	const spinner = verbose ? ora().start() : null

	if (process.getuid?.() !== 0) {
		spinner?.fail("Run this script with sudo.")
		return false
	}

	if (spinner) spinner.text = "Checking 'caddy' status..."
	const status = await getServerStatus()
	if (status !== "running") {
		if (spinner) {
			spinner.fail(`'caddy' is not running.`)
			logger.error("Run `kiset service start` to start the services.")
		}
		return false
	}

	if (spinner) spinner.text = "Getting certificate with 'caddy'..."
	const certificate = await caddy.cert.get()

	if (spinner) spinner.text = "Updating certificate stores..."
	const hash = createHash("sha256")
		.update(certificate.root_certificate, "utf-8")
		.digest("hex")

	const certFile = `/usr/local/share/ca-certificates/${certificate.root_common_name}_${hash}.crt`
	file(certFile).write(certificate.root_certificate)
	setFilePermissions(certFile, 0o644)
	await $`sudo update-ca-certificates`

	spinner?.succeed(
		"Certificate trusted and copied to current directory successfully."
	)

	const isWsl = true
	if (isWsl) {
		const path = await $`wslpath -w ${certFile}`.text()
		console.log(
			"Run Command in Powershell (with elevated permissions):\n",
			`certutil -addstore Root "${path.trim()}"`
		)
	}

	return true
}
