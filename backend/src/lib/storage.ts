import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { env } from "../config/env";

// Local-filesystem adapter shaped like an S3 client (putObject/getObject) so
// swapping in real S3/R2 for production later only touches this file.
export async function putObject(key: string, buffer: Buffer): Promise<string> {
  const filePath = join(env.STORAGE_DIR, key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return `${env.STORAGE_PUBLIC_URL}/${key}`;
}

export async function getObject(key: string): Promise<Buffer> {
  return readFile(join(env.STORAGE_DIR, key));
}
