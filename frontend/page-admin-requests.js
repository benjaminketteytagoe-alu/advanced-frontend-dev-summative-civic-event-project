// Admin requests page: read every service request, change its status and reply
(function ($, CE) {
  'use strict';
  var ui = CE.ui, esc = CE.esc, fmt = CE.fmt;

  var requests = [];
  var filter = 'all';   // all, or one of the statuses
  var names = { open: 'Open', in_progress: 'In progress', done: 'Done', declined: 'Declined' };

  function matches() {
    return requests.filter(function (r) { return filter === 'all' || r.status === filter; });
  }

  function find(id) {
    return requests.filter(function (r) { return r.id === id; })[0];
  }

  // The status drop down, with the current one chosen
  function statusBox(r) {
    var options = Object.keys(names).map(function (key) {
      return '<option value="' + key + '"' + (key === r.status ? ' selected' : '') + '>' + names[key] + '</option>';
    });
    return '<div class="form-row"><label class="field-label" for="s-' + r.id + '">Status</label>' +
      '<select id="s-' + r.id + '" name="status" class="field">' + options.join('') + '</select></div>';
  }

  function replyBox(r) {
    return '<div class="form-row"><label class="field-label" for="r-' + r.id + '">Reply</label>' +
      '<textarea id="r-' + r.id + '" name="reply" rows="2" maxlength="500" class="field resize-y">' + esc(r.reply) + '</textarea></div>';
  }

  function card(r) {
    return '<article class="card p-5 reveal">' +
      '<h3 class="font-display text-xl text-ink-900">' + esc(r.type) + '</h3>' +
      '<p class="text-sm text-ink-600 break-words">' + esc(r.location) + '</p>' +
      '<p class="mt-3 text-ink-700 whitespace-pre-line break-words">' + esc(r.description) + '</p>' +
      '<p class="mt-2 text-xs text-ink-500 break-words">' + esc(r.full_name) + ' (' + esc(r.email) + '), ' + esc(fmt.relative(r.created_at)) + '</p>' +
      '<form class="js-form mt-4 grid md:grid-cols-[12rem_1fr_auto] gap-4 items-end" data-id="' + esc(r.id) + '">' +
      statusBox(r) + replyBox(r) +
      '<button type="submit" class="btn btn-primary">Save</button></form></article>';
  }

  function showCount() {
    var open = requests.filter(function (r) { return r.status === 'open'; });
    $('#req-count').text(requests.length + ' total · ' + open.length + ' open');
  }

  function show() {
    var list = matches();
    var empty = ui.empty('No requests here', 'Requests with this status will appear here.', '', 'message');
    showCount();
    $('#req-list').attr('aria-busy', 'false').html(list.length ? list.map(card).join('') : empty);
    ui.reveal($('#req-list'));
  }

  function load() {
    $('#req-list').attr('aria-busy', 'true').html(ui.skeletonCards(3, 'row'));
    CE.api.get('/service-requests')
      .then(function (reply) { requests = reply.data; show(); })
      .catch(function (err) {
        $('#req-count').text('');
        $('#req-list').attr('aria-busy', 'false');
        ui.errorState($('#req-list'), err, load);
      });
  }

  // Keep the other cards as they are, so text typed in them is not lost
  function saved(r, reply) {
    r.status = reply.data.status;
    r.reply = reply.data.reply;
    showCount();
    ui.toast('success', 'Saved. The sender has been told.');
  }

  function save(e) {
    e.preventDefault();
    if (!CE.guard.can('request:manage')) return ui.forbiddenModal();

    var $form = $(this), $button = $form.find('button');
    var r = find($form.attr('data-id'));
    ui.busy($button, true, 'Saving…');
    CE.api.patch('/service-requests/' + encodeURIComponent(r.id), {
      status: $form.find('select').val(),
      reply: $.trim($form.find('textarea').val())
    })
      .then(function (reply) { saved(r, reply); })
      .catch(CE.handleError)
      .finally(function () { ui.busy($button, false); });
  }

  function changeFilter() {
    filter = $(this).data('f');
    $('.chip[data-f]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    show();
  }

  // Start
  CE.ready(function () {
    CE.adminShell('requests');
    load();
    $('.chip[data-f]').on('click', changeFilter);
    $('#req-list').on('submit', '.js-form', save);
  });
})(jQuery, window.CE);
