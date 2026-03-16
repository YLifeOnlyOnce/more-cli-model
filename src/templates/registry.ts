export interface TemplateDefinition {
  name: string;
  label: string;
  description: string;
  directoryName: string;
}

export const templateRegistry: TemplateDefinition[] = [
  {
    name: "vanilla-ts",
    label: "Vanilla TypeScript",
    description: "最小 TypeScript 模板，包含 tsconfig 和构建脚本",
    directoryName: "vanilla-ts"
  },
  {
    name: "vanilla-js",
    label: "Vanilla JavaScript",
    description: "最小 JavaScript 模板，适合先理解目录复制流程",
    directoryName: "vanilla-js"
  }
];

export function listTemplates(): TemplateDefinition[] {
  return templateRegistry;
}

export function getTemplateByName(templateName: string): TemplateDefinition {
  const template = templateRegistry.find((item) => item.name === templateName);

  if (!template) {
    throw new Error(`未知模板: ${templateName}`);
  }

  return template;
}
