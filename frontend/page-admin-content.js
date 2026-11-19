/* =========================================================================
   Content management (ADMIN ONLY) — events, announcements and promos in one
   place, including unpublished items. Publish toggles are optimistic.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;
  var tab = 'events', data = { events: [], announcements: [], promos: [] }, q = '';

  var CFG = {
    events: { load: function (f) { return CE.data.events(f); }, view: 'event.html', edit: 'event-form.html', api: '/events/', del: 'event:delete', newLabel: '+ New event', ic: 'calendar' },
    announcements: { load: function (f) { return CE.data.announcements(f); }, view: 'announcement.html', edit: 'announcement-form.html', api: '/announcements/', del: 'announcement:delete', kind: 'announcement', newLabel: '+ New announcement', ic: 'megaphone' },
    promos: { load: function (f) { return CE.data.promos(f); }, view: 'promo.html', edit: 'promo-form.html', api: '/promos/', del: 'promo:delete', kind: 'promo', newLabel: '+ New promo', ic: 'film' }
  };

  function head() {
    $('#c-head').html('<tr><th scope="col">Title</th><th scope="col">' + (tab === 'events' ? 'Date' : 'Created') + '</th><th scope="col">Published</th><th scope="col" class="!text-right">Actions</th></tr>');
  }

  function render() {
    var c = CFG[tab], lq = q.toLowerCase();
    var list = data[tab].filter(function (x) { return !lq || (x.title || '').toLowerCase().indexOf(lq) > -1; });
    var drafts = data[tab].filter(function (x) { return x.published === false; }).length;
    $('#c-count').text(data[tab].length + ' total · ' + drafts + ' unpublished');
    head();
    if (!list.length) { $('#c-body').html('<tr><td colspan="4" class="!py-12 text-center text-ink-500">Nothing here yet. <a class="text-ember-700 underline" href="' + c.edit + '">Create one</a>.</td></tr>'); return; }
    $('#c-body').html(list.map(function (x, i) {
      var pub = x.published !== false;
      var toggle = c.kind
        ? '<input type="checkbox" class="switch js-pub" role="switch" ' + (pub ? 'checked' : '') + ' aria-label="Published: ' + esc(x.title) + '">'
        // The events API has no publish endpoint and ignores `published` on save.
        : '<span class="badge ' + (pub ? 'badge-moss' : 'badge-danger') + '" title="The events API does not support changing publish status">' + (pub ? 'Published' : 'Unpublished') + '</span>';
      return '<tr class="reveal" style="--d:' + Math.min(i * 25, 300) + 'ms" data-id="' + esc(x.id) + '" data-title="' + esc(x.title) + '">' +
        '<td><a href="' + c.view + '?id=' + encodeURIComponent(x.id) + '" class="flex items-center gap-3 font-medium text-ink-900 hover:text-ember-700"><span class="grid place-items-center w-9 h-9 rounded-lg bg-paper-200 text-ink-600 shrink-0">' + icon(c.ic, 'w-4 h-4') + '</span><span class="truncate max-w-xs">' + esc(x.title) + '</span></a></td>' +
        '<td class="text-ink-600 whitespace-nowrap">' + esc(tab === 'events' ? fmt.dateTime(x.starts_at) : fmt.date(x.created_at)) + '</td>' +
        '<td>' + toggle + '</td>' +
        '<td class="text-right whitespace-nowrap"><a class="btn btn-ghost btn-sm" href="' + c.edit + '?id=' + encodeURIComponent(x.id) + '">' + icon('edit', 'w-4 h-4') + '<span class="sr-only sm:not-sr-only">Edit</span></a> ' +
        '<button type="button" class="btn btn-danger btn-sm js-del">' + icon('trash', 'w-4 h-4') + '<span class="sr-only sm:not-sr-only">Delete</span></button></td></tr>';
    }).join(''));
    ui.reveal($('#c-body'));
  }

  function load(force) {
    $('#c-body').html('<tr><td colspan="4"><div class="space-y-3 py-2">' + new Array(5).join('<div class="skeleton h-9"></div>') + '</div></td></tr>');
    CFG[tab].load(force).then(function (list) { data[tab] = list; render(); })
      .catch(function (e) { $('#c-body').html('<tr><td colspan="4"><div id="c-err"></div></td></tr>'); ui.errorState($('#c-err'), e, function () { load(true); }); });
  }

  function select(k) {
    tab = CFG[k] ? k : 'events';
    $('.tab').each(function () {
      var on = $(this).data('k') === tab;
      $(this).attr({ 'aria-selected': String(on), tabindex: on ? 0 : -1 }).toggleClass('bg-white shadow-card text-ink-900', on).toggleClass('text-ink-600', !on);
    });
    $('#panel').attr('aria-labelledby', 'tab-' + tab);
    $('#new-btn').attr('href', CFG[tab].edit).text(CFG[tab].newLabel);
    history.replaceState(null, '', '#' + tab);
    load(true);
  }

  CE.ready(function () {
    CE.adminShell('content');
    select((window.location.hash || '').replace('#', '') || 'events');
    $('.tab').on('click', function () { select($(this).data('k')); })
      .on('keydown', function (e) {
        var $t = $('.tab'), i = $t.index(this);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = $t.eq((i + (e.key === 'ArrowRight' ? 1 : -1) + $t.length) % $t.length); n.trigger('focus').trigger('click'); }
      });
    $('#c-q').on('input', CE.debounce(function () { q = $.trim(this.value); render(); }, 150));

    $('#c-body').on('change', '.js-pub', function () {
      var $t = $(this), $tr = $t.closest('tr'), id = $tr.data('id'), on = $t.is(':checked');
      var item = data[tab].filter(function (x) { return x.id === id; })[0];
      item.published = on; $t.prop('disabled', true); // optimistic
      CE.actions.setPublished(CFG[tab].kind, id, on).then(function () {
        ui.toast('success', '“' + $tr.data('title') + '” ' + (on ? 'published.' : 'unpublished.'));
        render();
      }).catch(function (err) { item.published = !on; $t.prop('checked', !on); CE.handleError(err); })
        .finally(function () { $t.prop('disabled', false); });
    });
    $('#c-body').on('click', '.js-del', function () {
      var $tr = $(this).closest('tr'), id = $tr.data('id');
      CE.actions.remove({ action: CFG[tab].del, path: CFG[tab].api + id, title: $tr.data('title'), cacheKey: tab, $card: $tr,
        after: function () { data[tab] = data[tab].filter(function (x) { return x.id !== id; }); render(); } });
    });
  });
})(jQuery, window.CE);
