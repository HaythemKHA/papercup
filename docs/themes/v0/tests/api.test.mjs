/**
 * PAPER CUP — tests de l'API des demandes et de l'espace d'administration.
 *
 *   node --test tests/api.test.mjs     (depuis docs/themes/v0 ; PHP 8.1+ requis dans le PATH)
 *
 * Aucune dépendance : node:test, fetch et FormData natifs (Node 18+). Chaque suite démarre un
 * serveur PHP intégré (php -S + tests/router.php) avec un stockage temporaire et des limites
 * réduites (1 Mo par fichier, 3 Mo par envoi) pour vérifier les contrôles serveur.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { request } from 'node:http';

const THEME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PASSWORD = 'motdepasse-de-test-123';
const HASH = execFileSync('php', ['-r', `echo password_hash('${PASSWORD}', PASSWORD_DEFAULT);`]).toString();

/* ------------------------------------------------------------- Fichiers de test */

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
function png(w = 8, h = 8) {
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
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0xcc)])));
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const PNG = png();
const file = (buf, name, type = 'application/octet-stream') => [new Blob([buf], { type }), name];

/* ------------------------------------------------------------- Serveur PHP */

async function startServer({ port, env = {}, ini = {}, host = '127.0.0.1' }) {
  const storage = mkdtempSync(join(tmpdir(), 'pc-test-'));
  const args = ['-d', 'display_errors=0', '-d', 'log_errors=0'];
  for (const [k, v] of Object.entries({ upload_max_filesize: '1M', post_max_size: '3M', max_file_uploads: '20', ...ini })) args.push('-d', `${k}=${v}`);
  args.push('-S', `${host}:${port}`, '-t', THEME, join(THEME, 'tests/router.php'));
  const proc = spawn('php', args, {
    env: {
      ...process.env,
      PC_STORAGE_DIR: storage,
      PC_MAIL_TRANSPORT: 'file',
      PC_ADMIN_PASSWORD_HASH: HASH,
      PC_RATE_LIMIT_MAX: '1000',
      PC_SITE_URL: `http://127.0.0.1:${port}`,
      ...env,
    },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(base + '/api/demande.php');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return {
    base,
    storage,
    stop() {
      proc.kill();
      rmSync(storage, { recursive: true, force: true });
    },
  };
}

const devis = (extra = {}) => ({
  formulaire: 'devis',
  type: 'personnalise',
  format: '9oz',
  quantite: '10000',
  nom: 'Client Test',
  telephone: '+216 75 290 088',
  email: 'client@example.com',
  societe: 'Café Test',
  message: 'Logo en pièce jointe.',
  ...extra,
});
const essai = (extra = {}) => ({ formulaire: 'essai', marque: 'CAFÉ TEST', encre: '#2C4A7A', format: '12oz', nom: 'Client Essai', telephone: '26 880 202', ...extra });

async function post(base, fields, files = [], headers = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  for (const [blob, name] of files) fd.append('fichiers[]', blob, name);
  const res = await fetch(base + '/api/demande.php', { method: 'POST', body: fd, headers: { Accept: 'application/json', ...headers } });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data, headers: res.headers };
}

const requestIds = (storage) => (existsSync(join(storage, 'requests')) ? readdirSync(join(storage, 'requests')).filter((d) => d.startsWith('PC-')) : []);
const loadRequest = (storage, id) => JSON.parse(readFileSync(join(storage, 'requests', id, 'request.json'), 'utf8'));
const outbox = (storage) => (existsSync(join(storage, 'outbox')) ? readdirSync(join(storage, 'outbox')).filter((f) => f.endsWith('.eml')) : []);
const decodeEml = (raw) => {
  const [head, body] = raw.split('\r\n\r\n');
  return { head, body: Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8') };
};

/* ===================================================================== API */

describe('API des demandes', () => {
  let srv;
  before(async () => {
    srv = await startServer({ port: 8191 });
  });
  after(() => srv.stop());

  test('GET annonce les limites effectives (minimum application / php.ini)', async () => {
    const res = await fetch(srv.base + '/api/demande.php');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    const cfg = await res.json();
    assert.equal(cfg.service, 'papercup-demandes');
    assert.equal(cfg.uploads.enabled, true);
    assert.equal(cfg.uploads.maxFiles, 5);
    assert.equal(cfg.uploads.maxFileBytes, 1024 * 1024, 'plafonné par upload_max_filesize=1M');
    assert.equal(cfg.uploads.maxTotalBytes, 3 * 1024 * 1024 - 64 * 1024, 'plafonné par post_max_size=3M');
    assert.deepEqual(cfg.uploads.extensions, ['png', 'jpg', 'jpeg', 'webp', 'pdf'], 'SVG/AI/EPS/PSD désactivés par défaut');
  });

  test('une demande sans fichier est acceptée', async () => {
    const r = await post(srv.base, devis());
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.match(r.data.id, /^PC-\d{8}-[A-Z2-9]{5}$/);
    const saved = loadRequest(srv.storage, r.data.id);
    assert.equal(saved.fields.formulaire, 'devis');
    assert.equal(saved.fields.quantite, 10000);
    assert.deepEqual(saved.files, []);
    assert.equal(saved.status, 'nouvelle');
  });

  test('« Essayez votre marque » : fichiers rattachés à la demande, noms générés, empreintes', async () => {
    const r = await post(srv.base, essai(), [file(PNG, 'Logo Café.png', 'image/png'), file(PDF, 'maquette.pdf', 'application/pdf')]);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const saved = loadRequest(srv.storage, r.data.id);
    assert.equal(saved.fields.marque, 'CAFÉ TEST');
    assert.equal(saved.fields.encre, '#2C4A7A');
    assert.equal(saved.files.length, 2);
    const [a, b] = saved.files;
    assert.equal(a.name, 'Logo Café.png');
    assert.match(a.stored, /^01-[a-f0-9]{16}\.png$/);
    assert.match(b.stored, /^02-[a-f0-9]{16}\.pdf$/);
    assert.equal(a.mime, 'image/png');
    const onDisk = readFileSync(join(srv.storage, 'requests', r.data.id, 'files', a.stored));
    assert.equal(createHash('sha256').update(onDisk).digest('hex'), a.sha256);
    assert.ok(!resolve(srv.storage).startsWith(THEME + '/'), 'stockage hors de la racine web');
  });

  test('validation serveur des champs (même si le navigateur est contourné)', async () => {
    const before = requestIds(srv.storage).length;
    const r = await post(srv.base, devis({ nom: '', telephone: '12', format: '10oz', quantite: '100', email: 'x@' }), [file(PNG, 'logo.png')]);
    assert.equal(r.status, 422);
    assert.deepEqual(Object.keys(r.data.fields).sort(), ['email', 'format', 'nom', 'quantite', 'telephone']);
    assert.equal(requestIds(srv.storage).length, before, 'rien n’est enregistré');
    const unknown = await post(srv.base, { formulaire: 'autre' });
    assert.equal(unknown.status, 422);
  });

  test('contenu réel contrôlé : faux PNG, extensions interdites, double extension', async () => {
    const before = requestIds(srv.storage).length;
    const cases = [
      [Buffer.from('<?php system($_GET["c"]); ?>'), 'logo.png', /ne correspond pas/],
      [Buffer.from('<?php echo 1; ?>'), 'logo.php.png', /ne correspond pas/],
      [PNG, 'logo.png.php', /Format non accepté/],
      [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'logo.svg', /Format non accepté/],
      [Buffer.from('MZ\x90\x00'), 'setup.exe', /Format non accepté/],
      [PDF, 'faux.png', /ne correspond pas/],
      [Buffer.from('%PDF-'), 'vide.pdf', /PDF invalide|ne correspond pas/],
      [Buffer.alloc(0), 'vide.png', /vide|ne correspond pas/],
    ];
    for (const [buf, name, re] of cases) {
      const r = await post(srv.base, devis(), [file(buf, name)]);
      assert.equal(r.status, 422, name);
      assert.match(r.data.files.map((f) => f.message).join(' '), re, name);
    }
    assert.equal(requestIds(srv.storage).length, before);
  });

  test('nom de fichier malveillant neutralisé (chemin, caractères de contrôle)', async () => {
    const r = await post(srv.base, devis(), [file(PNG, '../../../etc/évil\u0007.png')]);
    assert.equal(r.status, 201);
    const saved = loadRequest(srv.storage, r.data.id);
    assert.equal(saved.files[0].name, 'évil.png');
    assert.match(saved.files[0].stored, /^01-[a-f0-9]{16}\.png$/);
  });

  test('limites : nombre de fichiers, taille unitaire, taille totale', async () => {
    const six = Array.from({ length: 6 }, (_, i) => file(png(4 + i, 4), `l${i}.png`));
    let r = await post(srv.base, devis(), six);
    assert.equal(r.status, 422);
    assert.match(r.data.files[0].message, /5 fichiers au maximum/);

    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024 + 10)]);
    r = await post(srv.base, devis(), [file(big, 'gros.png')]);
    assert.equal(r.status, 422);
    assert.match(r.data.files[0].message, /trop volumineux/);

    const huge = Buffer.alloc(3 * 1024 * 1024 + 100);
    r = await post(srv.base, devis(), [file(huge, 'enorme.pdf')]);
    assert.equal(r.status, 413);
    assert.equal(r.data.error, 'too_large');
  });

  test('idempotence : un renvoi avec la même clé ne crée pas de doublon', async () => {
    const before = requestIds(srv.storage).length;
    const fields = devis({ idempotence: 'cle-test-0123456789abcdef' });
    const first = await post(srv.base, fields, [file(PNG, 'logo.png')]);
    const again = await post(srv.base, fields, [file(PNG, 'logo.png')]);
    assert.equal(first.status, 201);
    assert.equal(again.status, 200);
    assert.equal(again.data.duplicate, true);
    assert.equal(again.data.id, first.data.id);
    assert.equal(requestIds(srv.storage).length, before + 1);
  });

  test('idempotence : envois simultanés avec la même clé → une seule demande', async () => {
    const before = requestIds(srv.storage).length;
    const fields = devis({ idempotence: 'cle-concurrente-0123456789' });
    const results = await Promise.all([1, 2, 3].map(() => post(srv.base, fields, [file(PNG, 'logo.png')])));
    assert.equal(new Set(results.map((r) => r.data.id)).size, 1);
    assert.equal(requestIds(srv.storage).length, before + 1);
  });

  test('sans clé (envoi sans JavaScript) : double envoi identique dédoublonné', async () => {
    const before = requestIds(srv.storage).length;
    const fields = devis({ message: 'Envoi sans JavaScript' });
    const a = await post(srv.base, fields, [file(PNG, 'logo.png')]);
    const b = await post(srv.base, fields, [file(PNG, 'logo.png')]);
    assert.equal(a.data.id, b.data.id);
    assert.equal(requestIds(srv.storage).length, before + 1);
  });

  test('origine étrangère refusée, champ piège refusé', async () => {
    const evil = await post(srv.base, devis(), [], { Origin: 'https://exemple-malveillant.test' });
    assert.equal(evil.status, 403);
    const same = await post(srv.base, devis({ message: 'même origine' }), [], { Origin: srv.base });
    assert.equal(same.status, 201);
    const bot = await post(srv.base, devis({ site_web: 'http://spam.test' }));
    assert.equal(bot.status, 422);
    assert.equal(bot.data.error, 'rejected');
  });

  test('envoi sans JavaScript : réponse HTML avec la référence', async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(devis({ message: 'HTML' }))) fd.append(k, v);
    const res = await fetch(srv.base + '/api/demande.php', { method: 'POST', body: fd });
    assert.equal(res.status, 201);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const html = await res.text();
    assert.match(html, /Demande envoyée/);
    assert.match(html, /PC-\d{8}-[A-Z2-9]{5}/);
  });

  test('notification interne : pièces jointes signalées, liens signés, aucun fichier dans l’e-mail', async () => {
    const r = await post(srv.base, devis({ societe: 'Notif SARL' }), [file(PNG, 'logo-notif.png'), file(PDF, 'brief.pdf')]);
    const eml = outbox(srv.storage).filter((f) => f.startsWith(r.data.id));
    assert.equal(eml.length, 1);
    const raw = readFileSync(join(srv.storage, 'outbox', eml[0]), 'utf8');
    const { head, body } = decodeEml(raw);
    assert.match(head, /^To: paper\.cup@hotmail\.fr/m);
    assert.match(head, /^Reply-To: client@example\.com/m);
    assert.doesNotMatch(head, /multipart/i, 'aucune pièce jointe MIME');
    assert.ok(raw.length < 8000);
    assert.match(body, /PIÈCES JOINTES \(2\)/);
    assert.match(body, /logo-notif\.png — PNG/);
    assert.match(body, /\/admin\/\?demande=PC-/);
    const links = body.match(/http:\/\/\S+\/api\/fichier\.php\?\S+/g);
    assert.equal(links.length, 2);
  });

  test('liens signés : téléchargement, signature falsifiée, lien expiré, fichier d’une autre demande', async () => {
    const r = await post(srv.base, devis({ societe: 'Lien SARL' }), [file(PNG, 'lien.png')]);
    const eml = outbox(srv.storage).find((f) => f.startsWith(r.data.id));
    const { body } = decodeEml(readFileSync(join(srv.storage, 'outbox', eml), 'utf8'));
    const url = body.match(/http:\/\/\S+\/api\/fichier\.php\?\S+/)[0];

    const ok = await fetch(url);
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('content-disposition'), /^attachment;/);
    assert.equal(ok.headers.get('content-type'), 'application/octet-stream');
    assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
    assert.match(ok.headers.get('content-security-policy'), /sandbox/);
    assert.deepEqual(Buffer.from(await ok.arrayBuffer()), PNG);

    const tampered = url.replace(/s=([a-f0-9])/, (m, c) => 's=' + (c === 'a' ? 'b' : 'a'));
    assert.equal((await fetch(tampered)).status, 403);

    const q = new URL(url).searchParams;
    const secret = readFileSync(join(srv.storage, 'secret.key'), 'utf8').trim();
    const sign = (d, f, e) => createHmac('sha256', secret).update(`file|${d}|${f}|${e}`).digest('hex');
    const past = Math.floor(Date.now() / 1000) - 10;
    const expired = `${srv.base}/api/fichier.php?d=${q.get('d')}&f=${q.get('f')}&e=${past}&s=${sign(q.get('d'), q.get('f'), past)}`;
    assert.equal((await fetch(expired)).status, 410);

    const other = requestIds(srv.storage).find((id) => id !== q.get('d'));
    const future = Math.floor(Date.now() / 1000) + 60;
    const cross = `${srv.base}/api/fichier.php?d=${other}&f=${q.get('f')}&e=${future}&s=${sign(other, q.get('f'), future)}`;
    assert.equal((await fetch(cross)).status, 404);

    assert.equal((await fetch(`${srv.base}/api/fichier.php?d=../x&f=y&e=1&s=z`)).status, 400);
  });

  test('aucun accès HTTP direct au code interne ni au stockage', async () => {
    for (const path of ['/api/lib/bootstrap.php', '/api/lib/storage.php', '/api/config.sample.php', '/api/tools/hash-password.php', '/tests/api.test.mjs', '/api/.user.ini']) {
      assert.equal((await fetch(srv.base + path)).status, 403, path);
    }
    const rel = relative(THEME, srv.storage);
    assert.ok(rel.startsWith('..'), 'le stockage n’est pas sous la racine web');
    for (const dir of ['requests', 'outbox', 'idempotency']) {
      assert.ok(existsSync(join(srv.storage, dir, '.htaccess')), `${dir}/.htaccess (défense en profondeur)`);
    }
  });
});


