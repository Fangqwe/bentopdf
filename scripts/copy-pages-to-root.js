import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const srcPagesDir = path.join(__dirname, '../src/pages');

// 获取实际生成的 CSS 文件名
function getActualCssFile() {
  if (!fs.existsSync(distDir)) return null;
  const files = fs.readdirSync(path.join(distDir, 'assets'));
  const cssFile = files.find(f => f.startsWith('style-') && f.endsWith('.css'));
  return cssFile ? `/assets/${cssFile}` : null;
}

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found!');
  process.exit(1);
}

const actualCssFile = getActualCssFile();
console.log(`Actual CSS file: ${actualCssFile}`);

if (fs.existsSync(srcPagesDir)) {
  const files = fs.readdirSync(srcPagesDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  
  for (const file of htmlFiles) {
    const srcPath = path.join(srcPagesDir, file);
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // 修复 CSS 引用
    if (actualCssFile) {
      content = content.replace(/href="\.\.\/css\/styles\.css"/g, `href="${actualCssFile}"`);
      content = content.replace(/href="\/src\/css\/styles\.css"/g, `href="${actualCssFile}"`);
    }
    
    // 修复其他资源路径
    content = content.replace(/src="\.\.\/js\//g, 'src="/js/');
    content = content.replace(/href="\.\.\/css\//g, 'href="/assets/');
    
    const destPath = path.join(distDir, file);
    fs.writeFileSync(destPath, content);
    console.log(`  ✓ Fixed: ${file}`);
  }
  
  console.log('✅ All pages fixed!');
}