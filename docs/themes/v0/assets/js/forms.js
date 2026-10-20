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

  /**
   * Bouton d'envoi occupé (configuration en cours de chargement ou envoi) : aria-disabled plutôt que
   * disabled, pour que le bouton garde le focus clavier ; l'état est annoncé par la zone de statut du formulaire.
   */
  var busy = function (btn, label, on, text) {
    if (on) {
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.removeAttribute('aria-disabled');
      btn.removeAttribute('aria-busy');
    }
    if (label && text) label.textContent = text;
    var status = btn.form && btn.form.querySelector('[data-form-status]');
    if (status) status.textContent = on ? text : '';
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
      return Boolean(el);
    };
    var formatFromUrl = setRadio('format', params.get('format'));
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
    applyType(formatFromUrl);

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
      busy(submitBtn, submitLabel, on, on ? 'Envoi en cours…' : submitBtn.getAttribute(connected ? 'data-label-connected' : 'data-label-offline'));
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
        busy(submitBtn, submitLabel, on, on ? 'Envoi en cours…' : submitBtn.getAttribute('data-label-connected'));
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
