#!/usr/bin/env node
/**
 * PAPER CUP — Thème v0 · build
 *
 *   node build.mjs          génère les pages HTML, les bundles CSS/JS, sitemap.xml,
 *                           robots.txt et site.webmanifest.
 *
 * Aucune dépendance : Node.js ≥ 18 suffit. Les sources sont dans src/ (pages, gabarits,
 * données) et assets/css|js (styles et scripts). Les fichiers générés sont commités pour
 * que le thème s'ouvre sans étape de build.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { site } from './src/data/site.mjs';
import { render, absUrl } from './src/partials/layout.mjs';
import { homePage } from './src/pages/home.mjs';
import { productsPage, productPages } from './src/pages/products.mjs';
import { customPage, aboutPage, faqPage, contactPage, notFoundPage } from './src/pages/pages.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const out = (p) => join(ROOT, p);

const PAGES = [homePage, productsPage, ...productPages, customPage, aboutPage, faqPage, contactPage, notFoundPage];

const CSS = ['style', 'components', 'utilities', 'responsive'];
const JS = ['main', 'navigation', 'animations', 'components', 'forms'];

/** Minification CSS prudente : commentaires et espaces superflus uniquement. */
const minifyCSS = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();

async function bundles() {
  const css = (await Promise.all(CSS.map((f) => readFile(out(`assets/css/${f}.css`), 'utf8')))).join('\n');
  const banner = `/*! PAPER CUP — thème v0 · généré par build.mjs, ne pas modifier : éditer assets/css/*.css */`;
  await writeFile(out('assets/css/theme.bundle.css'), `${banner}\n${minifyCSS(css)}\n`);

  const js = (await Promise.all(JS.map((f) => readFile(out(`assets/js/${f}.js`), 'utf8')))).join('\n');
  await writeFile(
    out('assets/js/theme.bundle.js'),
    `/*! PAPER CUP — thème v0 · généré par build.mjs, ne pas modifier : éditer assets/js/*.js */\n${js}\nwindow.PC.start();\n`,
  );
  return { css: Buffer.byteLength(minifyCSS(css)), js: Buffer.byteLength(js) };
}

async function pages() {
  const written = [];
  for (const page of PAGES) {
    const depth = page.path.split('/').length - 1;
    const r = page.root ?? '../'.repeat(depth);
    const html = render(page, page.main(r), r);
    await mkdir(dirname(out(page.path)), { recursive: true });
    await writeFile(out(page.path), html);
    written.push(page.path);
  }
  return written;
}

async function seoFiles() {
  const urls = PAGES.filter((p) => !p.noindex)
    .map((p) => {
      const priority = p.path === 'index.html' ? '1.0' : p.path.startsWith('produits') ? '0.8' : '0.6';
      return `  <url>\n    <loc>${absUrl(p.path)}</loc>\n    <lastmod>${site.lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');
  await writeFile(
    out('sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  await writeFile(
    out('robots.txt'),
    `# PAPER CUP — à placer à la racine du domaine de production.\n# Sur un environnement de recette, remplacer par « Disallow: / ».\nUser-agent: *\nAllow: /\n\nSitemap: ${site.baseUrl}/sitemap.xml\n`,
  );
  await writeFile(
    out('site.webmanifest'),
    JSON.stringify(
      {
        name: `${site.name} — Gobelets Tunisie`,
        short_name: site.name,
        lang: 'fr',
        start_url: './index.html',
        display: 'standalone',
        background_color: '#F5F0E8',
        theme_color: '#F5F0E8',
        icons: [
          { src: 'assets/images/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/images/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'assets/images/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      null,
      2,
    ) + '\n',
  );
}

/** Mise en forme lisible des pages générées si Prettier est disponible (facultatif). */
function format(files) {
  try {
    execFileSync('prettier', ['--log-level', 'warn', '--print-width', '120', '--write', ...files], { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

const t0 = Date.now();
const sizes = await bundles();
const files = await pages();
await seoFiles();
const formatted = process.argv.includes('--no-format') ? false : format(files);
console.log(
  `✓ ${files.length} pages · CSS ${(sizes.css / 1024).toFixed(1)} Ko · JS ${(sizes.js / 1024).toFixed(1)} Ko` +
    `${formatted ? ' · Prettier' : ''} · ${Date.now() - t0} ms`,
);
for (const f of files) console.log(`  ${posix.normalize(f)}`);
