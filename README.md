# TypeScript CLI 学习示例

这是一个适合入门和拆解原理的 TypeScript CLI 项目。

它故意不依赖 `commander`、`yargs` 这类成熟框架，而是自己实现了一个最小命令解析器。这样你既能学会如何做一个可用的 CLI，也能看见 CLI 的底层骨架到底是什么。

## 你会学到什么

- CLI 程序从 `node` 进程启动后如何拿到命令行参数
- 子命令、位置参数、选项参数是如何被解析的
- 如何把 CLI 功能拆成命令层、解析层、工具层、存储层
- 如何读写文件，让 CLI 具备“有状态能力”
- TypeScript 如何编译为 Node 可执行的 JavaScript
- `bin` 字段、shebang、`npm link` 背后的基本工作方式

## 阅读顺序

1. 先看 `docs/learning-guide.md`
2. 再看入口文件 `src/index.ts`
3. 然后看解析器 `src/core/parser.ts`
4. 再分别看命令实现目录 `src/commands/`
5. 再看逐文件讲解 `docs/source-walkthrough.md`
6. 最后看 `docs/principles.md`

## 教学文档

- `docs/learning-guide.md`：学习路径和阅读顺序
- `docs/source-walkthrough.md`：逐文件源码讲解，适合边看边学
- `docs/principles.md`：CLI 构建原理、运行原理、底层机制

## 项目结构

```text
ts-cli/
  docs/
    learning-guide.md
    source-walkthrough.md
    principles.md
  src/
    commands/
      greet.ts
      help.ts
      json-pretty.ts
      note.ts
      sum.ts
    core/
      parser.ts
      types.ts
    services/
      note-store.ts
    utils/
      format.ts
      fs.ts
    index.ts
  package.json
  tsconfig.json
```

## 快速开始

```bash
npm install
npm run build
node dist/index.js help
```

也可以直接运行具体命令：

```bash
node dist/index.js greet Alice --times 2 --upper
node dist/index.js sum 1 2 3 4
node dist/index.js json package.json --indent 4
node dist/index.js note add "学习 CLI"
node dist/index.js note list
```

## 示例功能

### 1. `greet`

演示字符串参数、布尔选项、带值选项。

```bash
node dist/index.js greet Alice --times 2 --upper
```

### 2. `sum`

演示多位置参数、数值校验、错误提示。

```bash
node dist/index.js sum 10 20 30
```

### 3. `json`

演示文件读取、JSON 解析、格式化输出。

```bash
node dist/index.js json package.json --indent 2
```

### 4. `note`

演示本地持久化存储。

```bash
node dist/index.js note add "第一条笔记"
node dist/index.js note list
```

## 学习建议

- 第一轮：先跑命令，观察现象
- 第二轮：从 `src/index.ts` 顺着调用链看进去
- 第三轮：自己加一个新命令，比如 `time` 或 `hash`
- 第四轮：把自定义解析器替换成 `commander`，对比开发体验

## 延伸练习

- 给 `note` 增加 `remove` 命令
- 给 `sum` 增加 `--avg` 选项
- 给 `json` 增加输出到文件的能力
- 增加彩色输出与交互输入
- 改造成真正发布到 npm 的 CLI
