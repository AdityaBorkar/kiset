import type { Platform } from "."

// export const DNSMASQ_INSTALL_COMMANDS = {
// 	arch: "sudo pacman -S --noconfirm dnsmasq",
// 	centos: "sudo yum install -y dnsmasq",
// 	darwin: "brew install dnsmasq",
// 	debian: "sudo apt-get install -y dnsmasq",
// 	fedora: "sudo dnf install -y dnsmasq",
// 	manjaro: "sudo pacman -S --noconfirm dnsmasq",
// 	rhel: "sudo yum install -y dnsmasq",
// 	ubuntu: "sudo apt-get install -y dnsmasq"
// } as Record<Platform, string>

// export const DNSMASQ_CONFIG = ({
// 	hostname,
// 	port
// }: {
// 	hostname: string
// 	port: number | string
// }) => `
// address=/local/${hostname}
// listen-address=${hostname}
// port=${port}
// cache-size=10000
// bogus-priv
// no-resolv
// log-dhcp
// log-queries
// domain-needed
// server=1.1.1.1
// server=8.8.8.8
// keep-in-foreground`

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

export const getCaddyConfig = ({
	hostname,
	port,
	https
}: {
	https: boolean
	hostname: string
	port: number | string
}) => {
	const url = `${https ? "https" : "http"}://${hostname}:${port}`
	return `{
	admin 127.0.0.1:2019
}

localhost:${port} {
// TODO: Show a overall dashboard using React+Bun
	# root * /usr/share/caddy
	respond "kiset is working! Use custom .local domains by setting DNS to ${url}"
	# reverse_proxy localhost:8080
}

uma.localhost:${port} {
	# root * /usr/share/caddy
	respond "kiset is working! Use custom .local domains by setting DNS to ${url}"
	# reverse_proxy localhost:8080
}

maitri-global.localhost:${port} {
	reverse_proxy localhost:3000
}

maitri-global.local:${port} {
	reverse_proxy localhost:3000
}
`
}
