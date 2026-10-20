/**
 * PAPER CUP — tests de bout en bout des formulaires avec pièces jointes (navigateur réel).
 *
 *   node tests/e2e.mjs        (depuis docs/themes/v0)
 *
 * Prérequis : PHP 8.1+ et Playwright (non inclus dans le thème ; s'il est installé hors du projet :
 * PLAYWRIGHT_MODULE=/chemin/vers/node_modules/playwright/index.mjs node tests/e2e.mjs). Démarre deux serveurs : PHP (formulaires connectés) et statique
 * (mode préparation, sans API), puis vérifie interface, envoi, erreurs, reprise et accessibilité.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

let chromium;
try {
  // PLAYWRIGHT_MODULE : chemin d'un Playwright installé ailleurs (ex. installation globale).
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'));
} catch {
  console.log('Playwright introuvable : tests de bout en bout ignorés.');
  process.exit(0);
}

const THEME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = mkdtempSync(join(tmpdir(), 'pc-e2e-'));
const STORAGE = join(TMP, 'data');
const PHP_PORT = 8195;
const STATIC_PORT = 8196;
const PROXY_PORT = 8206;
const PHP = `http://127.0.0.1:${PHP_PORT}`;
const STATIC = `http://127.0.0.1:${STATIC_PORT}`;
const PROXY = `http://127.0.0.1:${PROXY_PORT}`;

/* ------------------------------------------------------------- Fichiers */
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function png(w, h, rgb = [0xcc, 0x3d, 0x14]) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: w }, () => Buffer.from(rgb)))]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const F = (name, buf) => {
  const p = join(TMP, name);
  writeFileSync(p, buf);
  return p;
};
const LOGO = F('logo-client.png', png(120, 60));
const PDF = F('brief.pdf', Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'));
const FAKE = F('faux-logo.png', Buffer.from('ceci n’est pas une image'));
const GIF = F('anim.gif', Buffer.from('GIF89a'));
const BIG = F('trop-gros.png', Buffer.concat([png(4, 4), Buffer.alloc(1100 * 1024)]));

/* ------------------------------------------------------------- Serveurs */
const php = spawn(
  'php',
  ['-d', 'display_errors=0', '-d', 'upload_max_filesize=1M', '-d', 'post_max_size=4M', '-S', `127.0.0.1:${PHP_PORT}`, '-t', THEME, join(THEME, 'tests/router.php')],
  { env: { ...process.env, PC_STORAGE_DIR: STORAGE, PC_MAIL_TRANSPORT: 'file', PC_RATE_LIMIT_MAX: '1000' }, stdio: 'ignore' },
);
// Hébergement statique (sans PHP) : les fichiers .php sont servis comme du texte, l'API ne répond pas.
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.json': 'application/json', '.php': 'text/plain' };
const staticServer = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, STATIC).pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(THEME, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(THEME) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(req.method === 'POST' ? 405 : 404).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(STATIC_PORT, '127.0.0.1');

// Mandataire qui simule une coupure réseau réelle : la requête (fichiers compris) atteint le serveur,
// qui l'enregistre, mais la connexion du navigateur est coupée avant la réponse.
let cutNext = false;
const proxy = createServer((req, res) => {
  const cut = cutNext && req.method === 'POST' && req.url.startsWith('/api/demande.php');
  if (cut) cutNext = false;
  const up = httpRequest({ host: '127.0.0.1', port: PHP_PORT, method: req.method, path: req.url, headers: req.headers }, (upRes) => {
    if (cut) {
      upRes.resume();
      upRes.on('end', () => req.socket.destroy());
      return;
    }
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res);
  });
  req.pipe(up);
}).listen(PROXY_PORT, '127.0.0.1');

