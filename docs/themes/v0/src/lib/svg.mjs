/**
 * Générateurs SVG exécutés au build (aucun coût à l'exécution).
 *
 *  - cup()     : gobelet dessiné à l'échelle à partir des cotes publiées (mm) ;
 *  - lineup()  : plusieurs gobelets alignés sur une même ligne de base, même échelle ;
 *  - carton()  : carton de conditionnement en perspective isométrique ;
 *  - defs()    : dégradés partagés + sprite d'icônes, injectés une fois par page.
 *
 * Les gobelets sont des illustrations techniques, pas des photographies :
 * les pages les présentent toujours comme telles.
 */

const K = 0.17; // rapport des ellipses (angle de vue légèrement plongeant)
const n = (v) => Math.round(v * 100) / 100;
/** Séparateur de milliers : espace insécable U+00A0 (U+202F absent des polices auto-hébergées). */
export const fmt = (v) => v.toLocaleString('fr-FR').replace(/[\u202f\s]/g, '\u00a0');
const dimFont = (s) => Math.min(15, Math.max(10, s * 5));

const FINISH_BASE = {
  plain: '#FBF8F2',
  band: '#FBF8F2',
  brand: '#FBF8F2',
  ink: '#23201C',
  accent: '#CC3D14',
  line: '#FFFDF9',
};

/** Canevas commun à un ensemble de gobelets : même échelle, même ligne de base. */
export function canvasFor(set, s, dims) {
  const maxH = Math.max(...set.map((p) => p.height)) * s;
  const maxRt = (Math.max(...set.map((p) => p.top)) / 2) * s;
  const maxRb = (Math.max(...set.map((p) => p.bottom)) / 2) * s;
  const fs = dimFont(s);
  const top = maxRt * K + 5 + (dims ? 16 + fs : 2);
  const bottom = maxRb * K + (dims ? 18 + fs : 14);
  return { height: n(top + maxH + bottom), base: n(top + maxH), maxRt };
}

function geometry(p, s, cx, yb) {
  const rt = (p.top / 2) * s;
  const rb = (p.bottom / 2) * s;
  const H = p.height * s;
  const yt = yb - H;
  const eyT = rt * K;
  const eyB = rb * K;
  const rAt = (y) => rt + (rb - rt) * ((y - yt) / H);
  const body =
    `M${n(cx - rt)} ${n(yt)}L${n(cx - rb)} ${n(yb)}` +
    `A${n(rb)} ${n(eyB)} 0 0 0 ${n(cx + rb)} ${n(yb)}` +
    `L${n(cx + rt)} ${n(yt)}A${n(rt)} ${n(eyT)} 0 0 1 ${n(cx - rt)} ${n(yt)}Z`;
  // Arc avant d'une section horizontale (apparaît courbe sur un cylindre vu de dessus)
  const arc = (f, extra = 0) => {
    const y = yt + H * f;
    const r = rAt(y) + extra;
    return { y, r, d: `M${n(cx - r)} ${n(y)}A${n(r)} ${n(r * K)} 0 0 0 ${n(cx + r)} ${n(y)}` };
  };
  const band = (f1, f2) => {
    const a = arc(f1, 3);
    const b = arc(f2, 3);
    return (
      `M${n(cx - a.r)} ${n(a.y)}A${n(a.r)} ${n(a.r * K)} 0 0 0 ${n(cx + a.r)} ${n(a.y)}` +
      `L${n(cx + b.r)} ${n(b.y)}A${n(b.r)} ${n(b.r * K)} 0 0 1 ${n(cx - b.r)} ${n(b.y)}Z`
    );
  };
  return { rt, rb, H, yt, yb, eyT, eyB, body, arc, band };
}

