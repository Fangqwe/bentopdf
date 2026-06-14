import { defineConfig } from 'vitest/config';
import type { IncomingMessage, ServerResponse } from 'http';
import http from 'http';
import https from 'https';
import type { Connect, Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import viteCompression from 'vite-plugin-compression';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';
import fs from 'fs';
import { constants as zlibConstants } from 'zlib';

const SUPPORTED_LANGUAGES = [
  'en',
  'ar',
  'be',
  'da',
  'ru',
  'de',
  'es',
  'fr',
  'id',
  'it',
  'nl',
  'pt',
  'sv',
  'tr',
  'vi',
  'zh',
  'zh-TW',
  'ko',
  'ja',
  'uk',
  'sk',
] as const;
const LANG_REGEX = new RegExp(
  `^/(${SUPPORTED_LANGUAGES.join('|')})(?:/(.*))?$`
);

function loadPages(): Set<string> {
  const pagesDir = resolve(__dirname, 'src/pages');
  const pages = new Set<string>();

  if (fs.existsSync(pagesDir)) {
    for (const file of fs.readdirSync(pagesDir)) {
      if (file.endsWith('.html')) {
        pages.add(file.replace('.html', ''));
      }
    }
  }

  const rootPages = [
    'index',
    'about',
    'contact',
    'faq',
    'privacy',
    'terms',
    'licensing',
    'tools',
    '404',
    'pdf-converter',
    'pdf-editor',
    'pdf-security',
    'pdf-merge-split',
  ];
  rootPages.forEach((p) => pages.add(p));

  return pages;
}

const PAGES = loadPages();

function getBasePath(): string {
  return (process.env.BASE_URL || '/').replace(/\/$/, '');
}

function createLanguageMiddleware(isDev: boolean): Connect.NextHandleFunction {
  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction
  ): void => {
    if (!req.url) return next();

    const basePath = getBasePath();
    const [fullPathname, queryString] = req.url.split('?');

    let pathname = fullPathname;
    if (basePath && basePath !== '/' && pathname.startsWith(basePath)) {
      pathname = pathname.slice(basePath.length) || '/';
    }

    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }

    const match = pathname.match(LANG_REGEX);

    if (match) {
      const lang = match[1];
      const rest = match[2] ?? '';

      if (rest === '' && !pathname.endsWith('/')) {
        const redirectUrl = basePath ? `${basePath}/${lang}/` : `/${lang}/`;
        res.statusCode = 302;
        res.setHeader(
          'Location',
          redirectUrl + (queryString ? `?${queryString}` : '')
        );
        res.end();
        return;
      }

      if (rest === '' || rest === '/') {
        if (isDev) {
          req.url = '/index.html' + (queryString ? `?${queryString}` : '');
        } else {
          const langIndexPath = resolve(__dirname, 'dist', lang, 'index.html');
          if (fs.existsSync(langIndexPath)) {
            req.url =
              `/${lang}/index.html` + (queryString ? `?${queryString}` : '');
          } else {
            req.url = '/index.html' + (queryString ? `?${queryString}` : '');
          }
        }
        return next();
      }

      const cleanPath = rest.replace(/\/$/, '').replace(/\.html$/, '');
      const pageName = cleanPath.split('/')[0];

      if (pageName && PAGES.has(pageName)) {
        if (isDev) {
          const srcPath = resolve(__dirname, 'src/pages', `${pageName}.html`);
          if (fs.existsSync(srcPath)) {
            req.url =
              `/src/pages/${pageName}.html` +
              (queryString ? `?${queryString}` : '');
          } else {
            req.url =
              `/${pageName}.html` + (queryString ? `?${queryString}` : '');
          }
        } else {
          const langPagePath = resolve(
            __dirname,
            'dist',
            lang,
            `${pageName}.html`
          );
          if (fs.existsSync(langPagePath)) {
            req.url =
              `/${lang}/${pageName}.html` +
              (queryString ? `?${queryString}` : '');
          } else {
            req.url =
              `/${pageName}.html` + (queryString ? `?${queryString}` : '');
          }
        }
      } else if (!cleanPath.includes('.')) {
        if (isDev) {
          req.url =
            `/${cleanPath}.html` + (queryString ? `?${queryString}` : '');
        } else {
          const langPagePath = resolve(
            __dirname,
            'dist',
            lang,
            `${cleanPath}.html`
          );
          if (fs.existsSync(langPagePath)) {
            req.url =
              `/${lang}/${cleanPath}.html` +
              (queryString ? `?${queryString}` : '');
          } else {
            req.url =
              `/${cleanPath}.html` + (queryString ? `?${queryString}` : '');
          }
        }
      }

      return next();
    }

    if (isDev && pathname.endsWith('.html') && !pathname.startsWith('/src/')) {
      const pageName = pathname.slice(1).replace('.html', '');
      if (PAGES.has(pageName)) {
        const srcPath = resolve(__dirname, 'src/pages', `${pageName}.html`);
        if (fs.existsSync(srcPath)) {
          req.url =
            `/src/pages/${pageName}.html` +
            (queryString ? `?${queryString}` : '');
          return next();
        }
      }
    }

    next();
  };
}

