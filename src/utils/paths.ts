import { homedir } from "node:os"

export function getPaths() {
	const xdg_config = process.env["XDG_CONFIG_HOME"] ?? `${homedir()}/.config`
	const xdg_state = process.env["XDG_STATE_HOME"] || `${homedir()}/.local/state`

	const CONFIG_DIR = `${xdg_config}/kiset`
	const STATE_DIR = `${xdg_state}/kiset`

	return {
		ASSIGNMENTS_STATE: `${STATE_DIR}/assignments.json`,
		AUTOSTART_SERVICE_PATH: `/etc/systemd/system/${SERVICE_NAME}`,
		CADDY_CERT_PATH: `~/.local/share/caddy/pki/authorities/local/root.crt`,
		CADDY_CONFIG: `${CONFIG_DIR}/Caddyfile`,
		CADDY_STATE: `${STATE_DIR}/caddy.json`,
		CONFIG_DIR,
		GLOBAL_CONFIG: `${CONFIG_DIR}/kiset.config.json`,
		LOCKFILE: `${STATE_DIR}/kiset.lock`,
		LOGS_DIR: `${STATE_DIR}/logs`,
		STATE_DIR
	}
}

export const SERVICE_NAME = "kiset.service"
