export type OptionType = "boolean" | "string" | "number";

export interface ArgumentDefinition {
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
}

export interface OptionDefinition {
  name: string;
  alias?: string;
  description: string;
  type: OptionType;
  required?: boolean;
  defaultValue?: string | number | boolean;
}

export interface ParsedCommand {
  commandName: string;
  args: string[];
  options: Record<string, string | number | boolean>;
}

export interface CommandContext {
  rawArgv: string[];
  parsed: ParsedCommand;
  commands: CommandDefinition[];
}

export interface CommandDefinition {
  name: string;
  description: string;
  arguments?: ArgumentDefinition[];
  options?: OptionDefinition[];
  examples?: string[];
  run: (context: CommandContext) => Promise<string> | string;
}
