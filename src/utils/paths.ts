import { homedir } from "node:os"

export function getPaths() {
	// biome-ignore lint/complexity/useLiteralKeys: <-- Required for TypeScript index signature
	const xdg_config = process.env["XDG_CONFIG_HOME"] ?? `${homedir()}/.config`
	// biome-ignore lint/complexity/useLiteralKeys: <-- Required for TypeScript index signature
	const xdg_state = process.env["XDG_STATE_HOME"] || `${homedir()}/.local/state`

	const CONFIG_DIR = `${xdg_config}/kiset`
	const STATE_DIR = `${xdg_state}/kiset`

	return {
		CADDY_CONFIG: `${CONFIG_DIR}/Caddyfile`,
		CADDY_STATE: `${STATE_DIR}/caddy.json`,
		CONFIG_DIR,
		// DNSMASQ_CONFIG: `${CONFIG}/dnsmasq.conf`,
		// DNSMASQ_STATE: `${STATES}/dnsmasq.json`,
		GLOBAL_CONFIG: `${CONFIG_DIR}/kiset.config.json`,
		LOCKFILE: `${STATE_DIR}/kiset.lock`,
		LOGS_DIR: `${STATE_DIR}/logs`,
		STATE_DIR
	}
}
