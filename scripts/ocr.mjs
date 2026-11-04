import { createWorker } from "tesseract.js";
import path from "node:path";
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error(JSON.stringify({ error: "missing file" }));
  process.exit(2);
}

const root = process.cwd();
// The language data lives with the app (not in the persistent data volume) so
// the first verification is fast and the volume only holds user data.
const cachePath = process.env.OCR_CACHE_DIR
  ? path.resolve(process.env.OCR_CACHE_DIR)
  : path.join(root, "ocr-cache");
fs.mkdirSync(cachePath, { recursive: true });

const timeout = setTimeout(() => {
  console.log(JSON.stringify({ error: "timeout" }));
  process.exit(3);
}, 25000);

try {
  const worker = await createWorker("eng", 1, { cachePath, logger: () => {} });
  const { data } = await worker.recognize(file);
  await worker.terminate();
  clearTimeout(timeout);
  console.log(JSON.stringify({ text: data.text ?? "", confidence: data.confidence ?? 0 }));
} catch (err) {
  clearTimeout(timeout);
  console.log(JSON.stringify({ error: String(err?.message ?? err) }));
  process.exit(4);
}
