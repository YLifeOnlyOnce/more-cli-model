# 从零讲解源码：逐文件拆解这个 CLI

这份文档按“真正读源码”的顺序来讲，不是只告诉你文件干了什么，而是带你建立一条完整的执行链：

`命令输入 -> 参数进入 Node -> 入口调度 -> 参数解析 -> 命令执行 -> 输出结果`

建议你打开编辑器，一边看本文，一边对照源码跳转阅读。

## 先建立全局图景

这个项目虽然小，但结构已经有了一个真实 CLI 的骨架：

```text
src/
  index.ts            # 程序入口，负责装配和启动
  core/
    types.ts          # 类型定义，先定义数据结构
    parser.ts         # 参数解析器
  commands/           # 各个具体命令
  services/           # 有状态能力，如笔记存储
  utils/              # 通用工具函数
```

阅读时你可以始终问自己两个问题：

1. 这一层接收的输入是什么？
2. 这一层输出给下一层的是什么？

只要这两个问题回答清楚，CLI 的设计就会非常清晰。

## 第一站：入口文件 `src/index.ts`

这个文件是整个程序的总调度器，见 `ts-cli/src/index.ts:11`。

### 它做了什么

入口文件主要负责四件事：

1. 收集所有命令定义
2. 从 `process.argv` 获取用户输入
3. 解析出要执行哪个命令
4. 执行命令并统一处理错误

### 先看命令注册

`commands` 数组里放的是所有命令对象：

```ts
const commands: CommandDefinition[] = [
  initCommand,
  greetCommand,
  sumCommand,
  jsonPrettyCommand,
  noteCommand,
  helpCommand
];
```

这一步很关键。它说明这个 CLI 不是靠一堆 `if...else` 硬编码分发，而是通过“命令定义对象列表”来完成装配。

这带来两个好处：

- 新增命令时，只要新增文件并注册一次
- `help` 可以复用这份命令列表自动生成帮助信息

### 再看参数入口

```ts
const rawArgv = process.argv.slice(2);
```

为什么是 `slice(2)`？

因为 `process.argv` 前两个位置通常是：

- 第 0 项：Node 可执行文件路径
- 第 1 项：当前执行脚本路径

真正属于用户输入的 CLI 参数，是从第 2 项开始。

比如执行：

```bash
node dist/index.js greet Alice --times 2
```

用户真正关心的部分就是：

```ts
["greet", "Alice", "--times", "2"]
```

### 主流程怎么走

入口中的主流程是：

```ts
const commandName = resolveCommandName(rawArgv, commands);
const command = commands.find((item) => item.name === commandName);
const parsed = parseCommand(rawArgv.slice(1), command);
const result = await command.run({ rawArgv, parsed, commands });
```

你可以把它翻译成自然语言：

- 先看用户要执行哪个命令
- 再找到这个命令的定义
- 再把剩余参数解析成结构化数据
- 最后调用这个命令自己的 `run`

这其实就是一个很经典的解释器流程。

### 为什么错误处理要集中在入口

`try/catch` 放在入口层，意味着所有命令都可以直接抛出业务错误，而不用每个命令都重复写一遍输出逻辑。

这是一种很常见的 CLI 设计方式：

- 业务层负责“发现问题”
- 入口层负责“如何把问题友好地告诉用户”

## 第二站：类型定义 `src/core/types.ts`

这个文件只有类型，但非常重要，见 `ts-cli/src/core/types.ts:1`。

如果你只想真正搞懂一个项目是怎么设计出来的，往往先看类型比先看逻辑更快。

### 1. `OptionType`

```ts
export type OptionType = "boolean" | "string" | "number";
```

这告诉你：当前这个 CLI 只支持三类选项值。

这相当于先给解析器划了边界：

- 布尔开关，例如 `--upper`
- 字符串值，例如 `--name alice`
- 数字值，例如 `--times 2`

### 2. `ArgumentDefinition`

这个类型描述位置参数。

例如 `greet Alice` 里的 `Alice`，就是位置参数；`sum 1 2 3 4` 里的数字列表也是位置参数。

字段里的重点有两个：

- `required` 表示是否必填
- `variadic` 表示是否可接收多个值

也就是说，参数定义本身就已经告诉了解析器“这个命令期望怎样的输入形状”。

### 3. `OptionDefinition`

这个类型描述选项参数。

比如：

- `name` 对应长选项名 `--times`
- `alias` 对应短选项名 `-t`
- `type` 决定怎样把字符串转为实际值
- `defaultValue` 决定用户没传时用什么值

