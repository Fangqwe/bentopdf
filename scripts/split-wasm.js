import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WASM_FILE = path.join(__dirname, '../public/libreoffice-wasm/soffice.wasm.gz');
const CHUNK_SIZE = 15 * 1024 * 1024; // 15MB per chunk

if (!fs.existsSync(WASM_FILE)) {
  console.error(`File not found: ${WASM_FILE}`);
  // 如果文件不存在，可能是已经被分片过了，跳过
  console.log('WASM file already split or not found, skipping...');
  process.exit(0);
}

const fileBuffer = fs.readFileSync(WASM_FILE);
const fileSize = fileBuffer.length;
const numChunks = Math.ceil(fileSize / CHUNK_SIZE);

console.log(`Splitting ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB) into ${numChunks} chunks of ~${CHUNK_SIZE / 1024 / 1024} MB`);

// 输出到 public 目录
const outputDir = path.join(__dirname, '../public/libreoffice-wasm');

// Generate chunk names: aa, ab, ac, ad, ...
for (let i = 0; i < numChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, fileSize);
  const chunk = fileBuffer.slice(start, end);
  
  // Generate sequential chunk names: aa, ab, ac, ad, ae...
  const firstChar = String.fromCharCode(97 + Math.floor(i / 26));
  const secondChar = String.fromCharCode(97 + (i % 26));
  const chunkName = firstChar + secondChar;
  
  const outputFile = path.join(outputDir, `soffice.wasm.gz.${chunkName}`);
  
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
    
    const outputFile = path.join(outputDir, `soffice.data.gz.${chunkName}`);
    
    fs.writeFileSync(outputFile, chunk);
    console.log(`  Created: soffice.data.gz.${chunkName} (${chunk.length} bytes, ${(chunk.length / 1024 / 1024).toFixed(2)} MB)`);
  }
  
  // 删除原始 data 文件
  try {
    fs.unlinkSync(DATA_FILE);
    console.log(`  Removed original: soffice.data.gz`);
  } catch (err) {
    console.warn(`  Could not remove original data file: ${err.message}`);
  }
}

// 删除原始 wasm 文件
try {
  fs.unlinkSync(WASM_FILE);
  console.log(`\n✅ Removed original file: soffice.wasm.gz`);
} catch (err) {
  console.warn(`Could not remove original wasm file: ${err.message}`);
}

console.log('\n✅ WASM file splitting complete!');