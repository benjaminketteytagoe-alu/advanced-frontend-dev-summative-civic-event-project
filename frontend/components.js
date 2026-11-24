// Pieces that several pages share: cards, buttons that act, form parts, captions and the admin menu.
// Loaded after app.js. Buttons are only drawn when CE.guard.can says the person may use them
(function ($, CE) {
  'use strict';
  var esc = CE.esc, fmt = CE.fmt, icon = CE.icon, ui = CE.ui, can = CE.guard.can;

  // ---------- events ----------

  // An event with no date is never past
  function isPast(e) {
    var end = e.ends_at || e.starts_at;
    return !!end && new Date(end) < new Date();
  }

  function eventImage(e) {
    return e.metadata && e.metadata.image_url ? CE.mediaUrl(e.metadata.image_url) : '';
  }

  // ---------- small parts of the cards ----------

  function pageLink(page, x) { return page + '.html?id=' + encodeURIComponent(x.id); }

  function editButton(page, x) {
    return '<a href="' + pageLink(page, x) + '" class="icon-btn border border-paper-300 bg-white" aria-label="Edit ' + esc(x.title) + '">' + icon('edit', 'w-4 h-4') + '</a>';
  }

  function deleteButton(className, x) {
    return '<button type="button" class="icon-btn border border-paper-300 bg-white text-ember-700 ' + className + '" data-id="' + esc(x.id) + '"' +
      ' data-title="' + esc(x.title) + '" aria-label="Delete ' + esc(x.title) + '">' + icon('trash', 'w-4 h-4') + '</button>';
  }

  function draftBadge(x) {
    return x.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '';
  }

  function titleLink(href, x, search) {
    return '<a href="' + href + '" class="hover:text-ember-700 transition">' + ui.highlight(x.title, search) + '</a>';
  }

  // ---------- event card ----------

  // The words and icon inside the register button
  function regText(on) {
    return on ? icon('check', 'w-4 h-4') + '<span>Registered</span>' : icon('ticket', 'w-4 h-4') + '<span>Register</span>';
  }

  function regButton(e, on) {
    return '<button type="button" class="btn btn-sm ' + (on ? 'btn-success' : 'btn-primary') + ' js-reg" data-id="' + esc(e.id) + '"' +
      ' data-state="' + (on ? 'registered' : 'none') + '" aria-pressed="' + on + '">' + regText(on) + '</button>';
  }

  function eventButtons(e, going) {
    var html = '<a href="' + pageLink('event', e) + '" class="btn btn-ghost btn-sm">' + icon('eye', 'w-4 h-4') + 'View</a>';
    if (can('event:register') && !isPast(e)) html += regButton(e, going);
    if (can('event:edit')) html += editButton('event-form', e);
    if (can('event:delete')) html += deleteButton('js-del-event', e);
    return html;
  }

  function eventBadges(e, going) {
    var html = draftBadge(e);
    if (isPast(e)) html = '<span class="badge badge-muted">Past event</span>' + html;
    if (going) html += '<span class="badge badge-moss">' + icon('check', 'w-3 h-3') + 'Going</span>';
    return '<span class="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">' + html + '</span>';
  }

  function eventDate(e) {
    var s = fmt.stub(e.starts_at);
    return '<span class="absolute left-4 bottom-4 date-stub shadow-lift">' +
      '<span class="text-[10px] tracking-[.2em] text-ember-200 font-semibold">' + esc(s.mon) + '</span>' +
      '<span class="font-display text-2xl leading-none">' + esc(s.day) + '</span>' +
      '<span class="text-[10px] text-ink-300">' + esc(s.wk) + '</span></span>';
  }

  // Uses generated art when there is no image, or when it fails to load
  function eventPicture(e) {
    var art = CE.dice.cover(e.id);
    return '<img class="zoom w-full h-full object-cover ' + (isPast(e) ? 'grayscale-[40%]' : '') + '" src="' + esc(eventImage(e) || art) + '" alt="" loading="lazy"' +
      ' onerror="this.onerror=null;this.src=\'' + art + '\'">' +
      '<span class="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent"></span>';
  }

  function eventFacts(e, search) {
    var time = fmt.time(e.starts_at) || 'TBA';
    if (e.ends_at) time += '–' + fmt.time(e.ends_at);
    return '<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 mb-2">' +
      '<span class="inline-flex items-center gap-1">' + icon('clock', 'w-3.5 h-3.5') + esc(time) + '</span>' +
      '<span class="inline-flex items-center gap-1 min-w-0">' + icon('pin', 'w-3.5 h-3.5 shrink-0') +
      '<span class="truncate">' + ui.highlight(e.location || 'Location TBA', search) + '</span></span></p>';
  }

  // options: q is the search text to highlight, registrations says who is going
  function eventCard(e, options) {
    options = options || {};
    var going = !!options.registrations && options.registrations[e.id] === 'registered';
    var href = pageLink('event', e);
    return '<article class="event-card tilt relative card card-hover overflow-hidden flex flex-col reveal" data-id="' + esc(e.id) + '">' +
      '<a href="' + href + '" class="relative block h-48 overflow-hidden bg-ink-900" tabindex="-1" aria-hidden="true">' +
      eventPicture(e) + eventDate(e) + eventBadges(e, going) + '</a>' +
      '<div class="p-5 flex-1 flex flex-col">' + eventFacts(e, options.q) +
      '<h3 class="font-display text-xl leading-snug text-ink-900 mb-2 break-words">' + titleLink(href, e, options.q) + '</h3>' +
      '<p class="text-sm text-ink-600 clamp-2 mb-5">' + ui.highlight(e.description || 'No description yet.', options.q) + '</p>' +
      '<div class="mt-auto flex flex-wrap items-center gap-2">' + eventButtons(e, going) + '</div></div></article>';
  }

  // ---------- announcement card ----------

  function annPicture(a) {
    return '<div class="relative shrink-0">' +
      '<img src="' + CE.dice.rings(a.id) + '" alt="" class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-card" loading="lazy">' +
      '<button type="button" class="js-play absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/95 text-ink-900 grid place-items-center shadow-lift transition hover:scale-110"' +
      ' aria-label="Play ' + esc(a.title) + '">' + icon('play', 'w-5 h-5 ml-0.5') + '</button></div>';
  }

  function annFacts(a) {
    return '<div class="flex flex-wrap items-center gap-2 mb-1.5">' +
      '<span class="eq text-ember-600" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<span class="text-xs text-ink-500">' + esc(fmt.date(a.created_at)) + '</span>' +
      '<span class="text-xs font-mono text-ink-600 js-dur">––:––</span>' + draftBadge(a) + '</div>';
  }

  function annButtons(a) {
    var html = '<a href="' + pageLink('announcement', a) + '" class="icon-btn border border-paper-300 bg-white" aria-label="Open ' + esc(a.title) + '">' + icon('arrowRight', 'w-4 h-4') + '</a>';
    if (can('announcement:edit')) html += editButton('announcement-form', a);
    if (can('announcement:delete')) html += deleteButton('js-del-ann', a);
    return '<div class="flex flex-col sm:flex-row gap-2 shrink-0">' + html + '</div>';
  }

  function announcementCard(a, options) {
    options = options || {};
    return '<article class="ann-card card card-hover p-5 flex gap-4 items-center reveal" data-src="' + esc(CE.mediaUrl(a.audio_url)) + '">' +
      annPicture(a) + '<div class="min-w-0 flex-1">' + annFacts(a) +
      '<h3 class="font-display text-lg sm:text-xl leading-snug text-ink-900 truncate">' + titleLink(pageLink('announcement', a), a, options.q) + '</h3>' +
      '<div class="mt-2 h-1 rounded-full bg-paper-200 overflow-hidden"><span class="js-prog block h-full w-0 bg-ember-500 transition-[width] duration-200"></span></div></div>' +
      annButtons(a) + '</article>';
  }

  // Read the length of each audio file, because the database does not store it
  function lazyDurations($root) {
    $root.find('.ann-card').each(function () {
      var $text = $(this).find('.js-dur');
      var audio = new Audio();
      audio.preload = 'metadata'; // the details only, not the sound
      audio.onloadedmetadata = function () { $text.text(fmt.duration(audio.duration)); };
      audio.onerror = function () { $text.text('n/a'); };
      audio.src = $(this).attr('data-src');
    });
  }

  function showCardPlaying($card, on) {
    $card.toggleClass('is-playing', on);
    $card.find('.js-play')
      .attr('aria-label', (on ? 'Pause ' : 'Play ') + $card.find('h3').text())
      .html(icon(on ? 'pause' : 'play', on ? 'w-5 h-5' : 'w-5 h-5 ml-0.5'));
  }

  // One player for all the play buttons in a list, so only one can sound
  function inlineAudio($root) {
    var player = new Audio();
    var $card = $(); // the card that is playing

    function start($next) {
      player.pause();
      showCardPlaying($card, false);
      $card.find('.js-prog').css('width', 0);
      $card = $next;
      player.src = $card.attr('data-src');
      play();
    }

    function play() {
      player.play().catch(function (err) {
        if (err.name === 'AbortError') return; // another card was pressed first
        ui.toast('error', 'This audio couldn’t be played. Try opening the announcement.');
      });
    }

    function press() {
      var $pressed = $(this).closest('.ann-card');
      if ($pressed[0] !== $card[0]) return start($pressed);
      if (player.paused) play();
      else player.pause();
    }

    $(player)
      .on('play', function () { showCardPlaying($card, true); })
      .on('pause ended', function () { showCardPlaying($card, false); })
      .on('timeupdate', function () { $card.find('.js-prog').css('width', player.currentTime / player.duration * 100 + '%'); });
    $root.on('click', '.js-play', press);
    return player;
  }

  // ---------- promo card ----------

  // YouTube gives a picture. An uploaded video shows a frame, loaded later by lazyVideos
  function promoPicture(p, link) {
    if (!link) {
      return '<video class="js-thumb zoom absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700" muted playsinline preload="none"' +
        ' data-src="' + esc(CE.mediaUrl(p.video_url)) + '" aria-hidden="true" tabindex="-1"></video>';
    }
    if (!link.thumb) return '';
    return '<img src="' + esc(link.thumb) + '" alt="" class="zoom absolute inset-0 w-full h-full object-cover" loading="lazy" onerror="this.remove()">';
  }

  function promoBadges(p, link) {
    var html = '';
    if (link) html += '<span class="badge bg-white/90 text-ink-800">' + icon('external', 'w-3 h-3') + esc(link.label) + '</span>';
    if (p.caption_text) html += '<span class="badge bg-white/90 text-ink-800">' + icon('cc', 'w-3 h-3') + 'Captions</span>';
    return '<span class="absolute left-3 top-3 flex gap-1.5">' + html + draftBadge(p) + '</span>';
  }

  function promoButtons(p) {
    var html = '<a href="' + pageLink('promo', p) + '" class="btn btn-primary btn-sm">' + icon('play', 'w-3.5 h-3.5') + 'Watch</a>';
    if (can('promo:edit')) html += editButton('promo-form', p);
    if (can('promo:delete')) html += deleteButton('js-del-promo', p);
    return '<div class="mt-auto flex items-center gap-2">' + html + '</div>';
  }

  function promoCard(p, options) {
    options = options || {};
    var href = pageLink('promo', p), link = CE.videoLink(p.video_url);
    return '<article class="promo-card tilt relative card card-hover overflow-hidden flex flex-col reveal">' +
      '<a href="' + href + '" class="group relative block aspect-video overflow-hidden bg-ink-900" aria-label="Play ' + esc(p.title) + '">' +
      '<img src="' + CE.dice.glass(p.id) + '" alt="" class="absolute inset-0 w-full h-full object-cover opacity-80" loading="lazy">' + promoPicture(p, link) +
      '<span class="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent"></span>' +
      '<span class="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/95 text-ink-900 grid place-items-center shadow-lift transition duration-500 group-hover:scale-110">' + icon('play', 'w-6 h-6 ml-1') + '</span>' +
      promoBadges(p, link) + '</a>' +
      '<div class="p-5 flex-1 flex flex-col"><p class="text-xs text-ink-500 mb-1.5">' + esc(fmt.date(p.created_at)) + '</p>' +
      '<h3 class="font-display text-xl leading-snug text-ink-900 mb-2 break-words">' + titleLink(href, p, options.q) + '</h3>' +
      '<p class="text-sm text-ink-600 clamp-2 mb-5">' + ui.highlight(p.description || '', options.q) + '</p>' + promoButtons(p) + '</div></article>';
  }

  // Load the start of one video and show a frame of it
  function loadThumb(video) {
    video.preload = 'metadata';
    video.onloadeddata = function () { video.style.opacity = '1'; };
    video.src = video.getAttribute('data-src') + '#t=0.5'; // half a second in
  }

  // Load thumbnails only when they come near the screen
  function lazyVideos($root) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadThumb(entry.target);
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '200px' });
    $root.find('.js-thumb').each(function () { watcher.observe(this); });
    if (!CE.fx.reducedMotion()) playOnHover($root);
  }

  function playOnHover($root) {
    $root.find('.promo-card').on('mouseenter', function () {
      var video = $(this).find('video')[0];
      if (video && video.src) video.play().catch(function () { });
    }).on('mouseleave', function () {
      var video = $(this).find('video')[0];
      if (video) video.pause();
    });
  }

  // ---------- actions ----------

  function showReg($button, on) {
    $button.attr({ 'aria-pressed': String(on), 'data-state': on ? 'registered' : 'none' })
      .toggleClass('btn-success', on).toggleClass('btn-primary', !on).html(regText(on));
  }

  // The button changes at once, and changes back if saving fails
  function saveReg($button, on, onChange) {
    var id = $button.attr('data-id');
    showReg($button, on);
    $button.prop('disabled', true);
    CE.api.post('/event-registrations/' + (on ? 'register' : 'cancel'), { event_id: id })
      .then(function () {
        ui.toast('success', on ? 'You’re registered! We’ve saved your spot.' : 'Registration cancelled.');
        if (on) CE.fx.success();
        if (onChange) onChange(id, on ? 'registered' : 'cancelled');
      })
      .catch(function (err) {
        if (on && err.status === 409) return ui.toast('info', 'You’re already registered for this event.');
        showReg($button, !on);
        CE.handleError(err);
      })
      .finally(function () { $button.prop('disabled', false); });
  }

  // Register, or cancel after asking
  function toggleRegistration($button, onChange) {
    if (!can('event:register')) return ui.forbiddenModal('Only community members can register for events.');
    if ($button.attr('data-state') !== 'registered') return saveReg($button, true, onChange);
    ui.confirm({ title: 'Cancel your registration?', message: 'Your spot will be released for someone else.', confirmText: 'Cancel registration', danger: true })
      .then(function (yes) { if (yes) saveReg($button, false, onChange); });
  }

  // Fade a card out, then take it away
  function fadeOut($card, after) {
    $card.css({ transition: 'all .4s', opacity: 0, transform: 'scale(.96)' });
    setTimeout(function () {
      $card.remove();
      if (after) after();
    }, 400);
  }

  function deleteNow(o) {
    return CE.api.del(o.path)
      .then(function () {
        CE.cache.invalidate(o.cacheKey);
        ui.toast('success', '“' + o.title + '” was deleted.');
        if (o.$card) fadeOut(o.$card, o.after);
        return true;
      })
      .catch(function (err) { CE.handleError(err); return false; });
  }

  // Ask, then delete. Gives back true when it is gone.
  // o has: action, path, title, cacheKey, and for lists $card and after
  function remove(o) {
    if (!can(o.action)) { ui.forbiddenModal(); return Promise.resolve(false); }
    return ui.confirm({ title: 'Delete “' + o.title + '”?', message: 'This permanently removes it for everyone. This cannot be undone.', confirmText: 'Delete', danger: true })
      .then(function (yes) { return yes ? deleteNow(o) : false; });
  }

  // For announcements and promos. Events use a normal edit
  function setPublished(kind, id, on) {
    if (!can(kind + ':publish')) return Promise.reject(new CE.ApiError(403, 'You don’t have permission to do that.'));
    return CE.api.patch('/' + kind + 's/' + encodeURIComponent(id) + (on ? '/publish' : '/unpublish'))
      .then(function () { CE.cache.invalidate(kind + 's'); });
  }

  // ---------- form parts ----------

  // A file box that also accepts dropped files, and checks size and type before uploading.
  // o has: zone, input, kind (image, audio or video) and onChange
  function picker(o) {
    var $input = $(o.input), $zone = $(o.zone);
    ui.dropzone($zone, $input, function (file) {
      var problem = file ? ui.validateFile(file, o.kind) : '';
      ui.fieldError($input, problem);
      $zone.toggleClass('!border-[#b42318]', !!problem);
      if (problem) $input.val(''); // forget the bad file
      o.onChange(problem ? null : file);
    });
  }

  // Warn before leaving with unsaved changes. clean() means everything is saved
  function dirtyGuard($form) {
    var dirty = false;
    $form.on('input change', function () { dirty = true; });
    $(window).on('beforeunload', function (e) {
      if (dirty) e.preventDefault();
    });
    return { clean: function () { dirty = false; } };
  }

  // The upload bar. null hides it
  function progress($box, percent) {
    $box.toggleClass('hidden', percent === null);
    if (percent === null) return;
    $box.find('.progress').attr('aria-valuenow', percent).find('span').css('width', percent + '%');
    $box.find('.js-pct').text(percent < 100 ? 'Uploading… ' + percent + '%' : 'Processing on server…');
  }

  function fileMeta(file) {
    return '<span class="font-medium text-ink-900 truncate">' + esc(file.name) + '</span><span class="text-ink-500 shrink-0">' + fmt.bytes(file.size) + '</span>';
  }

  // ---------- captions ----------
  // The database stores captions as plain text. The browser needs WebVTT, a format with times,
  // so plain sentences are spread over the length of the video

  function isVtt(text) { return /-->/.test(text || ''); }

  // 00:01:05.500 or 01:05.500 becomes 65.5 seconds
  function toSeconds(text) {
    var parts = text.replace(',', '.').split(':').map(Number);
    var seconds = 0;
    parts.forEach(function (p) { seconds = seconds * 60 + p; });
    return seconds;
  }

  // 65.5 seconds becomes 00:01:05.500
  function toTime(seconds) { return new Date(seconds * 1000).toISOString().slice(11, 23); }

  // Read text that already has times. Blocks are separated by empty lines
  function vttCues(text) {
    var cues = [];
    text.replace(/\r/g, '').split(/\n\s*\n/).forEach(function (block) {
      var times = block.match(/([\d:.,]+)\s*-->\s*([\d:.,]+).*\n([\s\S]+)/);
      if (times) cues.push({ start: toSeconds(times[1]), end: toSeconds(times[2]), text: $.trim(times[3]) });
    });
    return cues;
  }

  // A new line, or a space after . ! or ? starts a new sentence
  function sentences(text) {
    return text.replace(/([.!?])\s+/g, '$1\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // Longer sentences get more time
  function spreadCues(text, duration) {
    var list = sentences(text);
    var seconds = duration > 0 && isFinite(duration) ? duration : list.length * 4; // a guess until the length is known
    var letters = list.join('').length;
    var start = 0;
    return list.map(function (s) {
      var end = start + seconds * s.length / letters;
      var cue = { start: start, end: end, text: s };
      start = end;
      return cue;
    });
  }

  // The caption lines, each with a start, an end and a text
  function cues(text, duration) {
    if (!text) return [];
    return isVtt(text) ? vttCues(text) : spreadCues(text, duration);
  }

  function toVtt(list) {
    var blocks = list.map(function (c) { return toTime(c.start) + ' --> ' + toTime(c.end) + '\n' + c.text; });
    return 'WEBVTT\n\n' + blocks.join('\n\n') + '\n';
  }

  // Put captions on a video, switched on
  function attach(video, text) {
    var list = cues(text, video.duration);
    $(video).find('track').remove();
    if (!list.length) return [];

    var file = new Blob([toVtt(list)], { type: 'text/vtt' });
    var track = document.createElement('track');
    track.kind = 'captions';
    track.srclang = 'en';
    track.label = 'English';
    track.default = true;
    track.src = URL.createObjectURL(file);
    video.appendChild(track);
    track.track.mode = 'showing';
    return list;
  }

  // ---------- admin menu ----------

  function menuLink(page, active) {
    var current = page.name === active ? ' aria-current="page"' : '';
    return '<a class="side-link shrink-0" href="' + page.href + '"' + current + '>' + icon(page.icon, 'w-4 h-4') + page.label + '</a>';
  }

  // The dark box on the left of every admin page. active is the page we are on
  function adminShell(active) {
    if (!can('dashboard:view')) return;
    var user = CE.auth.user();
    var pages = [
      { name: 'overview', href: 'admin.html', label: 'Overview', icon: 'chart' },
      { name: 'users', href: 'admin-users.html', label: 'Users', icon: 'users' },
      { name: 'content', href: 'admin-content.html', label: 'Content', icon: 'grid' },
      { name: 'requests', href: 'admin-requests.html', label: 'Requests', icon: 'message' },
      { name: 'notifications', href: 'admin-notifications.html', label: 'Notifications', icon: 'bell' }
    ];
    var create = [
      { href: 'event-form.html', label: 'New event', icon: 'calendar' },
      { href: 'announcement-form.html', label: 'New announcement', icon: 'megaphone' },
      { href: 'promo-form.html', label: 'New promo', icon: 'film' }
    ];
    var links = pages.map(function (p) { return menuLink(p, active); }).join('');
    var createLinks = create.map(function (p) { return menuLink(p, active); }).join('');

    $('#admin-side').html('<div class="lg:sticky lg:top-24 rounded-2xl bg-ink-950 text-white p-4 shadow-lift relative overflow-hidden">' +
      '<div aria-hidden="true" class="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-ember-600/30 blur-2xl"></div>' +
      '<div class="relative hidden lg:flex items-center gap-3 px-2 pb-4 mb-3 border-b border-white/10">' + ui.avatarImg(user.id, user.full_name, 'w-10 h-10') +
      '<div class="min-w-0"><p class="text-sm font-semibold truncate">' + esc(user.full_name) + '</p><p class="text-xs text-ember-200">Administrator</p></div></div>' +
      '<nav aria-label="Admin" class="relative flex lg:flex-col gap-1 overflow-x-auto -mx-1 px-1 pb-1 lg:pb-0">' + links + '</nav>' +
      '<p class="relative hidden lg:block eyebrow !text-ember-300 !text-[0.62rem] px-2 mt-6 mb-2">Create</p>' +
      '<div class="relative hidden lg:flex flex-col gap-1">' + createLinks + '</div></div>');
  }

  CE.views = {
    isPast: isPast, eventImage: eventImage,
    eventCard: eventCard, announcementCard: announcementCard, promoCard: promoCard,
    lazyVideos: lazyVideos, lazyDurations: lazyDurations, inlineAudio: inlineAudio
  };
  CE.actions = { toggleRegistration: toggleRegistration, remove: remove, setPublished: setPublished };
  CE.forms = { picker: picker, dirtyGuard: dirtyGuard, progress: progress, fileMeta: fileMeta };
  CE.captions = { isVtt: isVtt, cues: cues, attach: attach };
  CE.adminShell = adminShell;
})(jQuery, window.CE);
