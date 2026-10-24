import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsDirectory = path.resolve(__dirname, '../../../prompts/receipts');
export const RECEIPT_PROMPT_VERSION = process.env.RECEIPT_PROMPT_VERSION || 'receipt-v3';

export function getReceiptPrompt(version = RECEIPT_PROMPT_VERSION) {
  if (!/^receipt-v\d+$/.test(version)) throw new Error('Invalid receipt prompt version.');
  return fs.readFileSync(path.join(promptsDirectory, `${version}.md`), 'utf8').trim();
}