function buildCorsProxyAllowedHosts(): Set<string> {
  const hosts = new Set<string>([
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'bentopdf-cors-proxy.bentopdf.workers.dev',
    'timestamp.digicert.com',
    'timestamp.sectigo.com',
    'ts.ssl.com',
    'freetsa.org',
    'tsa.mesign.com',
  ]);

  const envHostSources = [
    process.env.VITE_CORS_PROXY_URL,
    process.env.VITE_WASM_PYMUPDF_URL,
    process.env.VITE_WASM_GS_URL,
    process.env.VITE_WASM_CPDF_URL,
    process.env.VITE_TESSERACT_WORKER_URL,
    process.env.VITE_TESSERACT_CORE_URL,
    process.env.VITE_TESSERACT_LANG_URL,
    process.env.VITE_OCR_FONT_BASE_URL,
  ];
  for (const raw of envHostSources) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      console.warn(
        `[vite] Ignoring malformed VITE_* URL in dev CORS proxy allowlist: ${raw}`
      );
    }
  }

  const extra = process.env.VITE_DEV_CORS_PROXY_EXTRA_HOSTS;
  if (extra) {
    for (const host of extra.split(',').map((s) => s.trim())) {
      if (host) hosts.add(host);
    }
  }

  return hosts;
}

const CORS_PROXY_ALLOWED_HOSTS = buildCorsProxyAllowedHosts();

function createCorsProxyMiddleware(): Connect.NextHandleFunction {
  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction
  ): void => {
    if (!req.url?.startsWith('/cors-proxy')) return next();

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.statusCode = 204;
      res.end();
      return;
    }

    const parsed = new URL(req.url, 'http://localhost');
    const targetUrl = parsed.searchParams.get('url');
    if (!targetUrl) {
      res.statusCode = 400;
      res.end('Missing url parameter');
      return;
    }

    let targetHost: string;
    let targetProtocol: string;
    try {
      const parsedTarget = new URL(targetUrl);
      targetHost = parsedTarget.hostname;
      targetProtocol = parsedTarget.protocol;
    } catch {
      res.statusCode = 400;
      res.end('Invalid url parameter');
      return;
    }

    if (targetProtocol !== 'https:' && targetProtocol !== 'http:') {
      res.statusCode = 400;
      res.end('Unsupported protocol');
      return;
    }

    if (!CORS_PROXY_ALLOWED_HOSTS.has(targetHost)) {
      console.warn(`[CORS Proxy] Blocked disallowed host: ${targetHost}`);
      res.statusCode = 403;
      res.end(`Host not allowed: ${targetHost}`);
      return;
    }

    console.log(`[CORS Proxy] ${req.method} ${targetUrl}`);

    const bodyChunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => bodyChunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(bodyChunks);
      const target = new URL(targetUrl);
      const transport = target.protocol === 'https:' ? https : http;

      const headers: Record<string, string> = {};
      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      }
      if (body.length > 0) {
        headers['Content-Length'] = String(body.length);
      }

      const proxyReq = transport.request(
        targetUrl,
        { method: req.method || 'GET', headers },
        (proxyRes) => {
          console.log(
            `[CORS Proxy] Response: ${proxyRes.statusCode} from ${targetUrl}`
          );
          res.setHeader(
            'Access-Control-Allow-Origin',
            req.headers.origin || '*'
          );
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = proxyRes.statusCode || 200;
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        const msg = String(err.message).replace(/[\r\n]+/g, ' ');
        console.error('[CORS Proxy] Error:', msg);
        res.statusCode = 502;
        res.end(`Proxy error: ${msg}`);
      });

      if (body.length > 0) {
        proxyReq.write(body);
      }
      proxyReq.end();
    });
  };
}

