import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'public', 'models');

const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

async function download(file) {
  const url = `${BASE}/${file}`;
  const dest = path.join(outDir, file);
  if (existsSync(dest)) {
    console.log(`  ✓ already present: ${file}`);
    return;
  }
  process.stdout.write(`  ↓ ${file} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(res.body, createWriteStream(dest));
  console.log('done');
}

console.log(`Downloading face-api.js models to ${outDir}`);
for (const f of files) {
  await download(f);
}
console.log('All models ready.');