describe('Durcissement (revue de sécurité)', () => {
  let srv;
  before(async () => {
    srv = await startServer({ port: 8197 });
  });
  after(() => srv.stop());

  test('en-tête Host falsifié : les liens de la notification gardent l’adresse configurée', async () => {
    // fetch() impose l'en-tête Host : envoi HTTP brut.
    const boundary = 'pcboundary';
    const parts = Object.entries(devis({ societe: 'Host SARL' })).map(([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
    const body = Buffer.concat([Buffer.from(parts.join('')), Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fichiers[]"; filename="host.png"\r\nContent-Type: image/png\r\n\r\n`), PNG, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const data = await new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port: 8197, path: '/api/demande.php', method: 'POST', headers: { Host: 'evil.example', Accept: 'application/json', 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length } }, (res) => {
        let t = '';
        res.on('data', (c) => (t += c));
        res.on('end', () => resolve(JSON.parse(t)));
      });
      req.on('error', reject);
      req.end(body);
    });
    assert.equal(data.ok, true);
    const eml = outbox(srv.storage).find((f) => f.startsWith(data.id));
    const { body: text } = decodeEml(readFileSync(join(srv.storage, 'outbox', eml), 'utf8'));
    assert.doesNotMatch(text, /evil\.example/);
    assert.match(text, /http:\/\/127\.0\.0\.1:8197\/api\/fichier\.php/);
  });

  test('clé d’idempotence réutilisée avec un contenu modifié : nouvelle demande, pas de faux doublon', async () => {
    const key = 'cle-contenu-0123456789abcd';
    const a = await post(srv.base, devis({ idempotence: key, message: 'Version 1' }));
    const b = await post(srv.base, devis({ idempotence: key, message: 'Version 2' }), [file(PNG, 'ajout.png')]);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.notEqual(a.data.id, b.data.id);
    assert.equal(b.data.files.length, 1);
    const c = await post(srv.base, devis({ idempotence: key, message: 'Version 2' }), [file(PNG, 'ajout.png')]);
    assert.equal(c.data.duplicate, true);
    assert.equal(c.data.id, b.data.id);
  });

  test('erreurs de fichier : position du fichier renvoyée', async () => {
    const r = await post(srv.base, devis(), [file(PNG, 'bon.png'), file(Buffer.from('texte'), 'bon.png')]);
    assert.equal(r.status, 422);
    assert.equal(r.data.files[0].index, 1);
  });

  test('paramètres en tableau : refusés proprement, sans avertissement PHP', async () => {
    const f = await fetch(`${srv.base}/api/fichier.php?d[]=x&f=y&e=1&s=z`);
    assert.equal(f.status, 400);
    assert.doesNotMatch(await f.text(), /Warning|Array|\/home\//);
    const a = await fetch(`${srv.base}/admin/?demande[]=x&statut[]=y`);
    assert.equal(a.status, 200);
    assert.doesNotMatch(await a.text(), /Warning|Array to string/);
    const hp = await post(srv.base, { ...devis(), 'site_web[]': 'x' });
    assert.equal(hp.status, 422);
  });

  test('nom de fichier très long : accepté, extension conservée', async () => {
    const r = await post(srv.base, devis(), [file(PNG, 'a'.repeat(200) + '.png')]);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.match(r.data.files[0].name, /^a{130}\.png$/);
  });

  test('image démesurée refusée (dimensions)', async () => {
    const r = await post(srv.base, devis(), [file(png(12001, 1), 'bandeau.png')]);
    assert.equal(r.status, 422);
    assert.match(r.data.files[0].message, /trop grande.*12 000 px/);
  });

  test('« Autre emballage » : format facultatif, pas de minimum gobelets', async () => {
    const r = await post(srv.base, devis({ type: 'autre', format: '', quantite: '300', message: 'Pochettes taille 2' }));
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const saved = loadRequest(srv.storage, r.data.id);
    assert.equal(saved.fields.type, 'autre');
    const perso = await post(srv.base, devis({ type: 'personnalise', format: '', quantite: '300' }));
    assert.equal(perso.status, 422);
    assert.ok(perso.data.fields.format && perso.data.fields.quantite);
  });
});

describe('Stockage plein', () => {
  let full;
  let capped;
  before(async () => {
    full = await startServer({ port: 8198, env: { PC_MIN_FREE_BYTES: '999999999999999' } });
    capped = await startServer({ port: 8199, env: { PC_STORAGE_MAX_BYTES: '1' } });
  });
  after(() => {
    full.stop();
    capped.stop();
  });

  test('réserve disque atteinte : fichiers refusés (507), demande sans fichier acceptée', async () => {
    assert.equal((await post(full.base, devis(), [file(PNG, 'logo.png')])).status, 507);
    assert.equal((await post(full.base, devis({ message: 'sans fichier' }))).status, 201);
  });

  test('plafond de stockage atteint : fichiers refusés (507), demande sans fichier acceptée', async () => {
    assert.equal((await post(capped.base, devis(), [file(PNG, 'logo.png')])).status, 507);
    assert.equal((await post(capped.base, devis({ message: 'sans fichier' }))).status, 201);
  });
});

describe('Durcissement (vérification des correctifs)', () => {
  let noLink;
  let auto;
  let capped;
  before(async () => {
    noLink = await startServer({ port: 8202, ini: { disable_functions: 'link,symlink,ini_set' } });
    auto = await startServer({ port: 8203, ini: { 'session.auto_start': '1' } });
    capped = await startServer({ port: 8204, env: { PC_GLOBAL_RATE_MAX: '2' } });
  });
  after(() => {
    noLink.stop();
    auto.stop();
    capped.stop();
  });

  test('hébergement sans link() ni ini_set() : installation neuve fonctionnelle', async () => {
    const r = await post(noLink.base, devis(), [file(PNG, 'logo.png')]);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.ok(readFileSync(join(noLink.storage, 'secret.key'), 'utf8').trim().length === 64);
    assert.equal(readdirSync(noLink.storage).filter((f) => f.includes('.tmp-')).length, 0);
  });

  test('session.auto_start activé : connexion à l’administration possible', async () => {
    const res = await fetch(auto.base + '/admin/');
    const cookies = res.headers.getSetCookie().map((c) => c.split(';')[0]);
    const csrf = (await res.text()).match(/name="csrf" value="([a-f0-9]{64})"/)[1];
    const login = await fetch(auto.base + '/admin/', {
      method: 'POST',
      redirect: 'manual',
      headers: { Cookie: cookies.join('; '), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrf, action: 'login', utilisateur: 'papercup', mot_de_passe: PASSWORD }),
    });
    const jar = new Map(cookies.map((c) => c.split('=')));
    for (const c of login.headers.getSetCookie()) {
      const [k, v] = c.split(';')[0].split('=');
      jar.set(k, v);
    }
    const page = await (await fetch(auto.base + '/admin/', { headers: { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } })).text();
    assert.match(page, /Demandes reçues/);
  });

  test('plafond global : seulement pour les envois avec fichiers, message distinct', async () => {
    assert.equal((await post(capped.base, devis({ message: 'f1' }), [file(PNG, 'a.png')])).status, 201);
    assert.equal((await post(capped.base, devis({ message: 'f2' }), [file(PNG, 'b.png')])).status, 201);
    const third = await post(capped.base, devis({ message: 'f3' }), [file(PNG, 'c.png')]);
    assert.equal(third.status, 503);
    assert.equal(third.data.error, 'busy');
    assert.match(third.data.message, /sans pièce jointe/);
    assert.equal((await post(capped.base, devis({ message: 'sans fichier' }))).status, 201);
  });

  test('version modifiée après une coupure : enregistrée comme remplaçant la précédente', async () => {
    const key = 'cle-remplacement-0123456789';
    const a = await post(capped.base, devis({ idempotence: key, message: 'Avant' }));
    const b = await post(capped.base, devis({ idempotence: key, message: 'Après' }));
    assert.equal(b.data.replaces, a.data.id);
    assert.equal(loadRequest(capped.storage, b.data.id).meta.replaces, a.data.id);
    const eml = outbox(capped.storage).find((f) => f.startsWith(b.data.id));
    assert.match(decodeEml(readFileSync(join(capped.storage, 'outbox', eml), 'utf8')).body, new RegExp('Remplace\\s+: ' + a.data.id));
  });

  test('envoi trop volumineux sans JavaScript : retour au formulaire de devis (#devis)', async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(devis())) fd.append(k, v);
    fd.append('fichiers[]', new Blob([Buffer.alloc(3 * 1024 * 1024 + 100)]), 'enorme.pdf');
    const res = await fetch(capped.base + '/api/demande.php', { method: 'POST', body: fd, headers: { Referer: capped.base + '/contact.html' } });
    assert.equal(res.status, 413);
    assert.match(await res.text(), /href="\/contact\.html#devis"/);
  });

  test('retour à la version d’origine après deux coupures : la version intermédiaire est signalée remplacée', async () => {
    const key = 'cle-chaine-0123456789abcdef';
    const a = await post(capped.base, devis({ idempotence: key, message: 'Version A' }));
    const b = await post(capped.base, devis({ idempotence: key, message: 'Version B' }));
    const again = await post(capped.base, devis({ idempotence: key, message: 'Version A' }));
    assert.equal(again.data.duplicate, true);
    assert.equal(again.data.id, a.data.id);
    assert.equal(loadRequest(capped.storage, b.data.id).meta.superseded_by, a.data.id);
  });

  test('page d’erreur sans JavaScript : retour au formulaire de devis (#devis)', async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(devis({ nom: '' }))) fd.append(k, v);
    const res = await fetch(capped.base + '/api/demande.php', { method: 'POST', body: fd, headers: { Referer: capped.base + '/contact.html' } });
    assert.equal(res.status, 422);
    assert.match(await res.text(), /href="\/contact\.html#devis"/);
  });

  test('adresses : IPv4 vue en IPv6 (double pile) distinguée, IPv6 regroupée par /64', () => {
    const out = execFileSync('php', ['-r', `require '${THEME}/api/lib/bootstrap.php'; foreach (['::ffff:1.2.3.4', '::ffff:5.6.7.8', '2001:db8:1:2::5', '2001:db8:1:2:ffff::9', '::1'] as $ip) { $_SERVER['REMOTE_ADDR'] = $ip; echo pc_client_ip(), "\\n"; }`]).toString().trim().split('\n');
    assert.deepEqual(out, ['1.2.3.4', '5.6.7.8', '20010db800010002::/64', '20010db800010002::/64', '::1']);
  });

  test('SVG (si activé) : encodage, contrôle et références de caractères', () => {
    const cases = {
      '<svg><text>PAPER&#xa0;CUP Caf&#xE9;</text><animateTransform attributeName="transform" type="rotate"/></svg>': true,
      '<?xml version="1.0" encoding="ISO-2022-JP"?><svg><scr\u001b(Bipt>x</scr\u001b(Bipt></svg>': false,
      '<svg><a href="&#106;avascript:alert(1)">x</a></svg>': false,
      '<svg><a href="#x"><set attributeName="href" to="javascript:alert(1)"/></a></svg>': false,
      '<svg><svg:script>1</svg:script></svg>': false,
      '<svg><style>@\\69mport "http://x/y.css";</style></svg>': false,
      '<svg><style>rect{fill:\\75rl(http://x/y.png)}</style><rect/></svg>': false,
    };
    const php = `require '${THEME}/api/lib/bootstrap.php'; foreach (json_decode(stream_get_contents(STDIN), true) as $svg) { echo pc_svg_is_safe($svg) ? '1' : '0'; }`;
    const res = execFileSync('php', ['-r', php], { input: JSON.stringify(Object.keys(cases)) }).toString();
    assert.equal(res, Object.values(cases).map((v) => (v ? '1' : '0')).join(''));
  });

  test('FAQPage JSON-LD : texte propre (espaces, entités, liens retirés)', () => {
    const html = readFileSync(join(THEME, 'faq.html'), 'utf8');
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).map((b) => b.replace(/<[^>]+>/g, '')).find((b) => b.includes('FAQPage')));
    const text = JSON.stringify(json);
    assert.doesNotMatch(text, /&nbsp;|&amp;/);
    assert.doesNotMatch(text, /\.[A-ZÉ][a-z]/, 'phrases collées');
    assert.doesNotMatch(text, /Voir les autres emballages/);
  });
});

