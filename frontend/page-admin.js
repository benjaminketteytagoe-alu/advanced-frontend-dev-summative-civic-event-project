// Admin dashboard: the key numbers, four charts drawn with plain boxes, and the newest notifications
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, num = CE.num;

  var last = '';      // the numbers shown last, to see if anything changed
  var timer = null;

  // ---------- the numbers ----------

  // Pick what we need from the reply, as real numbers
  function readStats(d) {
    var events = num(d.events.total_events), upcoming = num(d.events.upcoming_events), past = num(d.events.past_events);
    return {
      members: num(d.users.total_users),
      active: num(d.users.active_users),
      disabled: num(d.users.inactive_users),
      events: events,
      upcoming: upcoming,
      past: past,
      now: events - upcoming - past, // started but not finished
      registrations: num(d.registrations.total_registrations),
      feedback: num(d.feedbacks.total_feedback),
      promos: num(d.promos.total_promos),
      announcements: num(d.announcements.total_announcements),
      notifications: num(d.notifications.total_notifications),
      unread: CE.notifs.unread(),
      growth: d.user_growth
    };
  }

  function tile(t, i) {
    return '<a href="' + t.link + '" class="card card-hover focus-brackets p-5 reveal" style="--d:' + i * 60 + 'ms">' +
      '<div class="flex items-start justify-between"><span class="text-sm text-ink-600">' + t.label + '</span>' +
      '<span class="grid place-items-center w-9 h-9 rounded-xl ' + (t.colour || 'bg-paper-200 text-ink-700') + '">' + icon(t.icon, 'w-4 h-4') + '</span></div>' +
      '<p class="font-display text-4xl text-ink-900 mt-3 count-up" data-to="' + t.value + '" data-odo-key="admin-' + i + '">0</p>' +
      '<p class="text-xs text-ink-500 mt-1">' + t.note + '</p></a>';
  }

  function showTiles(s) {
    var tiles = [
      { label: 'Members', value: s.members, note: s.active + ' active · ' + s.disabled + ' disabled', icon: 'users', colour: 'bg-ink-900 text-white', link: 'admin-users.html' },
      { label: 'Events', value: s.events, note: s.upcoming + ' upcoming', icon: 'calendar', colour: 'bg-ember-100 text-ember-700', link: 'events.html' },
      { label: 'Registrations', value: s.registrations, note: 'across all events', icon: 'ticket', colour: 'bg-moss-100 text-moss-700', link: 'events.html' },
      { label: 'Feedback', value: s.feedback, note: 'reviews submitted', icon: 'star', link: 'events.html' },
      { label: 'Promos', value: s.promos, note: 'videos', icon: 'film', link: 'admin-content.html#promos' },
      { label: 'Announcements', value: s.announcements, note: 'audio briefings', icon: 'megaphone', link: 'admin-content.html#announcements' },
      { label: 'Notifications', value: s.notifications, note: 'sent in total', icon: 'bell', link: 'admin-notifications.html' },
      { label: 'Unread (you)', value: s.unread, note: 'in your inbox', icon: 'inbox', colour: 'bg-ember-100 text-ember-700', link: 'notifications.html' }
    ];
    $('#kpis').html(tiles.map(tile).join(''));
    $('#kpis .count-up').each(function () { CE.fx.odometer($(this), $(this).data('to')); }); // rolling numbers
    ui.reveal($('#kpis'));
  }

  // ---------- charts ----------

  // How much of the biggest one, from 0 to 100
  function percentOf(value, biggest) { return biggest ? value / biggest * 100 : 0; }

  function biggest(list) {
    return Math.max.apply(null, list.map(function (x) { return x.value; }));
  }

  // The last six months, also the ones nobody joined in
  function lastMonths(growth) {
    var counts = {}, months = [], now = new Date();
    growth.forEach(function (g) { counts[g.month] = num(g.new_users); });
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); // like 2026-11
      months.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), value: counts[key] || 0 });
    }
    return months;
  }

  function column(m, i, most) {
    return '<li class="flex-1 min-w-0 flex flex-col items-center justify-end h-full">' +
      '<span class="text-xs font-semibold text-ink-900 mb-1">' + m.value + '</span>' +
      '<span class="grow-y block w-full max-w-[2.75rem] rounded-t" style="--d:' + i * 70 + 'ms; height:' + percentOf(m.value, most) * 0.75 + '%; min-height:2px; background:var(--s1)"></span>' +
      '<span class="w-full text-center text-xs text-ink-500 border-t border-paper-400 pt-1.5">' + esc(m.label) + '</span></li>';
  }

  // Columns: new members each month
  function showGrowth(growth) {
    var months = lastMonths(growth), most = biggest(months);
    var columns = months.map(function (m, i) { return column(m, i, most); });
    $('#chart-growth').html('<ol class="flex gap-3 h-56">' + columns.join('') + '</ol>');
  }

  function legendLine(p, total) {
    return '<li class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm" style="background:' + p.colour + '" aria-hidden="true"></span>' +
      '<span class="text-ink-700">' + p.label + '</span><span class="font-semibold text-ink-900">' + p.value + '</span>' +
      '<span class="text-ink-500">(' + Math.round(percentOf(p.value, total)) + '%)</span></li>';
  }

  function slice(p) { return '<span class="block h-full" style="flex-grow:' + p.value + '; background:' + p.colour + '"></span>'; }

  // One bar cut into parts, with a legend below
  function showParts($chart, parts, unit) {
    var total = 0;
    parts.forEach(function (p) { total += p.value; });
    var filled = parts.filter(function (p) { return p.value > 0; });
    var legend = parts.map(function (p) { return legendLine(p, total); });
    $chart.html('<p class="font-display text-4xl text-ink-900 mb-3">' + total.toLocaleString() + ' <span class="text-base font-sans text-ink-500">' + unit + '</span></p>' +
      '<div class="grow-x flex gap-0.5 h-9 rounded-md overflow-hidden" style="background:var(--grid)" aria-hidden="true">' + filled.map(slice).join('') + '</div>' +
      '<ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">' + legend.join('') + '</ul>');
  }

  function barLine(r, i, most) {
    return '<li class="flex items-center gap-3 text-xs"><span class="w-24 shrink-0 text-right text-ink-700">' + r.label + '</span>' +
      '<span class="flex-1 h-5 rounded overflow-hidden" style="background:var(--grid)" aria-hidden="true">' +
      '<span class="grow-x block h-full rounded" style="--d:' + i * 70 + 'ms; width:' + percentOf(r.value, most) + '%; background:var(--s1)"></span></span>' +
      '<span class="w-10 shrink-0 font-semibold text-ink-900">' + r.value.toLocaleString() + '</span></li>';
  }

  // Bars: totals across the platform
  function showTotals(s) {
    var rows = [
      { label: 'Registrations', value: s.registrations },
      { label: 'Notifications', value: s.notifications },
      { label: 'Events', value: s.events },
      { label: 'Feedback', value: s.feedback },
      { label: 'Announcements', value: s.announcements },
      { label: 'Promos', value: s.promos }
    ];
    var most = biggest(rows);
    var bars = rows.map(function (r, i) { return barLine(r, i, most); });
    $('#chart-content').html('<ul class="space-y-3">' + bars.join('') + '</ul>');
  }

  function showCharts(s) {
    showGrowth(s.growth);
    showParts($('#chart-events'), [
      { label: 'Upcoming', value: s.upcoming, colour: 'var(--s1)' },
      { label: 'In progress', value: s.now, colour: 'var(--s2)' },
      { label: 'Past', value: s.past, colour: 'var(--s3)' }
    ], 'events');
    showParts($('#chart-users'), [
      { label: 'Active', value: s.active, colour: 'var(--s3)' },
      { label: 'Disabled', value: s.disabled, colour: 'var(--s2)' }
    ], 'members');
    showTotals(s);
  }

  // ---------- table and notifications ----------

  function tableRow(r) {
    return '<tr><th scope="row" class="font-normal text-left text-ink-700 px-4 py-2.5">' + esc(r[0]) + '</th>' +
      '<td class="text-right font-mono">' + r[1].toLocaleString() + '</td></tr>';
  }

  // Every number again, for people who prefer a table
  function showTable(s) {
    var rows = [
      ['Members (total)', s.members], ['Members (active)', s.active], ['Members (disabled)', s.disabled],
      ['Events (total)', s.events], ['Events (upcoming)', s.upcoming], ['Events (in progress)', s.now], ['Events (past)', s.past],
      ['Registrations', s.registrations], ['Feedback', s.feedback], ['Promos', s.promos], ['Announcements', s.announcements],
      ['Notifications', s.notifications], ['Unread notifications (you)', s.unread]
    ];
    s.growth.forEach(function (g) { rows.push(['New members ' + g.month, num(g.new_users)]); });
    $('#stats-table').html('<table class="table w-full text-sm"><thead><tr><th scope="col">Metric</th><th scope="col" class="!text-right">Value</th></tr></thead>' +
      '<tbody>' + rows.map(tableRow).join('') + '</tbody></table>');
  }

  function recentLine(n) {
    return '<li><a href="notifications.html?id=' + encodeURIComponent(n.id) + '" class="flex items-center gap-4 px-6 py-3.5 hover:bg-paper-100 transition">' +
      '<span class="grid place-items-center w-9 h-9 rounded-full bg-paper-200 text-ink-600">' + icon(CE.notifs.typeIcon(n.type), 'w-4 h-4') + '</span>' +
      '<span class="flex-1 min-w-0"><span class="block text-sm font-medium text-ink-900 truncate">' + esc(n.title) + '</span>' +
      '<span class="block text-xs text-ink-500 truncate">' + esc(n.message) + '</span></span>' +
      '<span class="text-xs text-ink-500 shrink-0">' + esc(CE.fmt.relative(n.created_at)) + '</span></a></li>';
  }

  function showRecent() {
    var newest = CE.notifs.items.slice(0, 5);
    $('#recent').html(newest.length ? newest.map(recentLine).join('') : '<li class="px-6 py-6 text-sm text-ink-500">No notifications yet.</li>');
  }

  // ---------- loading ----------

  // Redraw only when a number changed, so the page does not flicker every minute
  function show(d) {
    var stats = readStats(d);
    var text = JSON.stringify(stats);
    if (text !== last) {
      showTiles(stats);
      showCharts(stats);
      showTable(stats);
      last = text;
    }
    showRecent();
    $('#updated').text('Updated ' + new Date().toLocaleTimeString());
  }

  function showLoading() {
    last = '';
    $('#kpis').html('<div class="skeleton h-32"></div>'.repeat(8));
    $('#chart-growth, #chart-events, #chart-users, #chart-content').html('<div class="skeleton h-48"></div>');
  }

  function showError(err) {
    $('#updated').text('');
    $('#chart-growth, #chart-events, #chart-users, #chart-content').empty();
    ui.errorState($('#kpis'), err, start);
  }

  // Get the numbers and the notifications together
  function load() {
    var notifications = CE.notifs.load(true).catch(function () { });
    return Promise.all([CE.api.get('/dashboard/admin'), notifications])
      .then(function (results) { show(results[0].data); });
  }

  function start() {
    showLoading();
    load().catch(showError);
  }

  function refresh() {
    ui.busy($('#refresh'), true, 'Refreshing…');
    load().catch(CE.handleError).finally(function () { ui.busy($('#refresh'), false); });
  }

  // Once a minute, unless the tab is hidden. The old numbers stay if it fails
  function autoRefresh() {
    if (!document.hidden) load().catch(function () { });
  }

  function setTimer() {
    clearInterval(timer);
    if ($('#auto').is(':checked')) timer = setInterval(autoRefresh, 60000);
  }

  CE.ready(function () {
    CE.adminShell('overview');
    start();
    setTimer();
    $('#refresh').on('click', refresh);
    $('#auto').on('change', setTimer);
  });
})(jQuery, window.CE);
