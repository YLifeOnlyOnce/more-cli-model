import path from "node:path";

import { CommandDefinition } from "../core/types";
import { readTextFile } from "../utils/fs";

export const jsonPrettyCommand: CommandDefinition = {
  name: "json",
  description: "读取并美化输出 JSON 文件",
  arguments: [
    {
      name: "file",
      description: "JSON 文件路径",
      required: true
    }
  ],
  options: [
    {
      name: "indent",
      alias: "i",
      description: "缩进空格数",
      type: "number",
      defaultValue: 2
    }
  ],
  examples: [
    "node dist/index.js json package.json",
    "node dist/index.js json package.json --indent 4"
  ],
  async run(context) {
    const [filePath] = context.parsed.args;
    const indent = Number(context.parsed.options.indent ?? 2);
    const resolvedPath = path.resolve(process.cwd(), filePath);

    let content: string;
    try {
      content = await readTextFile(resolvedPath);
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      throw new Error(`读取文件失败: ${typedError.message}`);
    }

    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, indent);
    } catch (error) {
      const typedError = error as Error;
      throw new Error(`JSON 解析失败: ${typedError.message}`);
    }
  }
};