describe('Connexion : attaque distribuée', () => {
  let srv;
  before(async () => {
    srv = await startServer({ port: 8205, host: '0.0.0.0' });
  });
  after(() => srv.stop());

  // Requêtes depuis des adresses locales différentes (127.0.0.x) pour simuler plusieurs clients.
  const call = (from, method, path, cookies, body) =>
    new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port: 8205, localAddress: from, method, path, headers: { Cookie: cookies.join('; '), ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } : {}) } }, (res) => {
        let t = '';
        res.on('data', (c) => (t += c));
        res.on('end', () => resolve({ status: res.statusCode, cookies: (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]), text: t }));
      });
      req.on('error', reject);
      req.end(body);
    });
  const attempt = async (from, password, extra = []) => {
    const page = await call(from, 'GET', '/admin/', extra);
    const cookies = [...extra, ...page.cookies];
    const csrf = page.text.match(/name="csrf" value="([a-f0-9]{64})"/)[1];
    const res = await call(from, 'POST', '/admin/', cookies, new URLSearchParams({ csrf, action: 'login', utilisateur: 'papercup', mot_de_passe: password }).toString());
    const all = [...cookies, ...res.cookies];
    const after = await call(from, 'GET', '/admin/', [...new Map(all.map((c) => c.split('='))).entries()].map(([k, v]) => `${k}=${v}`));
    return { ok: /Demandes reçues/.test(after.text), throttled: /Trop de tentatives/.test(after.text), cookies: all };
  };

  test('l’équipe déjà connectée sur un appareil n’est pas bloquée par une attaque distribuée', async () => {
    const team = await attempt('127.0.0.50', PASSWORD);
    assert.ok(team.ok, 'connexion initiale');
    const device = team.cookies.filter((c) => c.startsWith('pc_admin_device='));
    assert.equal(device.length, 1);
    for (let ip = 2; ip <= 11; ip++) {
      for (let i = 0; i < 5; i++) await attempt(`127.0.0.${ip}`, 'faux-' + i);
    }
    const stranger = await attempt('127.0.0.60', PASSWORD);
    assert.ok(stranger.throttled && !stranger.ok, 'appareil inconnu bloqué pendant l’attaque');
    const known = await attempt('127.0.0.51', PASSWORD, device);
    assert.ok(known.ok, 'appareil connu toujours autorisé');
  });
});

