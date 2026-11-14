import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export async function readJson<T>(file: string): Promise<T> {
  const filePath = path.join(DATA_DIR, file);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

export async function writeJson<T>(file: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, file);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
