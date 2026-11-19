/* =========================================================================
   Login & Sign-up pages
   POST /api/auth/signup  { full_name, email, password }
   POST /api/auth/login   { email, password } → { token, user }
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon;

  // Same policy the backend enforces in auth.controller.js
  var RULES = {
    len: function (p) { return p.length >= 8; },
    case: function (p) { return /[a-z]/.test(p) && /[A-Z]/.test(p); },
    num: function (p) { return /\d/.test(p); },
    sym: function (p) { return /[\W_]/.test(p); }
  };
  var STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function alertBox(type, msg) {
    var $a = $('#form-alert');
    if (!msg) return $a.addClass('hidden');
    $a.removeClass('hidden border-ember-200 bg-ember-50 text-ember-800 border-moss-200 bg-moss-50 text-moss-700')
      .addClass(type === 'error' ? 'border-ember-200 bg-ember-50 text-ember-800' : 'border-moss-200 bg-moss-50 text-moss-700')
      .text(msg);
  }

  // Only allow redirecting to same-site pages (prevents open redirects via ?next=)
  function safeNext(n) {
    if (!n || /^[a-z]+:|^\/\//i.test(n) || n.indexOf('..') > -1) return null;
    return /^[a-z0-9\-]+\.html(\?.*)?$/i.test(n) ? n : null;
  }

  function wireReveal() {
    $('.js-reveal').each(function () {
      var $b = $(this), $i = $('#' + $b.attr('aria-controls'));
      $b.html(icon('eye', 'w-4 h-4'));
      $b.on('click', function () {
        var show = $i.attr('type') === 'password';
        $i.attr('type', show ? 'text' : 'password');
        $b.html(icon(show ? 'eyeOff' : 'eye', 'w-4 h-4')).attr('aria-label', show ? 'Hide password' : 'Show password');
      });
    });
  }

  function decorate() {
    var seeds = ['Kofi', 'Amara', 'Lena', 'Tariq', 'Yaw', 'Noor', 'Efua'];
    $('#auth-avatars').html(seeds.map(function (s, i) {
      return '<img src="' + CE.dice.avatar(s) + '" alt="" class="w-12 h-12 rounded-full ring-4 ring-ink-950 bg-paper-200 reveal" style="--d:' + (i * 70) + 'ms">';
    }).join(''));
    ui.reveal(document);
  }

  /* ---------------- LOGIN ---------------- */
  function initLogin() {
    var $f = $('#login-form');
    var prefill = CE.param('email');
    if (prefill) { $('#email').val(prefill); $('#password').trigger('focus'); } else $('#email').trigger('focus');

    $f.on('submit', function (e) {
      e.preventDefault();
      ui.clearErrors($f); alertBox();
      var email = $.trim($('#email').val()), pw = $('#password').val(), remember = $('#remember').is(':checked');
      var ok = true;
      if (!EMAIL.test(email)) ok = ui.fieldError($('#email'), 'Enter a valid email address.') && ok;
      if (!pw) ok = ui.fieldError($('#password'), 'Enter your password.') && ok;
      if (!ok) { $f.find('[aria-invalid=true]').first().trigger('focus'); return; }

      var $btn = $f.find('[type=submit]');
      ui.busy($btn, true, 'Signing in…');
      CE.api.post('/auth/login', { email: email, password: pw }, { public: true })
        .then(function (res) {
          var d = res.data || {};
          if (!d.token || !d.user) throw new CE.ApiError(500, 'Unexpected response from server.');
          CE.auth.save(d.token, d.user, remember);
          // Confirm the account is still active (admins can disable accounts).
          return CE.api.get('/users/profile/me').then(function (p) {
            if (p.data && p.data.is_active === false) {
              CE.auth.clear();
              throw new CE.ApiError(403, 'Your account has been disabled. Please contact an administrator.');
            }
            if (p.data) CE.auth.updateUser(p.data);
            return d.user;
          });
        })
        .then(function (user) {
          CE.flash.set('success', 'Welcome back, ' + (user.full_name || '').split(' ')[0] + '!');
          // ROLE-BASED REDIRECT: admins land on the admin dashboard, users on their home dashboard.
          window.location.href = safeNext(CE.param('next')) || (user.role === 'admin' ? 'admin.html' : 'index.html');
        })
        .catch(function (err) {
          ui.busy($btn, false);
          if (err.status === 401) { alertBox('error', 'That email and password combination didn’t match our records.'); $('#password').val('').trigger('focus'); }
          else if (err.status === 403) alertBox('error', err.message);
          else if (err.status === 400) { ui.applyServerErrors($f, err); alertBox('error', err.message); }
          else { alertBox('error', err.message); CE.handleError(err, { retry: function () { $f.trigger('submit'); } }); }
        });
    });
  }

  /* ---------------- SIGNUP ---------------- */
  function scorePassword(p) {
    var passed = Object.keys(RULES).filter(function (k) { return RULES[k](p); });
    var score = passed.length;
    if (score === 4 && p.length < 10) score = 3; // full marks need 10+ chars
    if (!p) score = 0;
    return { score: Math.max(score, p ? 1 : 0), passed: passed };
  }

  function initSignup() {
    var $f = $('#signup-form'), $pw = $('#password'), $meter = $('#pw-meter'), $lbl = $('#pw-strength-label');
    var labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
    var colours = ['text-ink-500', 'text-[#b42318]', 'text-ember-600', 'text-[#9a7414]', 'text-moss-600'];
    $('#full_name').trigger('focus');

    $('#full_name').on('input', CE.debounce(function () {
      var v = $.trim(this.value) || 'civic';
      $('#avatar-preview').attr('src', CE.dice.avatar(v)).css('transform', 'rotate(-8deg) scale(1.06)');
      setTimeout(function () { $('#avatar-preview').css('transform', ''); }, 350);
    }, 300));

    $pw.on('input', function () {
      var r = scorePassword(this.value);
      $meter.attr('data-score', r.score);
      $lbl.text(this.value ? labels[r.score] : labels[0]).attr('class', 'text-xs font-semibold w-20 text-right ' + colours[this.value ? r.score : 0]);
      $('#pw-rules li').each(function () {
        var ok = r.passed.indexOf($(this).data('rule')) > -1;
        $(this).toggleClass('text-moss-700', ok).find('.dot')
          .toggleClass('bg-moss-500 border-moss-500 text-white', ok)
          .html(ok ? icon('check', 'w-3 h-3') : '');
      });
      if ($('#confirm_password').val()) $('#confirm_password').trigger('input');
    });
    $('#confirm_password').on('input', function () {
      if (!this.value) return ui.fieldError($(this), '');
      ui.fieldError($(this), this.value === $pw.val() ? '' : 'Passwords don’t match yet.');
    });

    $f.on('submit', function (e) {
      e.preventDefault();
      ui.clearErrors($f); alertBox();
      var v = {
        full_name: $.trim($('#full_name').val()),
        email: $.trim($('#email').val()).toLowerCase(),
        password: $pw.val(),
        confirm: $('#confirm_password').val()
      };
      var ok = true;
      if (v.full_name.length < 2) ok = ui.fieldError($('#full_name'), 'Please enter your full name.') && ok;
      if (!EMAIL.test(v.email)) ok = ui.fieldError($('#email'), 'Enter a valid email address.') && ok;
      if (!STRONG.test(v.password)) ok = ui.fieldError($pw, 'Use at least 8 characters with upper & lower case letters, a number and a special character.') && ok;
      if (v.password !== v.confirm) ok = ui.fieldError($('#confirm_password'), 'Passwords don’t match.') && ok;
      if (!ok) { $f.find('[aria-invalid=true]').first().trigger('focus'); return; }

      var $btn = $f.find('[type=submit]');
      ui.busy($btn, true, 'Creating account…');
      // NOTE: we never send `role` — every self-signup is a normal user.
      CE.api.post('/auth/signup', { full_name: v.full_name, email: v.email, password: v.password }, { public: true })
        .then(function () {
          CE.flash.set('success', 'Account created! Sign in to get started.');
          window.location.href = 'login.html?email=' + encodeURIComponent(v.email);
        })
        .catch(function (err) {
          ui.busy($btn, false);
          if (err.status === 409) { ui.fieldError($('#email'), 'An account with this email already exists.'); alertBox('error', 'That email is already registered — try signing in instead.'); $('#email').trigger('focus'); }
          else if (err.status === 400) { ui.applyServerErrors($f, err); alertBox('error', err.message); }
          else { alertBox('error', err.message); CE.handleError(err, { retry: function () { $f.trigger('submit'); } }); }
        });
    });
  }

  CE.ready(function () {
    wireReveal();
    decorate();
    if ($('body').data('page') === 'login') initLogin(); else initSignup();
  });
})(jQuery, window.CE);
