/* =========================================================================
   Admin dashboard (ADMIN ONLY) — GET /api/dashboard/admin
   KPI tiles + four hand-built SVG charts (no chart library: HTML/Tailwind/
   jQuery only). Charts re-render whenever data changes (manual refresh or
   60-second auto-refresh). Every chart has hover tooltips, and all figures
   are also available as a table for screen-reader / keyboard users.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, num = CE.num;
  var timer = null, last = null;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- tooltip helper (one per figure) ---------- */
  function tip($host) {
    var $t = $host.find('.viz-tip');
    if (!$t.length) $t = $('<div class="viz-tip" role="status" aria-live="polite"></div>').appendTo($host);
    return {
      show: function (html, x, y) { $t.html(html).css({ left: x, top: y }).addClass('on'); },
      hide: function () { $t.removeClass('on'); }
    };
  }
  function nice(max) { if (max <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log10(max))); var n = Math.ceil(max / p); return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  // bar path with 4px rounded data-end, square at the baseline
  function vbar(x, y, w, h, r) { r = Math.min(r, w / 2, h); return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'; }
  function hbar(x, y, w, h, r) { r = Math.min(r, h / 2, w); return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + x + 'Z'; }

  /* ---------- 1. column chart: monthly sign-ups (single series → no legend) ---------- */
  function growthChart(rows) {
    var $h = $('#chart-growth');
    // fill the last 6 months, including empty ones
    var map = {}; (rows || []).forEach(function (r) { map[r.month] = num(r.new_users); });
    var months = [], d = new Date(); d.setDate(1);
    for (var i = 5; i >= 0; i--) {
      var m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      var key = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0');
      months.push({ key: key, label: m.toLocaleDateString(undefined, { month: 'short' }), full: m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), v: map[key] || 0 });
    }
    var W = 560, H = 240, L = 34, B = 26, T = 18, R = 8;
    var max = nice(Math.max.apply(null, months.map(function (m) { return m.v; })) || 1);
    var pw = W - L - R, ph = H - T - B, step = pw / months.length, bw = Math.min(46, step * 0.56);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full h-auto" role="img" aria-label="New members per month: ' + months.map(function (m) { return m.full + ' ' + m.v; }).join(', ') + '">';
    for (var g = 0; g <= 4; g++) {
      var gy = T + ph - (ph * g / 4);
      svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="var(--grid)" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="var(--axis)">' + Math.round(max * g / 4) + '</text>';
    }
    var peak = months.reduce(function (a, m, idx) { return m.v > months[a].v ? idx : a; }, 0);
    months.forEach(function (m, idx) {
      var h = ph * (m.v / max), x = L + step * idx + (step - bw) / 2, y = T + ph - h;
      svg += '<g class="col" tabindex="0" data-i="' + idx + '" aria-label="' + esc(m.full) + ': ' + m.v + ' new members">' +
        '<rect class="hit" x="' + (L + step * idx) + '" y="' + T + '" width="' + step + '" height="' + ph + '" fill="transparent"/>' +
        (m.v ? '<path class="bar grow-y" style="--d:' + idx * 70 + 'ms" d="' + vbar(x, y, bw, h, 4) + '" fill="var(--s1)"/>' : '<line x1="' + x + '" x2="' + (x + bw) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '" stroke="var(--s1)" stroke-width="2" opacity=".35"/>') +
        // direct label on the peak only (selective labelling)
        (idx === peak && m.v ? '<text x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle" font-size="12" font-weight="600" fill="#121a2e">' + m.v + '</text>' : '') +
        '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--axis)">' + esc(m.label) + '</text></g>';
    });
    svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '" stroke="#cbbd9f" stroke-width="1"/></svg>';
    $h.html(svg);
    var t = tip($h);
    $h.find('g.col').on('mouseenter focus', function () {
      var m = months[$(this).data('i')], r = this.getBoundingClientRect(), hr = $h[0].getBoundingClientRect();
      t.show('<strong>' + esc(m.full) + '</strong><br>' + m.v + ' new member' + (m.v === 1 ? '' : 's'), r.left - hr.left + r.width / 2, r.top - hr.top + 30);
    }).on('mouseleave blur', t.hide);
  }

  /* ---------- stacked horizontal bar with legend + direct labels ---------- */
  function stacked($h, parts, label, totalLabel) {
    var total = parts.reduce(function (s, p) { return s + p.v; }, 0);
    var W = 560, H = 54, gap = 2;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full h-auto" role="img" aria-label="' + esc(label + ': ' + parts.map(function (p) { return p.label + ' ' + p.v; }).join(', ')) + '">';
    if (!total) svg += '<rect x="0" y="8" width="' + W + '" height="38" rx="6" fill="var(--grid)"/>';
    var x = 0, visible = parts.filter(function (p) { return p.v > 0; });
    visible.forEach(function (p, i) {
      var w = (W - gap * (visible.length - 1)) * (p.v / total);
      var first = i === 0, lastSeg = i === visible.length - 1;
      var r = 6;
      // round only the outer ends
      var d = 'M' + (x + (first ? r : 0)) + ',8H' + (x + w - (lastSeg ? r : 0)) + (lastSeg ? 'Q' + (x + w) + ',8 ' + (x + w) + ',' + (8 + r) + 'V' + (46 - r) + 'Q' + (x + w) + ',46 ' + (x + w - r) + ',46' : 'V46') +
        'H' + (x + (first ? r : 0)) + (first ? 'Q' + x + ',46 ' + x + ',' + (46 - r) + 'V' + (8 + r) + 'Q' + x + ',8 ' + (x + r) + ',8' : 'V8') + 'Z';
      svg += '<g class="col" tabindex="0" data-i="' + parts.indexOf(p) + '" aria-label="' + esc(p.label) + ': ' + p.v + '"><path class="bar grow-x" style="--d:' + i * 120 + 'ms" d="' + d + '" fill="' + p.c + '"/>' +
        (w > 44 ? '<text x="' + (x + 10) + '" y="32" font-size="13" font-weight="700" fill="#fff">' + p.v + '</text>' : '') + '</g>';
      x += w + gap;
    });
    svg += '</svg>';
    var legend = '<ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">' + parts.map(function (p) {
      var pct = total ? Math.round(p.v / total * 100) : 0;
      return '<li class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm" style="background:' + p.c + '" aria-hidden="true"></span><span class="text-ink-700">' + esc(p.label) + '</span><span class="font-semibold text-ink-900">' + p.v + '</span><span class="text-ink-500">(' + pct + '%)</span></li>';
    }).join('') + '</ul>';
    $h.html('<p class="font-display text-4xl text-ink-900 mb-3"><span class="count-up" data-to="' + total + '">0</span> <span class="text-base font-sans text-ink-500">' + esc(totalLabel) + '</span></p>' + svg + legend);
    ui.countUp($h.find('.count-up'), total);
    var t = tip($h);
    $h.find('g.col').on('mouseenter focus', function () {
      var p = parts[$(this).data('i')], r = this.getBoundingClientRect(), hr = $h[0].getBoundingClientRect();
      t.show('<strong>' + esc(p.label) + '</strong><br>' + p.v + ' of ' + total + ' (' + (total ? Math.round(p.v / total * 100) : 0) + '%)', r.left - hr.left + r.width / 2, r.top - hr.top);
    }).on('mouseleave blur', t.hide);
  }

  /* ---------- horizontal bar list: content totals (single series) ---------- */
  function contentChart(rows) {
    var $h = $('#chart-content');
    var max = nice(Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1);
    var W = 560, rowH = 34, L = 120, R = 40, H = rows.length * rowH + 4;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full h-auto" role="img" aria-label="Platform totals: ' + rows.map(function (r) { return r.label + ' ' + r.v; }).join(', ') + '">';
    rows.forEach(function (r, i) {
      var y = i * rowH + 6, w = Math.max(r.v ? 3 : 0, (W - L - R) * (r.v / max));
      svg += '<g class="col" tabindex="0" data-i="' + i + '" aria-label="' + esc(r.label) + ': ' + r.v + '">' +
        '<rect class="hit" x="0" y="' + (y - 4) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
        '<text x="' + (L - 12) + '" y="' + (y + 16) + '" text-anchor="end" font-size="12" fill="#36476c">' + esc(r.label) + '</text>' +
        '<rect x="' + L + '" y="' + y + '" width="' + (W - L - R) + '" height="22" rx="4" fill="var(--grid)" opacity=".6"/>' +
        (w ? '<path class="bar grow-x" style="--d:' + i * 70 + 'ms" d="' + hbar(L, y, w, 22, 4) + '" fill="var(--s1)"/>' : '') +
        '<text x="' + (L + w + 8) + '" y="' + (y + 16) + '" font-size="12" font-weight="600" fill="#121a2e">' + r.v.toLocaleString() + '</text></g>';
    });
    $h.html(svg + '</svg>');
    var t = tip($h);
    $h.find('g.col').on('mouseenter focus', function () {
      var r = rows[$(this).data('i')], b = this.getBoundingClientRect(), hr = $h[0].getBoundingClientRect();
      t.show('<strong>' + esc(r.label) + '</strong><br>' + r.v.toLocaleString() + (r.note ? ' · ' + esc(r.note) : ''), b.left - hr.left + b.width / 2, b.top - hr.top + 8);
    }).on('mouseleave blur', t.hide);
  }

  /* ---------- KPI tiles ---------- */
  function kpi(label, value, sub, ic, tone, href, i) {
    return '<a href="' + href + '" class="card card-hover focus-brackets p-5 reveal" style="--d:' + i * 60 + 'ms">' +
      '<div class="flex items-start justify-between"><span class="text-sm text-ink-600">' + esc(label) + '</span><span class="grid place-items-center w-9 h-9 rounded-xl ' + tone + '">' + icon(ic, 'w-4 h-4') + '</span></div>' +
      '<p class="font-display text-4xl text-ink-900 mt-3 count-up" data-to="' + num(value) + '" data-odo-key="admin-' + esc(label) + '">0</p>' +
      '<p class="text-xs text-ink-500 mt-1">' + sub + '</p></a>';
  }

  function render(d) {
    var u = d.users || {}, e = d.events || {};
    var unread = CE.notifs.unread();
    var upcoming = num(e.upcoming_events), past = num(e.past_events), totalE = num(e.total_events);
    var ongoing = Math.max(0, totalE - upcoming - past);

    $('#kpis').html(
      kpi('Members', u.total_users, num(u.active_users) + ' active · ' + num(u.inactive_users) + ' disabled', 'users', 'bg-ink-900 text-white', 'admin-users.html', 0) +
      kpi('Events', totalE, upcoming + ' upcoming', 'calendar', 'bg-ember-100 text-ember-700', 'events.html', 1) +
      kpi('Registrations', d.registrations && d.registrations.total_registrations, 'across all events', 'ticket', 'bg-moss-100 text-moss-700', 'events.html', 2) +
      kpi('Feedback', d.feedbacks && d.feedbacks.total_feedback, 'reviews submitted', 'star', 'bg-paper-200 text-ink-700', 'events.html', 3) +
      kpi('Promos', d.promos && d.promos.total_promos, 'videos uploaded', 'film', 'bg-paper-200 text-ink-700', 'admin-content.html#promos', 4) +
      kpi('Announcements', d.announcements && d.announcements.total_announcements, 'audio briefings', 'megaphone', 'bg-paper-200 text-ink-700', 'admin-content.html#announcements', 5) +
      kpi('Notifications', d.notifications && d.notifications.total_notifications, 'sent in total', 'bell', 'bg-paper-200 text-ink-700', 'admin-notifications.html', 6) +
      kpi('Unread (you)', unread, 'in your inbox', 'inbox', 'bg-ember-100 text-ember-700', 'notifications.html', 7)
    );
    // rolling odometer digits; the key keeps the last value so the 60-second refresh rolls on from it
    $('#kpis .count-up').each(function () { CE.fx.odometer($(this), $(this).data('to')); });
    ui.reveal($('#kpis'));

    growthChart(d.user_growth);
    stacked($('#chart-events'), [
      { label: 'Upcoming', v: upcoming, c: 'var(--s1)' },
      { label: 'In progress', v: ongoing, c: 'var(--s2)' },
      { label: 'Past', v: past, c: 'var(--s3)' }
    ], 'Events by timing', 'events');
    stacked($('#chart-users'), [
      { label: 'Active', v: num(u.active_users), c: 'var(--s3)' },
      { label: 'Disabled', v: num(u.inactive_users), c: 'var(--s2)' }
    ], 'Member accounts', 'members');
    contentChart([
      { label: 'Registrations', v: num(d.registrations && d.registrations.total_registrations) },
      { label: 'Notifications', v: num(d.notifications && d.notifications.total_notifications) },
      { label: 'Events', v: totalE },
      { label: 'Feedback', v: num(d.feedbacks && d.feedbacks.total_feedback) },
      { label: 'Announcements', v: num(d.announcements && d.announcements.total_announcements) },
      { label: 'Promos', v: num(d.promos && d.promos.total_promos) }
    ]);

    // accessible table view of every figure
    var rows = [['Members (total)', u.total_users], ['Members (active)', u.active_users], ['Members (disabled)', u.inactive_users],
      ['Events (total)', totalE], ['Events (upcoming)', upcoming], ['Events (in progress)', ongoing], ['Events (past)', past],
      ['Registrations', d.registrations && d.registrations.total_registrations], ['Feedback', d.feedbacks && d.feedbacks.total_feedback],
      ['Promos', d.promos && d.promos.total_promos], ['Announcements', d.announcements && d.announcements.total_announcements],
      ['Notifications', d.notifications && d.notifications.total_notifications], ['Unread notifications (you)', unread]]
      .concat((d.user_growth || []).map(function (g) { return ['New members ' + g.month, g.new_users]; }));
    $('#stats-table').html('<table class="table w-full text-sm"><thead><tr><th scope="col">Metric</th><th scope="col" class="!text-right">Value</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th scope="row" class="font-normal text-left text-ink-700 px-4 py-2.5">' + esc(r[0]) + '</th><td class="text-right font-mono">' + num(r[1]).toLocaleString() + '</td></tr>'; }).join('') + '</tbody></table>');

    $('#updated').text('Updated ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  function renderRecent() {
    var list = CE.notifs.items.slice(0, 5);
    $('#recent').html(list.length ? list.map(function (n) {
      return '<li><a href="notifications.html?id=' + encodeURIComponent(n.id) + '" class="flex items-center gap-4 px-6 py-3.5 hover:bg-paper-100 transition">' +
        '<span class="grid place-items-center w-9 h-9 rounded-full bg-paper-200 text-ink-600">' + icon(CE.notifs.typeIcon(n.type), 'w-4 h-4') + '</span>' +
        '<span class="flex-1 min-w-0"><span class="block text-sm font-medium text-ink-900 truncate">' + esc(n.title) + '</span><span class="block text-xs text-ink-500 truncate">' + esc(n.message) + '</span></span>' +
        '<span class="text-xs text-ink-400 shrink-0">' + esc(CE.fmt.relative(n.created_at)) + '</span></a></li>';
    }).join('') : '<li class="px-6 py-6 text-sm text-ink-500">No notifications yet.</li>');
  }

  function load(silent) {
    if (!silent) {
      $('#kpis').html(new Array(9).join('<div class="skeleton h-32"></div>'));
      $('#chart-growth, #chart-events, #chart-users, #chart-content').html('<div class="skeleton h-48"></div>');
    }
    var $b = $('#refresh'); ui.busy($b, true, 'Refreshing…');
    Promise.all([CE.api.get('/dashboard/admin'), CE.notifs.load(true).catch(function () { return []; })]).then(function (res) {
      var d = res[0].data || {};
      var sig = JSON.stringify(d);
      if (!silent || sig !== last) render(d); // re-render only when the numbers changed
      last = sig;
      renderRecent();
    }).catch(function (err) {
      if (!silent) ui.errorState($('#kpis'), err, function () { load(); });
      else CE.handleError(err);
    }).finally(function () { ui.busy($b, false); });
  }

  function schedule() {
    clearInterval(timer);
    if ($('#auto').is(':checked')) timer = setInterval(function () { if (!document.hidden) load(true); }, 60000);
  }

  CE.ready(function () {
    CE.adminShell('overview');
    load();
    schedule();
    $('#refresh').on('click', function () { load(); });
    $('#auto').on('change', schedule);
  });
})(jQuery, window.CE);
