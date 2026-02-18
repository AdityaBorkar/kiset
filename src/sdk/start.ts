import { isInstalled, getPlatformId, install } from "../utils";
import {
	CADDY_CONFIG_PATHS,
	CADDY_INSTALL_COMMANDS,
	DNSMASQ_CONFIG,
	DNSMASQ_CONFIG_PATHS,
	DNSMASQ_INSTALL_COMMANDS,
} from "../constants";
import { $, file, write } from "bun";

export async function start() {
	// Get platform id
	const platformId = await getPlatformId();

	// Install dnsmasq
	console.log("Checking for dnsmasq installation...");
	if (await isInstalled("dnsmasq")) {
		console.log("dnsmasq is already installed.");
	} else {
		const command = DNSMASQ_INSTALL_COMMANDS[platformId];
		await install({ label: "dnsmasq", command });
	}

	// Configure dnsmasq
	const dnsmasq_conf_path = DNSMASQ_CONFIG_PATHS[platformId];
	const dnsmasq_conf = file(dnsmasq_conf_path);
	if (await dnsmasq_conf.exists()) {
		console.log(`Configuration file already exists at ${dnsmasq_conf_path}`);
		// TODO: Verify if required properties are present
	} else {
		console.log(`Creating dnsmasq configuration file at ${dnsmasq_conf_path}`);
		await write(dnsmasq_conf_path, DNSMASQ_CONFIG);
		console.log("Configuration file created successfully.");
	}

	// Restart dnsmasq
	await $`sudo systemctl restart dnsmasq`;
	await $`nameserver 127.0.0.1`;

	// Install caddy
	console.log("Checking for caddy installation...");
	if (await isInstalled("caddy")) {
		console.log("caddy is already installed.");
	} else {
		const command = CADDY_INSTALL_COMMANDS[platformId];
		await install({ label: "caddy", command });
	}

	// Configure caddy
	const caddy_conf_path = CADDY_CONFIG_PATHS[platformId];
	const caddy_conf = file(caddy_conf_path);
	if (await caddy_conf.exists()) {
		console.log(`Configuration file already exists at ${caddy_conf_path}`);
		// TODO: Verify if required properties are present
	} else {
		console.log(`Creating caddy configuration file at ${caddy_conf_path}`);
		// await write(caddyConfigPath, CADDY_CONFIG);
		// api.local {
		//     reverse_proxy 127.0.0.1:3000
		// }
		// admin.local {
		//     reverse_proxy 127.0.0.1:4000
		// }
		console.log("Configuration file created successfully.");
	}

	// Restart caddy
	await $`sudo systemctl restart caddy`;

	// TODO: Automatic HTTPS
	// await $`caddy trust`;
	// cp /root/.local/share/caddy/pki/authorities/local/root.crt /mnt/c/Users/<your-user>/Downloads
	// Double click → Install → Trusted Root Certification Authorities

	// 127.0.0.1 db.local
}
