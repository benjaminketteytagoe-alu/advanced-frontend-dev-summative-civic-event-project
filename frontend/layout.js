// The header, the footer and the notification panel, and the code that starts every page.
// Loaded after ui.js
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, can = CE.guard.can, notifs = CE.notifs;

  var page = CE.pageName();

  // ---------- header ----------

  // start is how the page names of this part of the site begin
  function navLinks() {
    var links = [
      { href: 'events.html', label: 'Events', start: 'event' },
      { href: 'announcements.html', label: 'Announcements', start: 'announcement' },
      { href: 'promos.html', label: 'Promos', start: 'promo' }
    ];
    if (CE.guard.role() === 'user') {
      links.push({ href: 'my-registrations.html', label: 'My events', start: 'my-registrations' });
      links.push({ href: 'requests.html', label: 'Requests', start: 'requests' });
    }
    if (can('dashboard:view')) links.push({ href: 'admin.html', label: 'Dashboard', start: 'admin' });
    return links;
  }

  function isHere(link) { return page.indexOf(link.start) === 0; }
  function currentText(link) { return isHere(link) ? ' aria-current="page"' : ''; }

  function navLink(l) { return '<a class="nav-link" href="' + l.href + '"' + currentText(l) + '>' + l.label + '</a>'; }

  function mobileLink(l) {
    var colour = isHere(l) ? 'bg-white text-ink-900 shadow-card' : 'text-ink-700 hover:bg-white/70';
    return '<a class="px-3 py-2.5 rounded-xl font-medium ' + colour + '" href="' + l.href + '"' + currentText(l) + '>' + l.label + '</a>';
  }

  function logo() {
    return '<a href="index.html" class="flex items-center gap-2.5 shrink-0 group" aria-label="CivicEvents+ home">' +
      '<span class="relative grid place-items-center w-9 h-9 rounded-xl bg-ink-900 text-white shadow-card transition-transform duration-500 group-hover:rotate-[-8deg]">' +
      '<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 10 12 5l8 5M6 10v8M10 10v8M14 10v8M18 10v8M3.5 20h17"/></svg>' +
      '<span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ember-500 ring-2 ring-paper"></span></span>' +
      '<span class="font-display text-xl font-semibold text-ink-900 tracking-tight">Civic<span class="text-ember-600">Events+</span></span></a>';
  }

  function searchForm(id, classes) {
    var text = page === 'search.html' ? CE.param('q') : '';
    return '<form role="search" action="search.html" method="get" class="relative ' + classes + '">' +
      '<label for="' + id + '" class="sr-only">Search events, announcements and promos</label>' +
      '<span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">' + icon('search', 'w-4 h-4') + '</span>' +
      '<input id="' + id + '" name="q" type="search" value="' + esc(text) + '" placeholder="Search CivicEvents+" autocomplete="off"' +
      ' class="w-full rounded-full border border-paper-300 bg-white/80 py-2.5 pl-10 pr-12 text-sm placeholder:text-ink-400 focus:border-ink-400 focus:bg-white focus:ring-4 focus:ring-ink-100 transition">' +
      '<kbd class="hidden md:inline absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-400 border border-paper-300 rounded px-1.5 py-0.5">/</kbd></form>';
  }

  function bell() {
    return '<button type="button" id="bell-btn" class="icon-btn relative" aria-haspopup="dialog" aria-controls="notif-drawer" aria-label="Notifications">' +
      '<span class="bell-icon inline-block">' + icon('bell') + '</span><span id="bell-count" class="bell-badge" hidden>0</span></button>';
  }

  function menuLink(href, iconName, label) {
    return '<a role="menuitem" href="' + href + '">' + icon(iconName, 'w-4 h-4') + label + '</a>';
  }

  function userLinks() {
    if (CE.guard.role() !== 'user') return '';
    return menuLink('my-registrations.html', 'ticket', 'My registrations') + menuLink('requests.html', 'message', 'My requests');
  }

  function adminLinks() {
    if (!can('users:manage')) return '';
    return '<div class="my-1 border-t border-paper-200"></div><p class="px-3 pt-2 pb-1 eyebrow !text-[0.62rem]">Admin</p>' +
      menuLink('admin.html', 'chart', 'Dashboard') + menuLink('admin-users.html', 'users', 'Manage users') +
      menuLink('admin-content.html', 'grid', 'Manage content') + menuLink('admin-requests.html', 'message', 'Manage requests') +
      menuLink('admin-notifications.html', 'bell', 'Manage notifications');
  }

  function menuHead(user) {
    var admin = user.role === 'admin';
    return '<div class="px-3 py-3 mb-1 border-b border-paper-200"><p class="text-sm font-semibold text-ink-900 truncate">' + esc(user.full_name) + '</p>' +
      '<p class="text-xs text-ink-500 truncate">' + esc(user.email) + '</p>' +
      '<span class="badge ' + (admin ? 'badge-ember' : 'badge-ink') + ' mt-2">' + icon(admin ? 'shield' : 'user', 'w-3 h-3') + esc(user.role) + '</span></div>';
  }

  function profileMenu(user) {
    var firstName = user.full_name.split(' ')[0];
    return '<div class="relative" id="profile-menu-wrap">' +
      '<button type="button" id="profile-btn" class="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-white/80 transition" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu" aria-label="Account menu">' +
      ui.avatarImg(user.id, user.full_name, 'w-9 h-9') +
      '<span class="hidden xl:block text-sm font-medium text-ink-800 max-w-[9rem] truncate">' + esc(firstName) + '</span>' + icon('down', 'w-4 h-4 text-ink-500 hidden sm:block') + '</button>' +
      '<div id="profile-menu" class="menu" role="menu" aria-labelledby="profile-btn">' + menuHead(user) +
      menuLink('index.html', 'home', 'My dashboard') + menuLink('profile.html', 'user', 'My profile') + userLinks() +
      menuLink('notifications.html', 'inbox', 'Notifications') + adminLinks() +
      '<div class="my-1 border-t border-paper-200"></div>' +
      '<button role="menuitem" type="button" id="logout-btn" class="!text-ember-700">' + icon('logout', 'w-4 h-4') + 'Sign out</button></div></div>';
  }

  function mobileButton() {
    return '<button type="button" id="mobile-menu-btn" class="icon-btn lg:hidden" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">' + icon('menu') + '</button>';
  }

  function mobileMenu() {
    return '<div id="mobile-menu" class="lg:hidden hidden border-t border-paper-300/70 bg-paper/95 backdrop-blur"><div class="px-4 py-4 space-y-3">' +
      searchForm('mobile-search', 'md:hidden') + '<nav class="grid gap-1" aria-label="Mobile">' + navLinks().map(mobileLink).join('') + '</nav></div></div>';
  }

  function visitorHeader() {
    return logo() + '<div class="flex-1"></div><div class="flex items-center gap-1 sm:gap-2">' +
      '<a href="login.html" class="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</a><a href="signup.html" class="btn btn-primary btn-sm">Join free</a></div>';
  }

  function memberHeader() {
    return logo() + '<nav class="hidden lg:flex items-center gap-5" aria-label="Primary">' + navLinks().map(navLink).join('') + '</nav>' +
      '<div class="flex-1"></div>' + searchForm('global-search', 'hidden md:block w-44 xl:w-72') +
      '<div class="flex items-center gap-1 sm:gap-2">' + bell() + profileMenu(CE.auth.user()) + mobileButton() + '</div>';
  }

  function header() {
    var member = CE.auth.isLoggedIn();
    return '<header class="sticky top-0 z-50 border-b border-paper-300/70 bg-paper/80 backdrop-blur-md">' +
      '<div class="mx-auto max-w-page px-4 sm:px-6 h-16 flex items-center gap-4 lg:gap-6">' + (member ? memberHeader() : visitorHeader()) + '</div>' +
      (member ? mobileMenu() : '') + '</header>';
  }

  // ---------- footer ----------

  function footLink(href, label) { return '<li><a class="hover:text-white transition" href="' + href + '">' + label + '</a></li>'; }

  function footLine(iconName, text) { return '<li class="flex items-center gap-2">' + icon(iconName, 'w-4 h-4 text-ink-400') + text + '</li>'; }

  function footColumn(title, inside) { return '<div><p class="eyebrow !text-ember-300 mb-4">' + title + '</p>' + inside + '</div>'; }

  function footList(items) { return '<ul class="space-y-2.5 text-sm">' + items + '</ul>'; }

  function footAbout() {
    return '<div><p class="font-display text-2xl text-white mb-3">Civic<span class="text-ember-300">Events+</span></p>' +
      '<p class="text-sm leading-relaxed text-ink-300">Connecting residents with the town halls, clean-ups, workshops and festivals that shape our community.</p>' +
      '<p class="mt-5 inline-flex items-center gap-2 text-xs text-ink-300"><span id="api-dot" class="w-2 h-2 rounded-full bg-ink-500"></span><span id="api-status">Checking API…</span></p></div>';
  }

  function footer() {
    var mail = CE.config.SUPPORT_EMAIL;
    return '<footer class="mt-24 border-t border-paper-300/80 bg-ink-950 text-ink-200 relative overflow-hidden">' +
      '<div aria-hidden="true" class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-ember-600/20 blur-3xl"></div>' +
      '<div class="relative mx-auto max-w-page px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">' + footAbout() +
      footColumn('Explore', footList(footLink('events.html', 'Upcoming events') + footLink('announcements.html', 'Audio announcements') +
        footLink('promos.html', 'Video promos') + footLink('notifications.html', 'Notification inbox'))) +
      footColumn('Help &amp; contact', footList(footLine('mail', '<a class="hover:text-white transition" href="mailto:' + mail + '">' + mail + '</a>') +
        footLine('clock', 'Mon–Fri, 9:00–17:00') + footLine('pin', 'Civic Centre, Main Street') + footLink('profile.html', 'Account settings'))) +
      footColumn('Accessibility', '<p class="text-sm leading-relaxed text-ink-300">Audio announcements include keyboard-friendly controls and promos ship with captions on by default. ' +
        'Press <kbd class="font-mono text-xs border border-ink-700 rounded px-1">/</kbd> to search from anywhere.</p>') + '</div>' +
      '<div class="relative border-t border-white/10"><div class="mx-auto max-w-page px-4 sm:px-6 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-ink-400">' +
      '<p>© ' + new Date().getFullYear() + ' CivicEvents+. Built with HTML, Tailwind CSS &amp; jQuery.</p>' +
      '<p>Avatars &amp; artwork by <a class="underline underline-offset-2 hover:text-white" href="https://www.dicebear.com" target="_blank" rel="noopener">DiceBear</a></p></div></div></footer>';
  }

  // The light that says if the backend is running
  function showHealth() {
    CE.api.health().then(function (ok) {
      var host = CE.config.ORIGIN.replace(/^https?:\/\//, '');
      $('#api-dot').removeClass('bg-ink-500').addClass(ok ? 'bg-moss-500' : 'bg-ember-500');
      $('#api-status').text(ok ? 'API online · ' + host : 'API unreachable at ' + host);
    });
  }

  // ---------- profile and mobile menus ----------

  function setMenu(open) {
    $('#profile-menu').toggleClass('is-open', open);
    $('#profile-btn').attr('aria-expanded', String(open));
    if (open) setTimeout(function () { $('#profile-menu [role=menuitem]').first().trigger('focus'); }, 50);
  }

  function toggleMenu() { setMenu(!$('#profile-menu').hasClass('is-open')); }

  // Up and down move through the menu, Escape closes it
  function menuKeys(e) {
    var $items = $('#profile-menu [role=menuitem]');
    var step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      var next = ($items.index(document.activeElement) + step + $items.length) % $items.length;
      $items.eq(next).trigger('focus');
    }
    if (e.key === 'Escape') { setMenu(false); $('#profile-btn').trigger('focus'); }
    if (e.key === 'Tab') setMenu(false);
  }

  function clickOutside(e) {
    if (!$(e.target).closest('#profile-menu-wrap').length) setMenu(false);
  }

  function toggleMobile() {
    var open = $('#mobile-menu').hasClass('hidden');
    $('#mobile-menu').toggleClass('hidden', !open);
    $(this).attr({ 'aria-expanded': String(open), 'aria-label': open ? 'Close menu' : 'Open menu' }).html(icon(open ? 'x' : 'menu'));
  }

  // The / key goes to the search box, unless someone is typing
  function slashKey(e) {
    if (e.key !== '/' || $(e.target).is('input, textarea, select')) return;
    var $box = $('#global-search:visible, #mobile-search:visible').first();
    if (!$box.length) return;
    e.preventDefault();
    $box.trigger('focus');
  }

  // ---------- notification panel ----------

  var openId = null;   // the notification being read, or nothing for the list
  var before;          // where the keyboard was

  function panel() {
    return '<div id="notif-overlay" class="overlay"></div>' +
      '<aside id="notif-drawer" class="drawer" role="dialog" aria-modal="true" aria-labelledby="notif-title">' +
      '<div class="flex items-center justify-between px-5 h-16 border-b border-paper-300 shrink-0"><div class="flex items-center gap-2">' +
      '<button type="button" id="notif-back" class="icon-btn -ml-2" aria-label="Back to all notifications" hidden>' + icon('arrowLeft') + '</button>' +
      '<h2 id="notif-title" class="font-display text-xl text-ink-900">Notifications</h2></div>' +
      '<div class="flex items-center gap-1"><button type="button" id="notif-readall" class="btn btn-ghost btn-sm">' + icon('check', 'w-4 h-4') + 'Mark all read</button>' +
      '<button type="button" id="notif-close" class="icon-btn" aria-label="Close notifications">' + icon('x') + '</button></div></div>' +
      '<div id="notif-body" class="flex-1 overflow-y-auto"></div>' +
      '<div class="p-4 border-t border-paper-300 shrink-0"><a href="notifications.html" class="btn btn-primary w-full">Open inbox ' + icon('arrowRight', 'w-4 h-4') + '</a></div></aside>';
  }

  function panelItem(n) {
    var unread = !notifs.isRead(n);
    var dot = unread ? '<span class="w-2 h-2 rounded-full bg-ember-500 shrink-0"></span><span class="sr-only">Unread</span>' : '';
    return '<li><button type="button" class="notif-item w-full text-left px-5 py-4 flex gap-3 hover:bg-white/80 transition" data-id="' + esc(n.id) + '">' +
      '<span class="shrink-0 grid place-items-center w-10 h-10 rounded-full ' + (unread ? 'bg-ember-100 text-ember-700' : 'bg-paper-200 text-ink-500') + '">' + icon(notifs.typeIcon(n.type)) + '</span>' +
      '<span class="flex-1 min-w-0"><span class="flex items-center gap-2"><span class="text-sm truncate ' + (unread ? 'font-semibold text-ink-900' : 'font-medium text-ink-700') + '">' + esc(n.title) + '</span>' + dot + '</span>' +
      '<span class="block text-sm text-ink-600 clamp-2 mt-0.5">' + esc(n.message) + '</span>' +
      '<span class="block text-xs text-ink-500 mt-1.5">' + esc(fmt.relative(n.created_at)) + '</span></span></button></li>';
  }

  function listHtml() {
    if (!notifs.loaded) return '<div class="p-4 space-y-3">' + ui.skeletonCards(4, 'row') + '</div>';
    if (!notifs.items.length) return '<div class="p-6">' + ui.empty('You’re all caught up', 'New events, announcements and promos will appear here.', '', 'bell') + '</div>';
    return '<ul class="divide-y divide-paper-200">' + notifs.items.slice(0, 30).map(panelItem).join('') + '</ul>';
  }

  function detailHtml(n) {
    var link = notifs.link(n), buttons = '';
    if (link) buttons += '<a class="btn btn-primary" href="' + link.href + '">' + esc(link.label) + icon('arrowRight', 'w-4 h-4') + '</a>';
    if (can('notification:delete')) buttons += '<button type="button" id="notif-del" class="btn btn-danger">' + icon('trash', 'w-4 h-4') + 'Delete</button>';
    return '<article class="p-6 page-enter"><span class="badge badge-ember capitalize mb-4">' + icon(notifs.typeIcon(n.type), 'w-3 h-3') + esc(n.type) + '</span>' +
      '<h3 class="font-display text-2xl text-ink-900 mb-2 break-words">' + esc(n.title) + '</h3>' +
      '<p class="text-xs text-ink-500 mb-5">' + esc(fmt.dateTime(n.created_at)) + (n.recipient_id ? ' · Sent to you' : ' · Broadcast to everyone') + '</p>' +
      '<p class="text-ink-700 leading-relaxed whitespace-pre-line break-words">' + esc(n.message) + '</p><div class="mt-8 flex flex-wrap gap-2">' + buttons + '</div></article>';
  }

  // Draw the list, or the one being read
  function showPanel() {
    var n = notifs.items.filter(function (x) { return x.id === openId; })[0];
    $('#notif-back').prop('hidden', !n);
    $('#notif-title').text(n ? 'Notification' : 'Notifications');
    $('#notif-body').html(n ? detailHtml(n) : listHtml());
  }

  function readOne() {
    openId = $(this).attr('data-id');
    notifs.markRead(openId);
    showPanel();
    $('#notif-back').trigger('focus');
  }

  function backToList() {
    openId = null;
    showPanel();
    $('#notif-close').trigger('focus');
  }

  function readAll() {
    var ids = notifs.items.map(function (n) { return n.id; });
    if (notifs.markRead(ids)) ui.toast('success', 'All notifications marked as read.');
  }

  function removeOne() {
    var id = openId;
    ui.confirm({ title: 'Delete notification?', message: 'This removes it for every user. This cannot be undone.', confirmText: 'Delete', danger: true }).then(function (yes) {
      if (!yes) return;
      backToList();
      notifs.remove(id).then(function () { ui.toast('success', 'Notification deleted.'); }).catch(CE.handleError);
    });
  }

  function loadPanel() {
    notifs.load().then(showPanel).catch(function (err) { ui.errorState($('#notif-body'), err, loadPanel); });
  }

  function openPanel() {
    before = document.activeElement;
    openId = null;
    $('#notif-overlay, #notif-drawer').addClass('is-open');
    $('body').css('overflow', 'hidden'); // the page behind must not scroll
    showPanel();
    loadPanel();
    setTimeout(function () { $('#notif-close').trigger('focus'); }, 80);
  }

  function closePanel() {
    $('#notif-overlay, #notif-drawer').removeClass('is-open');
    $('body').css('overflow', '');
    before.focus();
  }

  function panelKeys(e) {
    if (e.key === 'Escape') closePanel();
    if (e.key === 'Tab') ui.trapFocus($('#notif-drawer'), e);
  }

  // ---------- the bell ----------

  var lastCount = 0;

  // Ring when there are more than before
  function showBell(count) {
    $('#bell-count').text(count > 99 ? '99+' : count).prop('hidden', count === 0);
    $('#bell-btn').attr('aria-label', count ? 'Notifications, ' + count + ' unread' : 'Notifications');
    $('.bell-icon').toggleClass('bell-ring', count > lastCount);
    lastCount = count;
    if ($('#notif-drawer').hasClass('is-open') && !openId) showPanel();
  }

  // ---------- starting ----------

  function connect() {
    $('#profile-btn').on('click', toggleMenu);
    $('#profile-menu').on('keydown', menuKeys);
    $('#logout-btn').on('click', CE.auth.logout);
    $('#mobile-menu-btn').on('click', toggleMobile);
    $('#bell-btn').on('click', openPanel);
    $('#notif-close, #notif-overlay').on('click', closePanel);
    $('#notif-back').on('click', backToList);
    $('#notif-readall').on('click', readAll);
    $('#notif-drawer').on('click', '.notif-item', readOne).on('click', '#notif-del', removeOne).on('keydown', panelKeys);
    $(document).on('click', clickOutside).on('keydown', slashKey);
    notifs.on(showBell);
  }

  function drawFrame() {
    $('body').prepend('<a href="#main" class="skip-link">Skip to main content</a>');
    $('body').append('<div id="toast-region" role="region" aria-live="polite" aria-label="Messages"></div>');
    $('#app-header').replaceWith(header());
    $('#app-footer').replaceWith(footer());
    if (CE.auth.isLoggedIn()) $('body').append(panel());
    connect();
    showHealth();
  }

  // The message kept by the page before
  function showFlash() {
    var kept = CE.flash.take();
    if (kept) setTimeout(function () { ui.toast(kept.type, kept.message); }, 250);
  }

  function loadBell() {
    if (!document.hidden) notifs.load().catch(function () { }); // the bell just stays as it was
  }

  // Keep the name and role up to date. A new role needs a new page
  function checkAccount() {
    CE.api.get('/users/profile/me').then(function (reply) {
      var oldRole = CE.auth.user().role;
      CE.auth.updateUser(reply.data);
      if (oldRole !== reply.data.role) window.location.reload();
    }).catch(function () { });
  }

  // What runs only for people who are logged in
  function startMember() {
    CE.auth.startEndTimer();
    notifs.load().catch(function () { });
    checkAccount();
    setInterval(loadBell, 60000); // every minute
  }

  function start() {
    var answer = CE.guard.checkPage();
    if (answer === 'leaving') return;

    drawFrame();
    CE.guard.applyRoles();
    showFlash();
    if (CE.auth.isLoggedIn()) startMember();
    if (answer === 'forbidden') return ui.forbiddenPage(); // the page's own script never runs

    $('#main').addClass('page-enter');
    CE.runPage();
    ui.reveal(document);
  }

  $(start);
})(jQuery, window.CE);
