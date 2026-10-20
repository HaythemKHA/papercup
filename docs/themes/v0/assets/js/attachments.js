/* ==========================================================================
   PAPER CUP — Thème v0 · attachments.js
   Pièces jointes facultatives des formulaires « Demande de devis » et
   « Essayez votre marque » : glisser-déposer ou sélection classique, liste
   (nom, taille, aperçu, retrait), contrôles de format, de taille et de nombre
   d'après les limites EFFECTIVES annoncées par le serveur (GET api/demande.php),
   progression de l'envoi.
   Sans JavaScript, le champ <input type="file" multiple> natif reste utilisable.
   Les contrôles faisant foi sont ceux du serveur (api/lib/uploads.php).
   ========================================================================== */
(function (PC) {
  'use strict';

  var IMAGE_EXT = { png: 1, jpg: 1, jpeg: 1, webp: 1 };

  /** 245 760 → « 240 Ko » ; 1 572 864 → « 1,5 Mo ». */
  PC.bytes = function (n) {
    if (n >= 1048576) return String(Math.round((n / 1048576) * 10) / 10).replace('.', ',') + ' Mo';
    return Math.max(1, Math.round(n / 1024)) + ' Ko';
  };

  /** Identifiant aléatoire (clé d'idempotence d'un envoi). */
  PC.uid = function () {
    var c = window.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    var a = new Uint8Array(16);
    if (c && c.getRandomValues) c.getRandomValues(a);
    else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map
      .call(a, function (b) {
        return ('0' + b.toString(16)).slice(-2);
      })
      .join('');
  };

  /**
   * État du service d'envoi (mémorisé par URL). Résout la configuration, ou null si le service
   * est absent (hébergement statique, file://, erreur) : les formulaires restent alors en mode
   * « préparation » (récapitulatif à transmettre), comme avant.
   */
  var apiCache = {};
  PC.api = function (endpoint) {
    if (!endpoint || !window.fetch || location.protocol === 'file:') return Promise.resolve(null);
    if (apiCache[endpoint]) return apiCache[endpoint];
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, 8000);
    apiCache[endpoint] = fetch(endpoint, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (cfg) {
        return cfg && cfg.ok === true && cfg.service === 'papercup-demandes' && cfg.uploads ? cfg : null;
      })
      .catch(function () {
        return null;
      })
      .then(function (cfg) {
        clearTimeout(timer);
        return cfg;
      });
    return apiCache[endpoint];
  };

  var extOf = function (name) {
    var m = /\.([a-z0-9]{1,5})$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  };
  var iconSvg = function (name) {
    return '<svg class="icon" width="24" height="24" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  };
  var quote = function (name) {
    return '« ' + name + ' »';
  };

  /* ------------------------------------------------------------ Contrôleur */

  function Attach(root) {
    this.root = root;
    this.input = PC.$('[data-attach-input]', root);
    this.button = PC.$('[data-attach-button]', root);
    this.zone = PC.$('[data-attach-zone]', root);
    this.list = PC.$('[data-attach-list]', root);
    this.status = PC.$('[data-attach-status]', root);
    this.errors = PC.$('[data-attach-errors]', root);
    this.rules = PC.$('[data-attach-rules]', root);
    this.note = PC.$('[data-attach-note]', root);
    this.defaultExt = (root.getAttribute('data-attach-ext') || 'png,jpg,jpeg,webp,pdf').split(',');
    this.labels = root.getAttribute('data-attach-labels') || 'PNG, JPG, JPEG, WEBP et PDF';
    this.items = [];
    this.limits = null; // null : aucune limite serveur connue (mode préparation, rien n'est envoyé)
    this.mode = 'pending'; // pending | connected | offline | disabled
    this.busy = false;
    this.listeners = [];
    this.seq = 0;
    this.enhance();
  }

  Attach.prototype.enhance = function () {
    var self = this;
    this.root.classList.add('is-enhanced');
    PC.$$('[data-attach-enhanced]', this.root).forEach(function (el) {
      el.hidden = false;
    });
    PC.$$('[data-attach-native]', this.root).forEach(function (el) {
      el.hidden = true;
    });
    // Le bouton remplace le champ natif (masqué visuellement, hors tabulation).
    this.input.tabIndex = -1;
    this.input.setAttribute('aria-hidden', 'true');
    this.button.addEventListener('click', function () {
      if (!self.busy) self.input.click();
    });
    this.input.addEventListener('change', function () {
      self.add(self.input.files);
      self.input.value = '';
    });

    var depth = 0;
    var hasFiles = function (e) {
      var t = e.dataTransfer && e.dataTransfer.types;
      return t && Array.prototype.indexOf.call(t, 'Files') !== -1;
    };
    this.zone.addEventListener('dragenter', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      self.zone.classList.add('is-dragover');
    });
    this.zone.addEventListener('dragover', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = self.busy ? 'none' : 'copy';
    });
    this.zone.addEventListener('dragleave', function () {
      depth = Math.max(0, depth - 1);
      if (!depth) self.zone.classList.remove('is-dragover');
    });
    this.zone.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      self.zone.classList.remove('is-dragover');
      if (!self.busy) self.add(e.dataTransfer.files);
    });
  };

  Attach.prototype.onChange = function (cb) {
    this.listeners.push(cb);
  };
  Attach.prototype.emit = function () {
    var self = this;
    this.listeners.forEach(function (cb) {
      cb(self);
    });
  };

  Attach.prototype.extensions = function () {
    return this.limits ? this.limits.extensions : this.defaultExt;
  };

  /** Mode et limites, d'après la configuration du serveur (ou null : mode préparation). */
  Attach.prototype.setConfig = function (cfg) {
    var u = cfg && cfg.uploads;
    var email = this.root.getAttribute('data-attach-email') || '';
    if (u && u.enabled && u.maxFiles > 0) {
      this.mode = 'connected';
      this.limits = u;
      this.labels = u.labels;
      this.input.setAttribute(
        'accept',
        u.extensions
          .map(function (e) {
            return '.' + e;
          })
          .concat(u.mimes)
          .join(','),
      );
      this.rules.textContent =
        'Formats acceptés : ' + u.labels + '. Jusqu’à ' + u.maxFiles + ' fichier' + (u.maxFiles > 1 ? 's' : '') +
        ', ' + PC.bytes(u.maxFileBytes) + ' par fichier' + (u.maxFiles > 1 ? ', ' + PC.bytes(u.maxTotalBytes) + ' au total' : '') + '.';
      this.setNote('');
    } else if (u) {
      // Service joignable mais réception de fichiers désactivée par le serveur.
      this.mode = 'disabled';
      this.limits = null;
      this.zone.hidden = true;
      this.clear();
      this.setNote('L’envoi de fichiers n’est pas disponible pour le moment. Envoyez votre demande, puis transmettez vos fichiers par e-mail' + (email ? ' à ' + email : '') + '.');
    } else {
      this.mode = 'offline';
      this.limits = null;
      this.setNote('Vos fichiers restent sur votre appareil : ils ne sont pas envoyés par ce formulaire. Joignez-les à votre e-mail' + (email ? ' à ' + email : '') + '.');
    }
    this.revalidate();
  };

  Attach.prototype.setNote = function (text) {
    if (!this.note) return;
    this.note.textContent = text;
    this.note.hidden = !text;
  };

  /** Raison du refus d'un fichier, ou chaîne vide. */
  Attach.prototype.check = function (file, kept) {
    var ext = extOf(file.name);
    var name = quote(file.name);
    var l = this.limits;
    if (this.extensions().indexOf(ext) === -1) return name + ' : format non accepté (' + this.labels + ').';
    if (!file.size) return name + ' : le fichier est vide.';
    if (!l) return '';
    if (file.size > l.maxFileBytes) return name + ' : fichier trop volumineux (' + PC.bytes(l.maxFileBytes) + ' maximum).';
    if (kept.length >= l.maxFiles) return name + ' n’a pas été ajouté : ' + l.maxFiles + ' fichier' + (l.maxFiles > 1 ? 's' : '') + ' au maximum.';
    var total = kept.reduce(function (s, it) {
      return s + it.file.size;
    }, file.size);
    if (total > l.maxTotalBytes) return name + ' n’a pas été ajouté : l’ensemble dépasserait ' + PC.bytes(l.maxTotalBytes) + '.';
    return '';
  };

  Attach.prototype.add = function (fileList) {
    var self = this;
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var refused = [];
    var added = [];
    files.forEach(function (file) {
      var dup = self.items.some(function (it) {
        return it.file.name === file.name && it.file.size === file.size && it.file.lastModified === file.lastModified;
      });
      if (dup) {
        refused.push(quote(file.name) + ' est déjà dans la liste.');
        return;
      }
      var why = self.check(file, self.items);
      if (why) {
        refused.push(why);
        return;
      }
      var item = { id: 'f' + ++self.seq, file: file, ext: extOf(file.name), url: '', error: '' };
      self.items.push(item);
      self.render(item);
      added.push(file.name);
    });
    this.showErrors(refused);
    this.updateList();
    if (added.length) {
      this.announce(
        (added.length === 1 ? quote(added[0]) + ' ajouté.' : added.length + ' fichiers ajoutés.') +
          ' ' + this.items.length + ' fichier' + (this.items.length > 1 ? 's' : '') + ' joint' + (this.items.length > 1 ? 's' : '') + '.',
      );
      this.emit();
    }
  };

  Attach.prototype.render = function (item) {
    var self = this;
    var li = document.createElement('li');
    li.className = 'attach__item';
    var thumb = document.createElement('span');
    thumb.className = 'attach__thumb';
    thumb.setAttribute('aria-hidden', 'true');
    if (IMAGE_EXT[item.ext] && window.URL && URL.createObjectURL) {
      item.url = URL.createObjectURL(item.file);
      var img = document.createElement('img');
      img.src = item.url;
      img.alt = '';
      img.decoding = 'async';
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = iconSvg('file') + '<span>' + item.ext.toUpperCase() + '</span>';
    }
    var meta = document.createElement('span');
    meta.className = 'attach__meta';
    var name = document.createElement('span');
    name.className = 'attach__name';
    name.textContent = item.file.name;
    var size = document.createElement('span');
    size.className = 'attach__size';
    size.textContent = item.ext.toUpperCase() + ' · ' + PC.bytes(item.file.size);
    var err = document.createElement('span');
    err.className = 'attach__item-error';
    err.hidden = true;
    var bar = document.createElement('progress');
    bar.className = 'attach__progress';
    bar.max = 100;
    bar.value = 0;
    bar.hidden = true;
    bar.setAttribute('aria-label', 'Envoi de ' + item.file.name);
    meta.appendChild(name);
    meta.appendChild(size);
    meta.appendChild(err);
    meta.appendChild(bar);
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'attach__remove';
    rm.setAttribute('aria-label', 'Retirer ' + item.file.name);
    rm.innerHTML = iconSvg('trash');
    rm.addEventListener('click', function () {
      self.remove(item.id);
    });
    li.appendChild(thumb);
    li.appendChild(meta);
    li.appendChild(rm);
    item.el = li;
    item.errEl = err;
    item.bar = bar;
    item.rm = rm;
    this.list.appendChild(li);
  };

  Attach.prototype.remove = function (id) {
    if (this.busy) return;
    var idx = -1;
    this.items.forEach(function (it, i) {
      if (it.id === id) idx = i;
    });
    if (idx === -1) return;
    var item = this.items.splice(idx, 1)[0];
    if (item.url) URL.revokeObjectURL(item.url);
    item.el.parentNode.removeChild(item.el);
    this.updateList();
    // Focus : fichier suivant, sinon précédent, sinon bouton d'ajout.
    var next = this.items[idx] || this.items[idx - 1];
    (next ? next.rm : this.button).focus();
    this.showErrors([]);
    this.announce(quote(item.file.name) + ' retiré. ' + (this.items.length ? this.items.length + ' fichier' + (this.items.length > 1 ? 's' : '') + ' restant' + (this.items.length > 1 ? 's' : '') + '.' : 'Aucun fichier joint.'));
    this.emit();
  };

  /** Retire tout (nouvelle demande). */
  Attach.prototype.clear = function () {
    this.items.forEach(function (it) {
      if (it.url) URL.revokeObjectURL(it.url);
    });
    this.items = [];
    this.list.innerHTML = '';
    this.updateList();
    this.showErrors([]);
    this.emit();
  };

  /** Applique de nouvelles limites aux fichiers déjà choisis (configuration reçue après une sélection rapide). */
  Attach.prototype.revalidate = function () {
    var self = this;
    var kept = [];
    var refused = [];
    this.items.slice().forEach(function (it) {
      var why = self.check(it.file, kept);
      if (why) {
        refused.push(why);
        if (it.url) URL.revokeObjectURL(it.url);
        it.el.parentNode.removeChild(it.el);
      } else kept.push(it);
    });
    if (refused.length) {
      this.items = kept;
      this.showErrors(refused);
      this.updateList();
      this.emit();
    }
  };

  Attach.prototype.updateList = function () {
    this.list.hidden = !this.items.length;
    this.root.classList.toggle('has-files', this.items.length > 0);
  };

  Attach.prototype.showErrors = function (messages) {
    if (!this.errors) return;
    this.errors.innerHTML = '';
    if (!messages.length) {
      this.errors.hidden = true;
      return;
    }
    var ul = document.createElement('ul');
    messages.forEach(function (m) {
      var li = document.createElement('li');
      li.textContent = m;
      ul.appendChild(li);
    });
    this.errors.appendChild(ul);
    this.errors.hidden = false;
  };

  Attach.prototype.announce = function (text) {
    var s = this.status;
    if (!s) return;
    s.textContent = '';
    setTimeout(function () {
      s.textContent = text;
    }, 60);
  };

  Attach.prototype.files = function () {
    return this.items.map(function (it) {
      return it.file;
    });
  };

  Attach.prototype.hasErrors = function () {
    return this.items.some(function (it) {
      return it.error;
    });
  };

  /** Pendant l'envoi : ajout et retrait verrouillés, barres de progression visibles. */
  Attach.prototype.setBusy = function (busy) {
    this.busy = busy;
    this.root.classList.toggle('is-busy', busy);
    this.button.disabled = busy;
    this.items.forEach(function (it) {
      it.rm.disabled = busy;
      it.bar.hidden = !busy;
      if (busy) it.bar.value = 0;
    });
  };

  /**
   * Progression par fichier, déduite des octets envoyés : les fichiers sont ajoutés au corps
   * de la requête après les champs texte, dans l'ordre de la liste.
   */
  Attach.prototype.progress = function (loaded, total) {
    var sum = this.items.reduce(function (s, it) {
      return s + it.file.size;
    }, 0);
    var offset = Math.max(0, total - sum);
    this.items.forEach(function (it) {
      var done = Math.min(1, Math.max(0, (loaded - offset) / (it.file.size || 1)));
      it.bar.value = Math.round(done * 100);
      offset += it.file.size;
    });
  };

  /** Erreurs renvoyées par le serveur : fichier concerné signalé dans la liste, le reste en message. */
  Attach.prototype.serverErrors = function (list) {
    var self = this;
    var general = [];
    this.items.forEach(function (it) {
      it.error = '';
      it.errEl.hidden = true;
      it.el.classList.remove('is-error');
    });
    (list || []).forEach(function (e) {
      var match = e.name &&
        self.items.filter(function (it) {
          return it.file.name === e.name || it.file.name.replace(/[<>:"|?*]/g, '_') === e.name;
        })[0];
      if (match) {
        match.error = e.message;
        match.errEl.textContent = e.message;
        match.errEl.hidden = false;
        match.el.classList.add('is-error');
      } else general.push((e.name ? quote(e.name) + ' : ' : '') + e.message);
    });
    this.showErrors(general);
  };

  /** Contrôleur d'un champ [data-attach] (créé à la demande). */
  PC.attachFor = function (scope) {
    var root = scope && (scope.matches && scope.matches('[data-attach]') ? scope : PC.$('[data-attach]', scope));
    if (!root) return null;
    if (!root._pcAttach) root._pcAttach = new Attach(root);
    return root._pcAttach;
  };

  PC.register('attachments', function () {
    var fields = PC.$$('[data-attach]');
    if (!fields.length) return;
    fields.forEach(function (root) {
      PC.attachFor(root);
    });
    // Un fichier lâché à côté de la zone ne doit pas ouvrir le fichier à la place de la page
    // (ce qui ferait perdre la saisie en cours).
    ['dragover', 'drop'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        var t = e.dataTransfer && e.dataTransfer.types;
        if (t && Array.prototype.indexOf.call(t, 'Files') !== -1 && !e.defaultPrevented) {
          e.preventDefault();
          if (type === 'dragover') e.dataTransfer.dropEffect = 'none';
        }
      });
    });
  });
})(window.PC);
