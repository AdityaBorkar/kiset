import { Command } from "commander";
import { start } from "./sdk/start";
import { stop } from "./sdk/stop";

const program = new Command();

program
	.name("localport")
	.description("CLI for managing localport")
	.version("1.0.0");

program
	.command("start")
	.description("Start the service")
	.action(() => {
		start();
	});

program
	.command("stop")
	.description("Stop the service")
	.action(() => {
		stop();
	});

program.parse();
