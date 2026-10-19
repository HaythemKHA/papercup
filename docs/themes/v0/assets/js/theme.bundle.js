/*! PAPER CUP — thème v0 · généré par build.mjs, ne pas modifier : éditer assets/js/*.js */
/* ==========================================================================
   PAPER CUP — Thème v0 · main.js
   Noyau : espace de noms, utilitaires partagés, registre de modules.
   Le build concatène : main → navigation → animations → components → forms,
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
      var state = { name: '', format: (PC.$('input[name$="-format"]:checked', root) || {}).value };

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

      if (input) {
        input.addEventListener('input', function () {
          state.name = input.value.trim().slice(0, 18);
          var shown = (state.name || 'VOTRE MARQUE').toUpperCase();
          texts.forEach(function (tp) {
            tp.textContent = shown;
          });
          fit();
          updateLink();
        });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') e.preventDefault();
        });
      }

      root.addEventListener('change', function (e) {
        var name = e.target.name || '';
        if (/-ink$/.test(name)) root.style.setProperty('--print', e.target.value);
        if (/-format$/.test(name)) {
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
   Estimateur de cartons et formulaire « Préparer ma demande de devis ».

   Le formulaire du site source dépend d'un script serveur (sendmail/mail.php) absent
   de ce thème statique : par défaut, le formulaire n'envoie RIEN. Il génère un
   récapitulatif à envoyer par e-mail (lien mailto: pré-rempli), à dicter ou à copier.
   Si l'attribut data-endpoint du <form> reçoit une URL (voir README), la demande
   est envoyée en POST JSON et les états succès / erreur sont affichés.
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

  /* --------------------------------------------- Formulaire de demande de devis */
  PC.register('quote-form', function () {
    var form = PC.$('[data-quote-form]');
    if (!form) return;
    var result = PC.$('[data-quote-result]');
    var summaryEl = PC.$('[data-quote-summary]');
    var errorsBox = PC.$('[data-form-errors]', form);
    var qtyHint = PC.$('[data-qty-hint]', form);
    var submitBtn = PC.$('[type="submit"]', form);
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var qtyHintDefault = qtyHint ? qtyHint.textContent : '';

    if (endpoint) {
      form.classList.add('is-connected');
      PC.$$('[data-required-when-connected]', form).forEach(function (el) {
        el.required = true;
      });
    }

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

    var isCustom = function () {
      var t = form.querySelector('input[name="type"]:checked');
      return t && t.value === 'personnalise';
    };

    var updateQtyHint = function () {
      if (!qtyHint) return;
      var f = form.querySelector('input[name="format"]:checked');
      var p = f && PC.product(f.value);
      var q = parseInt(form.quantite.value, 10);
      var txt = isCustom() ? 'Minimum ' + PC.fmt(MIN_CUSTOM) + ' gobelets pour une commande personnalisée.' : qtyHintDefault;
      if (p && q > 0) txt += ' Soit environ ' + PC.fmt(cartonsFor(p, q)) + ' carton(s) de ' + PC.fmt(p.perBox) + ' pièces.';
      qtyHint.textContent = txt;
    };
    form.addEventListener('change', updateQtyHint);
    form.quantite.addEventListener('input', updateQtyHint);
    updateQtyHint();

    /* --------------------------------------------------------- Validation */
    var rules = [
      {
        field: function () {
          return form.querySelector('input[name="type"]');
        },
        check: function () {
          return form.querySelector('input[name="type"]:checked') ? '' : 'Choisissez un type de gobelet.';
        },
        errorId: 'err-type',
      },
      {
        field: function () {
          return form.querySelector('input[name="format"]');
        },
        check: function () {
          return form.querySelector('input[name="format"]:checked') ? '' : 'Choisissez un format de gobelet.';
        },
        errorId: 'err-format',
      },
      {
        field: function () {
          return form.quantite;
        },
        check: function () {
          var raw = form.quantite.value.trim();
          var q = parseInt(raw, 10);
          if (!raw || isNaN(q) || q <= 0) return 'Indiquez une quantité de gobelets.';
          if (isCustom() && q < MIN_CUSTOM) return 'Les commandes personnalisées démarrent à ' + PC.fmt(MIN_CUSTOM) + ' gobelets.';
          return '';
        },
        errorId: 'err-qty',
      },
      {
        field: function () {
          return form.telephone;
        },
        check: function () {
          var v = form.telephone.value.trim();
          if (!v) return form.telephone.required ? 'Indiquez un numéro de téléphone pour être rappelé.' : '';
          return /^[+()\d\s.-]{8,20}$/.test(v) ? '' : 'Le numéro de téléphone semble incomplet.';
        },
        errorId: 'err-phone',
      },
      {
        field: function () {
          return form.nom;
        },
        check: function () {
          return form.nom.required && !form.nom.value.trim() ? 'Indiquez votre nom.' : '';
        },
        errorId: 'err-name',
      },
    ];

    var showError = function (rule, msg) {
      var el = rule.field();
      var box = document.getElementById(rule.errorId);
      if (!box) return;
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

    /* ------------------------------------------------------- Récapitulatif */
    var buildSummary = function () {
      var f = form.querySelector('input[name="format"]:checked');
      var p = PC.product(f.value);
      var q = parseInt(form.quantite.value, 10);
      var lines = [
        'DEMANDE DE DEVIS — GOBELETS EN CARTON',
        '',
        'Type        : ' + (isCustom() ? 'Gobelet personnalisé' : 'Gobelet standard'),
        'Format      : ' + p.label + ' (modèle ' + p.model + ')',
        'Quantité    : ' + PC.fmt(q) + ' gobelets',
        'Estimation  : environ ' + PC.fmt(cartonsFor(p, q)) + ' carton(s) de ' + PC.fmt(p.perBox) + ' pièces',
      ];
      var opt = [
        ['Société     : ', form.societe.value],
        ['Contact     : ', form.nom.value],
        ['Téléphone   : ', form.telephone.value],
        ['Ville       : ', form.ville.value],
      ];
      opt.forEach(function (o) {
        if (o[1].trim()) lines.push(o[0] + o[1].trim());
      });
      if (form.message.value.trim()) lines.push('', 'Projet :', form.message.value.trim());
      return lines.join('\n');
    };

    var payload = function () {
      var data = {};
      new FormData(form).forEach(function (v, k) {
        data[k] = typeof v === 'string' ? v.trim() : v;
      });
      return data;
    };

    var mailto = PC.$('[data-mailto]', result);
    var showResult = function (title, text, summary) {
      PC.$('[data-result-title]', result).textContent = title;
      PC.$('[data-result-text]', result).textContent = text;
      summaryEl.textContent = summary;
      if (mailto) {
        // Le client de messagerie s'ouvre avec la demande pré-remplie (aucun envoi automatique).
        mailto.href =
          'mailto:' + mailto.getAttribute('data-email') +
          '?subject=' + encodeURIComponent('Demande de devis — gobelets en carton') +
          '&body=' + encodeURIComponent(summary.replace(/\u00a0/g, ' '));
      }
      form.hidden = true;
      result.hidden = false;
      result.focus();
      result.scrollIntoView({ behavior: PC.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errors = validate();
      if (errors.length) {
        var ul = PC.$('ul', errorsBox);
        ul.innerHTML = '';
        errors.forEach(function (er) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          var target = er.rule.field();
          var id = target.id || (form.querySelector('input[name="' + target.name + '"]') || {}).id;
          a.href = '#' + id;
          a.textContent = er.msg;
          a.addEventListener('click', function (ev) {
            ev.preventDefault();
            document.getElementById(id).focus();
          });
          li.appendChild(a);
          ul.appendChild(li);
        });
        errorsBox.hidden = false;
        errorsBox.focus();
        return;
      }
      errorsBox.hidden = true;
      var summary = buildSummary();

      if (!endpoint) {
        showResult(
          'Votre demande est prête',
          'Rien n’a encore été envoyé : transmettez ce récapitulatif par e-mail (votre messagerie s’ouvre avec la demande pré-remplie), par téléphone, ou copiez-le.',
          summary,
        );
        return;
      }

      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      var original = submitBtn.innerHTML;
      submitBtn.textContent = 'Envoi en cours…';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload()),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          showResult('Demande envoyée', 'Merci. Votre demande a bien été transmise à PAPER CUP. Voici le récapitulatif envoyé.', summary);
        })
        .catch(function () {
          errorsBox.hidden = false;
          PC.$('p', errorsBox).textContent = 'L’envoi a échoué. Vérifiez votre connexion ou appelez directement le (+216) 75 290 088.';
          PC.$('ul', errorsBox).innerHTML = '';
          errorsBox.focus();
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
          submitBtn.innerHTML = original;
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
    var edit = PC.$('[data-quote-edit]');
    if (edit) {
      edit.addEventListener('click', function () {
        result.hidden = true;
        form.hidden = false;
        status.textContent = '';
        submitBtn.focus();
      });
    }
  });
})(window.PC);

window.PC.start();
