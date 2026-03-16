import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

interface AskTextOptions {
  label: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
}

interface SelectChoice {
  label: string;
  value: string;
}

interface AskSelectOptions {
  label: string;
  choices: SelectChoice[];
  defaultValue?: string;
}

interface AskConfirmOptions {
  label: string;
  defaultValue?: boolean;
}

export interface PromptSession {
  askText: (options: AskTextOptions) => Promise<string>;
  askSelect: (options: AskSelectOptions) => Promise<string>;
  askConfirm: (options: AskConfirmOptions) => Promise<boolean>;
  close: () => void;
}

function formatDefaultValue(defaultValue?: string): string {
  return defaultValue ? ` (${defaultValue})` : "";
}

function normalizeInput(value: string, defaultValue?: string): string {
  const trimmed = value.trim();
  return trimmed || defaultValue || "";
}

export function createPromptSession(): PromptSession {
  const readline = createInterface({ input, output });

  async function askText(options: AskTextOptions): Promise<string> {
    while (true) {
      const answer = await readline.question(`${options.label}${formatDefaultValue(options.defaultValue)}: `);
      const value = normalizeInput(answer, options.defaultValue);
      const errorMessage = options.validate?.(value);

      if (!errorMessage) {
        return value;
      }

      console.log(`[error] ${errorMessage}`);
    }
  }

  async function askSelect(options: AskSelectOptions): Promise<string> {
    const indexedChoices = options.choices.map((choice, index) => `${index + 1}. ${choice.label}`).join("\n");
    const defaultIndex = options.defaultValue
      ? options.choices.findIndex((choice) => choice.value === options.defaultValue) + 1
      : undefined;

    while (true) {
      console.log(indexedChoices);
      const answer = await readline.question(
        `${options.label}${defaultIndex ? ` (${defaultIndex})` : ""}: `
      );
      const normalized = normalizeInput(answer, defaultIndex ? String(defaultIndex) : undefined);
      const selectedIndex = Number(normalized);

      if (!Number.isInteger(selectedIndex) || selectedIndex < 1 || selectedIndex > options.choices.length) {
        console.log("[error] 请输入列表中的序号。");
        continue;
      }

      return options.choices[selectedIndex - 1].value;
    }
  }

  async function askConfirm(options: AskConfirmOptions): Promise<boolean> {
    const defaultHint = options.defaultValue === undefined ? "" : options.defaultValue ? " (Y/n)" : " (y/N)";

    while (true) {
      const answer = await readline.question(`${options.label}${defaultHint}: `);
      const normalized = answer.trim().toLowerCase();

      if (!normalized && options.defaultValue !== undefined) {
        return options.defaultValue;
      }

      if (normalized === "y" || normalized === "yes") {
        return true;
      }

      if (normalized === "n" || normalized === "no") {
        return false;
      }

      console.log("[error] 请输入 y 或 n。");
    }
  }

  return {
    askText,
    askSelect,
    askConfirm,
    close() {
      readline.close();
    }
  };
}
