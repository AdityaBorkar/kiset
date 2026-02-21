import { homedir } from "node:os"

export function getPaths() {
	// biome-ignore lint/complexity/useLiteralKeys: <-- Required for TypeScript index signature
	const xdg_config = process.env["XDG_CONFIG_HOME"] ?? `${homedir()}/.config`
	// biome-ignore lint/complexity/useLiteralKeys: <-- Required for TypeScript index signature
	const xdg_state = process.env["XDG_STATE_HOME"] || `${homedir()}/.local/state`

	const config = `${xdg_config}/localport`
	const state = `${xdg_state}/localport`

	return {
		caddy_config: `${config}/Caddyfile`,
		caddy_pid: `${state}/caddy.pid`,
		caddy_state: `${state}/caddy.json`,
		config,
		dnsmasq_config: `${config}/dnsmasq.conf`,
		dnsmasq_pid: `${state}/dnsmasq.pid`,
		dnsmasq_state: `${state}/dnsmasq.json`,
		global_config: `${config}/localport.json`,
		logs: `${xdg_state}/localport/logs`,
		ports: `${config}/ports`,
		state
	}
}
