# 交互式 CLI 命令讲解：以 `init` 为例

这份文档专门讲当前项目里的多轮交互命令实现。

目标不是只告诉你“代码写了什么”，而是让你看完以后能自己模仿着写一个类似 Vite 脚手架的命令。

你会看到三层内容：

1. 这个命令的执行流程
2. Node 核心 API 在这里分别负责什么
3. 一份更适合学习的“最小实现思路”

## 一、先理解这类命令和普通命令有什么区别

前面的 `greet`、`sum`、`json` 都属于“一次性输入型”命令。

例如：

```bash
node dist/index.js greet Alice --times 2 --upper
```

它的特点是：

- 用户在一行里把信息全部给完
- 程序拿到参数后直接执行
- 中间不会继续向用户提问

而 `init` 不是这样。

它更像：

```bash
node dist/index.js init
```

程序启动后再继续问：

- 项目名是什么
- 输出目录是什么
- 选择 TypeScript 还是 JavaScript
- 要不要 README
- 要不要 `.gitignore`
- 如果目录已存在且非空，要不要继续

所以这类命令本质上是：

`启动命令 -> 进入问答循环 -> 收集答案 -> 执行生成`

这就是“多轮交互式 CLI”。

## 二、当前实现的文件分工

这个功能主要分成三部分：

### 1. [src/commands/init.ts](/abs/path/C:/ts-cli/src/commands/init.ts)

它负责“命令流程控制”。

也就是：

- 判断是不是在交互式终端里运行
- 按顺序发起提问
- 拿到所有答案
- 检查目标目录是否安全
- 调用模板生成逻辑
- 返回最终输出文本

你可以把它理解成“导演”。

### 2. [src/utils/prompt.ts](/abs/path/C:/ts-cli/src/utils/prompt.ts)

它负责“怎么问问题”。

这里封装了三种最常见的交互：

- `askText`：文本输入
- `askSelect`：列表选择
- `askConfirm`：确认题

你可以把它理解成“通用提问工具箱”。

### 3. [src/services/scaffold.ts](/abs/path/C:/ts-cli/src/services/scaffold.ts)

它负责“怎么生成文件”。

也就是：

- 根据答案决定生成哪些文件
- 拼出每个文件的内容
- 把文件写到目标目录

你可以把它理解成“模板工厂”。

这种拆法的好处是非常清楚：

- `init.ts` 只关心流程，不关心底层读写
- `prompt.ts` 只关心交互，不关心业务
- `scaffold.ts` 只关心模板，不关心命令调度

## 三、把执行链完整走一遍

假设你运行：

```bash
node dist/index.js init
```

执行链可以按下面理解。

### 第一步：入口先找到 `init` 命令

入口文件 [src/index.ts](/abs/path/C:/ts-cli/src/index.ts) 会先根据第一个参数找到 `initCommand`。

因为这个命令没有额外位置参数和选项参数，所以解析器这里几乎不做复杂工作，核心逻辑都在 `run()` 里。

### 第二步：检查当前是不是交互终端

`init.ts` 里先判断：

```ts
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  throw new Error("init 需要在交互式终端中运行。");
}
```

原因很简单：

- `stdin` 不是终端，说明没法正常等用户输入
- `stdout` 不是终端，说明也不适合做问答式输出

这是交互式命令里非常常见的一道前置保护。

### 第三步：创建 readline 会话

`createPromptSession()` 内部会调用：

```ts
createInterface({ input, output })
```

它会返回一个 readline 实例，后面每次提问都靠它完成。

### 第四步：按顺序提问

`init.ts` 里现在的顺序是：

1. 问项目名
2. 问输出目录
3. 问模板类型
4. 问是否生成 README
5. 问是否生成 `.gitignore`

注意这里的“多轮交互”并不神秘，本质上就是：

```ts
const a = await 问题1;
const b = await 问题2;
const c = await 问题3;
```

也就是说，它只是把终端问答变成了串行的异步流程。

### 第五步：根据答案再做条件判断

拿到 `targetDirectory` 以后，程序会检查目标目录是否已存在。

