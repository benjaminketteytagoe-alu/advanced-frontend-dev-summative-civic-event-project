/* =========================================================================
   Home — guest landing or personal dashboard (GET /api/dashboard/me)
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc;

  function guest() {
    var seeds = ['Kwame', 'Abena', 'Jonas', 'Sika', 'Rafael'];
    $('#hero-avatars').html(seeds.map(function (s) { return '<img src="' + CE.dice.avatar(s) + '" alt="" class="w-10 h-10 rounded-full ring-4 ring-paper bg-paper-200">'; }).join(''));
    $('#hero-cover-1').attr('src', CE.dice.cover('riverside-cleanup'));
    $('#hero-cover-2').attr('src', CE.dice.cover('town-hall-budget'));
  }

  function statTile(label, value, ic, tone, href, i) {
    return '<a href="' + href + '" class="card card-hover focus-brackets p-5 flex flex-col gap-4 reveal" style="--d:' + (i * 70) + 'ms">' +
      '<span class="grid place-items-center w-10 h-10 rounded-xl ' + tone + '">' + icon(ic, 'w-5 h-5') + '</span>' +
      '<span><span class="block font-display text-4xl text-ink-900 count-up" data-to="' + CE.num(value) + '" data-odo-key="home-' + i + '">0</span>' +
      '<span class="block text-sm text-ink-600 mt-1">' + esc(label) + '</span></span></a>';
  }

  function dashboard() {
    var u = CE.auth.user();
    var h = new Date().getHours();
    $('#greeting').text((h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + (u.full_name || '').split(' ')[0]);
    $('#today-label').text(CE.fmt.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }));
    $('#me-avatar').attr('src', CE.dice.avatar(u.id || u.email));
    ui.setTitle('Home');

    // --- stats
    var $stats = $('#my-stats').html('<div class="skeleton h-36"></div><div class="skeleton h-36"></div><div class="skeleton h-36"></div><div class="skeleton h-36"></div>');
    function renderStats(d) {
      d = d || {};
      var unread = CE.notifs.loaded ? CE.notifs.unread() : CE.num(d.notifications && d.notifications.unread_notifications);
      $stats.html(
        statTile(CE.guard.role() === 'admin' ? 'Feedback given' : 'Events registered', CE.guard.role() === 'admin' ? (d.feedbacks && d.feedbacks.total_feedbacks) : (d.registrations && d.registrations.total_registered_events), 'ticket', 'bg-ink-900 text-white', CE.guard.role() === 'admin' ? 'events.html' : 'my-registrations.html', 0) +
        statTile('Unread notifications', unread, 'bell', 'bg-ember-100 text-ember-700', 'notifications.html', 1) +
        statTile('Announcements', d.announcements && d.announcements.total_announcements, 'megaphone', 'bg-paper-200 text-ink-700', 'announcements.html', 2) +
        statTile('Promos', d.promos && d.promos.total_promos, 'film', 'bg-moss-100 text-moss-700', 'promos.html', 3)
      );
      $stats.find('.count-up').each(function () { CE.fx.odometer($(this), $(this).data('to')); });
      ui.reveal($stats);
    }
    function loadStats() {
      CE.api.get('/dashboard/me').then(function (r) { renderStats(r.data); })
        .catch(function (e) { ui.errorState($stats, e, loadStats); });
    }
    loadStats();
    CE.notifs.on(function (count) { var $n = $stats.find('.count-up').eq(1); if ($n.length) CE.fx.odometer($n, count); /* rolls on from the last value */ });

    // --- upcoming events
    var $up = $('#up-events').html(ui.skeletonCards(3));
    function loadEvents() {
      var regs = CE.guard.can('event:register') ? CE.data.myRegistrations().catch(function () { return []; }) : Promise.resolve([]);
      Promise.all([CE.data.events(), regs]).then(function (res) {
        var regMap = {}; res[1].forEach(function (r) { regMap[r.event_id] = r.status; });
        var now = new Date();
        var list = CE.data.visible(res[0]).filter(function (e) { return new Date(e.ends_at || e.starts_at) >= now; })
          .sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); }).slice(0, 3);
        $up.attr('aria-busy', 'false').html(list.length ? list.map(function (e) { return CE.views.eventCard(e, { registrations: regMap }); }).join('')
          : ui.empty('No upcoming events yet', 'Check back soon — new events are announced in your notifications.', CE.guard.can('event:create') ? '<a href="event-form.html" class="btn btn-primary">Create an event</a>' : '', 'calendar'));
        ui.stagger($up.find('.reveal'), 90); ui.reveal($up);
      }).catch(function (e) { ui.errorState($up, e, loadEvents); });
    }
    loadEvents();
    $up.on('click', '.js-reg', function () { CE.actions.toggleRegistration($(this)); });
    $up.on('click', '.js-del-event', function () {
      var $b = $(this);
      CE.actions.remove({ action: 'event:delete', path: '/events/' + $b.data('id'), title: $b.data('title'), cacheKey: 'events', $card: $b.closest('.event-card') });
    });

    // --- announcements
    var $ann = $('#home-ann').html(ui.skeletonCards(3, 'row'));
    CE.views.inlineAudio($ann);
    function loadAnn() {
      CE.data.announcements().then(function (list) {
        list = CE.data.visible(list).slice(0, 3);
        $ann.html(list.length ? list.map(function (a) { return CE.views.announcementCard(a); }).join('') : ui.empty('No announcements yet', 'Audio updates will appear here.', '', 'megaphone'));
        CE.views.lazyDurations($ann); ui.stagger($ann.find('.reveal'), 80); ui.reveal($ann);
      }).catch(function (e) { ui.errorState($ann, e, loadAnn); });
    }
    loadAnn();
    $ann.on('click', '.js-del-ann', function () {
      var $b = $(this);
      CE.actions.remove({ action: 'announcement:delete', path: '/announcements/' + $b.data('id'), title: $b.data('title'), cacheKey: 'announcements', $card: $b.closest('.ann-card') });
    });

    // --- featured promo
    var $pr = $('#home-promo').html(ui.skeletonCards(1));
    function loadPromo() {
      CE.data.promos().then(function (list) {
        list = CE.data.visible(list);
        $pr.html(list.length ? CE.views.promoCard(list[0]) : ui.empty('No promos yet', 'Community videos will appear here.', '', 'film'));
        CE.views.lazyVideos($pr); ui.reveal($pr);
      }).catch(function (e) { ui.errorState($pr, e, loadPromo); });
    }
    loadPromo();
    $pr.on('click', '.js-del-promo', function () {
      var $b = $(this);
      CE.actions.remove({ action: 'promo:delete', path: '/promos/' + $b.data('id'), title: $b.data('title'), cacheKey: 'promos', $card: $b.closest('.promo-card'), after: loadPromo });
    });
  }

  CE.ready(function () {
    if (CE.auth.isLoggedIn()) dashboard(); else guest();
  });
})(jQuery, window.CE);
