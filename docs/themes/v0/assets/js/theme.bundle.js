/*! PAPER CUP — thème v0 · généré par build.mjs, ne pas modifier : éditer assets/js/*.js */
/* ==========================================================================
   PAPER CUP — Thème v0 · main.js
   Noyau : espace de noms, utilitaires partagés, registre de modules.
   Le build concatène : main → navigation → animations → attachments → components → forms,
   puis ajoute `PC.start()`. Aucune dépendance.
   ========================================================================== */
(function () {
  'use strict';

  var modules = [];

  var PC = {
    /** Enregistre un module : init(root) est appelé une fois le DOM prêt. */
    register: function (name, init) {
      modules.push([name, init]);
    },

    start: function () {
      var run = function () {
        document.documentElement.classList.remove('no-js');
        modules.forEach(function (m) {
          try {
            m[1](document);
          } catch (err) {
            // Un module défaillant ne bloque jamais les autres.
            console.error('[PAPER CUP] module « ' + m[0] + ' »', err);
          }
        });
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
      } else {
        run();
      }
    },

    $: function (sel, ctx) {
      return (ctx || document).querySelector(sel);
    },

    $$: function (sel, ctx) {
      return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    },

    reducedMotion: function () {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    /** 5000 → « 5 000 » (espace insécable, présente dans les polices du thème). */
    fmt: function (n) {
      return Math.round(n)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    /** Catalogue publié au build dans <script id="pc-products" type="application/json">. */
    products: function () {
      if (PC._products) return PC._products;
      var el = document.getElementById('pc-products');
      try {
        PC._products = el ? JSON.parse(el.textContent) : [];
      } catch (e) {
        PC._products = [];
      }
      return PC._products;
    },

    product: function (id) {
      return PC.products().filter(function (p) {
        return p.id === id;
      })[0];
    },

    /** Interpolation numérique d'un texte (compteur bref, ignoré en mouvement réduit). */
    tween: function (el, to, duration) {
      var from = parseFloat((el.textContent || '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
      if (PC.reducedMotion() || from === to) {
        el.textContent = PC.fmt(to);
        return;
      }
      var start = null;
      var d = duration || 420;
      var step = function (t) {
        if (start === null) start = t;
        var k = Math.min(1, (t - start) / d);
        var eased = 1 - Math.pow(1 - k, 3);
        el.textContent = PC.fmt(from + (to - from) * eased);
        if (k < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    },

    /** Copie dans le presse-papiers ; repli execCommand si l'API est absente ou refusée (file://, permissions). */
    copy: function (text) {
      var fallback = function () {
        return new Promise(function (resolve, reject) {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var done = false;
          try {
            done = document.execCommand('copy');
          } catch (e) {
            done = false;
          }
          document.body.removeChild(ta);
          done ? resolve() : reject(new Error('copy'));
        });
      };
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).catch(fallback);
      }
      return fallback();
    },
  };

  window.PC = PC;
})();

/* ==========================================================================
   PAPER CUP — Thème v0 · navigation.js
   En-tête au scroll, méga-menu « Gobelets », menu mobile, barre d'appel mobile.
   ========================================================================== */
(function (PC) {
  'use strict';

  /* ------------------------------------------------------ En-tête au scroll */
  PC.register('header', function () {
    var header = PC.$('[data-header]');
    if (!header) return;
    var ticking = false;
    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    update();
  });

  /* ------------------------------------------------------------ Méga-menu */
  PC.register('mega-menu', function () {
    var item = PC.$('[data-mega]');
    if (!item) return;
    var trigger = PC.$('[data-mega-trigger]', item);
    var panel = PC.$('[data-mega-panel]', item);
    var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');
    var timer = null;

    var open = function () {
      clearTimeout(timer);
      if (!panel.hidden) return;
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('mega-open');
    };
    var close = function (focusTrigger) {
      clearTimeout(timer);
      if (panel.hidden) return;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('mega-open');
      if (focusTrigger) trigger.focus();
    };

    trigger.addEventListener('click', function () {
      panel.hidden ? open() : close();
    });
    item.addEventListener('mouseenter', function () {
      if (hoverable.matches) timer = setTimeout(open, 90);
    });
    item.addEventListener('mouseleave', function () {
      if (hoverable.matches) {
        clearTimeout(timer);
        timer = setTimeout(close, 180);
      }
    });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(true);
    });
    // Fermeture quand le focus quitte le menu (navigation clavier).
    item.addEventListener('focusout', function (e) {
      if (!item.contains(e.relatedTarget)) close();
    });
    document.addEventListener('click', function (e) {
      if (!item.contains(e.target)) close();
    });
  });

  /* ---------------------------------------------------------- Menu mobile */
  PC.register('mobile-menu', function () {
    var toggle = PC.$('[data-menu-toggle]');
    var menu = PC.$('[data-menu]');
    if (!toggle || !menu) return;
    var label = PC.$('[data-menu-label]', toggle);
    var outside = PC.$$('main, footer, [data-mobile-bar], .skip-link');
    var desktop = window.matchMedia('(min-width: 1024px)');

    var focusables = function () {
      return PC.$$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', menu).concat(
        PC.$$('.brand, .header-phone, [data-menu-toggle]', document.querySelector('[data-header]')),
      );
    };

    var setOpen = function (isOpen, restoreFocus) {
      toggle.setAttribute('aria-expanded', String(isOpen));
      label.textContent = isOpen ? 'Fermer le menu' : 'Ouvrir le menu';
      document.documentElement.classList.toggle('menu-open', isOpen);
      document.body.classList.toggle('no-scroll', isOpen);
      outside.forEach(function (el) {
        if (isOpen) el.setAttribute('inert', '');
        else if (!el.hasAttribute('data-mobile-bar') || el.classList.contains('is-visible')) el.removeAttribute('inert');
      });
      if (isOpen) {
        menu.hidden = false;
        menu.classList.remove('is-closing');
        var first = PC.$('a[href]', menu);
        if (first) first.focus({ preventScroll: true });
      } else if (!menu.hidden) {
        var finish = function () {
          menu.hidden = true;
          menu.classList.remove('is-closing');
        };
        if (PC.reducedMotion()) finish();
        else {
          menu.classList.add('is-closing');
          menu.addEventListener('animationend', finish, { once: true });
        }
        if (restoreFocus !== false) toggle.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        // Piège de focus : en-tête + menu.
        var list = focusables();
        var first = list[0];
        var last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    var onChange = function () {
      if (desktop.matches && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, false);
    };
    desktop.addEventListener ? desktop.addEventListener('change', onChange) : desktop.addListener(onChange);
  });

  /* ------------------------------------------------- Barre d'appel mobile */
  PC.register('mobile-bar', function () {
    var bar = PC.$('[data-mobile-bar]');
    if (!bar || !('IntersectionObserver' in window)) return;
    // Visible une fois l'en-tête de page dépassé, masquée près du CTA final et du pied de page.
    var start = PC.$('.hero, .page-hero, .product, .error-page');
    var ends = PC.$$('[data-cta-final], [data-footer]');
    var passedStart = !start;
    var nearEnd = false;
    var sync = function () {
      var show = passedStart && !nearEnd && !document.documentElement.classList.contains('menu-open');
      bar.classList.toggle('is-visible', show);
      if (show) bar.removeAttribute('inert');
      else bar.setAttribute('inert', '');
    };
    if (start) {
      new IntersectionObserver(function (entries) {
        passedStart = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
        sync();
      }).observe(start);
    }
    var visibleEnds = new Set();
    var endObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.isIntersecting ? visibleEnds.add(en.target) : visibleEnds.delete(en.target);
      });
      nearEnd = visibleEnds.size > 0;
      sync();
    });
    ends.forEach(function (el) {
      endObserver.observe(el);
    });
  });
})(window.PC);

