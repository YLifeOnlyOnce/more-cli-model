#!/usr/bin/env node

import { greetCommand } from "./commands/greet";
import { helpCommand } from "./commands/help";
import { initCommand } from "./commands/init";
import { jsonPrettyCommand } from "./commands/json-pretty";
import { noteCommand } from "./commands/note";
import { sumCommand } from "./commands/sum";
import { parseCommand, resolveCommandName } from "./core/parser";
import { CommandDefinition } from "./core/types";

const commands: CommandDefinition[] = [
  initCommand,
  greetCommand,
  sumCommand,
  jsonPrettyCommand,
  noteCommand,
  helpCommand
];

async function main(): Promise<void> {
  const rawArgv = process.argv.slice(2);
  console.log("Raw arguments:", rawArgv);

  try {
    const commandName = resolveCommandName(rawArgv, commands);
    const command = commands.find((item) => item.name === commandName);

    if (!command) {
      throw new Error(`命令未注册: ${commandName}`);
    }

    const parsed = parseCommand(rawArgv.slice(1), command);
    console.log("Parsed arguments:", parsed);
    const result = await command.run({
      rawArgv,
      parsed,
      commands
    });

    if (result) {
      console.log(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "发生未知错误";
    console.error(`[error] ${message}`);
    console.error("提示: 运行 `node dist/index.js help` 查看可用命令。\n");
    process.exitCode = 1;
  }
}

void main();
