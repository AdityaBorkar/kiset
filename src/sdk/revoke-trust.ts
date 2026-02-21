import { $ } from "bun"

export async function revoke_trust() {
	// sudo caddy trust
	const cert_path = `~/.local/share/caddy/pki/authorities/local/root.crt`
	await $`cp ${cert_path} .`.text()

	// Copy file to Desktop
	// WINDOWS: certutil -addstore -f ROOT "$env:USERPROFILE\OneDrive\Desktop\root.crt"
	// FIREFOX (WINDOWS): Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import `root.crt` → Check "Trust this CA to identify websites" → OK
}
