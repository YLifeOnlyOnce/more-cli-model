import { CommandDefinition } from "../core/types";

export const greetCommand: CommandDefinition = {
  name: "greet",
  description: "向指定名字输出问候语",
  arguments: [
    {
      name: "name",
      description: "被问候的人名",
      required: true
    }
  ],
  options: [
    {
      name: "times",
      alias: "t",
      description: "重复输出次数",
      type: "number",
      defaultValue: 1
    },
    {
      name: "upper",
      alias: "u",
      description: "是否转为大写输出",
      type: "boolean",
      defaultValue: false
    }
  ],
  examples: [
    "node dist/index.js greet Alice",
    "node dist/index.js greet Alice --times 2 --upper"
  ],
  run(context) {
    const [name] = context.parsed.args;
    const times = Number(context.parsed.options.times ?? 1);
    const upper = Boolean(context.parsed.options.upper ?? false);

    if (times < 1) {
      throw new Error("--times 必须大于等于 1");
    }

    const lines = Array.from({ length: times }, (_, index) => `#${index + 1} Hello, ${name}!`);
    return upper ? lines.join("\n").toUpperCase() : lines.join("\n");
  }
};
