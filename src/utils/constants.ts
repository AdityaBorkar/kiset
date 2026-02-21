import type { Platform } from "."

export const DNSMASQ_INSTALL_COMMANDS = {
	arch: "sudo pacman -S --noconfirm dnsmasq",
	centos: "sudo yum install -y dnsmasq",
	darwin: "brew install dnsmasq",
	debian: "sudo apt-get install -y dnsmasq",
	fedora: "sudo dnf install -y dnsmasq",
	manjaro: "sudo pacman -S --noconfirm dnsmasq",
	rhel: "sudo yum install -y dnsmasq",
	ubuntu: "sudo apt-get install -y dnsmasq"
} as Record<Platform, string>

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

export const HOSTNAME = "http://127.0.0.1" // TODO: MOVE TO CONFIG
export const DNSMASQ_PORT = 3355 // TODO: Move to config
export const CADDY_PORT = 3333 // TODO: Move to config

export const DNSMASQ_CONFIG = (hostname: string, _port: string) => `
address=/local/${hostname}
listen-address=${hostname}
cache-size=10000
bogus-priv
no-resolv
log-dhcp
log-queries
domain-needed
server=1.1.1.1
server=8.8.8.8
keep-in-foreground
` // port=${DNSMASQ_PORT}

export const CADDY_CONFIG = (hostname: string, port: string) => `
{
	admin 127.0.0.1:2519
}

http://localhost:${port} {
	respond "Localport is working! Use custom .local domains by setting DNS to ${hostname}:${port}"
}
`