describe('Notification sans adresse configurée', () => {
  let srv;
  before(async () => {
    srv = await startServer({ port: 8200, env: { PC_SITE_URL: '' } });
  });
  after(() => srv.stop());

  test('aucun lien construit à partir de la requête', async () => {
    const r = await post(srv.base, devis(), [file(PNG, 'logo.png')]);
    const eml = outbox(srv.storage).find((f) => f.startsWith(r.data.id));
    const { body } = decodeEml(readFileSync(join(srv.storage, 'outbox', eml), 'utf8'));
    assert.doesNotMatch(body, /https?:\/\//);
    assert.match(body, /logo\.png/);
    assert.match(body, /espace d’administration/);
  });
});

/* ============================================================ Administration */

describe('Espace d’administration', () => {
  let srv;
  const jar = new Map();
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const remember = (res) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      jar.set(k, v);
    }
  };
  const get = async (path) => {
    const res = await fetch(srv.base + path, { headers: { Cookie: cookieHeader() }, redirect: 'manual' });
    remember(res);
    return res;
  };
  const form = async (path, fields) => {
    const res = await fetch(srv.base + path, {
      method: 'POST',
      headers: { Cookie: cookieHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields),
      redirect: 'manual',
    });
    remember(res);
    return res;
  };
  const csrfOf = (html) => html.match(/name="csrf" value="([a-f0-9]{64})"/)[1];
  let requestId;
  let stored;

  before(async () => {
    srv = await startServer({ port: 8192, env: { PC_RATE_LIMIT_MAX: '1000' } });
    const r = await post(srv.base, devis(), [file(PNG, 'logo.png'), file(PDF, 'brief.pdf')]);
    requestId = r.data.id;
    stored = loadRequest(srv.storage, requestId).files;
  });
  after(() => srv.stop());

  test('non connecté : ni liste, ni fiche, ni fichier', async () => {
    const list = await (await get('/admin/')).text();
    assert.match(list, /Connexion/);
    assert.doesNotMatch(list, new RegExp(requestId));
    const res = await get(`/admin/?demande=${requestId}&fichier=${stored[0].stored}`);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.doesNotMatch(await res.text(), /PNG/);
  });

  test('cookie de session protégé, CSRF obligatoire', async () => {
    jar.clear();
    const res = await get('/admin/');
    const cookie = res.headers.getSetCookie().join(';');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    const noCsrf = await form('/admin/', { action: 'login', utilisateur: 'papercup', mot_de_passe: PASSWORD });
    assert.equal(noCsrf.status, 400);
  });

  test('mauvais mot de passe refusé, bon mot de passe accepté', async () => {
    let csrf = csrfOf(await (await get('/admin/')).text());
    const bad = await form('/admin/', { csrf, action: 'login', utilisateur: 'papercup', mot_de_passe: 'faux' });
    assert.equal(bad.status, 303);
    const page = await (await get('/admin/')).text();
    assert.match(page, /incorrect/);
    csrf = csrfOf(page);
    const good = await form('/admin/', { csrf, action: 'login', utilisateur: 'papercup', mot_de_passe: PASSWORD });
    assert.equal(good.status, 303);
    const list = await (await get('/admin/')).text();
    assert.match(list, new RegExp(requestId));
    assert.match(list, /2 fichiers/);
  });

  test('fiche : pièces jointes listées, aperçu réservé aux images, téléchargement', async () => {
    const html = await (await get(`/admin/?demande=${requestId}`)).text();
    assert.match(html, /Pièces jointes \(2\)/);
    assert.match(html, /logo\.png/);
    assert.match(html, /brief\.pdf/);
    const img = await get(`/admin/?demande=${requestId}&fichier=${stored[0].stored}&apercu=1`);
    assert.equal(img.headers.get('content-type'), 'image/png');
    assert.match(img.headers.get('content-disposition'), /^inline/);
    const pdf = await get(`/admin/?demande=${requestId}&fichier=${stored[1].stored}&apercu=1`);
    assert.equal(pdf.headers.get('content-type'), 'application/octet-stream');
    assert.match(pdf.headers.get('content-disposition'), /^attachment/);
    const csp = img.headers.get('content-security-policy');
    assert.match(csp, /sandbox/);
  });

  test('changement de statut puis suppression (avec confirmation)', async () => {
    let csrf = csrfOf(await (await get(`/admin/?demande=${requestId}`)).text());
    await form('/admin/', { csrf, action: 'status', demande: requestId, statut: 'traitee' });
    assert.equal(loadRequest(srv.storage, requestId).status, 'traitee');
    csrf = csrfOf(await (await get(`/admin/?demande=${requestId}`)).text());
    await form('/admin/', { csrf, action: 'delete', demande: requestId });
    assert.ok(requestIds(srv.storage).includes(requestId), 'sans confirmation : rien n’est supprimé');
    await form('/admin/', { csrf, action: 'delete', demande: requestId, confirmer: 'oui' });
    assert.ok(!requestIds(srv.storage).includes(requestId));
  });

  test('tentatives de connexion limitées', async () => {
    jar.clear();
    let csrf = csrfOf(await (await get('/admin/')).text());
    for (let i = 0; i < 5; i++) {
      await form('/admin/', { csrf, action: 'login', utilisateur: 'papercup', mot_de_passe: 'faux' + i });
      csrf = csrfOf(await (await get('/admin/')).text());
    }
    await form('/admin/', { csrf, action: 'login', utilisateur: 'papercup', mot_de_passe: PASSWORD });
    const page = await (await get('/admin/')).text();
    assert.match(page, /Trop de tentatives/);
    assert.doesNotMatch(page, /Demandes reçues/);
  });
});

