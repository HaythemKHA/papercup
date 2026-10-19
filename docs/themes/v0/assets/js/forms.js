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
