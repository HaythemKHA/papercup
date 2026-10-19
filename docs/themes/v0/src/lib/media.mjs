/**
 * Images responsives : <picture> AVIF + WebP, srcset/sizes, dimensions explicites (zéro CLS).
 * Les variantes sont produites par tools/optimize-images.py, qui écrit src/data/media.json.
 */
import { readFileSync } from 'node:fs';

const media = JSON.parse(readFileSync(new URL('../data/media.json', import.meta.url), 'utf8'));

export const mediaInfo = (key) => {
  const m = media[key];
  if (!m) throw new Error(`Image inconnue : ${key} (relancer tools/optimize-images.py ?)`);
  return m;
};

const srcset = (r, key, ext) =>
  mediaInfo(key)
    .variants.map((v) => `${r}assets/images/${key}-${v.w}.${ext} ${v.w}w`)
    .join(', ');

/** URL de la variante la plus proche d'une largeur donnée (préchargement, Open Graph…). */
export const mediaUrl = (r, key, width = 800, ext = 'webp') => {
  const vs = mediaInfo(key).variants;
  const v = vs.find((x) => x.w >= width) ?? vs[vs.length - 1];
  return `${r}assets/images/${key}-${v.w}.${ext}`;
};

/**
 * @param {string} key     clé du manifeste (ex. « products/gobelet-9-oz »)
 * @param {object} o       { r, alt, sizes, className, imgClass, priority, fallback }
 */
export function picture(key, o = {}) {
  const { r = '', alt = '', sizes = '100vw', className = '', imgClass = '', priority = false, fallback = 800 } = o;
  const vs = mediaInfo(key).variants;
  const f = vs.find((v) => v.w >= fallback) ?? vs[vs.length - 1];
  const loading = priority ? ' fetchpriority="high"' : ' loading="lazy"';
  return (
    `<picture${className ? ` class="${className}"` : ''}>` +
    `<source type="image/avif" srcset="${srcset(r, key, 'avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${srcset(r, key, 'webp')}" sizes="${sizes}">` +
    `<img src="${r}assets/images/${key}-${f.w}.webp" width="${f.w}" height="${f.h}" alt="${alt}"${loading} decoding="async"${imgClass ? ` class="${imgClass}"` : ''}>` +
    `</picture>`
  );
}

/** <link rel="preload"> pour l'image LCP (AVIF, même srcset/sizes que le <picture>). */
export const preloadImage = (r, key, sizes) =>
  `<link rel="preload" as="image" type="image/avif" href="${mediaUrl(r, key, 720, 'avif')}" imagesrcset="${srcset(r, key, 'avif')}" imagesizes="${sizes}" fetchpriority="high">`;
