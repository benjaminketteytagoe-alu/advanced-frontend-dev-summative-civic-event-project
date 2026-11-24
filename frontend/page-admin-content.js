// Admin content page: every event, announcement and promo, drafts too
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;

  var tab = 'events';   // the open tab
  var search = '';      // the text in the filter box
  var data = { events: [], announcements: [], promos: [] };

  // What is different about each tab
  var tabs = {
    events: { view: 'event.html', form: 'event-form.html', kind: 'event', add: '+ New event', icon: 'calendar' },
    announcements: { view: 'announcement.html', form: 'announcement-form.html', kind: 'announcement', add: '+ New announcement', icon: 'megaphone' },
    promos: { view: 'promo.html', form: 'promo-form.html', kind: 'promo', add: '+ New promo', icon: 'film' }
  };

  // The rows whose title matches the filter box
  function matches() {
    return data[tab].filter(function (x) {
      return (x.title || '').toLowerCase().indexOf(search.toLowerCase()) > -1;
    });
  }

  function showHead() {
    $('#c-head').html(
      '<tr><th scope="col">Title</th>' +
      '<th scope="col">' + (tab === 'events' ? 'Date' : 'Created') + '</th>' +
      '<th scope="col">Published</th>' +
      '<th scope="col" class="!text-right">Actions</th></tr>'
    );
  }

  function showCount() {
    var drafts = data[tab].filter(function (x) { return x.published === false; });
    $('#c-count').text(data[tab].length + ' total · ' + drafts.length + ' unpublished');
  }

  // The four cells of a row
  function titleCell(x) {
    return '<td><a href="' + tabs[tab].view + '?id=' + encodeURIComponent(x.id) + '"' +
      ' class="flex items-center gap-3 font-medium text-ink-900 hover:text-ember-700">' +
      '<span class="grid place-items-center w-9 h-9 rounded-lg bg-paper-200 text-ink-600 shrink-0">' +
      icon(tabs[tab].icon, 'w-4 h-4') + '</span>' +
      '<span class="truncate max-w-xs">' + esc(x.title) + '</span></a></td>';
  }

  function dateCell(x) {
    var date = tab === 'events' ? fmt.dateTime(x.starts_at) : fmt.date(x.created_at);
    return '<td class="text-ink-600 whitespace-nowrap">' + esc(date) + '</td>';
  }

  function switchCell(x) {
    var checked = x.published === false ? '' : ' checked';
    return '<td><input type="checkbox" class="switch js-pub" role="switch"' + checked +
      ' aria-label="Published: ' + esc(x.title) + '"></td>';
  }

  function buttonCell(x) {
    return '<td class="text-right whitespace-nowrap">' +
      '<a class="btn btn-ghost btn-sm" href="' + tabs[tab].form + '?id=' + encodeURIComponent(x.id) + '">' +
      icon('edit', 'w-4 h-4') + '<span class="sr-only sm:not-sr-only">Edit</span></a> ' +
      '<button type="button" class="btn btn-danger btn-sm js-del">' +
      icon('trash', 'w-4 h-4') + '<span class="sr-only sm:not-sr-only">Delete</span></button></td>';
  }

  // One table row. The delay makes the rows appear one after another
  function row(x, i) {
    var delay = Math.min(i * 25, 300);
    return '<tr class="reveal" style="--d:' + delay + 'ms" data-id="' + esc(x.id) + '">' +
      titleCell(x) + dateCell(x) + switchCell(x) + buttonCell(x) + '</tr>';
  }

  function emptyRow() {
    return '<tr><td colspan="4" class="!py-12 text-center text-ink-500">Nothing here yet. ' +
      '<a class="text-ember-700 underline" href="' + tabs[tab].form + '">Create one</a>.</td></tr>';
  }

  // Draw the table
  function show() {
    var list = matches();
    showHead();
    showCount();
    $('#c-body').html(list.length ? list.map(row).join('') : emptyRow());
    ui.reveal($('#c-body'));
  }

  // Grey bars while we wait
  function showLoading() {
    var bar = '<div class="skeleton h-9"></div>';
    $('#c-body').html('<tr><td colspan="4"><div class="space-y-3 py-2">' + bar + bar + bar + bar + '</div></td></tr>');
  }

  function showError(err) {
    $('#c-body').html('<tr><td colspan="4"><div id="c-err"></div></td></tr>');
    ui.errorState($('#c-err'), err, load);
  }

  // Get fresh data. If another tab was opened meanwhile, ignore the answer
  function load() {
    var wanted = tab;
    showLoading();
    CE.data[wanted](true)
      .then(function (list) {
        data[wanted] = list;
        if (wanted === tab) show();
      })
      .catch(function (err) { if (wanted === tab) showError(err); });
  }

  function openTab(name) {
    tab = tabs[name] ? name : 'events';
    $('.tab').each(function () {
      var on = $(this).data('k') === tab;
      $(this).attr({ 'aria-selected': String(on), tabindex: on ? 0 : -1 });
      $(this).toggleClass('bg-white shadow-card text-ink-900', on).toggleClass('text-ink-600', !on);
    });
    $('#panel').attr('aria-labelledby', 'tab-' + tab);
    $('#new-btn').attr('href', tabs[tab].form).text(tabs[tab].add);
    history.replaceState(null, '', '#' + tab);
    load();
  }

  // Left and right arrow keys move between tabs
  function arrowKeys(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    var $all = $('.tab');
    var step = e.key === 'ArrowRight' ? 1 : -1;
    var next = ($all.index(this) + step + $all.length) % $all.length;
    $all.eq(next).trigger('focus').trigger('click');
  }

  // The item a switch or button belongs to
  function itemOf(el) {
    var id = $(el).closest('tr').attr('data-id');
    return data[tab].filter(function (x) { return x.id === id; })[0];
  }

  // Events are published through a normal edit, the other two have their own addresses
  function savePublished(kind, id, on) {
    if (kind !== 'event') return CE.actions.setPublished(kind, id, on);
    return CE.api.put('/events/' + encodeURIComponent(id), { published: on })
      .then(function () { CE.cache.invalidate('events'); });
  }

  // The switch moves at once, and moves back if saving fails
  function togglePublished() {
    var $switch = $(this), item = itemOf(this), kind = tabs[tab].kind;
    var on = $switch.is(':checked');
    item.published = on;
    $switch.prop('disabled', true);
    savePublished(kind, item.id, on)
      .then(function () { ui.toast('success', '“' + item.title + '” ' + (on ? 'published.' : 'unpublished.')); })
      .catch(function (err) {
        item.published = !on;
        $switch.prop('checked', !on);
        CE.handleError(err);
      })
      .finally(function () {
        $switch.prop('disabled', false);
        showCount();
      });
  }

  function removeItem() {
    var item = itemOf(this), from = tab;
    CE.actions.remove({
      action: tabs[from].kind + ':delete',
      path: '/' + from + '/' + item.id,
      title: item.title,
      cacheKey: from,
      $card: $(this).closest('tr'),
      after: function () {
        data[from] = data[from].filter(function (x) { return x !== item; });
        show();
      }
    });
  }

  // Start
  CE.ready(function () {
    CE.adminShell('content');
    openTab(window.location.hash.replace('#', ''));

    $('.tab').on('click', function () { openTab($(this).data('k')); }).on('keydown', arrowKeys);
    $('#c-q').on('input', CE.debounce(function () { search = $.trim(this.value); show(); }, 150));
    $('#c-body').on('change', '.js-pub', togglePublished).on('click', '.js-del', removeItem);
  });
})(jQuery, window.CE);
