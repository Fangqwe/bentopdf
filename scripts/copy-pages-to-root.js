import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const srcPagesDir = path.join(__dirname, '../src/pages');

// 等待 dist 目录存在
if (!fs.existsSync(distDir)) {
  console.error('dist directory not found!');
  process.exit(1);
}

// 复制 src/pages 下的所有 HTML 文件到 dist 根目录
if (fs.existsSync(srcPagesDir)) {
  const files = fs.readdirSync(srcPagesDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  
  console.log(`Copying ${htmlFiles.length} pages from src/pages to dist root...`);
  
  for (const file of htmlFiles) {
    const srcPath = path.join(srcPagesDir, file);
    const destPath = path.join(distDir, file);
    
    // 读取文件内容
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // 修复资源路径（关键！）
    content = content.replace(/src="\.\.\/\.\.\/assets\//g, 'src="/assets/');
    content = content.replace(/href="\.\.\/\.\.\/assets\//g, 'href="/assets/');
    content = content.replace(/src="\.\.\/assets\//g, 'src="/assets/');
    content = content.replace(/href="\.\.\/assets\//g, 'href="/assets/');
    content = content.replace(/src="\.\.\/\.\.\/js\//g, 'src="/js/');
    content = content.replace(/href="\.\.\/\.\.\/css\//g, 'href="/css/');
    
    fs.writeFileSync(destPath, content);
    console.log(`  ✓ Copied: ${file}`);
  }
  
  console.log('✅ All pages copied to dist root!');
} else {
  console.log('src/pages directory not found');
}

// 列出 dist 根目录的 HTML 文件
const distFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.html'));
console.log(`\nHTML files in dist root: ${distFiles.length}`);
console.log(distFiles.slice(0, 20).join(', '));