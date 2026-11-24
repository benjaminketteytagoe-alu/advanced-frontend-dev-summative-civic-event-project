// My requests page: report a problem, and follow the ones already sent
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;

  var requests = [];
  var names = { open: 'Open', in_progress: 'In progress', done: 'Done', declined: 'Declined' };
  var colours = { open: 'badge-ink', in_progress: 'badge-ember', done: 'badge-moss', declined: 'badge-danger' };

  // ---------- the list ----------

  function replyBox(r) {
    if (!r.reply) return '';
    return '<div class="mt-4 rounded-xl bg-paper-100 p-4 text-sm"><p class="font-semibold text-ink-900">Reply from the civic office</p>' +
      '<p class="text-ink-700 whitespace-pre-line break-words">' + esc(r.reply) + '</p></div>';
  }

  function card(r) {
    return '<article class="card p-5 reveal">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
      '<h3 class="font-display text-xl text-ink-900">' + esc(r.type) + '</h3>' +
      '<span class="badge ' + colours[r.status] + '">' + names[r.status] + '</span></div>' +
      '<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-600">' + icon('pin', 'w-4 h-4 shrink-0') + '<span class="min-w-0 break-words">' + esc(r.location) + '</span></p>' +
      '<p class="mt-3 text-ink-700 whitespace-pre-line break-words">' + esc(r.description) + '</p>' +
      replyBox(r) +
      '<p class="mt-3 text-xs text-ink-500">Sent ' + esc(fmt.relative(r.created_at)) + '</p></article>';
  }

  function show() {
    var empty = ui.empty('No requests yet', 'Requests you send will appear here.', '', 'message');
    $('#req-list').attr('aria-busy', 'false').html(requests.length ? requests.map(card).join('') : empty);
    ui.reveal($('#req-list'));
  }

  function load() {
    $('#req-list').attr('aria-busy', 'true').html(ui.skeletonCards(3, 'row'));
    CE.api.get('/service-requests/mine')
      .then(function (reply) { requests = reply.data; show(); })
      .catch(function (err) {
        $('#req-list').attr('aria-busy', 'false');
        ui.errorState($('#req-list'), err, load);
      });
  }

  // ---------- the form ----------

  function option(type) { return '<option>' + esc(type) + '</option>'; }

  function loadTypes() {
    CE.api.get('/service-requests/types')
      .then(function (reply) { $('#type').html('<option value="">Choose one…</option>' + reply.data.map(option).join('')); })
      .catch(function () { $('#type').html('<option value="">Could not load, refresh the page</option>'); });
  }

  function typed(id) { return $.trim($('#' + id).val()); }

  function check() {
    var ok = true;
    ui.clearErrors($('#req-form'));
    if (!typed('type')) ok = ui.fieldError($('#type'), 'Choose what it is about.');
    if (typed('location').length < 3) ok = ui.fieldError($('#location'), 'Say where it is (at least 3 characters).');
    if (typed('description').length < 10) ok = ui.fieldError($('#description'), 'Describe it in at least 10 characters.');
    if (!ok) $('#req-form [aria-invalid=true]').first().trigger('focus');
    return ok;
  }

  // Sent: empty the form and put the new one on top
  function sent(reply) {
    $('#req-form')[0].reset();
    requests.unshift(reply.data);
    show();
    ui.toast('success', 'Your request was sent.');
  }

  function failed(err) {
    if (err.status === 400) ui.applyServerErrors($('#req-form'), err);
    CE.handleError(err);
  }

  function submit(e) {
    e.preventDefault();
    if (!CE.guard.can('request:create')) return ui.forbiddenModal();
    if (!check()) return;

    ui.busy($('#send-btn'), true, 'Sending…');
    CE.api.post('/service-requests', { type: typed('type'), location: typed('location'), description: typed('description') })
      .then(sent)
      .catch(failed)
      .finally(function () { ui.busy($('#send-btn'), false); });
  }

  // Start
  CE.ready(function () {
    load();
    if (!CE.guard.can('request:create')) return; // admins only see the list
    loadTypes();
    $('#req-form').on('submit', submit);
  });
})(jQuery, window.CE);