function languageRouterPlugin(): Plugin {
  return {
    name: 'language-router',
    configureServer(server) {
      server.middlewares.use(createCorsProxyMiddleware());
      server.middlewares.use(createLanguageMiddleware(true));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createCorsProxyMiddleware());
      server.middlewares.use(createLanguageMiddleware(false));
    },
  };
}

function flattenPagesPlugin(): Plugin {
  return {
    name: 'flatten-pages',
    enforce: 'post',
    writeBundle(options, bundle) {
      const outDir = options.dir;
      if (!outDir) return;

      // 移动 src/pages/*.html 到根目录
      const srcPagesDir = resolve(outDir, 'src/pages');
      if (fs.existsSync(srcPagesDir)) {
        const files = fs.readdirSync(srcPagesDir);
        for (const file of files) {
          if (file.endsWith('.html')) {
            const oldPath = resolve(srcPagesDir, file);
            const newPath = resolve(outDir, file);
            if (fs.existsSync(oldPath)) {
              fs.renameSync(oldPath, newPath);
              console.log(`[flatten] Moved ${file} to root`);
            }
          }
        }
        // 删除空目录
        try { fs.rmdirSync(srcPagesDir); } catch(e) {}
      }
      
      // 同时确保根目录的 HTML 文件存在
      const rootHtmlFiles = ['about.html', 'contact.html', 'faq.html', 'privacy.html', 'terms.html', 'licensing.html', 'tools.html', '404.html'];
      for (const file of rootHtmlFiles) {
        const srcPath = resolve(outDir, file);
        if (!fs.existsSync(srcPath)) {
          const altPath = resolve(outDir, `src/${file}`);
          if (fs.existsSync(altPath)) {
            fs.renameSync(altPath, srcPath);
          }
        }
      }
    },
  };
}

function rewriteHtmlPathsPlugin(): Plugin {
  const baseUrl = process.env.BASE_URL || '/';
  const normalizedBase = baseUrl.replace(/\/?$/, '/');

  const escapedBase = normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    name: 'rewrite-html-paths',
    enforce: 'post',
    writeBundle(options, bundle) {
      if (normalizedBase === '/') return;
      const outDir = options.dir;
      if (!outDir) return;

      const hrefRegex = new RegExp(
        `href="\\/(?!${escapedBase.slice(1)}|test\\/|http|\\/\\/)`,
        'g'
      );
      const srcRegex = new RegExp(
        `src="\\/(?!${escapedBase.slice(1)}|test\\/|http|\\/\\/)`,
        'g'
      );
      const contentRegex = new RegExp(
        `content="\\/(?!${escapedBase.slice(1)}|test\\/|http|\\/\\/)`,
        'g'
      );

      for (const fileName of Object.keys(bundle)) {
        if (!fileName.endsWith('.html')) continue;
        const diskPath = resolve(outDir, fileName);
        if (!fs.existsSync(diskPath)) continue;
        const source = fs.readFileSync(diskPath, 'utf8');
        const updated = source
          .replace(hrefRegex, `href="${normalizedBase}`)
          .replace(srcRegex, `src="${normalizedBase}`)
          .replace(contentRegex, `content="${normalizedBase}`);
        if (updated !== source) {
          fs.writeFileSync(diskPath, updated);
        }
      }
    },
  };
}