这就是声明式设计的典型特征：命令作者只描述规则，不自己手写解析过程。

### 4. `ParsedCommand`

这是解析器的输出结果。

```ts
export interface ParsedCommand {
  commandName: string;
  args: string[];
  options: Record<string, string | number | boolean>;
}
```

也就是说，解析器的本质工作，就是把原始字符串数组变成这个对象。

### 5. `CommandDefinition`

这是整个项目最核心的类型。

它定义了“一个命令最少要包含哪些信息”：

- `name`
- `description`
- `arguments`
- `options`
- `examples`
- `run`

你可以把它看成一个统一协议。只要符合这个协议，一个命令就能被系统识别、帮助系统展示、解析器校验、执行器调用。

## 第三站：解析器 `src/core/parser.ts`

这个文件是 CLI 的底层骨架，见 `ts-cli/src/core/parser.ts:40`。

如果你以后去读 `commander`、`yargs` 的源码，会发现它们本质上也在解决类似问题，只是功能更强、边界处理更多。

### 第一部分：识别 token 类型

```ts
function isOptionToken(token: string): boolean {
  return token.startsWith("-");
}
```

这里的思路非常直接：

- 以 `-` 开头，认为它是选项
- 否则认为它是位置参数

这是最基础的命令行协议识别方式。

### 第二部分：做选项名归一化

```ts
function normalizeOptionName(optionName: string): string {
  return optionName.replace(/^--?/, "");
}
```

它把：

- `--times` 变成 `times`
- `-t` 变成 `t`

这样后续查找就统一了，不需要分别处理长选项和短选项。

### 第三部分：根据 token 找到选项定义

```ts
return options.find((option) => option.name === normalized || option.alias === normalized);
```

这一步体现了“解析不是凭空发生的”，而是必须依赖命令定义。

也就是说，CLI 不会盲目接受任何 `--xxx`，而是只接受当前命令声明过的选项。

### 第四部分：类型转换

`coerceOptionValue` 的作用，是把命令行里天然都是字符串的输入，转换成业务更可用的值。

例如：

- `"2"` 转为数字 `2`
- `"alice"` 保持字符串
- 布尔值交给布尔规则处理

这里很值得你建立一个认知：

命令行输入进入程序时，本质上全都是字符串。所谓参数类型，不过是解析器帮你做的二次解释。

### 第五部分：主解析循环

核心循环是：

```ts
for (let index = 0; index < argv.length; index += 1) {
  const token = argv[index];
  ...
}
```

循环里分两条分支：

- 如果不是选项，就塞进 `parsedArgs`
- 如果是选项，就去查定义并解析值

这就是一个非常典型的“线性扫描命令参数”的实现。

### 第六部分：默认值注入

解析前有一段逻辑：

```ts
for (const option of options) {
  if (option.defaultValue !== undefined) {
    parsedOptions[option.name] = option.defaultValue;
  }
}
```

这意味着：

- 用户不传，也有默认配置
- 命令逻辑里就能少写很多兜底代码

这是一个很实用的思路：把输入补全尽量前置到解析阶段，而不是后置到每个命令里。

### 第七部分：布尔选项和带值选项为什么分开

```ts
if (option.type === "boolean") {
  parsedOptions[option.name] = true;
  continue;
}
```

像 `--upper` 这类选项，只要出现就表示开启，所以不需要再读取下一个 token。

而像 `--times 2` 这种选项，必须继续读取下一个值。

这就是为什么 CLI 解析器一定要知道“这个选项是什么类型”，否则它根本不知道要不要吃掉下一个 token。

### 第八部分：参数校验

解析完成后还有两步校验：

- `validateArguments`
- `validateRequiredOptions`

这说明“解析”和“校验”虽然相邻，但不是一回事：

- 解析：把字符串拆成结构
- 校验：判断结构是否符合命令规则

这种分离会让系统更清晰，也更容易扩展。

### 第九部分：`resolveCommandName`

这个函数只做一件事：先决定要执行哪个命令。

这里还有一个很实用的小设计：

- 如果用户什么都没输入，默认回到 `help`

这是 CLI 很常见的兜底体验设计，能让工具更友好。

## 第四站：帮助信息格式化 `src/utils/format.ts`

这个文件体现了一个常被忽视但非常重要的点：CLI 不只是“能跑”，还要“好用”。见 `ts-cli/src/utils/format.ts:15`。

### `formatCommandUsage`

