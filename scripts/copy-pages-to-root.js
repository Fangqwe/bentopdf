import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const srcPagesDir = path.join(__dirname, '../src/pages');

// 获取实际生成的 JS 文件
function getActualJsFile() {
  if (!fs.existsSync(distDir)) return null;
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return null;
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find(f => f.startsWith('main-') && f.endsWith('.js'));
  return jsFile ? `/assets/${jsFile}` : null;
}

// 获取实际生成的 CSS 文件
function getActualCssFile() {
  if (!fs.existsSync(distDir)) return null;
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return null;
  const files = fs.readdirSync(assetsDir);
  const cssFile = files.find(f => f.startsWith('style-') && f.endsWith('.css'));
  return cssFile ? `/assets/${cssFile}` : null;
}

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found!');
  process.exit(1);
}

const actualJsFile = getActualJsFile();
const actualCssFile = getActualCssFile();

console.log(`Actual JS file: ${actualJsFile}`);
console.log(`Actual CSS file: ${actualCssFile}`);

if (fs.existsSync(srcPagesDir)) {
  const files = fs.readdirSync(srcPagesDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  
  for (const file of htmlFiles) {
    const srcPath = path.join(srcPagesDir, file);
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // 修复 JS 引用
    if (actualJsFile) {
      content = content.replace(/src="\/src\/js\/main\.ts"/g, `src="${actualJsFile}"`);
      content = content.replace(/src="\.\.\/js\/main\.ts"/g, `src="${actualJsFile}"`);
    }
    
    // 修复 CSS 引用
    if (actualCssFile) {
      content = content.replace(/href="\.\.\/css\/styles\.css"/g, `href="${actualCssFile}"`);
      content = content.replace(/href="\/src\/css\/styles\.css"/g, `href="${actualCssFile}"`);
    }
    
    // 移除所有其他 TypeScript 引用（它们已经被打包到 main.js 中）
    content = content.replace(/<script[^>]*src="\/src\/js\/[^"]*\.ts"[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src="\.\.\/js\/[^"]*\.ts"[^>]*><\/script>/g, '');
    
    const destPath = path.join(distDir, file);
    fs.writeFileSync(destPath, content);
    console.log(`  ✓ Fixed: ${file}`);
  }
  
  console.log('✅ All pages fixed!');
} else {
  console.log('src/pages directory not found');
}