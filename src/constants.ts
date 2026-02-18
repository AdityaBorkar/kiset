import type { PlatformId } from "./utils";

export const DNSMASQ_INSTALL_COMMANDS = {
	darwin: "brew install dnsmasq",
	ubuntu: "sudo apt-get install -y dnsmasq",
	debian: "sudo apt-get install -y dnsmasq",
	fedora: "sudo dnf install -y dnsmasq",
	rhel: "sudo yum install -y dnsmasq",
	centos: "sudo yum install -y dnsmasq",
	arch: "sudo pacman -S --noconfirm dnsmasq",
	manjaro: "sudo pacman -S --noconfirm dnsmasq",
} as Record<PlatformId, string>;

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
`;

export const DNSMASQ_CONFIG_PATHS = {
	darwin: "/opt/homebrew/etc/dnsmasq.conf",
	ubuntu: "/etc/dnsmasq.conf",
	debian: "/etc/dnsmasq.conf",
	fedora: "/etc/dnsmasq.conf",
	rhel: "/etc/dnsmasq.conf",
	centos: "/etc/dnsmasq.conf",
	arch: "/etc/dnsmasq.conf",
	manjaro: "/etc/dnsmasq.conf",
} as Record<PlatformId, string>;

export const CADDY_INSTALL_COMMANDS = {
	ubuntu: "sudo apt-get install -y caddy",
	debian: "sudo apt-get install -y caddy",
	fedora: "sudo dnf install -y caddy",
	rhel: "sudo yum install -y caddy",
	centos: "sudo yum install -y caddy",
	arch: "sudo pacman -S --noconfirm caddy",
	manjaro: "sudo pacman -S --noconfirm caddy",
} as Record<PlatformId, string>;

export const CADDY_CONFIG_PATHS = {
	ubuntu: "/etc/caddy/Caddyfile",
	debian: "/etc/caddy/Caddyfile",
	fedora: "/etc/caddy/Caddyfile",
	rhel: "/etc/caddy/Caddyfile",
	centos: "/etc/caddy/Caddyfile",
	arch: "/etc/caddy/Caddyfile",
	manjaro: "/etc/caddy/Caddyfile",
} as Record<PlatformId, string>;