它把参数定义重新拼成命令用法，例如：

```text
learn-cli greet <name>
learn-cli sum <numbers...>
```

其中：

- 必填参数用 `< >`
- 可选参数用 `[ ]`
- 可变参数用 `...`

这其实是 CLI 社区里比较通用的一套表达方式。

### `formatCommandHelp`

这个函数的价值在于：帮助文案不是手写死在每个命令里，而是根据命令定义自动生成。

这说明当前项目的数据流是这样的：

`命令定义 -> 帮助文本`

不是：

`命令逻辑 + 另外再手写一份帮助文案`

这样可以避免文档和实现不一致。

### `formatCommandList`

它负责输出所有命令总览。

这是一个典型的“展示层函数”：

- 不做业务判断
- 不碰文件系统
- 不做参数解析
- 只负责把已有数据变成适合终端阅读的字符串

## 第五站：文件工具 `src/utils/fs.ts`

这个文件很小，但作用是把 Node 标准库调用包装成更可复用的工具层。

### 为什么不直接在命令里写 `readFile`

当然可以直接写，但单独抽工具层有几个好处：

- 命令文件更聚焦业务
- 文件系统细节不会到处散落
- 后续更容易复用和测试

### `ensureDirectory`

```ts
await mkdir(directoryPath, { recursive: true });
```

这行代码的意义是：如果目录不存在，就递归创建。

它为后面的写文件操作提供前置保障。很多 CLI 写文件失败，就是因为没有先确保父目录存在。

### `readTextFile` 与 `writeTextFile`

它们做的其实不复杂，但封装后读起来会更像业务语义，而不是底层 API 细节。

## 第六站：存储层 `src/services/note-store.ts`

这个文件让项目从“纯命令计算器”升级成了“有状态 CLI”，见 `ts-cli/src/services/note-store.ts:16`。

### 为什么把笔记单独放到 service

因为 `note` 命令关心的是：

- 添加笔记
- 列出笔记

而不应该关心：

- 文件放在哪
- JSON 怎么读
- 文件不存在怎么办

这就是分层的价值：命令层描述动作，服务层处理数据。

### 存储位置如何决定

```ts
const dataFilePath = path.join(os.homedir(), ".ts-cli-example", "notes.json");
```

这表示把数据写到当前用户目录下，而不是项目目录。

这是一种很常见的 CLI 设计，因为很多工具都希望自己的缓存、配置、历史记录能跨项目存在。

### `readDatabase`

这里做了一个非常典型的容错：

- 如果文件不存在，返回空数据
- 如果是别的错误，真正抛出异常

这使得第一次运行 `note list` 或 `note add` 时，工具不会因为没有历史文件就崩溃。

### `addNote`

这段逻辑体现了最基础的数据持久化流程：

1. 读旧数据
2. 算下一个 id
3. 组装新对象
4. push 到数组
5. 写回文件

这是很多 CLI 本地配置、缓存、清单管理功能的原型。

## 第七站：命令实现 `src/commands/`

这一层是“用户真正能感知的功能层”。每个命令都遵循同一个接口，但业务逻辑不同。

### 1. `greet.ts`：最小命令模板

见 `ts-cli/src/commands/greet.ts:3`。

这是你最适合抄写和模仿的命令模板，因为它非常完整但不复杂：

- 有必填位置参数 `name`
- 有数字选项 `--times`
- 有布尔选项 `--upper`
- 有示例命令
- 有轻量业务校验

执行逻辑也很容易理解：

```ts
const [name] = context.parsed.args;
const times = Number(context.parsed.options.times ?? 1);
const upper = Boolean(context.parsed.options.upper ?? false);
```

这几行说明：命令层已经不需要再处理原始字符串数组，而是直接消费解析后的结构化结果。

这正是解析器存在的价值。

### 2. `sum.ts`：参数校验示例

见 `ts-cli/src/commands/sum.ts:27`。

这个命令展示的是：即使解析器已经把“有没有参数”这类事情处理过了，业务层仍然要做自己的校验。

例如：

- 解析器只知道你传了字符串
- 业务层才知道这些字符串必须是有效数字

因此这里需要把每个字符串再转成数字，并检查 `Number.isNaN`。

这是一个很重要的分工：

- 通用合法性由解析器负责
- 业务语义合法性由命令负责

### 3. `json-pretty.ts`：文件读取与错误翻译

见 `ts-cli/src/commands/json-pretty.ts:29`。

