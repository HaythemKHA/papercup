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
