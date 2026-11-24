/* =========================================================================
   CivicEvents+ — shared view components & actions
   Card templates for events / announcements / promos and the actions they
   trigger (register, cancel, delete, publish). Loaded after app.js.

   ROLE GUARDS: every admin or user-only control below is wrapped in
   CE.guard.can('<action>') so it is never rendered for the wrong role.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var esc = CE.esc, fmt = CE.fmt, icon = CE.icon, ui = CE.ui, guard = CE.guard;

  function isPast(ev) { var e = new Date(ev.ends_at || ev.starts_at); return !isNaN(e) && e < new Date(); }
  function eventImage(ev) { return (ev.metadata && ev.metadata.image_url) ? CE.mediaUrl(ev.metadata.image_url) : ''; }

  var views = {
    isPast: isPast,
    eventImage: eventImage,

    /* ---------------- EVENT CARD ---------------- */
    eventCard: function (ev, opts) {
      opts = opts || {};
      var s = fmt.stub(ev.starts_at), img = eventImage(ev), cover = CE.dice.cover(ev.id);
      var reg = opts.registrations && opts.registrations[ev.id];
      var past = isPast(ev);
      var href = 'event.html?id=' + encodeURIComponent(ev.id);
      var actions = '<a href="' + href + '" class="btn btn-ghost btn-sm">' + icon('eye', 'w-4 h-4') + 'View</a>';

      // USER-ONLY: register / cancel (guard.can('event:register'))
      if (guard.can('event:register') && !past) {
        actions += reg === 'registered'
          ? '<button type="button" class="btn btn-sm btn-success js-reg" data-id="' + esc(ev.id) + '" data-state="registered" aria-pressed="true">' + icon('check', 'w-4 h-4') + '<span>Registered</span></button>'
          : '<button type="button" class="btn btn-sm btn-primary js-reg" data-id="' + esc(ev.id) + '" data-state="none" aria-pressed="false">' + icon('ticket', 'w-4 h-4') + '<span>Register</span></button>';
      }
      // ADMIN-ONLY: edit / delete (guard.can('event:edit'|'event:delete'))
      if (guard.can('event:edit')) actions += '<a href="event-form.html?id=' + encodeURIComponent(ev.id) + '" class="icon-btn border border-paper-300 bg-white" aria-label="Edit ' + esc(ev.title) + '">' + icon('edit', 'w-4 h-4') + '</a>';
      if (guard.can('event:delete')) actions += '<button type="button" class="icon-btn border border-paper-300 bg-white text-ember-700 hover:!bg-ember-50 js-del-event" data-id="' + esc(ev.id) + '" data-title="' + esc(ev.title) + '" aria-label="Delete ' + esc(ev.title) + '">' + icon('trash', 'w-4 h-4') + '</button>';

      var badges = '';
      if (past) badges += '<span class="badge badge-muted">Past event</span>';
      if (ev.published === false) badges += '<span class="badge badge-danger">Unpublished</span>';
      if (reg === 'registered') badges += '<span class="badge badge-moss">' + icon('check', 'w-3 h-3') + 'Going</span>';

      return '<article class="event-card tilt relative card card-hover overflow-hidden flex flex-col reveal" data-id="' + esc(ev.id) + '">' +
        '<a href="' + href + '" class="relative block h-48 overflow-hidden bg-ink-900" tabindex="-1" aria-hidden="true">' +
        '<img class="zoom w-full h-full object-cover ' + (past ? 'grayscale-[40%]' : '') + '" src="' + esc(img || cover) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + cover + '\'">' +
        '<span class="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent"></span>' +
        '<span class="absolute left-4 bottom-4 date-stub shadow-lift"><span class="text-[10px] tracking-[.2em] text-ember-200 font-semibold">' + esc(s.mon) + '</span><span class="font-display text-2xl leading-none">' + esc(s.day) + '</span><span class="text-[10px] text-ink-300">' + esc(s.wk) + '</span></span>' +
        (badges ? '<span class="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">' + badges + '</span>' : '') +
        '</a>' +
        '<div class="p-5 flex-1 flex flex-col">' +
        '<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 mb-2">' +
        '<span class="inline-flex items-center gap-1">' + icon('clock', 'w-3.5 h-3.5') + esc(fmt.time(ev.starts_at) || 'TBA') + (ev.ends_at ? '–' + esc(fmt.time(ev.ends_at)) : '') + '</span>' +
        '<span class="inline-flex items-center gap-1 min-w-0">' + icon('pin', 'w-3.5 h-3.5 shrink-0') + '<span class="truncate">' + ui.highlight(ev.location || 'Location TBA', opts.q) + '</span></span></p>' +
        '<h3 class="font-display text-xl leading-snug text-ink-900 mb-2"><a href="' + href + '" class="hover:text-ember-700 transition">' + ui.highlight(ev.title, opts.q) + '</a></h3>' +
        '<p class="text-sm text-ink-600 clamp-2 mb-5">' + ui.highlight(ev.description || 'No description yet.', opts.q) + '</p>' +
        '<div class="mt-auto flex flex-wrap items-center gap-2">' + actions + '</div>' +
        '</div></article>';
    },

    /* ---------------- ANNOUNCEMENT CARD ---------------- */
    announcementCard: function (a, opts) {
      opts = opts || {};
      var href = 'announcement.html?id=' + encodeURIComponent(a.id);
      var admin = '';
      // ADMIN-ONLY controls
      if (guard.can('announcement:edit')) admin += '<a href="announcement-form.html?id=' + encodeURIComponent(a.id) + '" class="icon-btn border border-paper-300 bg-white" aria-label="Edit ' + esc(a.title) + '">' + icon('edit', 'w-4 h-4') + '</a>';
      if (guard.can('announcement:delete')) admin += '<button type="button" class="icon-btn border border-paper-300 bg-white text-ember-700 js-del-ann" data-id="' + esc(a.id) + '" data-title="' + esc(a.title) + '" aria-label="Delete ' + esc(a.title) + '">' + icon('trash', 'w-4 h-4') + '</button>';
      var dur = a.duration_seconds ? fmt.duration(a.duration_seconds) : '';

      return '<article class="ann-card card card-hover p-5 flex gap-4 items-center reveal" data-id="' + esc(a.id) + '" data-src="' + esc(CE.mediaUrl(a.audio_url)) + '">' +
        '<div class="relative shrink-0">' +
        '<img src="' + CE.dice.rings(a.id) + '" alt="" class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-card" loading="lazy">' +
        '<button type="button" class="js-play absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/95 text-ink-900 grid place-items-center shadow-lift transition hover:scale-110" aria-label="Play ' + esc(a.title) + '">' + icon('play', 'w-5 h-5 ml-0.5') + '</button>' +
        '</div>' +
        '<div class="min-w-0 flex-1">' +
        '<div class="flex flex-wrap items-center gap-2 mb-1.5"><span class="eq text-ember-600" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
        '<span class="text-xs text-ink-500">' + esc(fmt.date(a.created_at)) + '</span>' +
        '<span class="text-xs text-ink-400" aria-hidden="true">·</span><span class="text-xs font-mono text-ink-600 js-dur" aria-label="Length">' + (dur || '––:––') + '</span>' +
        (a.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '') + '</div>' +
        '<h3 class="font-display text-lg sm:text-xl leading-snug text-ink-900 truncate"><a href="' + href + '" class="hover:text-ember-700 transition">' + ui.highlight(a.title, opts.q) + '</a></h3>' +
        '<div class="mt-2 h-1 rounded-full bg-paper-200 overflow-hidden"><span class="js-prog block h-full w-0 bg-ember-500 transition-[width] duration-200"></span></div>' +
        '</div>' +
        '<div class="flex flex-col sm:flex-row gap-2 shrink-0"><a href="' + href + '" class="icon-btn border border-paper-300 bg-white" aria-label="Open ' + esc(a.title) + '">' + icon('arrowRight', 'w-4 h-4') + '</a>' + admin + '</div>' +
        '</article>';
    },

    /* ---------------- PROMO CARD ---------------- */
    promoCard: function (p, opts) {
      opts = opts || {};
      var href = 'promo.html?id=' + encodeURIComponent(p.id);
      var link = CE.videoLink(p.video_url); // YouTube/Vimeo link instead of an uploaded file
      var admin = '';
      // ADMIN-ONLY controls
      if (guard.can('promo:edit')) admin += '<a href="promo-form.html?id=' + encodeURIComponent(p.id) + '" class="icon-btn border border-paper-300 bg-white" aria-label="Edit ' + esc(p.title) + '">' + icon('edit', 'w-4 h-4') + '</a>';
      if (guard.can('promo:delete')) admin += '<button type="button" class="icon-btn border border-paper-300 bg-white text-ember-700 js-del-promo" data-id="' + esc(p.id) + '" data-title="' + esc(p.title) + '" aria-label="Delete ' + esc(p.title) + '">' + icon('trash', 'w-4 h-4') + '</button>';

      return '<article class="promo-card tilt relative card card-hover overflow-hidden flex flex-col reveal" data-id="' + esc(p.id) + '">' +
        '<a href="' + href + '" class="group relative block aspect-video overflow-hidden bg-ink-900" aria-label="Play ' + esc(p.title) + '">' +
        '<img src="' + CE.dice.glass(p.id) + '" alt="" class="absolute inset-0 w-full h-full object-cover opacity-80" loading="lazy">' +
        (link
          // linked video: the provider's thumbnail (YouTube) over the generated artwork
          ? (link.thumb ? '<img src="' + esc(link.thumb) + '" alt="" class="zoom absolute inset-0 w-full h-full object-cover" loading="lazy" onerror="this.remove()">' : '')
          // uploaded file: first-frame thumbnail, src set lazily by views.lazyVideos()
          : '<video class="js-thumb zoom absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700" muted playsinline preload="none" data-src="' + esc(CE.mediaUrl(p.video_url)) + '" aria-hidden="true" tabindex="-1"></video>') +
        '<span class="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent"></span>' +
        '<span class="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/95 text-ink-900 grid place-items-center shadow-lift transition duration-500 group-hover:scale-110">' + icon('play', 'w-6 h-6 ml-1') + '</span>' +
        '<span class="absolute left-3 top-3 flex gap-1.5">' + (link ? '<span class="badge bg-white/90 text-ink-800">' + icon('external', 'w-3 h-3') + esc(link.label) + '</span>' : '') + (p.caption_text ? '<span class="badge bg-white/90 text-ink-800">' + icon('cc', 'w-3 h-3') + 'Captions</span>' : '') +
        (p.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '') + '</span>' +
        '</a>' +
        '<div class="p-5 flex-1 flex flex-col">' +
        '<p class="text-xs text-ink-500 mb-1.5">' + esc(fmt.date(p.created_at)) + '</p>' +
        '<h3 class="font-display text-xl leading-snug text-ink-900 mb-2"><a href="' + href + '" class="hover:text-ember-700 transition">' + ui.highlight(p.title, opts.q) + '</a></h3>' +
        '<p class="text-sm text-ink-600 clamp-2 mb-5">' + ui.highlight(p.description || '', opts.q) + '</p>' +
        '<div class="mt-auto flex items-center gap-2"><a href="' + href + '" class="btn btn-primary btn-sm">' + icon('play', 'w-3.5 h-3.5') + 'Watch</a>' + admin + '</div>' +
        '</div></article>';
    },

    /* Lazy-load promo thumbnails (first frame) only when scrolled into view,
       and play a muted preview on hover. Keeps heavy media off the network
       until needed. */
    lazyVideos: function (root) {
      var $vids = $(root || document).find('video.js-thumb[data-src]');
      var load = function (v) {
        var src = v.getAttribute('data-src'); if (!src) return;
        v.removeAttribute('data-src');
        v.preload = 'metadata';
        v.src = src + '#t=0.5';
        v.addEventListener('loadeddata', function () { v.style.opacity = '1'; }, { once: true });
      };
      if (!('IntersectionObserver' in window)) { $vids.each(function () { load(this); }); return; }
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }); }, { rootMargin: '200px' });
      $vids.each(function () { io.observe(this); });
      $(root || document).find('.promo-card').each(function () {
        var v = $(this).find('video')[0];
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!v || reduce) return;
        $(this).on('mouseenter', function () { if (v.src) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); } })
          .on('mouseleave', function () { v.pause(); });
      });
    },

    /* Lazily read audio duration for announcement cards (backend does not
       store duration_seconds, so we read it from the media metadata). */
    lazyDurations: function (root) {
      $(root || document).find('.ann-card').each(function () {
        var $c = $(this), $d = $c.find('.js-dur');
        if ($d.text().indexOf('–') < 0) return;
        var a = new Audio(); a.preload = 'metadata';
        a.addEventListener('loadedmetadata', function () { if (isFinite(a.duration)) $d.text(fmt.duration(a.duration)); });
        a.addEventListener('error', function () { $d.text('n/a'); });
        a.src = $c.data('src');
      });
    },

    /* One shared <audio> drives every inline play button on a list. */
    inlineAudio: function (root) {
      var player = new Audio(); player.preload = 'none';
      var $active = null;
      function setState($card, playing) {
        $card.toggleClass('is-playing', playing);
        $card.find('.js-play').html(icon(playing ? 'pause' : 'play', 'w-5 h-5' + (playing ? '' : ' ml-0.5')))
          .attr('aria-label', (playing ? 'Pause ' : 'Play ') + $card.find('h3').text());
      }
      player.addEventListener('timeupdate', function () {
        if ($active && player.duration) $active.find('.js-prog').css('width', (player.currentTime / player.duration * 100) + '%');
      });
      player.addEventListener('ended', function () { if ($active) setState($active, false); });
      player.addEventListener('error', function () { if ($active) { setState($active, false); ui.toast('error', 'This audio file couldn’t be played in your browser.'); } });
      $(root).on('click', '.js-play', function () {
        var $card = $(this).closest('.ann-card');
        if ($active && $active[0] === $card[0]) {
          if (player.paused) { player.play(); setState($card, true); } else { player.pause(); setState($card, false); }
          return;
        }
        if ($active) { setState($active, false); $active.find('.js-prog').css('width', 0); }
        $active = $card;
        player.src = $card.data('src');
        var pr = player.play();
        if (pr && pr.catch) pr.catch(function () { setState($card, false); ui.toast('error', 'Playback failed. Try opening the announcement.'); });
        setState($card, true);
      });
      return player;
    }
  };

  /* =======================================================================
     ACTIONS
     ======================================================================= */
  var actions = {
    /* Register / cancel — OPTIMISTIC: button flips instantly, reverts on error.
       USER-ONLY (guard.can('event:register')). */
    toggleRegistration: function ($btn, onChange) {
      if (!guard.can('event:register')) return ui.forbiddenModal('Only community members can register for events.');
      var id = $btn.data('id'), registered = $btn.data('state') === 'registered';
      var go = function () {
        var render = function (state) {
          $btn.data('state', state).attr('aria-pressed', String(state === 'registered'))
            .toggleClass('btn-success', state === 'registered').toggleClass('btn-primary', state !== 'registered')
            .html(state === 'registered' ? icon('check', 'w-4 h-4') + '<span>Registered</span>' : icon('ticket', 'w-4 h-4') + '<span>Register</span>');
        };
        render(registered ? 'none' : 'registered'); // optimistic
        $btn.prop('disabled', true);
        var req = registered
          ? CE.api.post('/event-registrations/cancel', { event_id: id })
          : CE.api.post('/event-registrations/register', { event_id: id });
        req.then(function () {
          ui.toast('success', registered ? 'Registration cancelled.' : 'You’re registered! We’ve saved your spot.');
          if (!registered && CE.fx) CE.fx.success();
          if (onChange) onChange(id, registered ? 'cancelled' : 'registered');
        }).catch(function (err) {
          render(registered ? 'registered' : 'none'); // revert
          if (!registered && err.status === 409) {
            ui.toast('warning', 'You’re already registered for this event. Refresh the page to see it.');
          } else CE.handleError(err, { retry: function () { actions.toggleRegistration($btn, onChange); } });
        }).finally(function () { $btn.prop('disabled', false); });
      };
      if (registered) {
        ui.confirm({ title: 'Cancel your registration?', message: 'Your spot will be released for someone else.', confirmText: 'Cancel registration', danger: true })
          .then(function (ok) { if (ok) go(); });
      } else go();
    },

    /* Generic admin delete with confirm + animated removal.
       ADMIN-ONLY — caller passes the guarded action name. */
    remove: function (opts) {
      if (!guard.can(opts.action)) return ui.forbiddenModal();
      return ui.confirm({ title: 'Delete “' + opts.title + '”?', message: opts.message || 'This permanently removes it for everyone. This cannot be undone.', confirmText: 'Delete', danger: true })
        .then(function (ok) {
          if (!ok) return false;
          return CE.api.del(opts.path).then(function () {
            CE.cache.invalidate(opts.cacheKey);
            ui.toast('success', '“' + opts.title + '” was deleted.');
            if (opts.$card) opts.$card.css({ transition: 'all .4s cubic-bezier(.16,1,.3,1)', opacity: 0, transform: 'scale(.96)' }).delay(400).queue(function () { $(this).remove(); if (opts.after) opts.after(); });
            else if (opts.after) opts.after();
            return true;
          }).catch(function (err) { CE.handleError(err); return false; });
        });
    },

    /* Publish / unpublish toggles for announcements & promos (ADMIN-ONLY). */
    setPublished: function (kind, id, publish) {
      if (!guard.can(kind + ':publish')) { ui.forbiddenModal(); return Promise.reject(new CE.ApiError(403, 'Forbidden')); }
      var base = kind === 'promo' ? '/promos/' : '/announcements/';
      return CE.api.patch(base + id + (publish ? '/publish' : '/unpublish')).then(function (r) {
        CE.cache.invalidate(kind === 'promo' ? 'promos' : 'announcements');
        return r;
      });
    }
  };

  /* =======================================================================
     FORM KIT — shared by the admin create/edit forms
     ======================================================================= */
  var forms = {
    /* Wires a drag-and-drop zone + <input type=file>. Validates size/type
       BEFORE upload (mirrors backend multer limits) and reports the file. */
    picker: function (opts) {
      var $input = $(opts.input), $zone = $(opts.zone);
      ui.dropzone($zone, $input, function (file) {
        if (!file) { opts.onChange(null); return; }
        var err = ui.validateFile(file, opts.kind);
        if (err) {
          ui.fieldError($input, err);
          $zone.addClass('!border-[#b42318]');
          try { $input.val(''); } catch (e) { }
          opts.onChange(null, err);
          return;
        }
        ui.fieldError($input, '');
        $zone.removeClass('!border-[#b42318]');
        opts.onChange(file);
      });
    },
    /* Warn before leaving with unsaved changes. */
    dirtyGuard: function ($form) {
      var dirty = false;
      $form.on('input change', function () { dirty = true; });
      $(window).on('beforeunload', function (e) { if (dirty) { e.preventDefault(); return ''; } });
      return { clean: function () { dirty = false; } };
    },
    /* Upload progress UI: <div class="js-progress"> with .progress > span and a label. */
    progress: function ($wrap, pct) {
      if (pct == null) { $wrap.addClass('hidden'); return; }
      $wrap.removeClass('hidden');
      $wrap.find('.progress > span').css('width', pct + '%');
      $wrap.find('.progress').attr({ 'aria-valuenow': pct });
      $wrap.find('.js-pct').text(pct < 100 ? 'Uploading… ' + pct + '%' : 'Processing on server…');
    },
    fileMeta: function (file) {
      return '<span class="font-medium text-ink-900 truncate">' + esc(file.name) + '</span><span class="text-ink-500 shrink-0">' + fmt.bytes(file.size) + '</span>';
    }
  };

  /* =======================================================================
     CAPTIONS — the promos API stores captions as plain `caption_text`
     (no .vtt file). We turn it into a WebVTT track in the browser:
       • if the text is already WebVTT ("WEBVTT…" or contains "-->") use it
       • otherwise split into sentences and spread them across the video's
         duration, weighted by length, so captions follow the narration.
     The VTT is served to <track kind="captions" src="blob:…"> so the
     native player's CC menu works too.
     ======================================================================= */
  var captions = {
    isVtt: function (t) { return /^WEBVTT/i.test($.trim(t || '')) || /-->/.test(t || ''); },
    sentences: function (text) {
      return $.trim(text || '').split(/\n+|(?<=[.!?])\s+/).map($.trim).filter(Boolean);
    },
    ts: function (s) {
      s = Math.max(0, s);
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(3);
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + sec.padStart(6, '0');
    },
    // returns [{start, end, text}]
    cues: function (text, duration) {
      if (captions.isVtt(text)) {
        var out = [], re = /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g, m;
        var toS = function (h, mi, s, ms) { return (parseInt(h || '0', 10) * 3600) + parseInt(mi, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000; };
        while ((m = re.exec(text))) out.push({ start: toS(m[1], m[2], m[3], m[4]), end: toS(m[5], m[6], m[7], m[8]), text: $.trim(m[9]) });
        return out;
      }
      var parts = captions.sentences(text);
      if (!parts.length) return [];
      var d = isFinite(duration) && duration > 0 ? duration : parts.length * 4;
      var total = parts.reduce(function (s, p) { return s + p.length; }, 0);
      var t = 0;
      return parts.map(function (p) {
        var len = d * (p.length / total);
        var cue = { start: t, end: Math.min(d, t + len), text: p };
        t += len;
        return cue;
      });
    },
    vtt: function (cues) {
      return 'WEBVTT\n\n' + cues.map(function (c, i) { return (i + 1) + '\n' + captions.ts(c.start) + ' --> ' + captions.ts(c.end) + '\n' + c.text; }).join('\n\n') + '\n';
    },
    // Attach a captions <track> to a <video>, enabled by default.
    attach: function (video, text) {
      $(video).find('track[data-generated]').remove();
      if (!$.trim(text || '')) return [];
      var cues = captions.cues(text, video.duration);
      if (!cues.length) return [];
      var url = URL.createObjectURL(new Blob([captions.vtt(cues)], { type: 'text/vtt' }));
      var track = document.createElement('track');
      track.kind = 'captions'; track.srclang = 'en'; track.label = 'English'; track.default = true; track.src = url;
      track.setAttribute('data-generated', '1');
      video.appendChild(track);
      var show = function () { for (var i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = video.textTracks[i].kind === 'captions' ? 'showing' : video.textTracks[i].mode; };
      track.addEventListener('load', show);
      setTimeout(show, 50);
      return cues;
    }
  };

  /* =======================================================================
     ADMIN SHELL — sidebar navigation for admin pages. Only ever rendered on
     pages with data-auth="admin" (page guard already passed), and it checks
     CE.guard.can('dashboard:view') again as a second line of defence.
     ======================================================================= */
  CE.adminShell = function (active) {
    if (!guard.can('dashboard:view')) return;
    var items = [
      { k: 'overview', href: 'admin.html', label: 'Overview', ic: 'chart' },
      { k: 'users', href: 'admin-users.html', label: 'Users', ic: 'users' },
      { k: 'content', href: 'admin-content.html', label: 'Content', ic: 'grid' },
      { k: 'notifications', href: 'admin-notifications.html', label: 'Notifications', ic: 'bell' }
    ];
    var create = [
      { href: 'event-form.html', label: 'New event', ic: 'calendar' },
      { href: 'announcement-form.html', label: 'New announcement', ic: 'megaphone' },
      { href: 'promo-form.html', label: 'New promo', ic: 'film' }
    ];
    var u = CE.auth.user();
    $('#admin-side').html(
      '<div class="lg:sticky lg:top-24 rounded-2xl bg-ink-950 text-white p-4 shadow-lift relative overflow-hidden">' +
      '<div aria-hidden="true" class="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-ember-600/30 blur-2xl"></div>' +
      '<div class="relative hidden lg:flex items-center gap-3 px-2 pb-4 mb-3 border-b border-white/10">' + ui.avatarImg(u.id, u.full_name, 'w-10 h-10') +
      '<div class="min-w-0"><p class="text-sm font-semibold truncate">' + esc(u.full_name) + '</p><p class="text-xs text-ember-200">Administrator</p></div></div>' +
      '<nav aria-label="Admin" class="relative flex lg:flex-col gap-1 overflow-x-auto -mx-1 px-1 pb-1 lg:pb-0">' +
      items.map(function (i) { return '<a class="side-link shrink-0" href="' + i.href + '"' + (i.k === active ? ' aria-current="page"' : '') + '>' + icon(i.ic, 'w-4 h-4') + i.label + '</a>'; }).join('') +
      '</nav>' +
      '<p class="relative hidden lg:block eyebrow !text-ember-300 !text-[0.62rem] px-2 mt-6 mb-2">Create</p>' +
      '<div class="relative hidden lg:flex flex-col gap-1">' +
      create.map(function (i) { return '<a class="side-link" href="' + i.href + '">' + icon(i.ic, 'w-4 h-4') + i.label + '</a>'; }).join('') + '</div></div>');
  };

  CE.views = views;
  CE.actions = actions;
  CE.forms = forms;
  CE.captions = captions;
})(jQuery, window.CE);
