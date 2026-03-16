interface ProjectMeta {
  name: string;
}

const meta: ProjectMeta = {
  name: "__PROJECT_NAME__"
};

console.log(`Hello from ${meta.name}!`);