function printLayer(finish, g, o, uid, cx) {
  const ink = o.ink ?? '#CC3D14';
  const rule = (f, color, w = 1.4) =>
    `<path d="${g.arc(f, 3).d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
  switch (finish) {
    case 'band':
      return `<path d="${g.band(0.4, 0.62)}" fill="${ink}"/>${rule(0.33, ink)}${rule(0.69, ink)}`;
    case 'ink':
      return `${rule(0.2, '#F5F0E8', 1)}${rule(0.82, '#F5F0E8', 1)}<path d="${g.band(0.7, 0.74)}" fill="#FF7A52"/>`;
    case 'accent':
      return `${rule(0.24, '#FBF8F2', 1.2)}${rule(0.3, '#FBF8F2', 0.8)}<path d="${g.band(0.74, 0.8)}" fill="#1C1A17"/>`;
    case 'brand': {
      const t = g.arc(0.585, 0);
      const fs = n(t.r * 0.17);
      // Tracé prolongé de part et d'autre : le texte centré n'est jamais tronqué (le débord est masqué par le clip).
      const tp = `M${n(cx - t.r - 40)} ${n(t.y)}L${t.d.slice(1)}L${n(cx + t.r + 40)} ${n(t.y)}`;
      // En mode « live » (atelier de personnalisation), la couleur vient de la variable CSS --print.
      const paint = o.live ? ' class="js-print"' : ` fill="${ink}"`;
      // Logo du client (atelier, aperçu local) : zone haute si un nom est saisi, zone pleine sinon.
      let logo = '';
      if (o.live) {
        const a = g.arc(0.405, 0);
        const b = g.arc(0.665, 0);
        const w = n(t.r * 1.15);
        const yTop = a.y + a.r * K + 2;
        const yText = t.y + t.r * K - fs * 0.95 - 3;
        const yFull = b.y + b.r * K - 3;
        const box = (y2) => `${n(cx - w / 2)} ${n(yTop)} ${w} ${n(y2 - yTop)}`;
        logo = `<image class="js-brand-logo" x="${n(cx - w / 2)}" y="${n(yTop)}" width="${w}" height="${n(yText - yTop)}" preserveAspectRatio="xMidYMid meet" data-box-top="${box(yText)}" data-box-full="${box(yFull)}"/>`;
      }
      return (
        `<path d="${g.band(0.36, 0.385)}"${paint}/>` +
        `<path d="${g.band(0.68, 0.705)}"${paint}/>` +
        logo +
        `<path id="tp-${uid}" d="${tp}" fill="none"/>` +
        `<text class="cup__brand${o.live ? ' js-print' : ''}"${o.live ? '' : ` fill="${ink}"`} font-size="${fs}" font-weight="700" letter-spacing="${n(fs * 0.06)}" text-anchor="middle" data-max="${n(t.r * 1.45)}">` +
        `<textPath href="#tp-${uid}" startOffset="50%"${o.live ? ' class="js-brand-text"' : ''}>${o.brandText ?? 'VOTRE MARQUE'}</textPath></text>`
      );
    }
    default:
      return '';
  }
}

/**
 * Gobelet à l'échelle.
 * @param {object} p  produit (top, bottom, height en mm)
 * @param {object} o  { scale, set, dims, finish, uid, title, className, fixedWidth, ghost, ink, brandText, live }
 */
export function cup(p, o = {}) {
  const s = o.scale ?? 2;
  const set = o.set ?? [p];
  const dims = Boolean(o.dims);
  const finish = o.finish ?? 'plain';
  const uid = `${o.uid ?? 'c'}-${p.id}`;
  const cv = canvasFor(set, s, dims);
  const fs = dimFont(s);
  const padL = 6;
  const padR = dims ? 16 + fs * 1.5 : 6;
  const halfW = o.fixedWidth ? cv.maxRt : (p.top / 2) * s;
  const W = n(padL + halfW * 2 + padR);
  const cx = padL + halfW;
  const g = geometry(p, s, cx, cv.base);
  const isLine = finish === 'line';

  const a11y = o.title
    ? `role="img" aria-labelledby="t-${uid}"><title id="t-${uid}">${o.title}</title`
    : 'aria-hidden="true" focusable="false"';

  let ghost = '';
  if (o.ghost && o.ghost.id !== p.id) {
    const gg = geometry(o.ghost, s, cx, cv.base);
    ghost =
      `<g class="cup__ghost" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 5" opacity=".38">` +
      `<path d="${gg.body}"/><ellipse cx="${n(cx)}" cy="${n(gg.yt)}" rx="${n(gg.rt)}" ry="${n(gg.eyT)}"/></g>`;
  }

  const shadow = isLine
    ? ''
    : `<ellipse class="cup__shadow" cx="${n(cx)}" cy="${n(g.yb + 1)}" rx="${n(g.rb * 1.75 + 6)}" ry="${n(g.eyB * 1.5 + 4)}" fill="url(#pc-shadow)"/>`;

  const bodyFill = isLine ? 'var(--color-surface, #FFFDF9)' : FINISH_BASE[finish];
  const body = isLine
    ? `<path d="${g.body}" fill="${bodyFill}" stroke="#1C1A17" stroke-width="1.3"/>` +
      `<path d="M${n(cx)} ${n(g.yt - g.eyT - 4)}V${n(g.yb + g.eyB + 4)}" stroke="#1C1A17" stroke-width=".8" stroke-dasharray="6 3 1 3" opacity=".55"/>`
    : `<clipPath id="cl-${uid}"><path d="${g.body}"/></clipPath>` +
      `<g class="cup__body"><path d="${g.body}" fill="${bodyFill}"/>` +
      `<g clip-path="url(#cl-${uid})">${printLayer(finish, g, o, uid, cx)}` +
      `<rect x="${n(cx - g.rt - 2)}" y="${n(g.yt - g.eyT)}" width="${n(g.rt * 2 + 4)}" height="${n(g.H + g.eyT + g.eyB + 2)}" fill="url(#pc-shade)"/></g>` +
      `<path d="${g.body}" fill="none" stroke="rgba(28,26,23,.16)" stroke-width="1"/></g>`;

  const rimW = n(Math.max(2.2, s * 1.25));
  const rim = isLine
    ? `<ellipse cx="${n(cx)}" cy="${n(g.yt)}" rx="${n(g.rt)}" ry="${n(g.eyT)}" fill="#F5F0E8" stroke="#1C1A17" stroke-width="1.3"/>` +
      `<ellipse cx="${n(cx)}" cy="${n(g.yt)}" rx="${n(g.rt - 3)}" ry="${n(g.eyT - 1.2)}" fill="none" stroke="#1C1A17" stroke-width=".7" opacity=".6"/>`
    : `<ellipse class="cup__inner" cx="${n(cx)}" cy="${n(g.yt)}" rx="${n(g.rt)}" ry="${n(g.eyT)}" fill="url(#pc-inner)"/>` +
      `<ellipse cx="${n(cx)}" cy="${n(g.yt)}" rx="${n(g.rt)}" ry="${n(g.eyT)}" fill="none" stroke="#FFFDF9" stroke-width="${rimW}"/>` +
      `<ellipse cx="${n(cx)}" cy="${n(g.yt)}" rx="${n(g.rt + rimW / 2)}" ry="${n(g.eyT + rimW / 2)}" fill="none" stroke="rgba(28,26,23,.22)" stroke-width=".8"/>`;

  let dimLayer = '';
  if (dims) {
    const ty = g.yt - g.eyT - rimW - 9;
    const hx = cx + g.rt + 12;
    const by = g.yb + g.eyB + 11;
    const line = (d) => `<path d="${d}" pathLength="1"/>`;
    dimLayer =
      `<g class="cup__dims" font-size="${fs}">` +
      `<g class="cup__dim-lines" fill="none" stroke="var(--dim-color, #CC3D14)" stroke-width="1">` +
      line(`M${n(cx - g.rt)} ${n(ty)}H${n(cx + g.rt)}`) +
      line(`M${n(cx - g.rt)} ${n(ty - 4)}v8M${n(cx + g.rt)} ${n(ty - 4)}v8`) +
      line(`M${n(hx)} ${n(g.yt)}V${n(g.yb)}`) +
      line(`M${n(hx - 4)} ${n(g.yt)}h8M${n(hx - 4)} ${n(g.yb)}h8`) +
      line(`M${n(cx - g.rb)} ${n(by)}H${n(cx + g.rb)}`) +
      line(`M${n(cx - g.rb)} ${n(by - 4)}v8M${n(cx + g.rb)} ${n(by - 4)}v8`) +
      `</g><g class="cup__dim-labels" fill="var(--dim-text, #1C1A17)">` +
      `<text x="${n(cx)}" y="${n(ty - 6)}" text-anchor="middle">Ø ${p.top} mm</text>` +
      `<text transform="translate(${n(hx + fs * 0.95)} ${n((g.yt + g.yb) / 2)}) rotate(-90)" text-anchor="middle">${p.height} mm</text>` +
      `<text x="${n(cx)}" y="${n(by + fs + 3)}" text-anchor="middle">Ø ${p.bottom} mm</text>` +
      `</g></g>`;
  }

  const cls = ['cup', `cup--${finish}`, o.className].filter(Boolean).join(' ');
  return (
    `<svg class="${cls}" viewBox="0 0 ${W} ${cv.height}" width="${W}" height="${cv.height}" ${a11y}>` +
    `${ghost}${shadow}${body}${rim}${dimLayer}</svg>`
  );
}

