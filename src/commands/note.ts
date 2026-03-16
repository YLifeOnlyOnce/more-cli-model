import { CommandDefinition } from "../core/types";
import { addNote, getNoteDataFilePath, listNotes } from "../services/note-store";

export const noteCommand: CommandDefinition = {
  name: "note",
  description: "管理本地笔记数据",
  arguments: [
    {
      name: "action",
      description: "支持 add 或 list",
      required: true
    },
    {
      name: "content",
      description: "add 时需要的笔记内容",
      required: false,
      variadic: true
    }
  ],
  examples: [
    "node dist/index.js note add \"学习 CLI\"",
    "node dist/index.js note list"
  ],
  async run(context) {
    const [action, ...restArgs] = context.parsed.args;

    if (action === "add") {
      const content = restArgs.join(" ").trim();
      if (!content) {
        throw new Error("note add 需要提供笔记内容");
      }

      const note = await addNote(content);
      return `已添加笔记 #${note.id}\n存储位置: ${getNoteDataFilePath()}\n内容: ${note.content}`;
    }

    if (action === "list") {
      const notes = await listNotes();
      if (notes.length === 0) {
        return `当前没有笔记。\n存储位置: ${getNoteDataFilePath()}`;
      }

      return [
        `存储位置: ${getNoteDataFilePath()}`,
        ...notes.map((note) => `#${note.id} ${note.content} (${note.createdAt})`)
      ].join("\n");
    }

    throw new Error(`note 只支持 add 和 list，收到: ${action}`);
  }
};
