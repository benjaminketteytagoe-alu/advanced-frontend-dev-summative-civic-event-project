// Admin notifications page: see every notification and delete them one by one or together
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;
  var notes = CE.notifs;   // the notifications, shared with the bell in the header

  var filter = 'all';      // all, event, announcement or promo
  var ticked = [];         // ids of the ticked rows

  // The notifications the filter lets through
  function matches() {
    return notes.items.filter(function (n) { return filter === 'all' || n.type === filter; });
  }

  function isTicked(n) { return ticked.indexOf(n.id) > -1; }

  // Forget ticks on rows that are hidden or gone, so nothing unseen is ever deleted
  function tidyTicks() {
    ticked = matches().filter(isTicked).map(function (n) { return n.id; });
  }

  // One choice in the drop down
  function option(n) {
    var date = fmt.date(n.created_at, { day: 'numeric', month: 'short' });
    return '<option value="' + esc(n.id) + '">' + esc(date + ': ' + n.title) + '</option>';
  }

  // The cells of a row
  function tickCell(n) {
    return '<td><input type="checkbox" class="js-check w-4 h-4 accent-ink-900"' + (isTicked(n) ? ' checked' : '') +
      ' aria-label="Select ' + esc(n.title) + '"></td>';
  }

  function textCell(n) {
    var link = notes.link(n);
    var html = '<p class="font-medium text-ink-900">' + esc(n.title) + '</p>' +
      '<p class="text-xs text-ink-500 clamp-2">' + esc(n.message) + '</p>';
    if (link) html += '<a class="text-xs text-ember-700 hover:underline" href="' + link.href + '">' + esc(link.label) + ' →</a>';
    return '<td class="max-w-md">' + html + '</td>';
  }

  function typeCell(n) {
    return '<td><span class="badge badge-muted capitalize">' + icon(notes.typeIcon(n.type), 'w-3 h-3') + esc(n.type) + '</span></td>';
  }

  function deleteCell(n) {
    return '<td class="text-right"><button type="button" class="btn btn-danger btn-sm js-del" aria-label="Delete ' + esc(n.title) + '">' +
      icon('trash', 'w-4 h-4') + '</button></td>';
  }

  // One table row. The delay makes the rows appear one after another
  function row(n, i) {
    var delay = Math.min(i * 25, 300);
    return '<tr class="reveal" style="--d:' + delay + 'ms" data-id="' + esc(n.id) + '">' +
      tickCell(n) + textCell(n) + typeCell(n) +
      '<td class="text-ink-600">' + (n.recipient_id ? 'One member' : 'Everyone') + '</td>' +
      '<td class="text-ink-600 whitespace-nowrap">' + esc(fmt.relative(n.created_at)) + '</td>' +
      deleteCell(n) + '</tr>';
  }

  // The delete button's number, and the tick box at the top
  function showTicks() {
    var total = matches().length;
    $('#bulk-n').text(ticked.length);
    $('#bulk-del').prop('disabled', ticked.length === 0);
    $('#check-all').prop('checked', total > 0 && ticked.length === total);
  }

  // Draw the page
  function show() {
    var list = matches();
    var empty = '<tr><td colspan="6" class="!py-12 text-center text-ink-500">No notifications.</td></tr>';
    tidyTicks();
    $('#del-select').html('<option value="">Select a notification…</option>' + notes.items.map(option).join(''));
    $('#n-body').html(list.length ? list.map(row).join('') : empty);
    ui.reveal($('#n-body'));
    showTicks();
  }

  // Grey bars while we wait
  function showLoading() {
    var bar = '<div class="skeleton h-10"></div>';
    $('#n-body').html('<tr><td colspan="6"><div class="space-y-3 py-2">' + bar + bar + bar + bar + '</div></td></tr>');
  }

  function showError(err) {
    $('#del-select').html('<option value="">Could not load</option>');
    $('#n-body').html('<tr><td colspan="6"><div id="n-err"></div></td></tr>');
    ui.errorState($('#n-err'), err, load);
  }

  function load() {
    showLoading();
    notes.load(true).then(show).catch(showError);
  }

  function count(n) { return n + (n === 1 ? ' notification' : ' notifications'); }

  // Delete one, then the next, and count how many failed
  async function removeAll(ids) {
    var failed = 0;
    for (var i = 0; i < ids.length; i++) {
      try { await notes.remove(ids[i]); } catch (err) { failed++; }
    }
    var done = ids.length - failed;
    show();
    if (done) ui.toast('success', count(done) + ' deleted.');
    if (failed) ui.toast('error', count(failed) + ' couldn’t be deleted. Please try again.');
  }

  function askRemove(ids) {
    if (!CE.guard.can('notification:delete')) return ui.forbiddenModal();
    ui.confirm({
      title: 'Delete ' + count(ids.length) + '?',
      message: 'They’ll be removed from every member’s inbox. This cannot be undone.',
      confirmText: 'Delete',
      danger: true
    }).then(function (yes) { if (yes) removeAll(ids); });
  }

  function changeFilter() {
    filter = $(this).data('f');
    $('.chip[data-f]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    show();
  }

  function rowId(el) { return $(el).closest('tr').attr('data-id'); }

  function tickOne() {
    var id = rowId(this);
    ticked = ticked.filter(function (x) { return x !== id; });
    if (this.checked) ticked.push(id);
    showTicks();
  }

  function tickAll() {
    var on = this.checked;
    ticked = on ? matches().map(function (n) { return n.id; }) : [];
    $('.js-check').prop('checked', on);
    showTicks();
  }

  // The form at the top
  function submitForm(e) {
    e.preventDefault();
    var id = $('#del-select').val();
    ui.fieldError($('#del-select'), id ? '' : 'Choose a notification to delete.');
    if (id) askRemove([id]);
  }

  // Start
  CE.ready(function () {
    CE.adminShell('notifications');
    load();
    $('#refresh').on('click', load);
    $('.chip[data-f]').on('click', changeFilter);
    $('#check-all').on('change', tickAll);
    $('#bulk-del').on('click', function () { askRemove(ticked.slice()); });
    $('#del-form').on('submit', submitForm);
    $('#n-body')
      .on('change', '.js-check', tickOne)
      .on('click', '.js-del', function () { askRemove([rowId(this)]); });
  });
})(jQuery, window.CE);
