import { Command } from "commander"

import { start } from "./sdk/start"
import { status } from "./sdk/status"
import { stop } from "./sdk/stop"

const program = new Command()

program
	.name("localport")
	.description("CLI for managing localport")
	.version("1.0.0")

program
	.command("start")
	.description("Start the service")
	.option("--no-detached", "Run in foreground mode")
	.action((options) => {
		start(options.detached, true)
	})

program
	.command("stop")
	.description("Stop the service")
	.action(() => {
		stop(true)
	})

program
	.command("status")
	.description("Show service status")
	.action(() => {
		status(true)
	})

program.parse()