/* ========================================================== Anti-abus */

describe('Limitation du nombre de demandes', () => {
  let srv;
  let multi;
  before(async () => {
    srv = await startServer({ port: 8193, env: { PC_RATE_LIMIT_MAX: '2' } });
    // Serveur à plusieurs processus : vérifie l'atomicité des plafonds sous envois simultanés.
    multi = await startServer({ port: 8201, env: { PC_RATE_LIMIT_MAX: '5', PHP_CLI_SERVER_WORKERS: '8' } });
  });
  after(() => {
    srv.stop();
    multi.stop();
  });

  test('connexions simultanées depuis des sessions distinctes : 5 tentatives au plus', async () => {
    const session = async () => {
      const res = await fetch(multi.base + '/admin/');
      const cookie = res.headers.getSetCookie()[0].split(';')[0];
      const csrf = (await res.text()).match(/name="csrf" value="([a-f0-9]{64})"/)[1];
      return { cookie, csrf };
    };
    const login = ({ cookie, csrf }, pw) =>
      fetch(multi.base + '/admin/', {
        method: 'POST',
        redirect: 'manual',
        headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrf, action: 'login', utilisateur: 'papercup', mot_de_passe: pw }),
      });
    const sessions = await Promise.all(Array.from({ length: 12 }, session));
    await Promise.all(sessions.map((x, i) => login(x, 'faux-' + i)));
    const last = await session();
    await login(last, PASSWORD);
    const page = await (await fetch(multi.base + '/admin/', { headers: { Cookie: last.cookie } })).text();
    assert.match(page, /Trop de tentatives/);
  });

  test('envois simultanés : jamais plus que le plafond', async () => {
    const results = await Promise.all(Array.from({ length: 15 }, (_, i) => post(multi.base, devis({ message: 'simultané ' + i }))));
    assert.equal(results.filter((r) => r.status === 201).length, 5);
    assert.equal(requestIds(multi.storage).length, 5);
  });

  test('au-delà du plafond horaire : 429', async () => {
    assert.equal((await post(srv.base, devis({ message: '1' }))).status, 201);
    assert.equal((await post(srv.base, devis({ message: '2' }))).status, 201);
    const third = await post(srv.base, devis({ message: '3' }));
    assert.equal(third.status, 429);
    assert.ok(third.headers.get('retry-after'));
  });
});

describe('Espace fermé sans mot de passe configuré', () => {
  let srv;
  before(async () => {
    srv = await startServer({ port: 8194, env: { PC_ADMIN_PASSWORD_HASH: '' } });
  });
  after(() => srv.stop());

  test('administration fermée (503)', async () => {
    const res = await fetch(srv.base + '/admin/');
    assert.equal(res.status, 503);
    assert.match(await res.text(), /fermé/);
  });
});
