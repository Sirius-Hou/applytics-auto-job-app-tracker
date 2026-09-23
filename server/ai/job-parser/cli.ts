import { readFile } from 'node:fs/promises';
import { parseJobDescription } from './agent.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const sourcePath = process.argv[2];
  const rawJd = sourcePath ? await readFile(sourcePath, 'utf8') : await readStdin();
  if (!rawJd.trim()) throw new Error('Provide a JD text file path or pipe JD text to stdin');

  const result = await parseJobDescription(rawJd);
  process.stdout.write(`${JSON.stringify(result.data, null, 2)}\n`);
  process.stderr.write(
    `Validated ${result.metadata.model} response (${result.metadata.totalTokens ?? 'unknown'} tokens).\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown parser error';
  process.stderr.write(
    `Job parser failed: ${message.replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]')}\n`,
  );
  process.exitCode = 1;
});