这个命令特别适合学习 CLI 中的“外部资源访问”模式。

关键步骤是：

1. 读取用户输入的文件路径
2. 用 `path.resolve(process.cwd(), filePath)` 转成绝对路径
3. 读取文件内容
4. 解析 JSON
5. 用指定缩进重新输出

这里尤其值得学习的是错误翻译：

- 底层 `fs` 抛出的错误往往偏技术化
- 命令层把它翻译成更适合用户理解的提示

这就是为什么 CLI 的错误信息不能只依赖原始异常。

### 4. `note.ts`：单命令里的子动作

见 `ts-cli/src/commands/note.ts:24`。

这里虽然没有单独做多层命令解析器，但已经模拟了一个常见模式：

```bash
note add "内容"
note list
```

本质上就是在 `note` 命令内部，自己再根据第一个位置参数做二次分发。

这是一个很常见的 CLI 设计技巧。很多工具在做复杂命令树之前，都会先用这种方式实现简单子命令。

### 5. `help.ts`：帮助命令本身也是普通命令

见 `ts-cli/src/commands/help.ts:18`。

这个文件传达了一个很好的设计观念：

`help` 不是特殊语法，而是一个普通命令。

这意味着：

- 它也有自己的参数定义
- 它也走统一的解析流程
- 它也通过 `run` 返回字符串

这种统一性会让整个系统更简单。

### 6. `init.ts`：多轮交互式脚手架命令

这个命令展示了另一类很常见的 CLI 能力：不是一次性把所有参数写在命令后面，而是进入一个问答流程，边问边收集信息，最后再批量生成文件。

它的执行思路是：

1. 用 `readline/promises` 创建交互会话
2. 依次询问项目名、输出目录、模板类型、是否生成 README / `.gitignore`
3. 如果目标目录已存在且非空，再额外确认一次
4. 把答案交给 `services/scaffold.ts` 统一生成模板文件

这和 Vite、Create React App 一类脚手架的核心体验已经非常接近了，只是这里保留了最小实现，方便你看清楚交互和文件生成是怎么接上的。

## 第八站：把一条命令完整走一遍

现在我们用一个真实例子把全流程串起来：

```bash
node dist/index.js greet Alice --times 2 --upper
```

### 第一步：Shell 和 Node

终端把整行命令切成 token，并启动 Node 进程。

### 第二步：进入 `process.argv`

程序里可以拿到类似这样的数组：

```ts
["greet", "Alice", "--times", "2", "--upper"]
```

### 第三步：入口决定命令名

`resolveCommandName` 看见第一个词是 `greet`，于是选中 `greetCommand`。

### 第四步：解析剩余参数

传给 `parseCommand` 的是：

```ts
["Alice", "--times", "2", "--upper"]
```

解析后得到：

```ts
{
  commandName: "greet",
  args: ["Alice"],
  options: {
    times: 2,
    upper: true
  }
}
```

### 第五步：命令执行

`greetCommand.run()` 使用这些结构化数据，生成两行大写问候语。

### 第六步：输出到终端

入口文件调用 `console.log(result)`，终端显示结果。

这条链路一旦看懂，整个 CLI 的本质就非常清楚了。

## 第九站：你应该怎样继续改这个项目

如果你想把“看懂”变成“会写”，最好的方式不是继续读，而是动手改。

推荐你按这个顺序练：

### 练习 1：给 `sum` 增加 `--round`

目标：平均值保留指定位数。

你会练到：

- 新增数字选项
- 默认值设计
- 命令层业务处理

### 练习 2：给 `note` 增加 `remove <id>`

你会练到：

- 多动作分支
- 持久化数据更新
- 错误处理

### 练习 3：新增 `time` 命令

你会练到：

- 新命令文件创建
- 命令注册
- 帮助信息自动接入

### 练习 4：把解析器升级为支持 `--key=value`

你会练到：

- token 预处理
- 协议扩展
- 解析器重构

## 最后，如何判断你真的学会了

你不需要背代码，你只要能清楚说出下面这几句话，就说明已经入门了：

- CLI 本质是一个接收命令行参数的程序
- `process.argv` 是原始输入入口
- 解析器负责把字符串变成结构化数据
- 命令定义负责描述规则和执行逻辑
- 帮助系统可以由命令元数据自动生成
- 文件、网络、配置、交互都只是 CLI 的附加能力

如果你愿意，我下一步可以继续给你补一版“手把手新增一个 `time` 命令”的教学实战，从建文件到写代码逐步带你完成。