/* ==========================================================================
   PAPER CUP — Thème v0 · animations.js
   Apparitions au scroll et tracé de la frise « Commander ».
   Tout est désactivé (contenu affiché d'emblée) si prefers-reduced-motion.
   ========================================================================== */
(function (PC) {
  'use strict';

  PC.register('reveal', function () {
    var items = PC.$$('[data-reveal]');
    var steps = PC.$$('[data-steps]');
    var showAll = function () {
      items.forEach(function (el) {
        el.classList.add('is-visible');
      });
      steps.forEach(function (el) {
        el.classList.add('is-drawn');
      });
    };
    if (PC.reducedMotion() || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    // Une fois révélé, l'élément retrouve ses propres transitions (survols des cartes).
    var settle = function (el) {
      var done = function (e) {
        if (e.target !== el || e.propertyName !== 'transform') return;
        el.removeEventListener('transitionend', done);
        el.removeAttribute('data-reveal');
        el.classList.remove('is-visible');
        el.style.removeProperty('--i');
      };
      el.addEventListener('transitionend', done);
    };

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          io.unobserve(el);
          if (el.hasAttribute('data-steps')) {
            el.classList.add('is-drawn');
            return;
          }
          settle(el);
          el.classList.add('is-visible');
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    items.concat(steps).forEach(function (el) {
      io.observe(el);
    });
  });
})(window.PC);

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
      // Position du fichier dans l'envoi (fiable même si deux fichiers portent le même nom), sinon nom.
      var match = typeof e.index === 'number' && self.items[e.index] ? self.items[e.index] : null;
      if (!match && e.name) {
        match = self.items.filter(function (it) {
          return it.file.name === e.name || it.file.name.replace(/[<>:"|?*]/g, '_') === e.name;
        })[0];
      }
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

/* ==========================================================================
   PAPER CUP — Thème v0 · components.js
   Interrupteur « vue technique », atelier de personnalisation, bandeau de
   références, visionneuse de réalisations, galerie à onglets, accordéons.
   ========================================================================== */
(function (PC) {
  'use strict';

  /* ------------------------------------------------ Interrupteur des cotes */
  PC.register('dims-toggle', function () {
    PC.$$('[data-dims-toggle]').forEach(function (btn) {
      var scope = btn.closest('[data-dims-scope]');
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(on));
        scope.classList.toggle('show-dims', on);
      });
    });
  });

  /* ------------------------------------------- Atelier de personnalisation */
  PC.register('studio', function () {
    PC.$$('[data-studio]').forEach(function (root) {
      var input = PC.$('[data-studio-name]', root);
      var cta = PC.$('[data-studio-cta]', root);
      var label = PC.$('[data-studio-label]', root);
      var cups = PC.$$('[data-studio-cup]', root);
      var texts = PC.$$('.js-brand-text', root);
      var logos = PC.$$('.js-brand-logo', root);
      var state = { name: '', format: (PC.$('[data-studio-format]:checked', root) || {}).value, logo: '' };

      // Ajuste la longueur du texte à la largeur visible du gobelet.
      var fit = function () {
        texts.forEach(function (tp) {
          var text = tp.parentNode;
          var max = parseFloat(text.getAttribute('data-max')) || 0;
          text.removeAttribute('textLength');
          text.removeAttribute('lengthAdjust');
          if (!max || !text.getComputedTextLength) return;
          if (text.getComputedTextLength() > max) {
            text.setAttribute('textLength', String(max));
            text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
          }
        });
      };

      var updateLink = function () {
        if (!cta) return;
        var url = root.getAttribute('data-href') + '?type=personnalise&format=' + encodeURIComponent(state.format);
        if (state.name) url += '&marque=' + encodeURIComponent(state.name);
        cta.href = url + '#devis';
      };

      // Logo joint (image) : affiché sur l'aperçu, au-dessus du nom s'il est saisi. Rien n'est envoyé ici.
      var placeLogo = function () {
        root.classList.toggle('has-logo', Boolean(state.logo));
        root.classList.toggle('has-name', Boolean(state.name));
        logos.forEach(function (img) {
          var box = (img.getAttribute(state.name ? 'data-box-top' : 'data-box-full') || '').split(' ');
          if (box.length === 4) {
            img.setAttribute('x', box[0]);
            img.setAttribute('y', box[1]);
            img.setAttribute('width', box[2]);
            img.setAttribute('height', box[3]);
          }
          if (state.logo) img.setAttribute('href', state.logo);
          else img.removeAttribute('href');
        });
      };
      var attach = PC.attachFor && PC.attachFor(root);
      if (attach && logos.length) {
        attach.onChange(function (a) {
          var first = a.items.filter(function (it) {
            return it.url;
          })[0];
          state.logo = first ? first.url : '';
          placeLogo();
        });
      }

      if (input) {
        input.addEventListener('input', function () {
          state.name = input.value.trim().slice(0, 18);
          var shown = (state.name || 'VOTRE MARQUE').toUpperCase();
          texts.forEach(function (tp) {
            tp.textContent = shown;
          });
          fit();
          updateLink();
          placeLogo();
        });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') e.preventDefault();
        });
      }

      // Entrée sur une teinte ou un format : ne soumet pas le formulaire (comportement de l'aperçu d'origine).
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-studio-ink], [data-studio-format]')) e.preventDefault();
      });

      // Le lien vers le devis détaillé ne transporte pas les fichiers joints : le signaler.
      var ctaNote = PC.$('[data-cta-note]', root);
      if (attach && ctaNote) {
        attach.onChange(function (a) {
          ctaNote.hidden = !a.items.length;
        });
      }

      root.addEventListener('change', function (e) {
        if (e.target.hasAttribute('data-studio-ink')) root.style.setProperty('--print', e.target.value);
        if (e.target.hasAttribute('data-studio-format')) {
          state.format = e.target.value;
          cups.forEach(function (c) {
            c.classList.toggle('is-active', c.getAttribute('data-studio-cup') === state.format);
          });
          var p = PC.product(state.format);
          if (label && p) label.textContent = p.label;
          fit();
          updateLink();
        }
      });

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      else fit();
    });
  });

  /* ------------------------------------------- Bandeau de références (pause) */
  PC.register('marquee', function () {
    PC.$$('[data-marquee-toggle]').forEach(function (btn) {
      var marquee = btn.closest('section').querySelector('[data-marquee]');
      var label = PC.$('[data-marquee-label]', btn);
      btn.addEventListener('click', function () {
        var paused = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(paused));
        marquee.classList.toggle('is-paused', paused);
        label.textContent = paused ? 'Reprendre le défilement' : 'Mettre en pause';
      });
    });
  });

  /* ------------------------------------------ Visionneuse des réalisations */
  PC.register('lightbox', function () {
    PC.$$('[data-lightbox]').forEach(function (grid) {
      var dialog = grid.nextElementSibling;
      if (!dialog || !dialog.matches('[data-lightbox-dialog]') || typeof dialog.showModal !== 'function') return;
      var buttons = PC.$$('[data-lightbox-open]', grid);
      var img = PC.$('[data-lightbox-img]', dialog);
      var source = PC.$('[data-lightbox-source]', dialog);
      var caption = PC.$('[data-lightbox-caption]', dialog);
      var count = PC.$('[data-lightbox-count]', dialog);
      var index = 0;
      var opener = null;

      var show = function (i) {
        index = (i + buttons.length) % buttons.length;
        var b = buttons[index];
        var thumb = PC.$('img', b);
        source.srcset = b.getAttribute('data-full-avif');
        img.src = b.getAttribute('data-full');
        img.alt = thumb ? thumb.alt : '';
        caption.textContent = b.parentNode.querySelector('figcaption').textContent;
        count.textContent = index + 1 + ' / ' + buttons.length;
      };

      buttons.forEach(function (b, i) {
        b.addEventListener('click', function () {
          opener = b;
          show(i);
          dialog.showModal();
        });
      });
      PC.$('[data-lightbox-prev]', dialog).addEventListener('click', function () {
        show(index - 1);
      });
      PC.$('[data-lightbox-next]', dialog).addEventListener('click', function () {
        show(index + 1);
      });
      PC.$('[data-lightbox-close]', dialog).addEventListener('click', function () {
        dialog.close();
      });
      dialog.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') show(index + 1);
        if (e.key === 'ArrowLeft') show(index - 1);
      });
      // Clic sur le fond (hors contenu) : fermeture.
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', function () {
        if (opener) opener.focus();
      });
    });
  });

  /* ------------------------------------------------- Galerie à onglets */
  PC.register('tabs', function () {
    PC.$$('[data-tabs]').forEach(function (root) {
      var tabs = PC.$$('[role="tab"]', root);
      var activate = function (tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
        if (focus) tab.focus();
      };
      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () {
          activate(tab);
        });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === 'Home') next = tabs[0];
          if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) {
            e.preventDefault();
            activate(next, true);
          }
        });
      });
    });
  });

  /* ------------------------------------------------------------ Accordéons
     <details> natif (fonctionne sans JS) ; le script anime seulement la hauteur. */
  PC.register('accordion', function () {
    PC.$$('[data-accordion] details').forEach(function (details) {
      var summary = PC.$('summary', details);
      var panel = PC.$('.faq__a', details);
      var anim = null;
      summary.addEventListener('click', function (e) {
        if (PC.reducedMotion() || !panel.animate) return;
        e.preventDefault();
        if (anim) anim.cancel();
        if (!details.open) {
          details.open = true;
          var h = panel.scrollHeight;
          anim = panel.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], {
            duration: 320,
            easing: 'cubic-bezier(.22,1,.36,1)',
          });
          anim.onfinish = function () {
            anim = null;
          };
        } else {
          var from = panel.offsetHeight;
          anim = panel.animate([{ height: from + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], {
            duration: 240,
            easing: 'cubic-bezier(.65,0,.35,1)',
          });
          anim.onfinish = function () {
            details.open = false;
            anim = null;
          };
        }
      });
    });
    // Ouvre la question ciblée par l'ancre (#faq-…).
    if (location.hash.indexOf('#faq-') === 0) {
      var target = document.getElementById(location.hash.slice(1));
      if (target && target.tagName === 'DETAILS') target.open = true;
    }
  });
})(window.PC);