function removeLargeWasmFilesPlugin(): Plugin {
  return {
    name: 'remove-large-wasm-files',
    enforce: 'post',
    writeBundle(options) {
      const outDir = options.dir;
      if (!outDir) return;
      
      const largeFiles = [
        'libreoffice-wasm/soffice.wasm.gz',
        'libreoffice-wasm/soffice.data.gz',
        'libreoffice-wasm/soffice.wasm',
        'libreoffice-wasm/soffice.data'
      ];
      
      for (const file of largeFiles) {
        const filePath = resolve(outDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[build] Removed large file: ${file}`);
        }
      }
      
      const wasmDir = resolve(outDir, 'libreoffice-wasm');
      if (fs.existsSync(wasmDir)) {
        const files = fs.readdirSync(wasmDir);
        const wasmChunks = files.filter(f => f.startsWith('soffice.wasm.gz.'));
        const dataChunks = files.filter(f => f.startsWith('soffice.data.gz.'));
        console.log(`[build] WASM chunks: ${wasmChunks.length}, Data chunks: ${dataChunks.length}`);
      }
    },
  };
}

export default defineConfig(() => {
  const USE_CDN = process.env.VITE_USE_CDN === 'true';

  if (USE_CDN) {
    console.log('[Vite] Using CDN for WASM files (with local fallback)');
  } else {
    console.log('[Vite] Using local WASM files only');
  }

  const staticCopyTargets = [
    {
      src: 'node_modules/embedpdf-snippet/dist/pdfium.wasm',
      dest: 'embedpdf',
    },
    {
      src: 'public/libreoffice-wasm/soffice.wasm.gz.??',
      dest: 'libreoffice-wasm',
    },
    {
      src: 'public/libreoffice-wasm/soffice.data.gz.??',
      dest: 'libreoffice-wasm',
    },
  ];

  return {
    base: (process.env.BASE_URL || '/').replace(/\/?$/, '/'),
    plugins: [
      handlebars({
        partialDirectory: resolve(__dirname, 'src/partials'),
        context: {
          baseUrl: (process.env.BASE_URL || '/').replace(/\/?$/, '/'),
          simpleMode: process.env.SIMPLE_MODE === 'true',
          brandName: process.env.VITE_BRAND_NAME || '',
          brandLogo: process.env.VITE_BRAND_LOGO || '',
          footerText: process.env.VITE_FOOTER_TEXT || '',
          appVersion: process.env.npm_package_version || 'Unknown',
        },
      }),
      languageRouterPlugin(),
      flattenPagesPlugin(),
      rewriteHtmlPathsPlugin(),
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'stream', 'util', 'zlib', 'process'],
        globals: {
          Buffer: true,
          global: false,
          process: true,
        },
      }),
      viteStaticCopy({
        targets: staticCopyTargets,
      }),
      removeLargeWasmFilesPlugin(),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        compressionOptions: {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
            [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
          },
        },
        deleteOriginFile: false,
      }),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        compressionOptions: {
          level: 9,
        },
        deleteOriginFile: false,
      }),
    ],
    define: {
      __SIMPLE_MODE__: JSON.stringify(process.env.SIMPLE_MODE === 'true'),
      __BRAND_NAME__: JSON.stringify(process.env.VITE_BRAND_NAME || ''),
      __DISABLED_TOOLS__: JSON.stringify(
        (process.env.DISABLE_TOOLS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    },
    resolve: {
      alias: {
        '@/types': resolve(__dirname, 'src/js/types/index.ts'),
        '@': resolve(__dirname, 'src'),
        stream: 'stream-browserify',
        zlib: 'browserify-zlib',
      },
    },
    optimizeDeps: {
      include: ['pdfkit', 'blob-stream'],
      exclude: ['coherentpdf', 'wasm-vips'],
    },
    server: {
      host: process.env.VITE_DEV_HOST || 'localhost',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: process.env.SIMPLE_MODE === 'true'
            ? resolve(__dirname, 'simple-index.html')
            : resolve(__dirname, 'index.html'),
          about: resolve(__dirname, 'about.html'),
          contact: resolve(__dirname, 'contact.html'),
          faq: resolve(__dirname, 'faq.html'),
          privacy: resolve(__dirname, 'privacy.html'),
          terms: resolve(__dirname, 'terms.html'),
          licensing: resolve(__dirname, 'licensing.html'),
          tools: resolve(__dirname, 'tools.html'),
          '404': resolve(__dirname, '404.html'),
          'pdf-converter': resolve(__dirname, 'pdf-converter.html'),
          'pdf-editor': resolve(__dirname, 'pdf-editor.html'),
          'pdf-security': resolve(__dirname, 'pdf-security.html'),
          'pdf-merge-split': resolve(__dirname, 'pdf-merge-split.html'),
        },
        output: {
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? '';
            if (name.endsWith('.mjs')) {
              return 'assets/[name]-[hash].js';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/tests/setup.ts',
      coverage: {
        provider: 'v8' as const,
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/tests/',
          '*.config.ts',
          '**/*.d.ts',
          'dist/',
        ],
      },
    },
  };
});