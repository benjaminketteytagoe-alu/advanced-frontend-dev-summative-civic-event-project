// Home page: a landing page for visitors, a dashboard for people who are logged in
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, num = CE.num;

  var regs = {};   // event id to registered or cancelled
  var player;      // the one audio player all the cards share

  // ---------- visitors ----------

  function showLanding() {
    var names = ['Kwame', 'Abena', 'Jonas', 'Sika', 'Rafael'];
    var faces = names.map(function (name) {
      return '<img src="' + CE.dice.avatar(name) + '" alt="" class="w-10 h-10 rounded-full ring-4 ring-paper bg-paper-200">';
    });
    $('#hero-avatars').html(faces.join(''));
    $('#hero-cover-1').attr('src', CE.dice.cover('riverside-cleanup'));
    $('#hero-cover-2').attr('src', CE.dice.cover('town-hall-budget'));
  }

  // ---------- greeting ----------

  function greeting() {
    var hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function showGreeting() {
    var user = CE.auth.user();
    var firstName = (user.full_name || '').split(' ')[0];
    $('#greeting').text(greeting() + ', ' + firstName);
    $('#today-label').text(CE.fmt.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }));
    $('#me-avatar').attr('src', CE.dice.avatar(user.id));
    ui.setTitle('Home');
  }

  // ---------- the four numbers ----------

  function tile(t, i) {
    return '<a href="' + t.link + '" class="card card-hover focus-brackets p-5 flex flex-col gap-4 reveal" style="--d:' + (i * 70) + 'ms">' +
      '<span class="grid place-items-center w-10 h-10 rounded-xl ' + t.colour + '">' + icon(t.icon, 'w-5 h-5') + '</span>' +
      '<span><span class="block font-display text-4xl text-ink-900 count-up js-number" data-to="' + num(t.value) + '" data-odo-key="home-' + i + '">0</span>' +
      '<span class="block text-sm text-ink-600 mt-1">' + esc(t.label) + '</span></span></a>';
  }

  // Admins do not register for events, so they get their feedback count
  function firstTile(d) {
    if (CE.guard.role() === 'admin') {
      return { label: 'Feedback given', value: d.feedbacks.total_feedbacks, icon: 'ticket', colour: 'bg-ink-900 text-white', link: 'events.html' };
    }
    return { label: 'Events registered', value: d.registrations.total_registered_events, icon: 'ticket', colour: 'bg-ink-900 text-white', link: 'my-registrations.html' };
  }

  // Read notifications are kept in this browser, so count them here once they are loaded
  function unread(d) {
    return CE.notifs.loaded ? CE.notifs.unread() : d.notifications.unread_notifications;
  }

  function showStats(d) {
    var tiles = [
      firstTile(d),
      { label: 'Unread notifications', value: unread(d), icon: 'bell', colour: 'bg-ember-100 text-ember-700', link: 'notifications.html' },
      { label: 'Announcements', value: d.announcements.total_announcements, icon: 'megaphone', colour: 'bg-paper-200 text-ink-700', link: 'announcements.html' },
      { label: 'Promos', value: d.promos.total_promos, icon: 'film', colour: 'bg-moss-100 text-moss-700', link: 'promos.html' }
    ];
    $('#my-stats').html(tiles.map(tile).join(''));
    $('#my-stats .js-number').each(function () { CE.fx.odometer($(this), $(this).data('to')); }); // rolling numbers
    ui.reveal($('#my-stats'));
  }

  function loadStats() {
    var bar = '<div class="skeleton h-36"></div>';
    $('#my-stats').html(bar + bar + bar + bar);
    CE.api.get('/dashboard/me')
      .then(function (reply) { showStats(reply.data); })
      .catch(function (err) { ui.errorState($('#my-stats'), err, loadStats); });
  }

  // The bell changed, so the second number changes too
  function updateUnread(count) {
    var $number = $('#my-stats .js-number').eq(1);
    if ($number.length) CE.fx.odometer($number, count);
  }

  // ---------- next events ----------

  // Not finished yet, soonest first, three at most
  function nextEvents(list) {
    var coming = CE.data.visible(list).filter(function (e) { return !CE.views.isPast(e); });
    coming.sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
    return coming.slice(0, 3);
  }

  function showEvents(list) {
    var $box = $('#up-events');
    if (list.length) {
      $box.html(list.map(function (e) { return CE.views.eventCard(e, { registrations: regs }); }).join(''));
    } else {
      var button = '';
      if (CE.guard.can('event:create')) button = '<a href="event-form.html" class="btn btn-primary">Create an event</a>';
      $box.html(ui.empty('No upcoming events yet', 'Check back soon. New events are announced in your notifications.', button, 'calendar'));
    }
    $box.attr('aria-busy', 'false');
    ui.stagger($box.find('.reveal'), 90); // cards appear one after another
    ui.reveal($box);
  }

  // Which events this person is going to. Without it we only lose the Registered labels
  function getRegs() {
    if (!CE.guard.can('event:register')) return null;
    return CE.data.myRegistrations()
      .then(function (list) { list.forEach(function (r) { regs[r.event_id] = r.status; }); })
      .catch(function () { });
  }

  function loadEvents() {
    $('#up-events').html(ui.skeletonCards(3));
    Promise.all([CE.data.events(), getRegs()])
      .then(function (results) { showEvents(nextEvents(results[0])); })
      .catch(function (err) { ui.errorState($('#up-events'), err, loadEvents); });
  }

  // ---------- newest announcements ----------

  function showAnns(list) {
    var $box = $('#home-ann');
    player.pause(); // the old cards are about to go
    if (list.length) $box.html(list.map(function (a) { return CE.views.announcementCard(a); }).join(''));
    else $box.html(ui.empty('No announcements yet', 'Audio updates will appear here.', '', 'megaphone'));
    CE.views.lazyDurations($box); // read each length from its audio file
    ui.stagger($box.find('.reveal'), 80);
    ui.reveal($box);
  }

  function loadAnns() {
    $('#home-ann').html(ui.skeletonCards(3, 'row'));
    CE.data.announcements()
      .then(function (list) { showAnns(CE.data.visible(list).slice(0, 3)); })
      .catch(function (err) { ui.errorState($('#home-ann'), err, loadAnns); });
  }

  // ---------- newest promo ----------

  function showPromo(promo) {
    var $box = $('#home-promo');
    $box.html(promo ? CE.views.promoCard(promo) : ui.empty('No promos yet', 'Community videos will appear here.', '', 'film'));
    CE.views.lazyVideos($box); // load the thumbnail only when it scrolls into view
    ui.reveal($box);
  }

  function loadPromo() {
    $('#home-promo').html(ui.skeletonCards(1));
    CE.data.promos()
      .then(function (list) { showPromo(CE.data.visible(list)[0]); })
      .catch(function (err) { ui.errorState($('#home-promo'), err, loadPromo); });
  }

  // ---------- buttons on the cards ----------

  function register() {
    CE.actions.toggleRegistration($(this), function (id, status) {
      regs[id] = status;
      loadStats();
    });
  }

  function remove($button, kind, name, reload) {
    CE.actions.remove({
      action: kind + ':delete',
      path: '/' + name + '/' + $button.attr('data-id'),
      title: $button.attr('data-title'),
      cacheKey: name,
      $card: $button.closest('article'),
      after: function () { reload(); loadStats(); }
    });
  }

  function showDashboard() {
    player = CE.views.inlineAudio($('#home-ann'));
    showGreeting();
    loadStats();
    loadEvents();
    loadAnns();
    loadPromo();

    CE.notifs.on(updateUnread);
    $('#up-events').on('click', '.js-reg', register);
    $('#up-events').on('click', '.js-del-event', function () { remove($(this), 'event', 'events', loadEvents); });
    $('#home-ann').on('click', '.js-del-ann', function () { remove($(this), 'announcement', 'announcements', loadAnns); });
    $('#home-promo').on('click', '.js-del-promo', function () { remove($(this), 'promo', 'promos', loadPromo); });
  }

  // Start
  CE.ready(function () {
    if (CE.auth.isLoggedIn()) showDashboard();
    else showLanding();
  });
})(jQuery, window.CE);
