import type { PlatformId } from "./utils"

export const DNSMASQ_PORT = 5353
export const CADDY_PORT = 8443

export const DNSMASQ_INSTALL_COMMANDS = {
	arch: "sudo pacman -S --noconfirm dnsmasq",
	centos: "sudo yum install -y dnsmasq",
	darwin: "brew install dnsmasq",
	debian: "sudo apt-get install -y dnsmasq",
	fedora: "sudo dnf install -y dnsmasq",
	manjaro: "sudo pacman -S --noconfirm dnsmasq",
	rhel: "sudo yum install -y dnsmasq",
	ubuntu: "sudo apt-get install -y dnsmasq"
} as Record<PlatformId, string>

export const DNSMASQ_CONFIG = `
address=/local/127.0.0.1
listen-address=127.0.0.1
cache-size=10000
bogus-priv
no-resolv
log-dhcp
log-queries
domain-needed
server=1.1.1.1
server=8.8.8.8
`

export const DNSMASQ_CONFIG_PATHS = {
	arch: "/etc/dnsmasq.conf",
	centos: "/etc/dnsmasq.conf",
	darwin: "/opt/homebrew/etc/dnsmasq.conf",
	debian: "/etc/dnsmasq.conf",
	fedora: "/etc/dnsmasq.conf",
	manjaro: "/etc/dnsmasq.conf",
	rhel: "/etc/dnsmasq.conf",
	ubuntu: "/etc/dnsmasq.conf"
} as Record<PlatformId, string>

export const CADDY_INSTALL_COMMANDS = {
	arch: "sudo pacman -S --noconfirm caddy",
	centos: "sudo yum install -y caddy",
	darwin: "brew install caddy",
	debian: "sudo apt-get install -y caddy",
	fedora: "sudo dnf install -y caddy",
	manjaro: "sudo pacman -S --noconfirm caddy",
	rhel: "sudo yum install -y caddy",
	ubuntu: "sudo apt-get install -y caddy"
} as Record<PlatformId, string>

export const CADDY_CONFIG_PATHS = {
	arch: "/etc/caddy/Caddyfile",
	centos: "/etc/caddy/Caddyfile",
	debian: "/etc/caddy/Caddyfile",
	fedora: "/etc/caddy/Caddyfile",
	manjaro: "/etc/caddy/Caddyfile",
	rhel: "/etc/caddy/Caddyfile",
	ubuntu: "/etc/caddy/Caddyfile"
} as Record<PlatformId, string>
