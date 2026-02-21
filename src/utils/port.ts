import { Socket } from "node:net"

export async function is_port_available(
	port: number,
	host: string
): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new Socket()

		socket.setTimeout(100)

		socket.on("connect", () => {
			socket.destroy()
			resolve(true)
		})

		socket.on("timeout", () => {
			socket.destroy()
			resolve(false)
		})

		socket.on("error", () => {
			socket.destroy()
			resolve(false)
		})

		socket.connect(port, host)
	})
}

export async function wait_for_port(
	port: number,
	host: string = "127.0.0.1",
	timeout: number = 30000
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		if (await is_port_available(port, host)) {
			return
		}
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	throw new Error(`Port ${port} did not become ready within ${timeout}ms`)
}
