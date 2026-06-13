import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WASM_FILE = path.join(__dirname, '../public/libreoffice-wasm/soffice.wasm.gz');
const CHUNK_SIZE = 15 * 1024 * 1024; // 15MB per chunk (safe under 25MB limit)

if (!fs.existsSync(WASM_FILE)) {
  console.error(`File not found: ${WASM_FILE}`);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(WASM_FILE);
const fileSize = fileBuffer.length;
const numChunks = Math.ceil(fileSize / CHUNK_SIZE);

console.log(`Splitting ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB) into ${numChunks} chunks of ~${CHUNK_SIZE / 1024 / 1024} MB`);

// Generate chunk names: aa, ab, ac, ad, ae, af, ...
for (let i = 0; i < numChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, fileSize);
  const chunk = fileBuffer.slice(start, end);
  
  // Generate sequential chunk names: aa, ab, ac, ad, ae...
  const firstChar = String.fromCharCode(97 + Math.floor(i / 26));
  const secondChar = String.fromCharCode(97 + (i % 26));
  const chunkName = firstChar + secondChar;
  
  const outputFile = path.join(__dirname, `../public/libreoffice-wasm/soffice.wasm.gz.${chunkName}`);
  
  fs.writeFileSync(outputFile, chunk);
  console.log(`  Created: soffice.wasm.gz.${chunkName} (${chunk.length} bytes, ${(chunk.length / 1024 / 1024).toFixed(2)} MB)`);
}

// Remove original file to avoid the 25MB limit
try {
  fs.unlinkSync(WASM_FILE);
  console.log(`✅ Removed original file: ${WASM_FILE}`);
} catch (err) {
  console.warn(`Could not remove original file: ${err.message}`);
}

console.log('✅ WASM file splitting complete!');