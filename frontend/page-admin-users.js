// Admin members page: see accounts, and enable or disable them. Roles are only shown, never changed
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;

  var perPage = 20;
  var page = 1;
  var users = [];        // the members on this page
  var filter = 'all';    // all, active, disabled or admin
  var search = '';

  function isActive(u) { return u.is_active !== false; }
  function isMe(u) { return u.id === CE.auth.user().id; }
  function find(id) { return users.filter(function (u) { return u.id === id; })[0]; }
  function rowId(el) { return $(el).closest('tr').attr('data-id'); }

  function matchesFilter(u) {
    if (filter === 'active') return isActive(u);
    if (filter === 'disabled') return !isActive(u);
    if (filter === 'admin') return u.role === 'admin';
    return true;
  }

  function matchesSearch(u) {
    var text = (u.full_name || '') + ' ' + (u.email || '');
    return text.toLowerCase().indexOf(search.toLowerCase()) > -1;
  }

  // The cells of a row
  function nameCell(u) {
    var you = isMe(u) ? ' <span class="badge badge-muted ml-1">You</span>' : '';
    return '<td><span class="flex items-center gap-3">' + ui.avatarImg(u.id, u.full_name, 'w-10 h-10') +
      '<span class="min-w-0"><span class="block font-semibold text-ink-900 truncate">' + ui.highlight(u.full_name, search) + you + '</span>' +
      '<span class="block text-xs text-ink-500 truncate">' + ui.highlight(u.email, search) + '</span></span></span></td>';
  }

  function roleCell(u) {
    var admin = u.role === 'admin';
    return '<td><span class="badge ' + (admin ? 'badge-ember' : 'badge-ink') + ' capitalize">' +
      icon(admin ? 'shield' : 'user', 'w-3 h-3') + esc(u.role) + '</span></td>';
  }

  function dateCell(u) {
    var date = fmt.date(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' });
    return '<td class="text-ink-600 whitespace-nowrap">' + esc(date) + '</td>';
  }

  function switchCell(u) {
    var on = isActive(u);
    var off = isMe(u) ? ' disabled title="You can’t disable your own account"' : '';
    return '<td><span class="flex items-center gap-2">' +
      '<input type="checkbox" class="switch js-toggle" role="switch"' + (on ? ' checked' : '') + off +
      ' aria-label="Active: ' + esc(u.full_name) + '">' +
      '<span class="text-xs ' + (on ? 'text-moss-700' : 'text-[#912018]') + '">' + (on ? 'Active' : 'Disabled') + '</span></span></td>';
  }

  // One table row. The delay makes the rows appear one after another
  function row(u, i) {
    var delay = Math.min(i * 30, 300);
    return '<tr class="reveal" style="--d:' + delay + 'ms" data-id="' + esc(u.id) + '">' +
      nameCell(u) + roleCell(u) + dateCell(u) + switchCell(u) +
      '<td class="text-right"><button type="button" class="btn btn-ghost btn-sm js-view" aria-label="View ' + esc(u.full_name) + '">View</button></td></tr>';
  }

  // Draw the table
  function show() {
    var list = users.filter(function (u) { return matchesFilter(u) && matchesSearch(u); });
    var empty = '<tr><td colspan="5" class="!py-12 text-center text-ink-500">No members match.</td></tr>';
    $('#u-body').html(list.length ? list.map(row).join('') : empty);
    ui.reveal($('#u-body'));

    $('#u-page').text('Page ' + page + ' · showing ' + list.length + ' of ' + users.length + ' on this page');
    $('#prev').prop('disabled', page === 1);
    $('#next').prop('disabled', users.length < perPage); // a page that is not full is the last one
  }

  function showLoading() {
    var bar = '<div class="skeleton h-10"></div>';
    $('#u-body').html('<tr><td colspan="5"><div class="space-y-3 py-2">' + bar + bar + bar + bar + '</div></td></tr>');
    $('#prev, #next').prop('disabled', true); // no second click while we wait
  }

  function showError(err) {
    $('#u-page').text('');
    $('#u-body').html('<tr><td colspan="5"><div id="u-err"></div></td></tr>');
    ui.errorState($('#u-err'), err, load);
  }

  function load() {
    showLoading();
    CE.api.get('/users', { page: page, limit: perPage })
      .then(function (reply) { users = reply.data; show(); })
      .catch(showError);
  }

  // The switch moves at once, and moves back if saving fails
  function setActive(u, on) {
    u.is_active = on;
    show();
    CE.api.patch('/users/' + encodeURIComponent(u.id) + (on ? '/enable' : '/disable'))
      .then(function () {
        ui.toast('success', u.full_name + (on ? ' can sign in again.' : ' has been disabled and will be signed out.'));
      })
      .catch(function (err) {
        u.is_active = !on;
        show();
        CE.handleError(err);
      });
  }

  function toggle() {
    var u = find(rowId(this)), on = this.checked;
    if (!CE.guard.can('users:manage')) { show(); return ui.forbiddenModal(); }
    if (on) return setActive(u, true);

    this.checked = true; // stay on until they say yes
    ui.confirm({
      title: 'Disable ' + u.full_name + '?',
      message: 'They’ll be signed out and won’t be able to use CivicEvents+ until an admin re-enables the account.',
      confirmText: 'Disable account',
      danger: true
    }).then(function (yes) { if (yes) setActive(u, false); });
  }

  // One box of the profile window
  function box(label, value, more) {
    return '<div class="rounded-xl bg-paper-100 p-3 ' + (more || '') + '"><dt class="text-xs text-ink-500">' + label + '</dt>' +
      '<dd class="text-ink-900 break-all">' + esc(value) + '</dd></div>';
  }

  function profile(u) {
    return '<div class="flex items-center gap-4 mb-6">' + ui.avatarImg(u.id, u.full_name, 'w-20 h-20') +
      '<div class="min-w-0"><p class="font-display text-2xl text-ink-900 break-words">' + esc(u.full_name) + '</p>' +
      '<p class="text-sm text-ink-600 break-all">' + esc(u.email) + '</p></div></div>' +
      '<dl class="grid grid-cols-2 gap-4 text-sm">' +
      box('Role', u.role, 'capitalize') +
      box('Status', isActive(u) ? 'Active' : 'Disabled') +
      box('Joined', fmt.dateTime(u.created_at)) +
      box('Last updated', fmt.relative(u.updated_at)) +
      box('User ID', u.id, 'col-span-2') + '</dl>' +
      '<p class="mt-5 text-xs text-ink-500">Roles can’t be changed from the admin panel.</p>' +
      '<a href="mailto:' + esc(u.email) + '" class="btn btn-ghost btn-sm mt-5">' + icon('mail', 'w-4 h-4') + 'Email member</a>';
  }

  function view() {
    var win = ui.modal({ title: 'Member profile', body: '<div class="skeleton h-40"></div>' });
    CE.api.get('/users/' + encodeURIComponent(rowId(this)))
      .then(function (reply) { win.$el.find('.modal-body').html(profile(reply.data)); })
      .catch(function (err) { win.close(); CE.handleError(err); });
  }

  function changeFilter() {
    filter = $(this).data('f');
    $('.chip[data-f]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    show();
  }

  function changeSearch() { search = $.trim(this.value); show(); }
  function goTo(n) { page = n; load(); }

  // Start
  CE.ready(function () {
    CE.adminShell('users');
    load();
    $('#u-q').on('input', CE.debounce(changeSearch, 200)); // wait until typing stops
    $('.chip[data-f]').on('click', changeFilter);
    $('#prev').on('click', function () { goTo(page - 1); });
    $('#next').on('click', function () { goTo(page + 1); });
    $('#u-body').on('change', '.js-toggle', toggle).on('click', '.js-view', view);
  });
})(jQuery, window.CE);
