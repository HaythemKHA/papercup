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
