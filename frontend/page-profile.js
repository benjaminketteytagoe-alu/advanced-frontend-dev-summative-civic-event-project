// Profile page: change your name and email. Role and status are only shown, never sent
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;
  var me;   // the logged in person

  function typedName() { return $.trim($('#full_name').val()); }
  function typedEmail() { return $.trim($('#email').val()).toLowerCase(); }

  // Only what is different from before
  function changes() {
    var changed = {};
    if (typedName() !== me.full_name) changed.full_name = typedName();
    if (typedEmail() !== me.email.toLowerCase()) changed.email = typedEmail();
    return changed;
  }

  // The buttons only work when something changed
  function showButtons() {
    var none = $.isEmptyObject(changes());
    $('#save-btn, #reset-btn').prop('disabled', none);
  }

  function badges() {
    var admin = me.role === 'admin', active = me.is_active !== false;
    return '<span>' + esc(me.email) + '</span>' +
      '<span class="badge ' + (admin ? 'badge-ember' : 'badge-ink') + ' capitalize">' +
      icon(admin ? 'shield' : 'user', 'w-3 h-3') + esc(me.role) + '</span>' +
      '<span class="badge ' + (active ? 'badge-moss' : 'badge-danger') + '">' + (active ? 'Active' : 'Disabled') + '</span>';
  }

  // The top of the page
  function showHead() {
    $('#p-avatar').attr('src', CE.dice.avatar(me.id));
    $('#banner').attr('src', CE.dice.cover('banner-' + me.id));
    $('#p-name').text(me.full_name);
    $('#p-meta').html(badges());
    ui.setTitle(me.full_name);
  }

  function fillForm() {
    $('#full_name').val(me.full_name);
    $('#email').val(me.email);
    $('#role').val(me.role);
    $('#status').val(me.is_active !== false ? 'Active' : 'Disabled');
    showButtons();
  }

  function show() {
    showHead();
    fillForm();
    var since = me.created_at ? fmt.date(me.created_at, { day: 'numeric', month: 'long', year: 'numeric' }) : '…';
    $('#s-since').text(since);
  }

  // ---------- this session ----------

  function showTimeLeft() {
    var end = CE.auth.expiresAt();
    if (!end) return $('#s-exp').text('Unknown');
    var seconds = Math.max(0, Math.round((end - Date.now()) / 1000));
    $('#s-exp').text(fmt.duration(seconds) + ' left');
  }

  function showSession() {
    $('#s-store').text(CE.auth.persistent() ? 'This device (localStorage)' : 'This tab only (sessionStorage)');
    showTimeLeft();
    setInterval(showTimeLeft, 1000); // every second
  }

  // ---------- my reviews ----------

  function review(f) {
    return '<li><a href="event.html?id=' + encodeURIComponent(f.event_id) + '" class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-paper-100 transition">' +
      '<span class="min-w-0"><span class="block font-medium text-ink-900 truncate">' + esc(f.title) + '</span>' +
      '<span class="text-xs text-ink-500">' + esc(fmt.date(f.starts_at)) + '</span></span>' + ui.stars(f.rating) + '</a></li>';
  }

  function showReviews(list) {
    var none = '<li class="text-ink-500">You haven’t rated any events yet.</li>';
    $('#my-feedback').html(list.length ? list.slice(0, 6).map(review).join('') : none); // newest six
  }

  function loadReviews() {
    var bar = '<li class="skeleton h-12"></li>';
    $('#my-feedback').html(bar + bar);
    CE.api.get('/event-feedback/my-feedback')
      .then(function (reply) { showReviews(reply.data); })
      .catch(function () { $('#my-feedback').html('<li class="text-ink-500">Couldn’t load your feedback.</li>'); });
  }

  // ---------- saving ----------

  function check() {
    var ok = true;
    ui.clearErrors($('#profile-form'));
    if (typedName().length < 2) ok = ui.fieldError($('#full_name'), 'Enter at least 2 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(typedEmail())) ok = ui.fieldError($('#email'), 'Enter a valid email address.');
    if (!ok) $('#profile-form [aria-invalid=true]').first().trigger('focus');
    return ok;
  }

  function saved(reply) {
    me = $.extend(me, reply.data);
    CE.auth.updateUser({ full_name: me.full_name, email: me.email }); // for the header and the next page
    show();
    ui.toast('success', 'Your profile was updated.');
  }

  function keepEmail() {
    $('#email').val(me.email);
    ui.fieldError($('#email'), '');
    showButtons();
  }

  // Someone else has that email
  function emailTaken(email) {
    ui.fieldError($('#email'), 'This email is already used by another account.');
    var win = ui.modal({
      title: 'That email is taken',
      body: '<p class="text-sm leading-relaxed">Another CivicEvents+ account already uses <strong>' + esc(email) + '</strong>. ' +
        'Your email has <strong>not</strong> been changed, so you still sign in with <strong>' + esc(me.email) + '</strong>.</p>',
      footer: '<button class="btn btn-ghost" data-close id="keep-email">Keep current email</button>' +
        '<button class="btn btn-primary" data-close autofocus>Try another email</button>'
    });
    win.$el.on('click', '#keep-email', keepEmail);
  }

  function failed(err, changed) {
    if (err.status === 409) return emailTaken(changed.email);
    if (err.status === 400) ui.applyServerErrors($('#profile-form'), err);
    CE.handleError(err);
  }

  function save(changed) {
    ui.busy($('#save-btn'), true, 'Saving…');
    CE.api.patch('/users/profile/me', changed)
      .then(saved)
      .catch(function (err) { failed(err, changed); })
      .finally(function () {
        ui.busy($('#save-btn'), false);
        showButtons();
      });
  }

  function submit(e) {
    e.preventDefault();
    var changed = changes();
    if ($.isEmptyObject(changed) || !check()) return;
    if (!changed.email) return save(changed);

    ui.confirm({
      title: 'Change your sign-in email?',
      message: 'From now on you’ll sign in with ' + changed.email + ' instead of ' + me.email + '.',
      confirmText: 'Yes, change it'
    }).then(function (yes) { if (yes) save(changed); });
  }

  function discard(e) {
    e.preventDefault();
    ui.clearErrors($('#profile-form'));
    fillForm();
  }

  // Get the latest, unless the person already started typing
  function load() {
    CE.api.get('/users/profile/me')
      .then(function (reply) {
        var typing = !$.isEmptyObject(changes());
        me = reply.data;
        if (typing) showHead();
        else show();
      })
      .catch(CE.handleError);
  }

  // Start
  CE.ready(function () {
    me = $.extend({}, CE.auth.user()); // show what we know at once
    show();
    showSession();
    load();
    loadReviews();
    $('#profile-form').on('input', showButtons).on('submit', submit).on('reset', discard);
    $('#signout').on('click', CE.auth.logout);
  });
})(jQuery, window.CE);
