/* =========================================================================
   My profile
     GET   /api/users/profile/me
     PATCH /api/users/profile/me   { full_name?, email? }
   role & is_active are NEVER sent (the API rejects them; UI shows them read-only).
   A 409 on email change is surfaced with a clear confirmation dialog.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;
  var me = null;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function paint() {
    $('#p-avatar').attr('src', CE.dice.avatar(me.id || me.email));
    $('#banner').attr('src', CE.dice.cover('banner-' + me.id));
    $('#p-name').text(me.full_name);
    $('#p-meta').html('<span>' + esc(me.email) + '</span>' +
      '<span class="badge ' + (me.role === 'admin' ? 'badge-ember' : 'badge-ink') + ' capitalize">' + icon(me.role === 'admin' ? 'shield' : 'user', 'w-3 h-3') + esc(me.role) + '</span>' +
      '<span class="badge ' + (me.is_active !== false ? 'badge-moss' : 'badge-danger') + '">' + (me.is_active !== false ? 'Active' : 'Disabled') + '</span>');
    $('#full_name').val(me.full_name); $('#email').val(me.email);
    $('#role').val(me.role); $('#status').val(me.is_active !== false ? 'Active' : 'Disabled');
    $('#s-since').text(me.created_at ? fmt.date(me.created_at, { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
    ui.setTitle(me.full_name);
    dirtyCheck();
  }

  function dirtyCheck() {
    var changed = me && ($.trim($('#full_name').val()) !== me.full_name || $.trim($('#email').val()).toLowerCase() !== (me.email || '').toLowerCase());
    $('#save-btn, #reset-btn').prop('disabled', !changed);
    return changed;
  }

  function sessionInfo() {
    $('#s-store').text(CE.auth.persistent() ? 'This device (localStorage)' : 'This tab only (sessionStorage)');
    var tick = function () {
      var e = CE.auth.expiresAt();
      if (!e) { $('#s-exp').text('—'); return; }
      var left = Math.max(0, Math.round((e - Date.now()) / 1000));
      $('#s-exp').text(fmt.duration(left) + ' left');
    };
    tick(); setInterval(tick, 1000);
  }

  function loadFeedback() {
    var $l = $('#my-feedback').html('<li class="skeleton h-12"></li><li class="skeleton h-12"></li>');
    CE.api.get('/event-feedback/my-feedback').then(function (r) {
      var list = r.data || [];
      $l.html(list.length ? list.slice(0, 6).map(function (f) {
        return '<li><a href="event.html?id=' + encodeURIComponent(f.event_id) + '" class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-paper-100 transition">' +
          '<span class="min-w-0"><span class="block font-medium text-ink-900 truncate">' + esc(f.title) + '</span><span class="text-xs text-ink-500">' + esc(fmt.date(f.starts_at)) + '</span></span>' + ui.stars(f.rating) + '</a></li>';
      }).join('') : '<li class="text-ink-500">You haven’t rated any events yet.</li>');
    }).catch(function () { $l.html('<li class="text-ink-500">Couldn’t load your feedback.</li>'); });
  }

  function save(payload, $btn) {
    ui.busy($btn, true, 'Saving…');
    return CE.api.patch('/users/profile/me', payload).then(function (r) {
      me = $.extend(me, r.data || payload);
      CE.auth.updateUser({ full_name: me.full_name, email: me.email });
      paint();
      $('#app-header, header').first().find('#profile-btn img').attr('alt', 'Avatar for ' + me.full_name);
      ui.toast('success', 'Your profile was updated.');
    }).catch(function (err) {
      if (err.status === 409) {
        ui.fieldError($('#email'), 'This email is already used by another account.');
        ui.modal({
          title: 'That email is taken',
          body: '<p class="text-sm leading-relaxed">Another CivicEvents+ account already uses <strong>' + esc(payload.email) + '</strong>. Your email has <strong>not</strong> been changed — you can still sign in with <strong>' + esc(me.email) + '</strong>.</p>',
          footer: '<button class="btn btn-ghost" data-close id="keep-email">Keep current email</button><button class="btn btn-primary" data-close id="try-again" autofocus>Try another email</button>'
        }).$el.on('click', '#keep-email', function () { $('#email').val(me.email); ui.fieldError($('#email'), ''); dirtyCheck(); })
          .on('click', '#try-again', function () { setTimeout(function () { $('#email').trigger('select'); }, 320); });
      } else if (err.status === 400) {
        ui.applyServerErrors($('#profile-form'), err); CE.handleError(err);
      } else CE.handleError(err, { retry: function () { save(payload, $btn); } });
    }).finally(function () { ui.busy($btn, false); dirtyCheck(); });
  }

  CE.ready(function () {
    var cached = CE.auth.user();
    me = $.extend({}, cached);
    paint(); sessionInfo(); loadFeedback();
    CE.api.get('/users/profile/me').then(function (r) { me = r.data; paint(); }).catch(function (e) { CE.handleError(e); });

    $('#profile-form').on('input', dirtyCheck);
    $('#profile-form').on('reset', function (e) { e.preventDefault(); ui.clearErrors($(this)); paint(); });
    $('#signout').on('click', CE.auth.logout);

    $('#profile-form').on('submit', function (e) {
      e.preventDefault();
      var $f = $(this); ui.clearErrors($f);
      var name = $.trim($('#full_name').val()), email = $.trim($('#email').val()).toLowerCase();
      var ok = true;
      if (name.length < 2) ok = ui.fieldError($('#full_name'), 'Name can’t be empty.') && ok;
      if (!EMAIL.test(email)) ok = ui.fieldError($('#email'), 'Enter a valid email address.') && ok;
      if (!ok) return;

      // Only send fields that changed — never role / is_active.
      var payload = {};
      if (name !== me.full_name) payload.full_name = name;
      if (email !== (me.email || '').toLowerCase()) payload.email = email;
      if (!Object.keys(payload).length) return;
      var $btn = $('#save-btn');

      if (payload.email) {
        ui.confirm({ title: 'Change your sign-in email?', message: 'From now on you’ll sign in with ' + email + ' instead of ' + me.email + '.', confirmText: 'Yes, change it' })
          .then(function (yes) { if (yes) save(payload, $btn); });
      } else save(payload, $btn);
    });
  });
})(jQuery, window.CE);
