import os from "node:os";
import path from "node:path";

import { readTextFile, writeTextFile } from "../utils/fs";

export interface NoteItem {
  id: number;
  content: string;
  createdAt: string;
}

interface NoteDatabase {
  notes: NoteItem[];
}

const dataFilePath = path.join(os.homedir(), ".ts-cli-example", "notes.json");

async function readDatabase(): Promise<NoteDatabase> {
  try {
    const content = await readTextFile(dataFilePath);
    return JSON.parse(content) as NoteDatabase;
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      return { notes: [] };
    }
    throw new Error(`读取笔记存储失败: ${typedError.message}`);
  }
}

async function writeDatabase(database: NoteDatabase): Promise<void> {
  await writeTextFile(dataFilePath, JSON.stringify(database, null, 2));
}

export async function addNote(content: string): Promise<NoteItem> {
  const database = await readDatabase();
  const nextId = database.notes.length === 0 ? 1 : database.notes[database.notes.length - 1].id + 1;

  const note: NoteItem = {
    id: nextId,
    content,
    createdAt: new Date().toISOString()
  };

  database.notes.push(note);
  await writeDatabase(database);
  return note;
}

export async function listNotes(): Promise<NoteItem[]> {
  const database = await readDatabase();
  return database.notes;
}

export function getNoteDataFilePath(): string {
  return dataFilePath;
}
