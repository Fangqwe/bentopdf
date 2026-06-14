import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const srcPagesDir = path.join(__dirname, '../src/pages');
const partialsDir = path.join(__dirname, '../src/partials');

// 注册所有 partials
function registerPartials() {
  if (fs.existsSync(partialsDir)) {
    const partialFiles = fs.readdirSync(partialsDir);
    for (const file of partialFiles) {
      if (file.endsWith('.html')) {
        const name = file.replace('.html', '');
        const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
        Handlebars.registerPartial(name, content);
        console.log(`Registered partial: ${name}`);
      }
    }
  }
}

// 复制并编译页面
function copyAndCompilePages() {
  registerPartials();
  
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found!');
    process.exit(1);
  }
  
  if (!fs.existsSync(srcPagesDir)) {
    console.error('src/pages directory not found!');
    process.exit(1);
  }
  
  const files = fs.readdirSync(srcPagesDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  
  console.log(`Processing ${htmlFiles.length} pages with Handlebars...`);
  
  // 公共 context
  const context = {
    baseUrl: '/',
    simpleMode: false,
    brandName: 'BentoPDF',
    brandLogo: '',
    footerText: '',
    appVersion: '2.8.5',
  };
  
  for (const file of htmlFiles) {
    const srcPath = path.join(srcPagesDir, file);
    const destPath = path.join(distDir, file);
    
    // 读取模板
    const templateContent = fs.readFileSync(srcPath, 'utf8');
    
    // 编译 Handlebars
    const template = Handlebars.compile(templateContent);
    const compiledContent = template(context);
    
    // 写入编译后的内容
    fs.writeFileSync(destPath, compiledContent);
    console.log(`  ✓ Compiled and copied: ${file}`);
  }
  
  console.log(`✅ All pages compiled and copied to dist root!`);
}

copyAndCompilePages();