for (let i = 0; i < 50; i++) {
  try {
    await fetch(PHP + '/api/demande.php');
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}

const requests = () => (existsSync(join(STORAGE, 'requests')) ? readdirSync(join(STORAGE, 'requests')).filter((d) => d.startsWith('PC-')) : []);
const load = (id) => JSON.parse(readFileSync(join(STORAGE, 'requests', id, 'request.json'), 'utf8'));

/* ------------------------------------------------------------- Assertions */
let pass = 0;
let fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? '✔' : '✖'} ${label}${!cond && detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
const errors = [];
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(m.text())) errors.push(m.text());
  });
  return page;
};
const fillContact = async (p) => {
  await p.fill('#f-name', 'Client Test');
  await p.fill('#f-phone', '+216 75 290 088');
  await p.fill('#f-email', 'client@example.com');
  await p.fill('#f-company', 'Café Test');
};

try {
  /* ---------------------------------------------- Demande de devis : connecté */
  let p = await newPage();
  await p.goto(PHP + '/contact.html');
  await p.waitForFunction(() => document.querySelector('#devis').classList.contains('is-connected'));
  ok('Devis : mode connecté détecté (API PHP)', true);
  ok('Devis : bouton « Envoyer ma demande »', (await p.innerText('#devis [type=submit]')).includes('Envoyer ma demande'));
  ok('Devis : titre et texte de la zone de pièces jointes', (await p.innerText('#devis .attach__title')).includes('Vous avez un logo ou un exemple à nous montrer') && (await p.innerText('#devis .attach__help')).includes('préparer une proposition adaptée'));
  ok('Devis : bouton « Ajouter des fichiers »', (await p.innerText('#devis [data-attach-button]')).includes('Ajouter des fichiers'));
  ok('Devis : limites réelles du serveur affichées', /1\sMo par fichier/.test(await p.innerText('#devis [data-attach-rules]')), await p.innerText('#devis [data-attach-rules]'));
  ok('Devis : champ fichier natif hors tabulation', (await p.getAttribute('#devis-files-input', 'tabindex')) === '-1');

  // Sans fichier
  let before = requests().length;
  await fillContact(p);
  await p.click('#devis [type=submit]');
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  const text = await p.innerText('[data-result-text]');
  const ref = (text.match(/PC-\d{8}-[A-Z2-9]{5}/) || [])[0];
  ok('Devis sans fichier : envoyé, référence affichée', Boolean(ref) && requests().length === before + 1, text);
  ok('Devis sans fichier : rattaché, aucun fichier', ref && load(ref).files.length === 0 && load(ref).fields.nom === 'Client Test');
  ok('Devis : bouton mailto masqué après envoi réel', await p.isHidden('[data-mailto]'));

  // Nouvelle demande avec fichiers
  await p.click('[data-quote-edit]');
  await p.setInputFiles('#devis-files-input', [LOGO, PDF]);
  ok('Pièces jointes : deux fichiers listés (nom + taille)', (await p.locator('#devis .attach__item').count()) === 2 && /logo-client\.png/.test(await p.innerText('#devis .attach__list')) && /Ko/.test(await p.innerText('#devis .attach__list')));
  ok('Pièces jointes : aperçu de l’image', (await p.locator('#devis .attach__thumb img').count()) === 1);
  await p.setInputFiles('#devis-files-input', [GIF, BIG]);
  const errText = await p.innerText('#devis [data-attach-errors]');
  ok('Pièces jointes : format et taille refusés côté navigateur', /anim\.gif.*format non accepté/s.test(errText) && /trop-gros\.png.*trop volumineux/s.test(errText), errText);
  await p.setInputFiles('#devis-files-input', [LOGO]);
  ok('Pièces jointes : doublon ignoré', /déjà dans la liste/.test(await p.innerText('#devis [data-attach-errors]')) && (await p.locator('#devis .attach__item').count()) === 2);
  await p.click('#devis .attach__item:nth-child(2) .attach__remove');
  ok('Pièces jointes : retrait avant envoi', (await p.locator('#devis .attach__item').count()) === 1);
  ok('Pièces jointes : focus déplacé après retrait', await p.evaluate(() => document.activeElement.matches('.attach__remove, [data-attach-button]')));
  // Glisser-déposer (événement drop avec un vrai fichier)
  await p.evaluate(async () => {
    const dt = new DataTransfer();
    dt.items.add(new File(['%PDF-1.4\n%%EOF\n'], 'depose.pdf', { type: 'application/pdf' }));
    const zone = document.querySelector('#devis [data-attach-zone]');
    zone.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  ok('Pièces jointes : glisser-déposer', /depose\.pdf/.test(await p.innerText('#devis .attach__list')));
  before = requests().length;
  await p.click('#devis [type=submit]');
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  const ref2 = ((await p.innerText('[data-result-text]')).match(/PC-\d{8}-[A-Z2-9]{5}/) || [])[0];
  const saved2 = ref2 && load(ref2);
  ok('Devis avec fichiers : enregistré avec ses 2 fichiers', saved2 && saved2.files.length === 2 && saved2.files[0].name === 'logo-client.png' && saved2.files[1].name === 'depose.pdf');
  ok('Devis avec fichiers : récapitulatif liste les fichiers transmis', /Fichiers transmis :[\s\S]*logo-client\.png/.test(await p.innerText('[data-quote-summary]')));
  ok('Devis avec fichiers : une seule demande créée', requests().length === before + 1);
  const outbox = readdirSync(join(STORAGE, 'outbox')).find((f) => f.startsWith(ref2));
  ok('Notification interne générée pour la demande', Boolean(outbox));

  /* ------------------------------ Refus serveur : saisie et fichiers conservés */
  await p.click('[data-quote-edit]');
  ok('Nouvelle demande : fichiers retirés, coordonnées conservées', (await p.locator('#devis .attach__item').count()) === 0 && (await p.inputValue('#f-name')) === 'Client Test');
  await p.fill('#f-msg', 'Message à conserver');
  await p.setInputFiles('#devis-files-input', [FAKE, LOGO]);
  before = requests().length;
  await p.click('#devis [type=submit]');
  await p.waitForSelector('#devis [data-form-errors]:not([hidden])');
  ok('Refus serveur : fichier signalé dans la liste', /ne correspond pas/.test(await p.innerText('#devis .attach__item.is-error')));
  ok('Refus serveur : message et données conservés', (await p.inputValue('#f-msg')) === 'Message à conserver' && (await p.locator('#devis .attach__item').count()) === 2 && requests().length === before);
  await p.click('#devis .attach__item.is-error .attach__remove');
  await p.click('#devis [type=submit]');
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  ok('Refus serveur : renvoi après retrait du fichier refusé', requests().length === before + 1);

  /* ------------------------- Coupure réseau après traitement : pas de doublon */
  await p.goto(PROXY + '/contact.html');
  await p.waitForFunction(() => document.querySelector('#devis').classList.contains('is-connected'));
  await fillContact(p);
  await p.fill('#f-msg', 'Test de coupure réseau');
  await p.setInputFiles('#devis-files-input', [LOGO, PDF]);
  before = requests().length;
  cutNext = true;
  await p.click('#devis [type=submit]');
  await p.waitForSelector('#devis [data-form-errors]:not([hidden])');
  ok('Coupure réseau : la demande a bien atteint le serveur (fichiers compris)', requests().length === before + 1 && load(requests().sort().slice(-1)[0]) && true);
  ok('Coupure réseau : erreur affichée, saisie et fichiers conservés', /interrompue/.test(await p.innerText('#devis [data-form-errors]')) && (await p.inputValue('#f-msg')) === 'Test de coupure réseau' && (await p.locator('#devis .attach__item').count()) === 2);
  await p.click('#devis [type=submit]');
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  ok('Coupure réseau : nouvel essai sans doublon', requests().length === before + 1 && /déjà été enregistrée/.test(await p.innerText('[data-result-text]')), `${requests().length - before} demande(s)`);
  ok('Coupure réseau : fichiers listés d’après la réponse du serveur', /Fichiers transmis :[\s\S]*logo-client\.png[\s\S]*brief\.pdf/.test(await p.innerText('[data-quote-summary]')));

  /* ----------------------- Coupure réseau puis saisie modifiée : remplacement signalé */
  await p.click('[data-quote-edit]');
  await p.fill('#f-msg', 'Avant modification');
  before = requests().length;
  cutNext = true;
  await p.click('#devis [type=submit]');
  await p.waitForSelector('#devis [data-form-errors]:not([hidden])');
  const firstRef = requests().filter((id) => load(id).fields.message === 'Avant modification')[0];
  await p.fill('#f-msg', 'Après modification');
  await p.click('#devis [type=submit]');
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  const refEdit = ((await p.innerText('[data-result-text]')).match(/Référence : (PC-\d{8}-[A-Z2-9]{5})/) || [])[1];
  ok('Saisie modifiée après une coupure : version confirmée = version envoyée', refEdit && load(refEdit).fields.message === 'Après modification' && /Après modification/.test(await p.innerText('[data-quote-summary]')), refEdit);
  ok('Saisie modifiée après une coupure : remplacement signalé au visiteur et enregistré', Boolean(firstRef) && load(refEdit).meta.replaces === firstRef && (await p.innerText('[data-result-text]')).includes('remplace la demande ' + firstRef) && requests().length === before + 2);

  /* ---------------------------------------------- Autre emballage (sans format) */
  await p.click('[data-quote-edit]');
  await p.click('label:has(#f-type-autre)');
  ok('« Autre emballage » : aucun format imposé, libellés adaptés', (await p.locator('#devis input[name="format"]:checked').count()) === 0 && (await p.innerText('[data-qty-label]')) === 'Quantité' && (await p.isHidden('[data-format-req]')));
  await p.fill('#f-qty', '300');
  await p.fill('#f-msg', 'Pochettes personnalisées taille 2');
  before = requests().length;
  await p.click('#devis [type=submit]');
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  const refOther = ((await p.innerText('[data-result-text]')).match(/PC-\d{8}-[A-Z2-9]{5}/) || [])[0];
  ok('« Autre emballage » : envoyé sans format ni minimum gobelets', refOther && load(refOther).fields.type === 'autre' && load(refOther).fields.format === '' && /Autre emballage/.test(await p.innerText('[data-quote-summary]')) && !/Format/.test(await p.innerText('[data-quote-summary]')));
  await p.goto(PHP + '/contact.html?type=autre#devis');
  ok('« Autre emballage » : pré-rempli depuis les liens de la gamme, sans format coché', (await p.isChecked('#f-type-autre')) && (await p.locator('#devis input[name="format"]:checked').count()) === 0);
  await p.click('label:has(#f-type-perso)');
  ok('Retour à « Personnalisé » : format par défaut rétabli', await p.isChecked('#f-format-12oz'));

  /* ------------------------------------------------- Double clic sur l'envoi */
  await fillContact(p);
  await p.click('label:has(#f-type-perso)');
  await p.click('label:has(#f-format-9oz)');
  await p.fill('#f-qty', '5000');
  await p.fill('#f-msg', 'Double clic');
  before = requests().length;
  await p.locator('#devis [type=submit]').dblclick();
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  await p.waitForTimeout(300);
  ok('Double clic : une seule demande', requests().length === before + 1);
  await p.close();

  /* ----------------------------------------------- Essayez votre marque : connecté */
  p = await newPage();
  await p.goto(PHP + '/index.html');
  await p.waitForFunction(() => document.querySelector('#home-studio').classList.contains('is-connected'));
  await p.locator('#home-studio').scrollIntoViewIfNeeded();
  await p.waitForTimeout(300); // rendu différé des sections (content-visibility)
  ok('Essai : titre et texte de la zone de pièces jointes', (await p.innerText('#home-studio .attach__title')).includes('Vous avez déjà une idée du design') && (await p.innerText('#home-studio .attach__help')).includes('Cette étape est facultative'));
  ok('Essai : bouton « Joindre des fichiers »', (await p.innerText('#home-studio [data-attach-button]')).includes('Joindre des fichiers'));
  ok('Essai : coordonnées visibles en mode connecté', await p.isVisible('#home-studio-nom'));
  await p.fill('#home-studio-name', 'Café Soleil');
  await p.click('#home-studio .swatch:nth-child(5)');
  await p.setInputFiles('#home-studio-files-input', [LOGO]);
  const href = await p.getAttribute('[data-studio-cup="12oz"] .js-brand-logo', 'href');
  ok('Essai : logo affiché sur l’aperçu du gobelet', /^blob:/.test(href || ''));
  ok('Essai : avertissement sur le lien de devis quand des fichiers sont joints', await p.isVisible('#home-studio [data-cta-note]'));
  await p.focus('#home-studio input[data-studio-format][value="9oz"]');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  ok('Essai : Entrée sur un format ne soumet pas le formulaire', (await p.isHidden('#home-studio [data-form-errors]')) && p.url().endsWith('/index.html'));
  await p.click('#home-studio [type=submit]');
  ok('Essai : coordonnées requises', /Indiquez votre nom/.test(await p.innerText('#home-studio [data-form-errors]')));
  await p.fill('#home-studio-nom', 'Client Essai');
  await p.fill('#home-studio-tel', '26 880 202');
  before = requests().length;
  await p.click('#home-studio [type=submit]');
  await p.waitForSelector('#home-studio [data-brand-result]:not([hidden])');
  const ref3 = await p.innerText('#home-studio [data-result-ref]');
  const s3 = load(ref3);
  ok('Essai : demande enregistrée (marque, teinte, format, logo)', s3.fields.formulaire === 'essai' && s3.fields.marque === 'Café Soleil' && s3.fields.encre === '#2C4A7A' && s3.fields.format === '12oz' && s3.files.length === 1, JSON.stringify(s3.fields));
  ok('Essai : une seule demande', requests().length === before + 1);
  await p.click('#home-studio [data-brand-again]');
  ok('Essai : nouvelle demande possible', (await p.locator('#home-studio .attach__item').count()) === 0 && (await p.isVisible('#home-studio [type=submit]')));
  // Essai sans fichier
  before = requests().length;
  await p.click('#home-studio [type=submit]');
  await p.waitForSelector('#home-studio [data-brand-result]:not([hidden])');
  ok('Essai sans fichier : envoyé', requests().length === before + 1 && load(await p.innerText('#home-studio [data-result-ref]')).files.length === 0);
  await p.close();

  /* -------------------------- Envoi pendant le chargement de la configuration */
  p = await newPage();
  await p.route('**/api/demande.php', async (route) => {
    if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, 1500));
    return route.continue();
  });
  await p.goto(PHP + '/contact.html');
  await p.click('#devis [type=submit]');
  ok('Configuration en cours de chargement : bouton occupé, focus conservé, état annoncé', await p.$eval('#devis [type=submit]', (b) => b.getAttribute('aria-disabled') === 'true' && b.getAttribute('aria-busy') === 'true' && document.activeElement === b && document.querySelector('#devis [data-form-status]').textContent === 'Chargement…'));
  await p.click('#devis [type=submit]');
  await p.waitForSelector('#devis [data-form-errors]:not([hidden])');
  ok('Configuration chargée : validation effectuée une fois, bouton rétabli', !(await p.$eval('#devis [type=submit]', (b) => b.hasAttribute('aria-disabled'))));
  await p.goto(PHP + '/contact.html?type=autre&format=inconnu');
  ok('?type=autre avec un format inconnu : aucun format imposé', (await p.locator('#devis input[name="format"]:checked').count()) === 0);
  // Cartes « Type de produit » : le libellé ne passe jamais sous l'indicateur de sélection.
  let overlap = [];
  for (const w of [390, 700, 1024, 1060, 1100, 1280, 1440]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(100);
    const o = await p.$$eval('#devis .radio-cards--3 .radio-card__body', (cards) => cards.map((c) => c.querySelector('strong').getBoundingClientRect().right - (c.getBoundingClientRect().right - 34)).filter((d) => d > 0.5));
    if (o.length) overlap.push(w + 'px');
  }
  ok('Cartes « Type de produit » : aucun chevauchement de 390 à 1440 px', overlap.length === 0, overlap.join(', '));
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.close();

  /* ------------------------------------------- Mode préparation (sans PHP) */
  p = await newPage();
  await p.goto(STATIC + '/contact.html');
  await p.waitForFunction(() => document.querySelector('#devis [data-attach-note]') && !document.querySelector('#devis [data-attach-note]').hidden);
  ok('Sans API : mode préparation conservé', !(await p.$eval('#devis', (f) => f.classList.contains('is-connected'))) && (await p.innerText('#devis [type=submit]')).includes('Générer mon récapitulatif'));
  ok('Sans API : nom et téléphone facultatifs (comme avant)', !(await p.$eval('#f-name', (e) => e.required)));
  await p.setInputFiles('#devis-files-input', [LOGO]);
  ok('Sans API : fichiers acceptés localement, avertissement affiché', /ne sont pas envoyés/.test(await p.innerText('#devis [data-attach-note]')));
  await p.click('#devis [type=submit]');
  await p.waitForSelector('[data-quote-result]:not([hidden])');
  ok('Sans API : récapitulatif + rappel des fichiers à joindre', /Fichiers à joindre à l’e-mail :[\s\S]*logo-client\.png/.test(await p.innerText('[data-quote-summary]')) && /joindre vos fichiers/.test(await p.innerText('[data-result-text]')));
  ok('Sans API : lien mailto proposé', (await p.getAttribute('[data-mailto]', 'href')).startsWith('mailto:') && (await p.isVisible('[data-mailto]')));
  await p.goto(STATIC + '/personnalisation.html');
  await p.waitForFunction(() => !document.querySelector('#perso-studio-files [data-attach-note], #perso-studio [data-attach-note]').hidden);
  ok('Sans API : atelier sans coordonnées, lien de devis principal', (await p.isHidden('#perso-studio-nom')) && (await p.getAttribute('#perso-studio [data-studio-cta]', 'class')).includes('btn--accent'));
  await p.setInputFiles('#perso-studio-files-input', [LOGO]);
  ok('Sans API : aperçu du logo disponible', /^blob:/.test((await p.getAttribute('[data-studio-cup="9oz"] .js-brand-logo', 'href')) || ''));
  await p.close();

  /* ----------------------------------------------------- Sans JavaScript */
  p = await newPage({ javaScriptEnabled: false });
  await p.goto(PHP + '/contact.html');
  ok('Sans JS : champ fichier natif utilisable', await p.isVisible('#devis-files-input'));
  await p.click('#devis [type=submit]');
  await p.waitForTimeout(300);
  ok('Sans JS : nom et téléphone requis par le navigateur (aucun envoi incomplet)', p.url().endsWith('/contact.html') && (await p.$eval('#f-name', (e) => e.matches(':invalid'))));
  await p.fill('#f-name', 'Client Sans JS');
  await p.fill('#f-phone', '75 290 088');
  await p.setInputFiles('#devis-files-input', [LOGO]);
  before = requests().length;
  await Promise.all([p.waitForNavigation(), p.click('#devis [type=submit]')]);
  ok('Sans JS : envoi classique, page de confirmation', /Demande envoyée/.test(await p.innerText('body')) && requests().length === before + 1);
  await p.close();

  ok('Aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
} catch (e) {
  fail++;
  console.log('✖ Exception :', e.message);
} finally {
  await browser.close();
  php.kill();
  staticServer.close();
  proxy.close();
  rmSync(TMP, { recursive: true, force: true });
}

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
