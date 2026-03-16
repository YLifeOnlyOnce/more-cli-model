import { CommandDefinition } from "../core/types";

export const sumCommand: CommandDefinition = {
  name: "sum",
  description: "对多个数字求和",
  arguments: [
    {
      name: "numbers",
      description: "要相加的数字列表",
      required: true,
      variadic: true
    }
  ],
  options: [
    {
      name: "average",
      alias: "a",
      description: "同时输出平均值",
      type: "boolean",
      defaultValue: false
    }
  ],
  examples: [
    "node dist/index.js sum 1 2 3 4",
    "node dist/index.js sum 1 2 3 4 --average"
  ],
  run(context) {
    const rawNumbers = context.parsed.args;
    const numbers = rawNumbers.map((value) => {
      const numberValue = Number(value);
      if (Number.isNaN(numberValue)) {
        throw new Error(`无效数字: ${value}`);
      }
      return numberValue;
    });

    const total = numbers.reduce((current, item) => current + item, 0);
    if (context.parsed.options.average) {
      return `sum=${total}\naverage=${total / numbers.length}`;
    }

    return `sum=${total}`;
  }
};
