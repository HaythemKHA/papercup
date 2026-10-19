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
