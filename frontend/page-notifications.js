// Notifications page: the list on one side, the opened one on the other
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;
  var notes = CE.notifs;            // the notifications, shared with the bell in the header

  var filter = 'all';               // all, unread, event, announcement or promo
  var opened = CE.param('id');      // the id of the opened one, if any

  function find(id) {
    return notes.items.filter(function (n) { return n.id === id; })[0];
  }

  // The notifications the filter lets through
  function matches() {
    return notes.items.filter(function (n) {
      if (filter === 'all') return true;
      if (filter === 'unread') return !notes.isRead(n);
      return n.type === filter;
    });
  }

  // The round icon, dark when unread
  function circle(n, unread) {
    var colour = unread ? 'bg-ink-900 text-white' : 'bg-paper-200 text-ink-500';
    return '<span class="shrink-0 grid place-items-center w-10 h-10 rounded-full ' + colour + '">' + icon(notes.typeIcon(n.type), 'w-5 h-5') + '</span>';
  }

  function titleLine(n, unread) {
    var weight = unread ? 'font-semibold text-ink-900' : 'text-ink-700';
    return '<span class="flex items-center justify-between gap-3">' +
      '<span class="truncate text-sm ' + weight + '">' + esc(n.title) + '</span>' +
      '<span class="text-xs text-ink-400 shrink-0">' + esc(fmt.relative(n.created_at)) + '</span></span>';
  }

  function labels(n, unread) {
    var html = '<span class="badge badge-muted capitalize">' + esc(n.type) + '</span>';
    if (n.recipient_id) html += '<span class="badge badge-ink">For you</span>';
    if (unread) html += '<span class="w-2 h-2 rounded-full bg-ember-500"></span><span class="sr-only">Unread</span>';
    return '<span class="mt-1.5 flex items-center gap-2 text-xs">' + html + '</span>';
  }

  // One line of the list. The delay makes them appear one after another
  function item(n, i) {
    var unread = !notes.isRead(n), open = n.id === opened;
    var delay = Math.min(i * 30, 300);
    return '<li class="reveal" style="--d:' + delay + 'ms">' +
      '<button type="button" class="n-item w-full text-left px-5 py-4 flex gap-3 transition ' + (open ? 'bg-ember-50' : 'hover:bg-paper-100') + '"' +
      ' data-id="' + esc(n.id) + '" aria-current="' + open + '">' +
      circle(n, unread) +
      '<span class="flex-1 min-w-0">' + titleLine(n, unread) +
      '<span class="block text-sm text-ink-600 clamp-2 mt-0.5">' + esc(n.message) + '</span>' +
      labels(n, unread) + '</span></button></li>';
  }

  function emptyItem() {
    var title = 'Nothing here', text = 'Notifications of this type will show up here.';
    if (filter === 'unread') {
      title = 'All caught up';
      text = 'You’ve read every notification.';
    }
    return '<li class="p-6">' + ui.empty(title, text, '', 'bell') + '</li>';
  }

  function showCounts() {
    var total = notes.items.length, unread = notes.unread();
    $('#n-summary').text(total + (total === 1 ? ' notification' : ' notifications') + ' · ' + unread + ' unread');
    $('#mark-all').prop('disabled', unread === 0);
  }

  // Draw the list, and keep the keyboard where it was
  function showList() {
    var focused = $(document.activeElement).attr('data-id');
    var inList = $(document.activeElement).hasClass('n-item');
    var list = matches();

    showCounts();
    $('#n-list').attr('aria-busy', 'false').html(list.length ? list.map(item).join('') : emptyItem());
    ui.reveal($('#n-list'));
    if (inList) $('.n-item').filter(function () { return $(this).attr('data-id') === focused; }).trigger('focus');
  }

  function detailHead(n) {
    var sentTo = n.recipient_id ? 'Sent to you' : 'Broadcast to all members';
    return '<div class="flex items-center gap-3 mb-5">' +
      '<span class="grid place-items-center w-12 h-12 rounded-2xl bg-ember-100 text-ember-700">' + icon(notes.typeIcon(n.type), 'w-6 h-6') + '</span>' +
      '<div><span class="badge badge-ember capitalize">' + esc(n.type) + '</span>' +
      '<p class="text-xs text-ink-500 mt-1">' + esc(fmt.dateTime(n.created_at)) + ' · ' + sentTo + '</p></div></div>';
  }

  function detailButtons(n) {
    var link = notes.link(n), html = '';
    if (link) html += '<a href="' + link.href + '" class="btn btn-primary">' + esc(link.label) + icon('arrowRight', 'w-4 h-4') + '</a>';
    html += '<button type="button" class="btn btn-ghost js-unread">Mark as unread</button>';
    if (CE.guard.can('notification:delete')) {
      html += '<button type="button" class="btn btn-danger js-del">' + icon('trash', 'w-4 h-4') + 'Delete for everyone</button>';
    }
    return '<div class="mt-8 flex flex-wrap gap-2">' + html + '</div>';
  }

  function showDetail(n) {
    $('#n-detail').html('<article class="page-enter">' + detailHead(n) +
      '<h2 class="font-display text-3xl text-ink-900 mb-4 break-words">' + esc(n.title) + '</h2>' +
      '<p class="text-ink-700 text-lg leading-relaxed whitespace-pre-line break-words">' + esc(n.message) + '</p>' +
      detailButtons(n) + '</article>');
  }

  // Open one: mark it read and show it
  function open(id) {
    opened = id;
    history.replaceState(null, '', 'notifications.html?id=' + encodeURIComponent(id));
    var n = find(id);
    if (!n) return $('#n-detail').html(ui.empty('Notification not found', 'It may have been deleted.', '', 'bell'));
    notes.markRead(id);
    showDetail(n);
    showList();
  }

  // On a small screen the detail is below the list, so scroll to it
  function openClicked() {
    open($(this).attr('data-id'));
    var small = window.matchMedia('(max-width: 1023px)').matches;
    if (small) $('html,body').animate({ scrollTop: $('#n-detail').offset().top - 80 }, 350);
  }

  function load() {
    $('#n-list').attr('aria-busy', 'true').html('<li class="p-4 space-y-3">' + ui.skeletonCards(5, 'row') + '</li>');
    notes.load(true)
      .then(function () {
        showList();
        if (opened) open(opened);
      })
      .catch(function (err) {
        $('#n-summary').text('');
        $('#n-list').attr('aria-busy', 'false').html('<li id="n-err"></li>');
        ui.errorState($('#n-err'), err, load);
      });
  }

  function markAll() {
    var ids = notes.items.map(function (n) { return n.id; });
    if (!notes.markRead(ids)) return;
    showList();
    ui.toast('success', 'Everything is marked as read.');
  }

  // Take the opened one out of the read list kept in this browser
  function markUnread() {
    var read = notes.readSet().filter(function (id) { return id !== opened; });
    CE.local.setJson('ce_read:' + CE.auth.user().id, read);
    notes.emit(); // tell the bell in the header
    showList();
    ui.toast('info', 'Marked as unread.');
  }

  function closeDetail() {
    opened = null;
    history.replaceState(null, '', 'notifications.html');
    $('#n-detail').html(ui.empty('Deleted', 'Select another notification to read it.', '', 'check'));
  }

  function remove(id) {
    notes.remove(id)
      .then(function () {
        ui.toast('success', 'Notification deleted.');
        closeDetail();
        showList();
      })
      .catch(function (err) {
        showList();
        CE.handleError(err);
      });
  }

  function askRemove() {
    if (!CE.guard.can('notification:delete')) return ui.forbiddenModal();
    var id = opened;
    ui.confirm({
      title: 'Delete this notification?',
      message: 'It will be removed from every member’s inbox. This cannot be undone.',
      confirmText: 'Delete',
      danger: true
    }).then(function (yes) { if (yes) remove(id); });
  }

  function changeFilter() {
    filter = $(this).data('f');
    $('.chip[data-f]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    showList();
  }

  // Start
  CE.ready(function () {
    load();
    notes.on(function () { if (notes.loaded) showList(); }); // redraw when the bell changes something
    $('#refresh').on('click', load);
    $('#mark-all').on('click', markAll);
    $('.chip[data-f]').on('click', changeFilter);
    $('#n-list').on('click', '.n-item', openClicked);
    $('#n-detail').on('click', '.js-unread', markUnread).on('click', '.js-del', askRemove);
  });
})(jQuery, window.CE);
