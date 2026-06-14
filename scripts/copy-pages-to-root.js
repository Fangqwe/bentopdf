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
    
    // 移除所有 TypeScript 模块导入
    content = content.replace(/<script[^>]*type="module"[^>]*src="\/src\/js\/[^"]*\.ts"[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*type="module"[^>]*src="\.\.\/js\/[^"]*\.ts"[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src="\/src\/js\/[^"]*\.ts"[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src="\.\.\/js\/[^"]*\.ts"[^>]*><\/script>/g, '');
    
    // 添加正确的 script 标签
    if (actualJsFile) {
      // 在 body 末尾添加 script 标签
      const scriptTag = `<script type="module" src="${actualJsFile}"></script>`;
      content = content.replace('</body>', `${scriptTag}\n</body>`);
    }
    
    // 修复 CSS 引用
    if (actualCssFile) {
      content = content.replace(/href="\.\.\/css\/styles\.css"/g, `href="${actualCssFile}"`);
      content = content.replace(/href="\/src\/css\/styles\.css"/g, `href="${actualCssFile}"`);
      content = content.replace(/href="\.\.\/\.\.\/css\/styles\.css"/g, `href="${actualCssFile}"`);
    }
    
    const destPath = path.join(distDir, file);
    fs.writeFileSync(destPath, content);
    console.log(`  ✓ Fixed: ${file}`);
  }
  
  console.log('✅ All pages fixed!');
}