import type { GlobalConfigSchemaType } from "#/utils/config"
import type { Platform } from "./utils"

export const CADDY_INSTALL_COMMANDS = {
	arch: "sudo pacman -S --noconfirm caddy",
	centos: "sudo yum install -y caddy",
	darwin: "brew install caddy",
	debian: "sudo apt-get install -y caddy",
	fedora: "sudo dnf install -y caddy",
	manjaro: "sudo pacman -S --noconfirm caddy",
	rhel: "sudo yum install -y caddy",
	ubuntu: "sudo apt-get install -y caddy"
} as Record<Platform, string>

export const DEFAULT_GLOBAL_CONFIG: GlobalConfigSchemaType = {
	server: {
		hostname: "localhost",
		https: true,
		port: 443,
		port_assignment: {
			deny: [],
			range: {
				end: 4999,
				start: 4000
			}
		}
	}
}
