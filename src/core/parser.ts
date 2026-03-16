import { CommandDefinition, OptionDefinition, ParsedCommand } from "./types";

function isOptionToken(token: string): boolean {
  return token.startsWith("-");
}

function normalizeOptionName(optionName: string): string {
  return optionName.replace(/^--?/, "");
}

function findOption(token: string, options: OptionDefinition[]): OptionDefinition | undefined {
  const normalized = normalizeOptionName(token);
  return options.find((option) => option.name === normalized || option.alias === normalized);
}

function coerceOptionValue(option: OptionDefinition, rawValue: string): string | number | boolean {
  if (option.type === "string") {
    return rawValue;
  }

  if (option.type === "number") {
    const value = Number(rawValue);
    if (Number.isNaN(value)) {
      throw new Error(`选项 --${option.name} 需要数字，但收到: ${rawValue}`);
    }
    return value;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`布尔选项 --${option.name} 不应该显式传值: ${rawValue}`);
}

export function parseCommand(argv: string[], command: CommandDefinition): ParsedCommand {
  const options = command.options ?? [];
  const parsedOptions: Record<string, string | number | boolean> = {};
  const parsedArgs: string[] = [];

  for (const option of options) {
    if (option.defaultValue !== undefined) {
      parsedOptions[option.name] = option.defaultValue;
    }
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!isOptionToken(token)) {
      parsedArgs.push(token);
      continue;
    }

    const option = findOption(token, options);
    if (!option) {
      throw new Error(`未知选项: ${token}`);
    }

    if (option.type === "boolean") {
      parsedOptions[option.name] = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || isOptionToken(nextValue)) {
      throw new Error(`选项 ${token} 缺少值`);
    }

    parsedOptions[option.name] = coerceOptionValue(option, nextValue);
    index += 1;
  }

  validateArguments(command, parsedArgs);
  validateRequiredOptions(command, parsedOptions);

  return {
    commandName: command.name,
    args: parsedArgs,
    options: parsedOptions
  };
}

function validateArguments(command: CommandDefinition, args: string[]): void {
  const definitions = command.arguments ?? [];
  const requiredDefinitions = definitions.filter((definition) => definition.required);
  const variadicDefinition = definitions.find((definition) => definition.variadic);

  if (args.length < requiredDefinitions.length) {
    throw new Error(`命令 ${command.name} 缺少必填参数`);
  }

  if (!variadicDefinition && args.length > definitions.length) {
    throw new Error(`命令 ${command.name} 收到多余参数: ${args.slice(definitions.length).join(" ")}`);
  }
}

function validateRequiredOptions(
  command: CommandDefinition,
  parsedOptions: Record<string, string | number | boolean>
): void {
  for (const option of command.options ?? []) {
    if (option.required && parsedOptions[option.name] === undefined) {
      throw new Error(`命令 ${command.name} 缺少必填选项 --${option.name}`);
    }
  }
}

export function resolveCommandName(argv: string[], commands: CommandDefinition[]): string {
  const requestedName = argv[0];

  if (!requestedName) {
    return "help";
  }

  const matched = commands.find((command) => command.name === requestedName);
  if (!matched) {
    throw new Error(`未知命令: ${requestedName}`);
  }

  return requestedName;
}
