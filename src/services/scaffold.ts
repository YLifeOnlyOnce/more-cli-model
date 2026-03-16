import path from "node:path";
import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";

import { getTemplateByName, listTemplates, TemplateDefinition } from "../templates/registry";
import { listFilesRecursively, readTextFile, writeTextFile } from "../utils/fs";

export interface ScaffoldAnswers {
  projectName: string;
  targetDirectory: string;
  templateName: string;
  includeReadme: boolean;
  includeGitignore: boolean;
}

export interface ScaffoldResult {
  targetPath: string;
  files: string[];
}

const TEMPLATE_NAME_PLACEHOLDER = "__PROJECT_NAME__";

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

export function getAvailableTemplates(): TemplateDefinition[] {
  return listTemplates();
}

export async function generateScaffold(answers: ScaffoldAnswers): Promise<ScaffoldResult> {
  const targetPath = path.resolve(process.cwd(), answers.targetDirectory);
  const template = getTemplateByName(answers.templateName);
  const templateRoot = getTemplateRoot(template.directoryName);
  const templateFiles = await listFilesRecursively(templateRoot);
  const createdFiles: string[] = [];

  for (const relativePath of templateFiles) {
    if (!shouldIncludeTemplateFile(relativePath, answers)) {
      continue;
    }

    const sourcePath = path.join(templateRoot, relativePath);
    const targetRelativePath = normalizeTargetPath(relativePath);
    const targetFilePath = path.join(targetPath, targetRelativePath);
    const templateContent = await readTextFile(sourcePath);
    const renderedContent = renderTemplate(templateContent, answers);
    console.log(`Creating file: ${renderedContent}`);

    await writeTextFile(targetFilePath, renderedContent);
    createdFiles.push(targetRelativePath);
  }

  return {
    targetPath,
    files: createdFiles
  };
}

function getTemplateRoot(directoryName: string): string {
  return path.resolve(__dirname, "../../templates", directoryName);
}

function shouldIncludeTemplateFile(relativePath: string, answers: ScaffoldAnswers): boolean {
  if (relativePath === "README.md") {
    return answers.includeReadme;
  }

  if (relativePath === "_gitignore") {
    return answers.includeGitignore;
  }

  return true;
}

function normalizeTargetPath(relativePath: string): string {
  if (relativePath === "_gitignore") {
    return ".gitignore";
  }

  return relativePath;
}

function renderTemplate(content: string, answers: ScaffoldAnswers): string {
  return content.split(TEMPLATE_NAME_PLACEHOLDER).join(answers.projectName);
}
