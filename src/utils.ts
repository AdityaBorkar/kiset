import { $ } from "bun";

export const SUPPORTED_PLATFORMS = [
	"darwin",
	"ubuntu",
	"debian",
	"fedora",
	"rhel",
	"centos",
	"arch",
	"manjaro",
] as const;

export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number];

export async function getPlatformId(): Promise<PlatformId> {
	const platform = process.platform;
	if (platform === "darwin") {
		return "darwin" as PlatformId;
	}
	if (platform === "linux") {
		const osRelease = await $`cat /etc/os-release`.text();
		const idMatch = osRelease.match(/^ID="?([^"\n]+)"?/m);
		const id = idMatch?.[1] as PlatformId;
		if (!id || !SUPPORTED_PLATFORMS.includes(id)) {
			throw new Error(`Unsupported platform: ${id}`);
		}
		return id;
	}
	throw new Error(`Unsupported platform: ${platform}`);
}

export function isInstalled(packageName: string) {
	return $`which ${packageName}`
		.quiet()
		.then(() => true)
		.catch(() => false);
}

export async function install({
	label,
	command,
}: {
	label: string;
	command: string;
}) {
	console.log(`Installing ${label} with command: ${command}`);
	$`${command}`
		.then(() => console.log(`${label} installed successfully!`))
		.catch((error) => console.error(`Failed to install ${label}: ${error}`));
}
