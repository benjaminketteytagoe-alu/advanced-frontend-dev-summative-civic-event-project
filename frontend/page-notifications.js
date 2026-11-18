/* =========================================================================
   Notifications inbox — GET /api/notifications (broadcast + targeted)
   GET /api/notifications/:id for detail, DELETE (ADMIN ONLY).
   Mark-as-read is optimistic and stored per user (no API endpoint exists).
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, N = CE.notifs;
  var filter = 'all', selected = CE.param('id');

  function visible() {
    return N.items.filter(function (n) {
      if (filter === 'unread') return !N.isRead(n);
      if (filter === 'all') return true;
      return n.type === filter;
    });
  }

  function renderList() {
    var list = visible(), $l = $('#n-list').attr('aria-busy', 'false');
    var unread = N.unread();
    $('#n-summary').text(N.items.length + ' notification' + (N.items.length === 1 ? '' : 's') + ' · ' + unread + ' unread');
    $('#mark-all').prop('disabled', !unread);
    if (!list.length) { $l.html('<li class="p-6">' + ui.empty(filter === 'unread' ? 'All caught up' : 'Nothing here', filter === 'unread' ? 'You’ve read every notification.' : 'Notifications of this type will show up here.', '', 'bell') + '</li>'); return; }
    $l.html(list.map(function (n, i) {
      var un = !N.isRead(n), sel = n.id === selected;
      return '<li class="reveal" style="--d:' + Math.min(i * 30, 300) + 'ms"><button type="button" class="n-item w-full text-left px-5 py-4 flex gap-3 transition ' + (sel ? 'bg-ember-50' : 'hover:bg-paper-100') + '" data-id="' + esc(n.id) + '" aria-current="' + (sel ? 'true' : 'false') + '">' +
        '<span class="shrink-0 grid place-items-center w-10 h-10 rounded-full ' + (un ? 'bg-ink-900 text-white' : 'bg-paper-200 text-ink-500') + '">' + icon(N.typeIcon(n.type), 'w-5 h-5') + '</span>' +
        '<span class="flex-1 min-w-0"><span class="flex items-center justify-between gap-3"><span class="truncate text-sm ' + (un ? 'font-semibold text-ink-900' : 'text-ink-700') + '">' + esc(n.title) + '</span>' +
        '<span class="text-xs text-ink-400 shrink-0">' + esc(fmt.relative(n.created_at)) + '</span></span>' +
        '<span class="block text-sm text-ink-600 clamp-2 mt-0.5">' + esc(n.message) + '</span>' +
        '<span class="mt-1.5 flex items-center gap-2 text-xs"><span class="badge badge-muted capitalize">' + esc(n.type) + '</span>' + (n.recipient_id ? '<span class="badge badge-ink">For you</span>' : '') +
        (un ? '<span class="w-2 h-2 rounded-full bg-ember-500" aria-label="Unread"></span>' : '') + '</span></span></button></li>';
    }).join(''));
    ui.reveal($l);
  }

  function renderDetail(n) {
    var link = N.link(n);
    $('#n-detail').html('<article class="page-enter">' +
      '<div class="flex items-center gap-3 mb-5"><span class="grid place-items-center w-12 h-12 rounded-2xl bg-ember-100 text-ember-700">' + icon(N.typeIcon(n.type), 'w-6 h-6') + '</span>' +
      '<div><span class="badge badge-ember capitalize">' + esc(n.type) + '</span><p class="text-xs text-ink-500 mt-1">' + esc(fmt.dateTime(n.created_at)) + ' · ' + (n.recipient_id ? 'Sent to you' : 'Broadcast to all members') + '</p></div></div>' +
      '<h2 class="font-display text-3xl text-ink-900 mb-4">' + esc(n.title) + '</h2>' +
      '<p class="text-ink-700 text-lg leading-relaxed whitespace-pre-line">' + esc(n.message) + '</p>' +
      '<div class="mt-8 flex flex-wrap gap-2">' +
      (link ? '<a href="' + link.href + '" class="btn btn-primary">' + esc(link.label) + icon('arrowRight', 'w-4 h-4') + '</a>' : '') +
      '<button type="button" class="btn btn-ghost js-unread" data-id="' + esc(n.id) + '">Mark as unread</button>' +
      // ADMIN-ONLY delete
      (CE.guard.can('notification:delete') ? '<button type="button" class="btn btn-danger js-del" data-id="' + esc(n.id) + '">' + icon('trash', 'w-4 h-4') + 'Delete for everyone</button>' : '') +
      '</div></article>');
  }

  function open(id) {
    selected = id;
    history.replaceState(null, '', 'notifications.html?id=' + encodeURIComponent(id));
    var local = N.items.filter(function (x) { return x.id === id; })[0];
    if (local) { N.markRead(id); renderDetail(local); renderList(); }
    // fetch fresh detail (GET /api/notifications/:id)
    CE.api.get('/notifications/' + encodeURIComponent(id)).then(function (r) {
      if (r.data && selected === id) { renderDetail(r.data); if (!local) { N.markRead(id); renderList(); } }
    }).catch(function (err) {
      if (!local) $('#n-detail').html(ui.empty('Notification not found', err.message, '', 'bell'));
    });
    if (window.matchMedia('(max-width: 1023px)').matches) $('html,body').animate({ scrollTop: $('#n-detail').offset().top - 80 }, 350);
  }

  function load() {
    $('#n-list').attr('aria-busy', 'true').html('<li class="p-4 space-y-3">' + ui.skeletonCards(5, 'row') + '</li>');
    N.load(true).then(function () { renderList(); if (selected) open(selected); })
      .catch(function (e) { ui.errorState($('#n-list'), e, load); });
  }

  CE.ready(function () {
    load();
    N.on(function () { if (N.loaded) renderList(); });
    $('#refresh').on('click', load);
    $('#mark-all').on('click', function () { if (N.markRead(N.items.map(function (n) { return n.id; }))) { renderList(); ui.toast('success', 'Everything is marked as read.'); } });
    $('.chip[data-f]').on('click', function () { filter = $(this).data('f'); $('.chip[data-f]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); renderList(); });
    $('#n-list').on('click', '.n-item', function () { open($(this).data('id')); });
    $('#n-detail').on('click', '.js-unread', function () {
      var id = $(this).data('id');
      var set = N.readSet().filter(function (x) { return x !== id; });
      CE.local.setJson('ce_read:' + CE.auth.user().id, set);
      N.emit(); renderList(); ui.toast('info', 'Marked as unread.');
    });
    $('#n-detail').on('click', '.js-del', function () {
      var id = $(this).data('id');
      if (!CE.guard.can('notification:delete')) return ui.forbiddenModal(); // ACTION GUARD
      ui.confirm({ title: 'Delete this notification?', message: 'It will be removed from every member’s inbox. This cannot be undone.', confirmText: 'Delete', danger: true }).then(function (ok) {
        if (!ok) return;
        N.remove(id).then(function () {
          ui.toast('success', 'Notification deleted.');
          selected = null; history.replaceState(null, '', 'notifications.html');
          $('#n-detail').html(ui.empty('Deleted', 'Select another notification to read it.', '', 'check'));
          renderList();
        }).catch(function (e) { renderList(); CE.handleError(e); });
      });
    });
  });
})(jQuery, window.CE);
