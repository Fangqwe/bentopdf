import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const srcPagesDir = path.join(__dirname, '../src/pages');
const indexPath = path.join(__dirname, 'index.html');

// 从 index.html 提取正确的脚本和样式引用
function getCorrectAssets() {
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found!');
    return { jsFile: null, cssFile: null };
  }
  
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // 提取 script 标签
  const scriptMatch = indexContent.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*>/);
  // 提取 link 标签
  const cssMatch = indexContent.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  
  return {
    jsFile: scriptMatch ? scriptMatch[1] : null,
    cssFile: cssMatch ? cssMatch[1] : null
  };
}

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found! Run build first.');
  process.exit(1);
}

const { jsFile, cssFile } = getCorrectAssets();
console.log(`JS file from index: ${jsFile}`);
console.log(`CSS file from index: ${cssFile}`);

if (fs.existsSync(srcPagesDir)) {
  const files = fs.readdirSync(srcPagesDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  
  for (const file of htmlFiles) {
    const srcPath = path.join(srcPagesDir, file);
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // 移除所有现有的 script 标签
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
    content = content.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '');
    
    // 添加正确的 CSS
    if (cssFile) {
      content = content.replace('</head>', `<link rel="stylesheet" href="${cssFile}">\n</head>`);
    }
    
    // 添加正确的 JS
    if (jsFile) {
      content = content.replace('</body>', `<script type="module" src="${jsFile}"></script>\n</body>`);
    }
    
    const destPath = path.join(distDir, file);
    fs.writeFileSync(destPath, content);
    console.log(`  ✓ Fixed: ${file}`);
  }
  
  console.log('✅ All pages fixed!');
}