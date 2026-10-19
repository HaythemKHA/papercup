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