/* ==========================================================================
   PAPER CUP — Thème v0 · forms.js
   Estimateur de cartons, formulaire « Demande de devis » et formulaire
   « Essayez votre marque » (atelier d'aperçu).

   Deux modes, choisis automatiquement au chargement :
   - « connecté » : l'API PHP du thème répond (GET data-endpoint, voir api/demande.php).
     La demande et ses pièces jointes sont envoyées (multipart, progression, clé
     d'idempotence conservée entre les tentatives : aucun doublon en cas de nouvel essai).
   - « préparation » : pas d'API (hébergement statique, file://). Rien n'est envoyé :
     le formulaire génère un récapitulatif à transmettre par e-mail (lien mailto:
     pré-rempli), à dicter ou à copier, et rappelle les fichiers à joindre.
   ========================================================================== */
(function (PC) {
  'use strict';

  var MIN_CUSTOM = 5000;

  var cartonsFor = function (p, qty) {
    return Math.max(1, Math.ceil(qty / p.perBox));
  };

  /* ------------------------------------------------------------ Estimateur */
  PC.register('estimator', function () {
    PC.$$('[data-estimator]').forEach(function (root) {
      var qty = PC.$('[data-qty]', root);
      var out = PC.$('[data-est-cartons]', root);
      var unit = PC.$('[data-est-unit]', root);
      var detail = PC.$('[data-est-detail]', root);
      var hint = PC.$('[data-qty-hint]', root);
      var link = PC.$('[data-est-link]', root);
      var presets = PC.$$('[data-preset]', root);
      var hintDefault = hint ? hint.textContent : '';

      var current = function () {
        var r = PC.$('input[type="radio"]:checked', root);
        return PC.product(r ? r.value : '12oz');
      };
      var read = function () {
        var v = parseInt(qty.value, 10);
        return isNaN(v) || v < 0 ? 0 : Math.min(v, 10000000);
      };
      var update = function () {
        var p = current();
        var q = read();
        if (!p) return;
        var n = q > 0 ? cartonsFor(p, q) : 0;
        PC.tween(out, n, 300);
        unit.textContent = n > 1 ? 'cartons' : 'carton';
        detail.textContent = 'de ' + PC.fmt(p.perBox) + ' gobelets ' + p.label + ' · carton ' + p.carton.join(' × ');
        if (hint) {
          var low = q > 0 && q < MIN_CUSTOM;
          hint.classList.toggle('is-warning', low);
          hint.textContent = low
            ? 'En dessous du minimum de ' + PC.fmt(MIN_CUSTOM) + ' gobelets indiqué pour les commandes personnalisées.'
            : hintDefault;
        }
        presets.forEach(function (b) {
          b.setAttribute('aria-pressed', String(parseInt(b.getAttribute('data-preset'), 10) === q));
        });
        if (link) {
          link.href = root.getAttribute('data-href') + '?format=' + encodeURIComponent(p.id) + '&qte=' + q + '#devis';
        }
      };

      root.addEventListener('change', update);
      qty.addEventListener('input', update);
      PC.$$('[data-step]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          var step = parseInt(b.getAttribute('data-step'), 10);
          var base = Math.round(read() / 1000) * 1000;
          qty.value = Math.max(1000, base + step);
          update();
        });
      });
      presets.forEach(function (b) {
        b.addEventListener('click', function () {
          qty.value = b.getAttribute('data-preset');
          update();
        });
      });
      update();
    });
  });

  /* ------------------------------------------------------ Envoi commun */

  /**
   * Envoie le formulaire (champs + fichiers retenus) en multipart. Résout toujours
   * { status, data } ; status 0 = réseau indisponible ou délai dépassé.
   */
  PC.sendForm = function (endpoint, form, attach) {
    return new Promise(function (resolve) {
      var fd = new FormData(form);
      fd.delete('fichiers[]');
      if (attach && attach.mode === 'connected') {
        attach.files().forEach(function (f) {
          fd.append('fichiers[]', f, f.name);
        });
      }
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = 10 * 60 * 1000;
      if (attach && xhr.upload) {
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) attach.progress(e.loaded, e.total);
        });
      }
      xhr.onload = function () {
        var data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          data = null;
        }
        resolve({ status: xhr.status, data: data });
      };
      xhr.onerror = xhr.ontimeout = xhr.onabort = function () {
        resolve({ status: 0, data: null });
      };
      xhr.send(fd);
    });
  };

  /** Message d'échec à afficher (les saisies et les fichiers restent dans le formulaire). */
  PC.sendError = function (res, phone) {
    if (res.data && res.data.message) return res.data.message;
    if (res.status === 0) return 'L’envoi n’a pas abouti (connexion interrompue ou trop lente). Vos informations et vos fichiers sont conservés : renvoyez la demande telle quelle, elle ne sera pas enregistrée deux fois. Si vous la modifiez, la nouvelle version sera transmise en remplacement de la précédente.';
    if (res.status === 413) return 'L’envoi dépasse la taille acceptée par le serveur. Retirez un ou plusieurs fichiers, puis renvoyez votre demande.';
    return 'L’envoi a échoué. Vos informations sont conservées : réessayez ou appelez le ' + phone + '.';
  };

  /** Clé d'idempotence : créée une fois, conservée jusqu'au succès de l'envoi. */
  var idempotence = function (form, renew) {
    var el = form.querySelector('[data-idempotence]');
    if (!el) return;
    if (renew || !el.value) el.value = PC.uid();
  };

  /** Texte de confirmation : doublon évité, version de remplacement, ou message du serveur. */
  var sentText = function (data, phone) {
    var t = data.duplicate ? 'Cette demande avait déjà été enregistrée : elle n’a pas été envoyée une seconde fois.' : data.message;
    if (data.replaces) t += ' Cette version remplace la demande ' + data.replaces + ', reçue juste avant la coupure.';
    if (!data.notified) t += ' Pour un traitement rapide, vous pouvez aussi appeler le ' + phone + '.';
    return t;
  };

  /** Bouton d'envoi occupé (configuration en cours de chargement ou envoi). */
  var busy = function (btn, label, on, text) {
    btn.disabled = on;
    if (on) btn.setAttribute('aria-busy', 'true');
    else btn.removeAttribute('aria-busy');
    if (label && text) label.textContent = text;
  };

  /** Liste des fichiers pour un récapitulatif texte. */
  var filesSummary = function (attach, title) {
    if (!attach || !attach.files().length) return [];
    return ['', title].concat(
      attach.files().map(function (f) {
        return '- ' + f.name + ' (' + PC.bytes(f.size) + ')';
      }),
    );
  };

  /* --------------------------------------------- Formulaire de demande de devis */
  PC.register('quote-form', function () {
    var form = PC.$('[data-quote-form]');
    if (!form) return;
    var result = PC.$('[data-quote-result]');
    var summaryEl = PC.$('[data-quote-summary]');
    var errorsBox = PC.$('[data-form-errors]', form);
    var errorsIntro = PC.$('p', errorsBox);
    var errorsIntroDefault = errorsIntro.textContent;
    var qtyHint = PC.$('[data-qty-hint]', form);
    var submitBtn = PC.$('[type="submit"]', form);
    var submitLabel = PC.$('[data-submit-label]', submitBtn);
    var note = PC.$('[data-form-note]', form);
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var phone = form.getAttribute('data-phone') || '';
    var qtyHintDefault = qtyHint ? qtyHint.textContent : '';
    var attach = PC.attachFor(form);
    var connected = false;
    var sending = false;
    // Validation assurée par le script (messages accessibles) ; sans JavaScript, celle du navigateur s'applique.
    form.noValidate = true;

    /* Envoi direct si l'API répond ; sinon mode préparation (récapitulatif), comme avant. */
    var setMode = function (cfg) {
      connected = Boolean(cfg);
      form.classList.toggle('is-connected', connected);
      PC.$$('[data-required-when-connected]', form).forEach(function (el) {
        el.required = connected;
      });
      PC.$$('[data-req-mark]', form).forEach(function (el) {
        el.hidden = !connected;
      });
      PC.$$('[data-connected-note]', form).forEach(function (el) {
        el.hidden = !connected;
      });
      if (submitLabel) submitLabel.textContent = submitBtn.getAttribute(connected ? 'data-label-connected' : 'data-label-offline');
      if (note) note.textContent = note.getAttribute(connected ? 'data-note-connected' : 'data-note-offline');
      if (attach) attach.setConfig(cfg);
    };
    // Le HTML est rendu en mode connecté : il n'est modifié qu'une fois la réponse de l'API connue
    // (aucun basculement visible au chargement sur un hébergement PHP).
    var ready = PC.api(endpoint).then(function (cfg) {
      setMode(cfg);
      if (cfg) idempotence(form, false);
      return cfg;
    });

    /* Pré-remplissage depuis l'URL (?format=9oz&qte=10000&type=personnalise&marque=…) */
    var params = new URLSearchParams(location.search);
    var setRadio = function (name, value) {
      var el = value && form.querySelector('input[name="' + name + '"][value="' + CSS.escape(value) + '"]');
      if (el) el.checked = true;
    };
    setRadio('format', params.get('format'));
    setRadio('type', params.get('type'));
    if (params.get('qte') && /^\d+$/.test(params.get('qte'))) form.quantite.value = params.get('qte');
    if (params.get('marque')) form.societe.value = params.get('marque').slice(0, 80);

    var typeValue = function () {
      var t = form.querySelector('input[name="type"]:checked');
      return t ? t.value : '';
    };
    var isCustom = function () {
      return typeValue() === 'personnalise';
    };
    // « Autre emballage » : gobelets plastique, pots à glace, pochettes… ; format de gobelet carton facultatif.
    var isOther = function () {
      return typeValue() === 'autre';
    };
    var TYPE_LABELS = { personnalise: 'Gobelet personnalisé', standard: 'Gobelet standard', autre: 'Autre emballage' };

    // « Autre emballage » : aucun format de gobelet imposé (il reste possible d'en choisir un), libellés adaptés.
    var formatReq = PC.$('[data-format-req]', form);
    var qtyLabel = PC.$('[data-qty-label]', form);
    var qtyLabelDefault = qtyLabel ? qtyLabel.textContent : '';
    var lastFormat = '12oz';
    var applyType = function (keepFormat) {
      var other = isOther();
      var cur = form.querySelector('input[name="format"]:checked');
      if (other && cur && !keepFormat) {
        lastFormat = cur.value;
        cur.checked = false;
      } else if (!other && !cur) {
        setRadio('format', lastFormat);
      }
      if (formatReq) formatReq.hidden = other;
      if (qtyLabel) qtyLabel.textContent = other ? 'Quantité' : qtyLabelDefault;
    };
    form.addEventListener('change', function (e) {
      if (e.target.name === 'type') applyType(false);
    });
    applyType(Boolean(params.get('format')));

    var updateQtyHint = function () {
      if (!qtyHint) return;
      var f = form.querySelector('input[name="format"]:checked');
      var p = f && PC.product(f.value);
      var q = parseInt(form.quantite.value, 10);
      var txt = isCustom() ? 'Minimum ' + PC.fmt(MIN_CUSTOM) + ' gobelets pour une commande personnalisée.' : qtyHintDefault;
      if (p && q > 0 && !isOther()) txt += ' Soit environ ' + PC.fmt(cartonsFor(p, q)) + ' carton(s) de ' + PC.fmt(p.perBox) + ' pièces.';
      if (isOther()) txt = 'Indiquez la quantité souhaitée et précisez le produit dans « Votre projet ».';
      qtyHint.textContent = txt;
    };
    form.addEventListener('change', updateQtyHint);
    form.quantite.addEventListener('input', updateQtyHint);
    updateQtyHint();

    /* --------------------------------------------------------- Validation */
    var rules = [
      {
        name: 'type',
        field: function () {
          return form.querySelector('input[name="type"]');
        },
        check: function () {
          return form.querySelector('input[name="type"]:checked') ? '' : 'Choisissez un type de produit.';
        },
        errorId: 'err-type',
      },
      {
        name: 'format',
        field: function () {
          return form.querySelector('input[name="format"]');
        },
        check: function () {
          return form.querySelector('input[name="format"]:checked') || isOther() ? '' : 'Choisissez un format de gobelet.';
        },
        errorId: 'err-format',
      },
      {
        name: 'quantite',
        field: function () {
          return form.quantite;
        },
        check: function () {
          var raw = form.quantite.value.trim();
          var q = parseInt(raw, 10);
          if (!raw || isNaN(q) || q <= 0) return isOther() ? 'Indiquez une quantité.' : 'Indiquez une quantité de gobelets.';
          if (isCustom() && q < MIN_CUSTOM) return 'Les commandes personnalisées démarrent à ' + PC.fmt(MIN_CUSTOM) + ' gobelets.';
          return '';
        },
        errorId: 'err-qty',
      },
      {
        name: 'telephone',
        field: function () {
          return form.telephone;
        },
        check: function () {
          var v = form.telephone.value.trim();
          if (!v) return form.telephone.required ? 'Indiquez un numéro de téléphone pour être rappelé.' : '';
          return /^[+()\d\s.-]{8,20}$/.test(v) && (v.match(/\d/g) || []).length >= 8 ? '' : 'Le numéro de téléphone semble incomplet.';
        },
        errorId: 'err-phone',
      },
      {
        name: 'nom',
        field: function () {
          return form.nom;
        },
        check: function () {
          return form.nom.required && !form.nom.value.trim() ? 'Indiquez votre nom.' : '';
        },
        errorId: 'err-name',
      },
      {
        name: 'email',
        field: function () {
          return form.email;
        },
        check: function () {
          var v = form.email ? form.email.value.trim() : '';
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'L’adresse e-mail semble incorrecte.';
        },
        errorId: 'err-email',
      },
    ];

    var showError = function (rule, msg) {
      var el = rule.field();
      var box = document.getElementById(rule.errorId);
      if (!box || !el) return;
      box.hidden = !msg;
      box.querySelector('span').textContent = msg;
      var targets = el.type === 'radio' ? PC.$$('input[name="' + el.name + '"]', form) : [el];
      targets.forEach(function (t) {
        if (msg) t.setAttribute('aria-invalid', 'true');
        else t.removeAttribute('aria-invalid');
      });
    };

    var validate = function () {
      var list = [];
      rules.forEach(function (rule) {
        var msg = rule.check();
        showError(rule, msg);
        if (msg) list.push({ rule: rule, msg: msg });
      });
      return list;
    };

    // Revalidation douce après une première erreur.
    form.addEventListener('input', function (e) {
      rules.forEach(function (rule) {
        var f = rule.field();
        if (f && (f === e.target || f.name === e.target.name) && f.getAttribute('aria-invalid')) showError(rule, rule.check());
      });
    });
    form.addEventListener('change', function () {
      rules.slice(0, 3).forEach(function (rule) {
        if (document.getElementById(rule.errorId) && !document.getElementById(rule.errorId).hidden) showError(rule, rule.check());
      });
    });

    /** Résumé d'erreurs focalisé, avec liens vers les champs. */
    var showSummary = function (errors, intro) {
      var ul = PC.$('ul', errorsBox);
      ul.innerHTML = '';
      errorsIntro.textContent = intro || errorsIntroDefault;
      errors.forEach(function (er) {
        var li = document.createElement('li');
        var target = er.rule ? er.rule.field() : null;
        var id = target && (target.id || (form.querySelector('input[name="' + target.name + '"]') || {}).id);
        if (id) {
          var a = document.createElement('a');
          a.href = '#' + id;
          a.textContent = er.msg;
          a.addEventListener('click', function (ev) {
            ev.preventDefault();
            document.getElementById(id).focus();
          });
          li.appendChild(a);
        } else li.textContent = er.msg;
        ul.appendChild(li);
      });
      errorsBox.hidden = false;
      errorsBox.focus();
    };

    /* ------------------------------------------------------- Récapitulatif */
    var buildSummary = function (reference, sentFiles) {
      var f = form.querySelector('input[name="format"]:checked');
      var p = f && PC.product(f.value);
      var q = parseInt(form.quantite.value, 10);
      var lines = [isOther() ? 'DEMANDE DE DEVIS — EMBALLAGES' : 'DEMANDE DE DEVIS — GOBELETS EN CARTON', ''];
      if (reference) lines.push('Référence   : ' + reference);
      lines.push('Type        : ' + (TYPE_LABELS[typeValue()] || ''));
      if (p) lines.push('Format      : ' + p.label + ' (modèle ' + p.model + ')');
      lines.push('Quantité    : ' + PC.fmt(q) + (isOther() ? ' pièces' : ' gobelets'));
      if (p && !isOther()) lines.push('Estimation  : environ ' + PC.fmt(cartonsFor(p, q)) + ' carton(s) de ' + PC.fmt(p.perBox) + ' pièces');
      var opt = [
        ['Société     : ', form.societe.value],
        ['Contact     : ', form.nom.value],
        ['Téléphone   : ', form.telephone.value],
        ['E-mail      : ', form.email ? form.email.value : ''],
        ['Ville       : ', form.ville.value],
      ];
      opt.forEach(function (o) {
        if (o[1].trim()) lines.push(o[0] + o[1].trim());
      });
      if (form.message.value.trim()) lines.push('', 'Projet :', form.message.value.trim());
      if (sentFiles) {
        // Envoi réel : la liste vient de la réponse du serveur (fichiers effectivement enregistrés).
        if (sentFiles.length) {
          lines.push('', 'Fichiers transmis :');
          sentFiles.forEach(function (fl) {
            lines.push('- ' + fl.name + ' (' + PC.bytes(fl.size) + ')');
          });
        }
      } else lines = lines.concat(filesSummary(attach, 'Fichiers à joindre à l’e-mail :'));
      return lines.join('\n');
    };

    var mailto = PC.$('[data-mailto]', result);
    var editBtn = PC.$('[data-quote-edit]');
    var showResult = function (title, text, summary, sent) {
      PC.$('[data-result-title]', result).textContent = title;
      PC.$('[data-result-text]', result).textContent = text;
      summaryEl.textContent = summary;
      if (mailto) {
        // Mode préparation : la messagerie s'ouvre avec la demande pré-remplie (aucun envoi automatique).
        mailto.hidden = Boolean(sent);
        mailto.href =
          'mailto:' + mailto.getAttribute('data-email') +
          '?subject=' + encodeURIComponent(isOther() ? 'Demande de devis — emballages' : 'Demande de devis — gobelets en carton') +
          '&body=' + encodeURIComponent(summary.replace(/ /g, ' '));
      }
      if (editBtn) editBtn.textContent = sent ? 'Faire une autre demande' : 'Modifier ma demande';
      result.classList.toggle('is-sent', Boolean(sent));
      form.hidden = true;
      result.hidden = false;
      result.focus();
      result.scrollIntoView({ behavior: PC.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };

    var setSending = function (on) {
      sending = on;
      submitBtn.disabled = on;
      if (on) submitBtn.setAttribute('aria-busy', 'true');
      else submitBtn.removeAttribute('aria-busy');
      if (submitLabel) submitLabel.textContent = on ? 'Envoi en cours…' : submitBtn.getAttribute(connected ? 'data-label-connected' : 'data-label-offline');
      if (attach) attach.setBusy(on);
    };

    /** Erreurs renvoyées par le serveur : affichées sur les champs et dans le résumé. */
    var serverFailure = function (res) {
      var list = [];
      var fields = (res.data && res.data.fields) || {};
      Object.keys(fields).forEach(function (name) {
        var rule = rules.filter(function (r) {
          return r.name === name;
        })[0];
        if (rule) showError(rule, fields[name]);
        list.push({ rule: rule, msg: fields[name] });
      });
      if (attach) attach.serverErrors((res.data && res.data.files) || []);
      if (!list.length && res.data && res.data.files && res.data.files.length) {
        res.data.files.forEach(function (f) {
          list.push({ msg: (f.name ? '« ' + f.name + ' » : ' : '') + f.message });
        });
      }
      showSummary(list, PC.sendError(res, phone));
    };

    var pending = false; // envoi demandé pendant le chargement de la configuration : un seul traitement
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending || pending) return;
      pending = true;
      busy(submitBtn, submitLabel, true, 'Chargement…');
      ready.then(function () {
        pending = false;
        busy(submitBtn, submitLabel, false, submitBtn.getAttribute(connected ? 'data-label-connected' : 'data-label-offline'));
        if (sending) return;
        var errors = validate();
        if (attach && attach.hasErrors()) {
          errors.push({ msg: 'Retirez ou remplacez les fichiers signalés dans la liste des pièces jointes.' });
        }
        if (errors.length) {
          showSummary(errors);
          return;
        }
        errorsBox.hidden = true;

        if (!connected) {
          var prep = buildSummary('', null);
          showResult(
            'Votre demande est prête',
            'Rien n’a encore été envoyé : transmettez ce récapitulatif par e-mail (votre messagerie s’ouvre avec la demande pré-remplie), par téléphone, ou copiez-le.' +
              (attach && attach.files().length ? ' Pensez à joindre vos fichiers à l’e-mail : ils ne sont pas ajoutés automatiquement.' : ''),
            prep,
            false,
          );
          return;
        }

        idempotence(form, false);
        setSending(true);
        PC.sendForm(endpoint, form, attach).then(function (res) {
          setSending(false);
          if (res.data && res.data.ok) {
            var ref = res.data.id;
            showResult(
              'Demande envoyée',
              sentText(res.data, phone) + ' Référence : ' + ref + '.',
              buildSummary(ref, res.data.files || []),
              true,
            );
            idempotence(form, true);
            return;
          }
          serverFailure(res);
        });
      });
    });

    /* ------------------------------------------------------- Actions résultat */
    var status = PC.$('[data-copy-status]');
    var copyBtn = PC.$('[data-copy-summary]');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        PC.copy(summaryEl.textContent).then(
          function () {
            status.textContent = 'Récapitulatif copié dans le presse-papiers.';
          },
          function () {
            status.textContent = 'Copie impossible : sélectionnez le texte manuellement.';
          },
        );
      });
    }
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        // Après un envoi réussi : nouvelle demande (coordonnées conservées, fichiers retirés).
        if (result.classList.contains('is-sent') && attach) attach.clear();
        result.hidden = true;
        form.hidden = false;
        status.textContent = '';
        submitBtn.focus();
      });
    }
  });

  /* ------------------------------------ Formulaire « Essayez votre marque » */
  PC.register('brand-form', function () {
    PC.$$('[data-brand-form]').forEach(function (form) {
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      var phone = form.getAttribute('data-phone') || '';
      var attach = PC.attachFor(form);
      var errorsBox = PC.$('[data-form-errors]', form);
      var errorsIntro = PC.$('p', errorsBox);
      var errorsIntroDefault = errorsIntro.textContent;
      var submitBtn = PC.$('[type="submit"]', form);
      var submitLabel = PC.$('[data-submit-label]', submitBtn);
      var cta = PC.$('[data-studio-cta]', form);
      var note = PC.$('[data-form-note]', form);
      var result = PC.$('[data-brand-result]', form);
      var connected = false;
      var sending = false;
      form.noValidate = true;

      var setMode = function (cfg) {
        connected = Boolean(cfg);
        form.classList.toggle('is-connected', connected);
        PC.$$('[data-connected-only]', form).forEach(function (el) {
          el.hidden = !connected;
        });
        PC.$$('[data-required-when-connected]', form).forEach(function (el) {
          el.required = connected;
        });
        if (cta) {
          // Envoi direct possible : le lien vers le devis détaillé devient l'action secondaire.
          cta.classList.toggle('btn--accent', !connected);
          cta.classList.toggle('btn--outline-light', connected);
          PC.$('[data-cta-label]', cta).textContent = cta.getAttribute(connected ? 'data-label-connected' : 'data-label-offline');
        }
        if (note) note.textContent = note.getAttribute(connected ? 'data-note-connected' : 'data-note-offline');
        if (attach) attach.setConfig(cfg);
      };
      var ready = PC.api(endpoint).then(function (cfg) {
        setMode(cfg);
        if (cfg) idempotence(form, false);
        return cfg;
      });

      var fields = [
        {
          el: form.nom,
          err: PC.$('[data-error-for="nom"]', form),
          check: function () {
            return form.nom.value.trim() ? '' : 'Indiquez votre nom.';
          },
        },
        {
          el: form.telephone,
          err: PC.$('[data-error-for="telephone"]', form),
          check: function () {
            var v = form.telephone.value.trim();
            if (!v) return 'Indiquez un numéro de téléphone pour être rappelé.';
            return /^[+()\d\s.-]{8,20}$/.test(v) && (v.match(/\d/g) || []).length >= 8 ? '' : 'Le numéro de téléphone semble incomplet.';
          },
        },
        {
          el: form.email,
          err: PC.$('[data-error-for="email"]', form),
          check: function () {
            var v = form.email.value.trim();
            return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'L’adresse e-mail semble incorrecte.';
          },
        },
      ];
      var show = function (f, msg) {
        if (!f.err) return;
        f.err.hidden = !msg;
        PC.$('span', f.err).textContent = msg;
        if (msg) f.el.setAttribute('aria-invalid', 'true');
        else f.el.removeAttribute('aria-invalid');
      };
      form.addEventListener('input', function (e) {
        fields.forEach(function (f) {
          if (f.el === e.target && f.el.getAttribute('aria-invalid')) show(f, f.check());
        });
      });

      var summary = function (list, intro) {
        var ul = PC.$('ul', errorsBox);
        ul.innerHTML = '';
        errorsIntro.textContent = intro || errorsIntroDefault;
        list.forEach(function (it) {
          var li = document.createElement('li');
          if (it.el) {
            var a = document.createElement('a');
            a.href = '#' + it.el.id;
            a.textContent = it.msg;
            a.addEventListener('click', function (ev) {
              ev.preventDefault();
              it.el.focus();
            });
            li.appendChild(a);
          } else li.textContent = it.msg;
          ul.appendChild(li);
        });
        errorsBox.hidden = false;
        errorsBox.focus();
      };

      var setSending = function (on) {
        sending = on;
        submitBtn.disabled = on;
        if (on) submitBtn.setAttribute('aria-busy', 'true');
        else submitBtn.removeAttribute('aria-busy');
        submitLabel.textContent = on ? 'Envoi en cours…' : submitBtn.getAttribute('data-label-connected');
        if (attach) attach.setBusy(on);
      };

      var pending = false;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sending || pending) return;
        pending = true;
        busy(submitBtn, submitLabel, true, 'Chargement…');
        ready.then(function () {
          pending = false;
          busy(submitBtn, submitLabel, false, submitBtn.getAttribute('data-label-connected'));
          if (sending) return;
          if (!connected) {
            // Sans service d'envoi : la demande se poursuit dans le formulaire de devis.
            if (cta) location.href = cta.href;
            return;
          }
          var list = [];
          fields.forEach(function (f) {
            var msg = f.check();
            show(f, msg);
            if (msg) list.push({ el: f.el, msg: msg });
          });
          if (attach && attach.hasErrors()) list.push({ msg: 'Retirez ou remplacez les fichiers signalés dans la liste des pièces jointes.' });
          if (list.length) {
            summary(list);
            return;
          }
          errorsBox.hidden = true;
          idempotence(form, false);
          setSending(true);
          PC.sendForm(endpoint, form, attach).then(function (res) {
            setSending(false);
            if (res.data && res.data.ok) {
              PC.$('[data-result-ref]', result).textContent = res.data.id;
              PC.$('[data-result-text]', result).textContent = sentText(res.data, phone);
              form.classList.add('is-sent');
              result.hidden = false;
              result.focus();
              idempotence(form, true);
              return;
            }
            var errs = (res.data && res.data.fields) || {};
            var list2 = [];
            Object.keys(errs).forEach(function (name) {
              var f = fields.filter(function (x) {
                return x.el && x.el.name === name;
              })[0];
              if (f) show(f, errs[name]);
              list2.push({ el: f ? f.el : null, msg: errs[name] });
            });
            if (attach) attach.serverErrors((res.data && res.data.files) || []);
            summary(list2, PC.sendError(res, phone));
          });
        });
      });

      var again = PC.$('[data-brand-again]', form);
      if (again) {
        again.addEventListener('click', function () {
          form.classList.remove('is-sent');
          result.hidden = true;
          if (attach) attach.clear();
          var name = PC.$('[data-studio-name]', form);
          if (name) name.focus();
        });
      }
    });
  });
})(window.PC);

window.PC.start();