如果存在且非空，再追加一轮确认：

```ts
目录 xxx 已存在且非空，是否继续写入
```

这说明“多轮交互”不一定是固定题目列表，也可以根据前面答案动态决定是否追加问题。

### 第六步：进入模板生成

当所有答案都收集完之后，`init.ts` 会把结果交给 `generateScaffold()`。

这个函数会：

1. 计算绝对路径
2. 根据模板选项拼出文件列表
3. 逐个写文件
4. 返回生成结果

到这里，交互阶段就结束了，进入的是普通文件生成逻辑。

## 四、`prompt.ts` 里最关键的思路是什么

如果你只想抓住本质，请记住一句话：

`prompt.ts` 的作用就是把“终端提问”包装成可复用的 Promise 函数。`

比如 `askText()` 的思路是：

1. 调用 `readline.question()` 输出提示
2. 等用户输入
3. 做默认值处理
4. 做校验
5. 如果校验失败，继续再问一遍
6. 如果校验成功，返回结果

本质就是一个 `while (true)` 循环加 `await question(...)`。

### 1. 文本输入：`askText`

这类问题适合：

- 项目名
- 文件路径
- 用户名
- 标题

代码层面的关键点只有两个：

- 支持默认值
- 支持校验失败后重问

### 2. 列表选择：`askSelect`

这类问题适合：

- 选模板
- 选框架
- 选包管理器

这里没有做复杂方向键选择，而是用了最适合学习的方案：

- 先打印编号列表
- 再让用户输入序号

例如：

```text
1. TypeScript
2. JavaScript
选择模板 (1):
```

这种实现虽然简单，但已经足够表达交互式脚手架的核心机制。

### 3. 确认题：`askConfirm`

这类问题适合：

- 是否覆盖
- 是否继续
- 是否安装依赖

它本质上就是把输入限制为：

- `y / yes`
- `n / no`

再加一个默认值。

## 五、`scaffold.ts` 里最关键的思路是什么

`scaffold.ts` 的核心不是“脚手架”，而是：

`根据答案，拼出文件；然后把文件写出去。`

这个服务分成两个动作：

### 1. 先决定要生成哪些文件

比如：

- 一定生成 `package.json`
- 一定生成入口文件
- 选了 TypeScript 才生成 `tsconfig.json`
- 选了 README 才生成 `README.md`
- 选了 gitignore 才生成 `.gitignore`

这一步是“模板装配”。

### 2. 再逐个写文件

它会遍历文件列表：

```ts
for (const file of files) {
  await writeTextFile(filePath, file.content);
}
```

这一步是“模板落盘”。

所以脚手架本身并不复杂，复杂的往往只是模板数量和模板内容。

## 六、这里用到的核心 Node API

下面只讲本项目真正用到、而且最值得掌握的部分。

### 1. `node:readline/promises`

#### `createInterface({ input, output })`

作用：创建一个可交互的 readline 会话。

在这里：

- `input` 来自 `process.stdin`
- `output` 来自 `process.stdout`

也就是从当前终端读输入、往当前终端写提示。

#### `readline.question(prompt)`

作用：显示提示文字，并等待用户输入。

在 `promises` 版本里，它直接返回 Promise，所以很适合写成：

```ts
const answer = await readline.question("项目名: ");
```

这就是多轮交互能写得很顺的关键。

#### `readline.close()`

作用：结束这次交互会话，释放资源。

所以当前代码里把它放在 `finally` 里，保证无论成功还是失败都会关闭。

### 2. `process.stdin.isTTY` / `process.stdout.isTTY`

作用：判断当前输入输出是不是连接在真正的终端上。

如果不是 TTY，说明当前可能是：

- 被管道重定向了
- 在某些非交互环境里执行
- 没法正常做问答式输入

所以交互命令一般要先判断。

### 3. `path.resolve()`

作用：把用户输入的相对路径转换成绝对路径。

例如当前目录是：

```text
C:\ts-cli
```

用户输入：

```text
demo-app
```

那么：

```ts
path.resolve(process.cwd(), "demo-app")
```

会得到完整路径。

这样后续写文件时就不会依赖调用位置的模糊状态。

### 4. `fs/promises.access()`

作用：检查路径是否存在。

当前项目里用它来判断目标目录是否已经存在。

如果存在，就进一步决定要不要检查是否为空。

### 5. `fs/promises.readdir()`

作用：读取目录内容。

这里用它来判断目录是不是空目录：

- 没有任何内容 -> 可以直接写
- 有内容 -> 需要再确认

### 6. `fs/promises.mkdir()` 和 `fs/promises.writeFile()`

它们在 [src/utils/fs.ts](/abs/path/C:/ts-cli/src/utils/fs.ts) 里被封装过。

这里的关键思想是：

- 写文件前先确保父目录存在
- 然后再真正写文件

这就是为什么脚手架能直接写出 `src/index.ts`，即使 `src/` 原本还不存在。

## 七、如果只为了学习，最小逻辑可以简化成什么样

当前项目的实现已经不算复杂，但如果你的目标只是“先看懂”，其实可以先记住下面这版最小思路。

### 最小版本伪代码

```ts
创建 readline

