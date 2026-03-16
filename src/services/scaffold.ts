import path from "node:path";
import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";

import { writeTextFile } from "../utils/fs";

export type TemplateKind = "ts" | "js";

export interface ScaffoldAnswers {
  projectName: string;
  targetDirectory: string;
  template: TemplateKind;
  includeReadme: boolean;
  includeGitignore: boolean;
}

export interface ScaffoldResult {
  targetPath: string;
  files: string[];
}

interface TemplateFile {
  relativePath: string;
  content: string;
}

function createPackageJson(answers: ScaffoldAnswers): string {
  const scripts =
    answers.template === "ts"
      ? {
          build: "tsc -p tsconfig.json",
          start: "node dist/index.js"
        }
      : {
          start: "node src/index.js"
        };

  return `${JSON.stringify(
    {
      name: answers.projectName,
      version: "1.0.0",
      private: true,
      scripts
    },
    null,
    2
  )}\n`;
}

function createEntryFile(answers: ScaffoldAnswers): TemplateFile {
  if (answers.template === "ts") {
    return {
      relativePath: "src/index.ts",
      content: [
        "interface ProjectMeta {",
        "  name: string;",
        "}",
        "",
        "const meta: ProjectMeta = {",
        `  name: ${JSON.stringify(answers.projectName)}`,
        "};",
        "",
        'console.log(`Hello from ${meta.name}!`);',
        ""
      ].join("\n")
    };
  }

  return {
    relativePath: "src/index.js",
    content: [
      `const projectName = ${JSON.stringify(answers.projectName)};`,
      "",
      'console.log(`Hello from ${projectName}!`);',
      ""
    ].join("\n")
  };
}

function createTsConfig(): TemplateFile {
  return {
    relativePath: "tsconfig.json",
    content: [
      "{",
      '  "compilerOptions": {',
      '    "target": "ES2020",',
      '    "module": "CommonJS",',
      '    "moduleResolution": "Node",',
      '    "rootDir": "src",',
      '    "outDir": "dist",',
      '    "strict": true,',
      '    "esModuleInterop": true',
      "  },",
      '  "include": ["src"]',
      "}",
      ""
    ].join("\n")
  };
}

function createReadme(answers: ScaffoldAnswers): TemplateFile {
  return {
    relativePath: "README.md",
    content: [
      `# ${answers.projectName}`,
      "",
      `由 learn-cli init 生成的 ${answers.template.toUpperCase()} 模板项目。`,
      "",
      "## 开始使用",
      "",
      "```bash",
      "npm install",
      answers.template === "ts" ? "npm run build" : "npm start",
      "```",
      ""
    ].join("\n")
  };
}

function createGitignore(answers: ScaffoldAnswers): TemplateFile {
  const lines = ["node_modules/"];
  if (answers.template === "ts") {
    lines.push("dist/");
  }
  lines.push("");

  return {
    relativePath: ".gitignore",
    content: lines.join("\n")
  };
}

function createTemplateFiles(answers: ScaffoldAnswers): TemplateFile[] {
  const files: TemplateFile[] = [
    { relativePath: "package.json", content: createPackageJson(answers) },
    createEntryFile(answers)
  ];

  if (answers.template === "ts") {
    files.push(createTsConfig());
  }

  if (answers.includeReadme) {
    files.push(createReadme(answers));
  }

  if (answers.includeGitignore) {
    files.push(createGitignore(answers));
  }

  return files;
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectoryEmpty(targetPath: string): Promise<boolean> {
  const entries = await readdir(targetPath);
  return entries.length === 0;
}

export async function generateScaffold(answers: ScaffoldAnswers): Promise<ScaffoldResult> {
  const targetPath = path.resolve(process.cwd(), answers.targetDirectory);
  const files = createTemplateFiles(answers);

  for (const file of files) {
    const filePath = path.join(targetPath, file.relativePath);
    await writeTextFile(filePath, file.content);
  }

  return {
    targetPath,
    files: files.map((file) => file.relativePath)
  };
}
