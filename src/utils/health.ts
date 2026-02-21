import { $ } from "bun"

export async function checkDnsHealth(dnsPort: number): Promise<{
	working: boolean
	error?: string
}> {
	try {
		const testDomain = "test.local"
		const result =
			await $`dig @127.0.0.1 -p ${dnsPort} +short ${testDomain}`.text()
		if (result.includes("127.0.0.1")) {
			return { working: true }
		}
		return {
			error: "DNS resolution returned unexpected result",
			working: false
		}
	} catch (error) {
		return { error: `DNS query failed: ${error}`, working: false }
	}
}

export async function checkHttpHealth(httpPort: number): Promise<{
	working: boolean
	error?: string
}> {
	try {
		const response = await fetch(`http://127.0.0.1:${httpPort}`, {
			method: "GET",
			signal: AbortSignal.timeout(5000)
		})
		if (response.ok) {
			return { working: true }
		}
		return { error: `HTTP returned status ${response.status}`, working: false }
	} catch (error) {
		return { error: `HTTP request failed: ${error}`, working: false }
	}
}