问项目名
问模板类型
问是否继续

根据答案拼出文件内容
写入文件

关闭 readline
```

### 最小版本示例

下面是一份比当前项目更短的教学版示例，它没有做太多抽象，但能完整表达核心流程：

```ts
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function runInit() {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const projectName = (await rl.question("项目名: ")).trim() || "demo-app";
    const template = (await rl.question("模板类型（ts/js）: ")).trim() || "ts";

    const targetDir = path.resolve(process.cwd(), projectName);
    await mkdir(path.join(targetDir, "src"), { recursive: true });

    const entryFile = template === "ts" ? "src/index.ts" : "src/index.js";
    const entryContent =
      template === "ts"
        ? 'const name: string = "demo";\nconsole.log(name);\n'
        : 'const name = "demo";\nconsole.log(name);\n';

    await writeFile(path.join(targetDir, entryFile), entryContent, "utf8");

    console.log(`已生成到: ${targetDir}`);
  } finally {
    rl.close();
  }
}
```

这版代码适合先建立两个认知：

1. 多轮交互其实就是多次 `await rl.question(...)`
2. 脚手架生成其实就是拼字符串再写文件

当你把这两个点看清楚后，再回头看当前项目的分层版实现，就会轻松很多。

## 八、为什么当前项目没有继续“压缩”代码

从教学角度看，代码越短不一定越容易学。

如果把所有逻辑都塞到一个文件里，虽然行数会变少，但会把三件事混在一起：

- 交互提问
- 业务流程
- 文件生成

那样反而不利于模仿。

所以当前实现保持了一个折中：

- 交互逻辑单独放在 `prompt.ts`
- 模板逻辑单独放在 `scaffold.ts`
- 命令流程放在 `init.ts`

这比“全塞一个文件”更适合你后续照着扩展出：

- `create page`
- `create component`
- `init config`
- `publish`

这类命令。

## 九、你真正应该模仿的套路

如果你以后要自己写交互式 CLI，可以直接套这套顺序：

1. 在命令层里定义提问顺序
2. 用 `readline.question()` 一轮轮收集答案
3. 对输入做最基础的默认值和校验
4. 根据前面答案决定是否追加问题
5. 把最终答案交给单独的生成函数
6. 生成函数只负责拼内容和写文件

如果你能把这 6 步写出来，就已经具备实现一个教学版脚手架的能力了。

## 十、建议的阅读顺序

如果你现在要对照源码学习，建议这样读：

1. 先看 [src/commands/init.ts](/abs/path/C:/ts-cli/src/commands/init.ts)
2. 再看 [src/utils/prompt.ts](/abs/path/C:/ts-cli/src/utils/prompt.ts)
3. 再看 [src/services/scaffold.ts](/abs/path/C:/ts-cli/src/services/scaffold.ts)
4. 最后回看 [src/index.ts](/abs/path/C:/ts-cli/src/index.ts) 里的命令注册

这个顺序最容易把“流程”和“分层”同时看明白。