/** Largeur naturelle d'un gobelet (sert au flex-grow proportionnel). */
export function cupWidth(p, o = {}) {
  const s = o.scale ?? 2;
  const fs = dimFont(s);
  return n(6 + p.top * s + (o.dims ? 16 + fs * 1.5 : 6));
}

/**
 * Carton de conditionnement, perspective isométrique, proportions issues des dimensions publiées.
 */
export function carton(p, o = {}) {
  const s = o.scale ?? 0.42;
  const [Lmm, lmm, hmm] = p.carton;
  const L = Lmm * s;
  const l = lmm * s;
  const h = hmm * s;
  const c = Math.cos(Math.PI / 6);
  const pad = 46;
  const ox = l * c + pad;
  const oy = h + pad - 10;
  const P = (x, y, z) => [n(ox + (x - y) * c), n(oy + (x + y) * 0.5 - z)];
  const poly = (pts, fill, extra = '') =>
    `<polygon points="${pts.map((q) => q.join(',')).join(' ')}" fill="${fill}"${extra}/>`;
  const W = n((L + l) * c + pad * 2);
  const H = n(h + (L + l) * 0.5 + pad * 2 - 10);
  const t = l * 0.09;
  const edge = ' stroke="rgba(28,26,23,.28)" stroke-width=".8" stroke-linejoin="round"';

  const top = poly([P(0, 0, h), P(L, 0, h), P(L, l, h), P(0, l, h)], '#DDBF95', edge);
  const right = poly([P(L, 0, 0), P(L, l, 0), P(L, l, h), P(L, 0, h)], '#B58B5E', edge);
  const left = poly([P(0, l, 0), P(L, l, 0), P(L, l, h), P(0, l, h)], '#C99F70', edge);
  const tapeTop = poly([P(0, l / 2 - t, h), P(L, l / 2 - t, h), P(L, l / 2 + t, h), P(0, l / 2 + t, h)], 'rgba(255,253,249,.32)');
  const tapeSide = poly([P(L, l / 2 - t, h), P(L, l / 2 + t, h), P(L, l / 2 + t, h * 0.78), P(L, l / 2 - t, h * 0.78)], 'rgba(255,253,249,.26)');
  const seam = `<path d="M${P(0, l / 2, h).join(' ')}L${P(L, l / 2, h).join(' ')}" stroke="rgba(28,26,23,.35)" stroke-width=".8"/>`;

  // Étiquette posée sur la face gauche (plan y = l) : u le long de x, v vers le bas.
  const [ex, ey] = P(0, l, h);
  const lw = L * 0.62;
  const lh = Math.min(h * 0.34, 74);
  const lu = (L - lw) / 2;
  const lv = h * 0.3;
  const fsBig = n(Math.min(lw * 0.15, 20));
  const label =
    `<g transform="matrix(${n(c)} .5 0 1 ${ex} ${ey})">` +
    `<rect x="${n(lu)}" y="${n(lv)}" width="${n(lw)}" height="${n(lh)}" rx="3" fill="#FBF8F2" opacity=".94"/>` +
    `<text x="${n(lu + 10)}" y="${n(lv + lh * 0.42)}" font-size="${n(fsBig * 0.55)}" fill="#6B645A" letter-spacing=".08em">${p.model}</text>` +
    `<text x="${n(lu + 10)}" y="${n(lv + lh * 0.8)}" font-size="${fsBig}" font-weight="700" fill="#1C1A17">${p.perBox.toLocaleString('fr-FR').replace(/\s/g, ' ')} pcs</text>` +
    `</g>`;

  // Cotes
  const off = 16;
  const a = P(0, l, 0);
  const b = P(L, l, 0);
  const d = P(L, 0, 0);
  const nl = [-0.5, c]; // normale extérieure du bord avant gauche
  const nr = [0.5, c]; // normale extérieure du bord avant droit
  const shift = (q, v, k) => [n(q[0] + v[0] * k), n(q[1] + v[1] * k)];
  const mid = (q, r) => [n((q[0] + r[0]) / 2), n((q[1] + r[1]) / 2)];
  const [a1, b1] = [shift(a, nl, off), shift(b, nl, off)];
  const [b2, d2] = [shift(b, nr, off), shift(d, nr, off)];
  const top0 = P(0, l, h);
  const hx = n(a[0] - off);
  const m1 = shift(mid(a, b), nl, off + 13);
  const m2 = shift(mid(b, d), nr, off + 13);
  const dimsLayer =
    `<g class="carton__dims" font-size="12" fill="var(--dim-text, #1C1A17)">` +
    `<g fill="none" stroke="var(--dim-color, #CC3D14)" stroke-width="1">` +
    `<path pathLength="1" d="M${a1.join(' ')}L${b1.join(' ')}"/>` +
    `<path pathLength="1" d="M${b2.join(' ')}L${d2.join(' ')}"/>` +
    `<path pathLength="1" d="M${hx} ${a[1]}V${top0[1]}"/>` +
    `<path pathLength="1" d="M${hx - 4} ${a[1]}h8M${hx - 4} ${top0[1]}h8"/>` +
    `</g>` +
    `<text transform="translate(${m1.join(' ')}) rotate(30)" text-anchor="middle">${Lmm}</text>` +
    `<text transform="translate(${m2.join(' ')}) rotate(-30)" text-anchor="middle">${lmm}</text>` +
    `<text transform="translate(${n(hx - 9)} ${n((a[1] + top0[1]) / 2)}) rotate(-90)" text-anchor="middle">${hmm}</text>` +
    `</g>`;

  const a11y = o.title
    ? `role="img" aria-labelledby="ct-${p.id}"><title id="ct-${p.id}">${o.title}</title`
    : 'aria-hidden="true" focusable="false"';
  return (
    `<svg class="carton" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${a11y}>` +
    `<ellipse cx="${n(ox + (L - l) * c * 0.5)}" cy="${n(oy + (L + l) * 0.5 - 4)}" rx="${n((L + l) * c * 0.55)}" ry="${n((L + l) * 0.12)}" fill="url(#pc-shadow)"/>` +
    `${left}${right}${top}${tapeTop}${tapeSide}${seam}${label}${dimsLayer}</svg>`
  );
}

