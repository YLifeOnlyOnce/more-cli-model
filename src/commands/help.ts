import { CommandDefinition } from "../core/types";
import { formatCommandHelp, formatCommandList } from "../utils/format";

export const helpCommand: CommandDefinition = {
  name: "help",
  description: "查看所有命令或单个命令帮助",
  arguments: [
    {
      name: "command",
      description: "要查看的命令名",
      required: false
    }
  ],
  examples: [
    "node dist/index.js help",
    "node dist/index.js help greet"
  ],
  run(context) {
    const [targetCommandName] = context.parsed.args;

    if (!targetCommandName) {
      return formatCommandList(context.commands);
    }

    const targetCommand = context.commands.find((command) => command.name === targetCommandName);
    if (!targetCommand) {
      throw new Error(`找不到命令: ${targetCommandName}`);
    }

    return formatCommandHelp(targetCommand);
  }
};
