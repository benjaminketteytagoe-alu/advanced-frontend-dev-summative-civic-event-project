/* =========================================================================
   Notification management (ADMIN ONLY)
     GET    /api/notifications
     DELETE /api/notifications/:id
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, N = CE.notifs;
  var filter = 'all', checked = {};

  function list() { return N.items.filter(function (n) { return filter === 'all' || n.type === filter; }); }

  function render() {
    var items = list();
    $('#del-select').html('<option value="">Select a notification…</option>' + N.items.map(function (n) {
      return '<option value="' + esc(n.id) + '">' + esc(fmt.date(n.created_at, { day: 'numeric', month: 'short' }) + ' — ' + n.title) + '</option>';
    }).join(''));
    $('#n-body').html(items.length ? items.map(function (n, i) {
      var link = N.link(n);
      return '<tr class="reveal" style="--d:' + Math.min(i * 25, 300) + 'ms" data-id="' + esc(n.id) + '">' +
        '<td><input type="checkbox" class="js-check w-4 h-4 accent-ink-900" ' + (checked[n.id] ? 'checked' : '') + ' aria-label="Select ' + esc(n.title) + '"></td>' +
        '<td class="max-w-md"><p class="font-medium text-ink-900">' + esc(n.title) + '</p><p class="text-xs text-ink-500 clamp-2">' + esc(n.message) + '</p>' +
        (link ? '<a class="text-xs text-ember-700 hover:underline" href="' + link.href + '">' + esc(link.label) + ' →</a>' : '') + '</td>' +
        '<td><span class="badge badge-muted capitalize">' + icon(N.typeIcon(n.type), 'w-3 h-3') + esc(n.type) + '</span></td>' +
        '<td class="text-ink-600">' + (n.recipient_id ? 'One member' : 'Everyone') + '</td>' +
        '<td class="text-ink-600 whitespace-nowrap">' + esc(fmt.relative(n.created_at)) + '</td>' +
        '<td class="text-right"><button type="button" class="btn btn-danger btn-sm js-del" aria-label="Delete ' + esc(n.title) + '">' + icon('trash', 'w-4 h-4') + '</button></td></tr>';
    }).join('') : '<tr><td colspan="6" class="!py-12 text-center text-ink-500">No notifications.</td></tr>');
    ui.reveal($('#n-body'));
    syncBulk();
  }

  function syncBulk() {
    var n = Object.keys(checked).filter(function (k) { return checked[k]; }).length;
    $('#bulk-n').text(n); $('#bulk-del').prop('disabled', !n);
    var vis = list();
    $('#check-all').prop('checked', vis.length && vis.every(function (x) { return checked[x.id]; }));
  }

  function removeMany(ids) {
    if (!CE.guard.can('notification:delete')) return ui.forbiddenModal(); // ACTION GUARD
    return ui.confirm({ title: 'Delete ' + ids.length + ' notification' + (ids.length > 1 ? 's' : '') + '?', message: 'They’ll be removed from every member’s inbox. This cannot be undone.', confirmText: 'Delete', danger: true }).then(function (ok) {
      if (!ok) return;
      var done = 0, failed = 0;
      // sequential deletes keep the optimistic list consistent and the error report clear
      return ids.reduce(function (p, id) {
        return p.then(function () { return N.remove(id).then(function () { done++; delete checked[id]; }).catch(function () { failed++; }); });
      }, Promise.resolve()).then(function () {
        render();
        if (done) ui.toast('success', done + ' notification' + (done > 1 ? 's' : '') + ' deleted.');
        if (failed) ui.toast('error', failed + ' couldn’t be deleted. Please try again.', { action: 'Retry', onAction: load });
      });
    });
  }

  function load() {
    $('#n-body').html('<tr><td colspan="6"><div class="space-y-3 py-2">' + new Array(5).join('<div class="skeleton h-10"></div>') + '</div></td></tr>');
    N.load(true).then(render).catch(function (e) { $('#n-body').html('<tr><td colspan="6"><div id="n-err"></div></td></tr>'); ui.errorState($('#n-err'), e, load); });
  }

  CE.ready(function () {
    CE.adminShell('notifications');
    load();
    $('#refresh').on('click', load);
    $('.chip[data-f]').on('click', function () { filter = $(this).data('f'); $('.chip[data-f]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); render(); });
    $('#n-body').on('change', '.js-check', function () { checked[$(this).closest('tr').data('id')] = this.checked; syncBulk(); });
    $('#check-all').on('change', function () { var on = this.checked; list().forEach(function (n) { checked[n.id] = on; }); render(); });
    $('#n-body').on('click', '.js-del', function () { removeMany([$(this).closest('tr').data('id')]); });
    $('#bulk-del').on('click', function () { removeMany(Object.keys(checked).filter(function (k) { return checked[k]; })); });
    $('#del-form').on('submit', function (e) {
      e.preventDefault();
      var id = $('#del-select').val();
      if (!ui.fieldError($('#del-select'), id ? '' : 'Choose a notification to delete.')) return;
      removeMany([id]);
    });
  });
})(jQuery, window.CE);
