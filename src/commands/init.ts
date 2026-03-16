import path from "node:path";

import { CommandDefinition } from "../core/types";
import { generateScaffold, getAvailableTemplates, isDirectoryEmpty, pathExists } from "../services/scaffold";
import { createPromptSession } from "../utils/prompt";

function validateProjectName(value: string): string | undefined {
  if (!value.trim()) {
    return "项目名不能为空。";
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    return "项目名需以小写字母或数字开头，且只允许小写字母、数字和连字符。";
  }

  return undefined;
}

export const initCommand: CommandDefinition = {
  name: "init",
  description: "通过多轮问答复制模板目录并生成项目",
  examples: ["node dist/index.js init", "learn-cli init"],
  async run() {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error("init 需要在交互式终端中运行。");
    }

    const prompt = createPromptSession();

    try {
      console.log("将通过多轮提问生成一个模板项目。\n");
      const templates = getAvailableTemplates();

      const projectName = await prompt.askText({
        label: "项目名",
        defaultValue: "demo-app",
        validate: validateProjectName
      });
      const targetDirectory = await prompt.askText({
        label: "输出目录",
        defaultValue: projectName,
        validate(value) {
          if (!value.trim()) {
            return "输出目录不能为空。";
          }

          return undefined;
        }
      });
      const templateName = await prompt.askSelect({
        label: "选择模板",
        choices: templates.map((template) => ({
          label: `${template.label} - ${template.description}`,
          value: template.name
        })),
        defaultValue: templates[0]?.name
      });
      const includeReadme = await prompt.askConfirm({
        label: "是否生成 README.md",
        defaultValue: true
      });
      const includeGitignore = await prompt.askConfirm({
        label: "是否生成 .gitignore",
        defaultValue: true
      });

      const resolvedTargetPath = path.resolve(process.cwd(), targetDirectory);
      const exists = await pathExists(resolvedTargetPath);

      if (exists) {
        const empty = await isDirectoryEmpty(resolvedTargetPath);
        if (!empty) {
          const shouldContinue = await prompt.askConfirm({
            label: `目录 ${targetDirectory} 已存在且非空，是否继续写入`,
            defaultValue: false
          });

          if (!shouldContinue) {
            throw new Error("已取消生成。");
          }
        }
      }

      const result = await generateScaffold({
        projectName,
        targetDirectory,
        templateName,
        includeReadme,
        includeGitignore
      });

      return [
        "模板生成完成。",
        `输出目录: ${result.targetPath}`,
        "已创建文件:",
        ...result.files.map((file) => `- ${file}`)
      ].join("\n");
    } finally {
      prompt.close();
    }
  }
};
