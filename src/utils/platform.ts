import { $ } from "bun"

export const SUPPORTED_PLATFORMS = [
	"darwin",
	"ubuntu",
	"debian",
	"fedora",
	"rhel",
	"centos",
	"arch",
	"manjaro"
] as const

export type Platform = (typeof SUPPORTED_PLATFORMS)[number]

export async function getPlatform(): Promise<Platform> {
	const platform = process.platform
	if (platform === "darwin") {
		return "darwin" as Platform
	}
	if (platform === "linux") {
		const osRelease = await $`cat /etc/os-release`.text()
		const idMatch = osRelease.match(/^ID="?([^"\n]+)"?/m)
		const id = idMatch?.[1] as Platform
		if (!id || !SUPPORTED_PLATFORMS.includes(id)) {
			throw new Error(`Unsupported platform: ${id}`)
		}
		return id
	}
	throw new Error(`Unsupported platform: ${platform}`)
}

export function isInstalled(packageName: string) {
	return $`which ${packageName}`
		.quiet()
		.then(() => true)
		.catch(() => false)
}