/* ---------------------------------------------------------------- Icônes */

const ICONS = {
  phone:
    '<path d="M6.6 3.5h2.6l1.6 4.3-2 1.3a10.6 10.6 0 0 0 6.1 6.1l1.3-2 4.3 1.6v2.6a2.1 2.1 0 0 1-2.2 2.1A16.4 16.4 0 0 1 4.5 5.7a2.1 2.1 0 0 1 2.1-2.2z"/>',
  'arrow-right': '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  'chevron-down': '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  menu: '<path d="M4 7.5h16M4 12h16M4 16.5h10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  'map-pin':
    '<path d="M12 21s-6.8-6-6.8-11.2a6.8 6.8 0 0 1 13.6 0C18.8 15 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  facebook:
    '<path d="M14.2 21v-7.6h2.6l.4-3.1h-3V8.4c0-.9.3-1.5 1.6-1.5h1.6V4.1a21 21 0 0 0-2.4-.1c-2.3 0-3.9 1.4-3.9 4v2.3H8.5v3.1h2.6V21"/>',
  'cup-hot':
    '<path d="M5.5 9h13l-1.6 10.8a1.4 1.4 0 0 1-1.4 1.2h-7a1.4 1.4 0 0 1-1.4-1.2z"/><path d="M4.5 9h15"/><path d="M10 2.8c-.8.8.8 1.7 0 2.6M14 2.8c-.8.8.8 1.7 0 2.6"/>',
  'cup-cold':
    '<path d="M5.5 8h13l-1.6 11.8a1.4 1.4 0 0 1-1.4 1.2h-7a1.4 1.4 0 0 1-1.4-1.2z"/><path d="M4.5 8h15M13 8l1.6-5.5h3"/><path d="M9.5 13.5h2.5v2.5H9.5zM12.8 15.8h2v2h-2z"/>',
  ruler:
    '<path d="m3.5 15.8 12.3-12.3 4.7 4.7L8.2 20.5z"/><path d="m7.6 11.7 1.8 1.8M10.4 8.9l1.2 1.2M13.2 6.1l1.8 1.8"/>',
  box: '<path d="M3.5 7.6 12 3.4l8.5 4.2v8.8L12 20.6l-8.5-4.2z"/><path d="M3.5 7.6 12 11.8l8.5-4.2M12 11.8v8.8"/>',
  palette:
    '<path d="M12 3.4a8.6 8.6 0 1 0 0 17.2c1 0 1.5-.6 1.5-1.4 0-.4-.2-.8-.5-1.1a1.5 1.5 0 0 1 1.1-2.5h1.8a4.7 4.7 0 0 0 4.7-4.7c0-4.2-3.8-7.5-8.6-7.5z"/><circle cx="7.7" cy="11.2" r="1"/><circle cx="10.2" cy="7.6" r="1"/><circle cx="14.6" cy="7.8" r="1"/>',
  check: '<path d="m5 12.5 4.6 4.5L19 7.5"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.4a1.9 1.9 0 0 0-1.9-1.9H6.4a1.9 1.9 0 0 0-1.9 1.9v7.2a1.9 1.9 0 0 0 1.9 1.9h2.1"/>',
  factory:
    '<path d="M3.5 20.5V10l5 3v-3l5 3V6.5l7-3v17z"/><path d="M7 17h1.5M11.5 17H13M16 17h1.5"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="15.5" rx="2"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/>',
  leaf: '<path d="M5.5 19C5.5 10.6 10.3 5.6 19.5 4.5c-.7 9.9-5.7 14.8-13.6 14.6z"/><path d="M5.5 19c2.6-3.9 5.6-6.4 9-7.8"/>',
  layers: '<path d="m12 3.5 8.5 4.3L12 12 3.5 7.8z"/><path d="m3.5 12 8.5 4.2 8.5-4.2M3.5 16.2l8.5 4.3 8.5-4.3"/>',
  clipboard:
    '<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3.6c0-.3.3-.6.6-.6h4.8c.3 0 .6.3.6.6v.9M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
  register:
    '<circle cx="12" cy="12" r="5.2"/><path d="M12 2.5v19M2.5 12h19"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  printer:
    '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.2v.2"/>',
  paperclip:
    '<path d="m19.2 11.6-7.4 7.4a4.8 4.8 0 0 1-6.8-6.8l7.9-7.9a3.2 3.2 0 0 1 4.5 4.5l-7.9 7.9a1.6 1.6 0 0 1-2.3-2.3l7.2-7.2"/>',
  upload: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 14.5v3.7a2.3 2.3 0 0 0 2.3 2.3h10.4a2.3 2.3 0 0 0 2.3-2.3v-3.7"/>',
  file: '<path d="M13.5 3.5H7.2a1.7 1.7 0 0 0-1.7 1.7v13.6a1.7 1.7 0 0 0 1.7 1.7h9.6a1.7 1.7 0 0 0 1.7-1.7V8.5z"/><path d="M13.5 3.5v5h5"/>',
  'ice-cream': '<path d="M6.8 11.5h10.4l-1.5 8.1a1.4 1.4 0 0 1-1.4 1.1H9.7a1.4 1.4 0 0 1-1.4-1.1z"/><path d="M7.8 11.5a4.2 4.2 0 0 1 8.4 0"/><path d="M12 7.3V5.5"/>',
  bag: '<path d="M6.5 4h11l1 16.5h-13z"/><path d="M9.5 4v1.8a2.5 2.5 0 0 0 5 0V4"/>',
  tray: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.6"/><path d="M7 9.5h5.5M7 12.5h10M7 15.5h7.5"/>',
  chat: '<path d="M5.2 19.4 6.3 16A7.6 7.6 0 1 1 9 18.6z"/><path d="M9.3 9.6c.3 2.4 2 4.2 4.6 4.8l.9-1.2 1.7.8-.4 1.4c-3.6.3-7.3-3.4-7.2-7l1.4-.4.8 1.7z"/>',
  trash:
    '<path d="M4.5 7h15M9.5 7V4.8c0-.4.3-.8.8-.8h3.4c.5 0 .8.4.8.8V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/><path d="M10.2 11v5.5M13.8 11v5.5"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="icon${cls ? ' ' + cls : ''}" width="24" height="24" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

/** Dégradés partagés + symboles d'icônes. À injecter une seule fois, en début de <body>. */
export function defs() {
  const symbols = Object.entries(ICONS)
    .map(
      ([id, d]) =>
        `<symbol id="i-${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`,
    )
    .join('');
  return (
    `<svg class="svg-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>` +
    `<linearGradient id="pc-shade" x1="0" x2="1" y1="0" y2="0">` +
    `<stop offset="0" stop-color="#1C1A17" stop-opacity=".22"/>` +
    `<stop offset=".12" stop-color="#1C1A17" stop-opacity=".04"/>` +
    `<stop offset=".26" stop-color="#FFFFFF" stop-opacity=".42"/>` +
    `<stop offset=".4" stop-color="#FFFFFF" stop-opacity="0"/>` +
    `<stop offset=".72" stop-color="#1C1A17" stop-opacity=".05"/>` +
    `<stop offset="1" stop-color="#1C1A17" stop-opacity=".3"/></linearGradient>` +
    `<linearGradient id="pc-inner" x1="0" x2="0" y1="0" y2="1">` +
    `<stop offset="0" stop-color="#C9BDA9"/><stop offset=".55" stop-color="#E4DACB"/><stop offset="1" stop-color="#F3EDE3"/></linearGradient>` +
    `<radialGradient id="pc-shadow"><stop offset="0" stop-color="#1C1A17" stop-opacity=".34"/><stop offset=".55" stop-color="#1C1A17" stop-opacity=".12"/><stop offset="1" stop-color="#1C1A17" stop-opacity="0"/></radialGradient>` +
    `</defs>${symbols}</svg>`
  );
}
