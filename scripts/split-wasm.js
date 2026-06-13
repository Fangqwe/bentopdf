// scripts/split-wasm.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 源文件在 public 目录
const WASM_FILE = path.join(__dirname, '../public/libreoffice-wasm/soffice.wasm.gz');
const CHUNK_SIZE = 15 * 1024 * 1024; // 15MB per chunk

if (!fs.existsSync(WASM_FILE)) {
  console.error(`File not found: ${WASM_FILE}`);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(WASM_FILE);
const fileSize = fileBuffer.length;
const numChunks = Math.ceil(fileSize / CHUNK_SIZE);

console.log(`Splitting ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB) into ${numChunks} chunks of ~${CHUNK_SIZE / 1024 / 1024} MB`);

// 确保目标目录存在
const distWasmDir = path.join(__dirname, '../dist/libreoffice-wasm');
if (!fs.existsSync(distWasmDir)) {
  fs.mkdirSync(distWasmDir, { recursive: true });
}

// Generate chunk names: aa, ab, ac, ad, ...
for (let i = 0; i < numChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, fileSize);
  const chunk = fileBuffer.slice(start, end);
  
  // Generate sequential chunk names: aa, ab, ac, ad, ae...
  const firstChar = String.fromCharCode(97 + Math.floor(i / 26));
  const secondChar = String.fromCharCode(97 + (i % 26));
  const chunkName = firstChar + secondChar;
  
  // 直接输出到 dist 目录
  const outputFile = path.join(distWasmDir, `soffice.wasm.gz.${chunkName}`);
  
  fs.writeFileSync(outputFile, chunk);
  console.log(`  Created: soffice.wasm.gz.${chunkName} (${chunk.length} bytes, ${(chunk.length / 1024 / 1024).toFixed(2)} MB)`);
}

// 同样处理 soffice.data.gz 分片
const DATA_FILE = path.join(__dirname, '../public/libreoffice-wasm/soffice.data.gz');
if (fs.existsSync(DATA_FILE)) {
  const dataBuffer = fs.readFileSync(DATA_FILE);
  const dataSize = dataBuffer.length;
  const dataNumChunks = Math.ceil(dataSize / CHUNK_SIZE);
  
  console.log(`\nSplitting data file ${dataSize} bytes (${(dataSize / 1024 / 1024).toFixed(2)} MB) into ${dataNumChunks} chunks`);
  
  for (let i = 0; i < dataNumChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, dataSize);
    const chunk = dataBuffer.slice(start, end);
    
    const firstChar = String.fromCharCode(97 + Math.floor(i / 26));
    const secondChar = String.fromCharCode(97 + (i % 26));
    const chunkName = firstChar + secondChar;
    
    const outputFile = path.join(distWasmDir, `soffice.data.gz.${chunkName}`);
    
    fs.writeFileSync(outputFile, chunk);
    console.log(`  Created: soffice.data.gz.${chunkName} (${chunk.length} bytes, ${(chunk.length / 1024 / 1024).toFixed(2)} MB)`);
  }
}

console.log('\n✅ WASM file splitting complete!');