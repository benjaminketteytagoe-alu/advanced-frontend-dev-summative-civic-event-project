/* =========================================================================
   User management (ADMIN ONLY)
     GET   /api/users?page=&limit=      list
     GET   /api/users/:id               view profile
     PATCH /api/users/:id/enable | /disable
   RULE: admins can enable/disable but NEVER change a role — there is no
   role control anywhere in this UI, and no request ever includes `role`.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;
  var LIMIT = 20, page = 1, users = [], filter = 'all', q = '';
  var me = CE.auth.user();

  function row(u, i) {
    var self = u.id === me.id, active = u.is_active !== false;
    return '<tr class="reveal" style="--d:' + Math.min(i * 30, 300) + 'ms" data-id="' + esc(u.id) + '">' +
      '<td><span class="flex items-center gap-3">' + ui.avatarImg(u.id, u.full_name, 'w-10 h-10') +
      '<span class="min-w-0"><span class="block font-semibold text-ink-900 truncate">' + ui.highlight(u.full_name, q) + (self ? ' <span class="badge badge-muted ml-1">You</span>' : '') + '</span>' +
      '<span class="block text-xs text-ink-500 truncate">' + ui.highlight(u.email, q) + '</span></span></span></td>' +
      // role is DISPLAY ONLY
      '<td><span class="badge ' + (u.role === 'admin' ? 'badge-ember' : 'badge-ink') + ' capitalize">' + icon(u.role === 'admin' ? 'shield' : 'user', 'w-3 h-3') + esc(u.role) + '</span></td>' +
      '<td class="text-ink-600 whitespace-nowrap">' + esc(fmt.date(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' })) + '</td>' +
      '<td><span class="flex items-center gap-2"><input type="checkbox" class="switch js-toggle" role="switch" id="t-' + esc(u.id) + '" ' + (active ? 'checked' : '') + (self ? ' disabled title="You can’t disable your own account"' : '') +
      ' aria-label="' + (active ? 'Disable ' : 'Enable ') + esc(u.full_name) + '"><span class="text-xs js-state ' + (active ? 'text-moss-700' : 'text-[#912018]') + '">' + (active ? 'Active' : 'Disabled') + '</span></span></td>' +
      '<td class="text-right"><button type="button" class="btn btn-ghost btn-sm js-view">View</button></td></tr>';
  }

  function render() {
    var lq = q.toLowerCase();
    var list = users.filter(function (u) {
      if (lq && ((u.full_name || '') + ' ' + (u.email || '')).toLowerCase().indexOf(lq) < 0) return false;
      if (filter === 'active') return u.is_active !== false;
      if (filter === 'disabled') return u.is_active === false;
      if (filter === 'admin') return u.role === 'admin';
      return true;
    });
    $('#u-body').html(list.length ? list.map(row).join('') : '<tr><td colspan="5" class="!py-12 text-center text-ink-500">No members match.</td></tr>');
    ui.reveal($('#u-body'));
    $('#u-page').text('Page ' + page + ' · showing ' + list.length + ' of ' + users.length + ' on this page');
    $('#prev').prop('disabled', page <= 1);
    $('#next').prop('disabled', users.length < LIMIT);
  }

  function load() {
    $('#u-body').html(new Array(6).join('<tr><td colspan="5"><div class="flex items-center gap-3"><div class="skeleton w-10 h-10 rounded-full"></div><div class="flex-1 space-y-2"><div class="skeleton h-3 w-1/3"></div><div class="skeleton h-3 w-1/4"></div></div></div></td></tr>'));
    CE.api.get('/users', { page: page, limit: LIMIT }).then(function (r) { users = r.data || []; render(); })
      .catch(function (e) {
        $('#u-body').html('<tr><td colspan="5"><div id="u-err"></div></td></tr>');
        ui.errorState($('#u-err'), e, load);
      });
  }

  // OPTIMISTIC enable/disable with revert on failure (ADMIN ONLY action)
  function toggle($t) {
    if (!CE.guard.can('users:manage')) { $t.prop('checked', !$t.is(':checked')); return ui.forbiddenModal(); }
    var id = $t.closest('tr').data('id'), u = users.filter(function (x) { return x.id === id; })[0];
    var enable = $t.is(':checked');
    var apply = function (on) {
      u.is_active = on; $t.prop('checked', on).attr('aria-label', (on ? 'Disable ' : 'Enable ') + u.full_name);
      $t.siblings('.js-state').text(on ? 'Active' : 'Disabled').toggleClass('text-moss-700', on).toggleClass('text-[#912018]', !on);
    };
    var run = function () {
      apply(enable); $t.prop('disabled', true);
      CE.api.patch('/users/' + encodeURIComponent(id) + (enable ? '/enable' : '/disable')).then(function () {
        ui.toast('success', u.full_name + (enable ? ' can sign in again.' : ' has been disabled and will be signed out.'));
      }).catch(function (err) { apply(!enable); CE.handleError(err, { retry: run }); })
        .finally(function () { $t.prop('disabled', false); });
    };
    if (!enable) {
      $t.prop('checked', true);
      ui.confirm({ title: 'Disable ' + u.full_name + '?', message: 'They’ll be signed out and won’t be able to use CivicEvents+ until an admin re-enables the account.', confirmText: 'Disable account', danger: true })
        .then(function (ok) { if (ok) run(); });
    } else run();
  }

  function view(id) {
    var m = ui.modal({ title: 'Member profile', body: '<div class="skeleton h-40"></div>', wide: false });
    CE.api.get('/users/' + encodeURIComponent(id)).then(function (r) {
      var u = r.data;
      m.$el.find('.modal-body').html('<div class="flex items-center gap-4 mb-6">' + ui.avatarImg(u.id, u.full_name, 'w-20 h-20') +
        '<div><p class="font-display text-2xl text-ink-900">' + esc(u.full_name) + '</p><p class="text-sm text-ink-600">' + esc(u.email) + '</p></div></div>' +
        '<dl class="grid grid-cols-2 gap-4 text-sm">' +
        '<div class="rounded-xl bg-paper-100 p-3"><dt class="text-xs text-ink-500">Role</dt><dd class="font-semibold capitalize text-ink-900">' + esc(u.role) + '</dd></div>' +
        '<div class="rounded-xl bg-paper-100 p-3"><dt class="text-xs text-ink-500">Status</dt><dd class="font-semibold ' + (u.is_active !== false ? 'text-moss-700' : 'text-[#912018]') + '">' + (u.is_active !== false ? 'Active' : 'Disabled') + '</dd></div>' +
        '<div class="rounded-xl bg-paper-100 p-3"><dt class="text-xs text-ink-500">Joined</dt><dd class="text-ink-900">' + esc(fmt.dateTime(u.created_at)) + '</dd></div>' +
        '<div class="rounded-xl bg-paper-100 p-3"><dt class="text-xs text-ink-500">Last updated</dt><dd class="text-ink-900">' + esc(fmt.relative(u.updated_at)) + '</dd></div>' +
        '<div class="col-span-2 rounded-xl bg-paper-100 p-3"><dt class="text-xs text-ink-500">User ID</dt><dd class="font-mono text-xs text-ink-700 break-all">' + esc(u.id) + '</dd></div></dl>' +
        '<p class="mt-5 text-xs text-ink-500 flex items-center gap-1.5">' + icon('lock', 'w-3.5 h-3.5') + 'Roles can’t be changed from the admin panel.</p>' +
        '<a href="mailto:' + esc(u.email) + '" class="btn btn-ghost btn-sm mt-5">' + icon('mail', 'w-4 h-4') + 'Email member</a>');
    }).catch(function (e) { m.close(); CE.handleError(e); });
  }

  CE.ready(function () {
    CE.adminShell('users');
    load();
    $('#u-q').on('input', CE.debounce(function () { q = $.trim(this.value); render(); }, 200));
    $('.chip[data-f]').on('click', function () { filter = $(this).data('f'); $('.chip[data-f]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); render(); });
    $('#prev').on('click', function () { if (page > 1) { page--; load(); } });
    $('#next').on('click', function () { page++; load(); });
    $('#u-body').on('change', '.js-toggle', function () { toggle($(this)); });
    $('#u-body').on('click', '.js-view', function () { view($(this).closest('tr').data('id')); });
  });
})(jQuery, window.CE);
