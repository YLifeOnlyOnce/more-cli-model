import { ArgumentDefinition, CommandDefinition } from "../core/types";

function formatArgument(argument: ArgumentDefinition): string {
  if (!argument) {
    return "";
  }

  if (argument.variadic) {
    return argument.required ? `<${argument.name}...>` : `[${argument.name}...]`;
  }

  return argument.required ? `<${argument.name}>` : `[${argument.name}]`;
}

export function formatCommandUsage(command: CommandDefinition): string {
  const argumentText = (command.arguments ?? []).map(formatArgument).filter(Boolean).join(" ");
  return `learn-cli ${command.name}${argumentText ? ` ${argumentText}` : ""}`;
}

export function formatCommandHelp(command: CommandDefinition): string {
  const lines: string[] = [];

  lines.push(`命令: ${command.name}`);
  lines.push(`说明: ${command.description}`);
  lines.push(`用法: ${formatCommandUsage(command)}`);

  if ((command.arguments ?? []).length > 0) {
    lines.push("");
    lines.push("参数:");
    for (const argument of command.arguments ?? []) {
      lines.push(`  - ${argument.name}: ${argument.description}`);
    }
  }

  if ((command.options ?? []).length > 0) {
    lines.push("");
    lines.push("选项:");
    for (const option of command.options ?? []) {
      const aliasText = option.alias ? `, -${option.alias}` : "";
      lines.push(`  - --${option.name}${aliasText}: ${option.description}`);
    }
  }

  if ((command.examples ?? []).length > 0) {
    lines.push("");
    lines.push("示例:");
    for (const example of command.examples ?? []) {
      lines.push(`  - ${example}`);
    }
  }

  return lines.join("\n");
}

export function formatCommandList(commands: CommandDefinition[]): string {
  const lines: string[] = [];

  lines.push("可用命令:");
  for (const command of commands) {
    lines.push(`  - ${command.name}: ${command.description}`);
  }
  lines.push("");
  lines.push("运行 `learn-cli help` 或 `node dist/index.js help` 查看帮助。");

  return lines.join("\n");
}
