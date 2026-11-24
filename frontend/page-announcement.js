/* =========================================================================
   Announcement detail — GET /api/announcements/:id
   Accessible custom audio player wrapped around a native <audio> element:
     • every control is a real <button>/<input> with a label
     • Space/K play-pause, ←/→ seek 5s, J/L seek 10s, M mute (when the
       player region has focus)
     • seek slider exposes aria-valuetext ("1:05 of 3:20")
     • fallback text + download link for browsers that can't play the format
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, guard = CE.guard;
  var id = CE.param('id'), ann = null;

  function adminBar() {
    // ADMIN-ONLY management bar
    if (!guard.can('announcement:edit')) return '';
    return '<div class="card p-4 mt-6 flex flex-wrap items-center justify-between gap-3 reveal" aria-label="Admin controls">' +
      '<div class="flex items-center gap-3"><span class="badge badge-ember">' + icon('shield', 'w-3 h-3') + 'Admin</span>' +
      '<label for="pub-toggle" class="text-sm font-medium text-ink-800">Published</label>' +
      '<input id="pub-toggle" type="checkbox" class="switch" role="switch" ' + (ann.published !== false ? 'checked' : '') + '></div>' +
      '<div class="flex gap-2"><a href="announcement-form.html?id=' + encodeURIComponent(ann.id) + '" class="btn btn-ghost btn-sm">' + icon('edit', 'w-4 h-4') + 'Edit</a>' +
      (guard.can('announcement:delete') ? '<button type="button" id="del-btn" class="btn btn-danger btn-sm">' + icon('trash', 'w-4 h-4') + 'Delete</button>' : '') + '</div></div>';
  }

  function render() {
    var src = CE.mediaUrl(ann.audio_url);
    ui.setTitle(ann.title);
    var html = '' +
      '<article class="relative overflow-hidden rounded-[1.75rem] bg-ink-950 text-white shadow-lift reveal" id="player" tabindex="0" aria-label="Audio player for ' + esc(ann.title) + '. Press space to play or pause, arrow keys to seek.">' +
      '<div aria-hidden="true" class="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-ember-600/30 blur-3xl float-slow"></div>' +
      '<div class="relative grid md:grid-cols-[auto_1fr] gap-8 md:gap-12 p-6 sm:p-10 items-center">' +
      '<div class="mx-auto relative w-48 h-48 sm:w-64 sm:h-64">' +
      '<img src="' + CE.dice.rings(ann.id) + '" alt="" class="disc w-full h-full rounded-full object-cover shadow-lift ring-8 ring-white/5">' +
      '<span class="absolute inset-0 m-auto w-10 h-10 rounded-full bg-ink-950 ring-4 ring-white/10"></span></div>' +
      '<div class="min-w-0">' +
      '<div class="flex flex-wrap items-center gap-2 mb-3"><span class="badge bg-white/10 text-ember-200">' + icon('megaphone', 'w-3 h-3') + 'Announcement</span>' +
      (ann.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '') +
      '<span class="text-xs text-ink-300">' + esc(fmt.dateTime(ann.created_at)) + '</span></div>' +
      '<h1 class="font-display text-3xl sm:text-5xl leading-tight mb-8">' + esc(ann.title) + '</h1>' +

      // native audio element (no native controls; our controls drive it)
      '<audio id="audio" preload="metadata">' +
      '<source src="' + esc(src) + '">' +
      'Your browser can’t play this audio format. <a href="' + esc(src) + '" download>Download the announcement</a> to listen offline.' +
      '</audio>' +

      '<div class="flex items-center gap-3 sm:gap-4">' +
      '<button type="button" id="back10" class="icon-btn !text-white hover:!bg-white/10" aria-label="Rewind 10 seconds">' + icon('rewind', 'w-5 h-5') + '</button>' +
      '<button type="button" id="play" class="grid place-items-center w-16 h-16 rounded-full bg-white text-ink-950 shadow-lift transition hover:scale-105 active:scale-95" aria-label="Play">' + icon('play', 'w-7 h-7 ml-1') + '</button>' +
      '<button type="button" id="fwd10" class="icon-btn !text-white hover:!bg-white/10" aria-label="Forward 10 seconds">' + icon('forward', 'w-5 h-5') + '</button>' +
      '<span class="eq text-ember-300 ml-2" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<div class="flex-1"></div>' +
      '<label for="rate" class="sr-only">Playback speed</label>' +
      '<select id="rate" class="rounded-full bg-white/10 border border-white/15 text-sm px-3 py-1.5 text-white focus:bg-white/20"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>' +
      '</div>' +

      '<div class="mt-6"><label for="seek" class="sr-only">Seek</label>' +
      '<input id="seek" type="range" class="range" min="0" max="100" step="0.1" value="0" aria-valuetext="0:00 of unknown length">' +
      '<div class="mt-2 flex justify-between text-xs font-mono text-ink-300"><span id="cur" aria-live="off">0:00</span><span id="dur">–:––</span></div></div>' +

      '<div class="mt-5 flex items-center gap-3 max-w-xs">' +
      '<button type="button" id="mute" class="icon-btn !text-white hover:!bg-white/10" aria-label="Mute" aria-pressed="false">' + icon('volume', 'w-5 h-5') + '</button>' +
      '<label for="vol" class="sr-only">Volume</label><input id="vol" type="range" class="range" min="0" max="1" step="0.05" value="1" aria-valuetext="100%">' +
      '<a href="' + esc(src) + '" download class="icon-btn !text-white hover:!bg-white/10 shrink-0" aria-label="Download audio">' + icon('download', 'w-5 h-5') + '</a></div>' +
      '<p id="audio-error" class="hidden mt-5 rounded-xl bg-ember-700/40 px-4 py-3 text-sm" role="alert"></p>' +
      '<p class="mt-5 text-xs text-ink-400">Keyboard: <kbd class="font-mono">Space</kbd> play/pause · <kbd class="font-mono">←/→</kbd> 5s · <kbd class="font-mono">J/L</kbd> 10s · <kbd class="font-mono">M</kbd> mute</p>' +
      '</div></div></article>' +
      adminBar() +
      '<section class="mt-10 reveal" aria-labelledby="tr-h"><details class="card p-6 group" ' + (ann.transcript ? 'open' : '') + '>' +
      '<summary class="flex items-center justify-between cursor-pointer list-none"><h2 id="tr-h" class="font-display text-2xl text-ink-900">Transcript</h2>' +
      '<span class="transition-transform group-open:rotate-180">' + icon('down', 'w-5 h-5') + '</span></summary>' +
      '<div class="mt-4 text-ink-700 leading-relaxed whitespace-pre-line">' + (ann.transcript ? esc(ann.transcript)
        : '<p class="text-ink-500">No transcript was provided for this announcement. If you need an accessible version, please <a class="underline" href="mailto:' + CE.config.SUPPORT_EMAIL + '?subject=Transcript%20request:%20' + encodeURIComponent(ann.title) + '">request one from the civic office</a>.</p>') +
      '</div></details></section>';

    $('#ann-root').attr('aria-busy', 'false').html(html);
    $('#temp-title').remove(); // the real title is on the page now
    ui.reveal($('#ann-root'));
    bindPlayer();
  }

  function bindPlayer() {
    var a = document.getElementById('audio');
    var $seek = $('#seek'), $vol = $('#vol'), $player = $('#player');
    var seeking = false;

    function fill($r) { var v = ($r.val() - $r.attr('min')) / ($r.attr('max') - $r.attr('min')) * 100; $r[0].style.setProperty('--fill', v + '%'); }
    function paint() {
      var d = isFinite(a.duration) ? a.duration : 0;
      if (!seeking) $seek.val(d ? (a.currentTime / d) * 100 : 0);
      fill($seek);
      $('#cur').text(fmt.duration(a.currentTime));
      $seek.attr('aria-valuetext', fmt.duration(a.currentTime) + ' of ' + (d ? fmt.duration(d) : 'unknown length'));
    }
    function setPlaying(p) {
      $player.toggleClass('is-playing', p);
      $('#play').html(icon(p ? 'pause' : 'play', 'w-7 h-7' + (p ? '' : ' ml-1'))).attr('aria-label', p ? 'Pause' : 'Play');
    }
    function toggle() {
      if (a.paused) { var pr = a.play(); if (pr && pr.catch) pr.catch(function () { showError(); }); } else a.pause();
    }
    function skip(s) { if (isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + s)); }
    function showError() {
      $('#audio-error').removeClass('hidden').html('This audio couldn’t be played in your browser. <a class="underline font-semibold" href="' + esc(CE.mediaUrl(ann.audio_url)) + '" download>Download it instead</a>.');
      setPlaying(false);
    }

    a.addEventListener('loadedmetadata', function () { $('#dur').text(fmt.duration(a.duration)); paint(); });
    a.addEventListener('timeupdate', paint);
    a.addEventListener('play', function () { setPlaying(true); });
    a.addEventListener('pause', function () { setPlaying(false); });
    a.addEventListener('ended', function () { setPlaying(false); });
    a.addEventListener('error', showError, true);
    $(a).find('source').on('error', showError);

    $('#play').on('click', toggle);
    $('#back10').on('click', function () { skip(-10); });
    $('#fwd10').on('click', function () { skip(10); });
    $('#rate').on('change', function () { a.playbackRate = parseFloat(this.value); });
    $seek.on('input', function () { seeking = true; fill($seek); if (isFinite(a.duration)) $('#cur').text(fmt.duration(this.value / 100 * a.duration)); })
      .on('change', function () { seeking = false; if (isFinite(a.duration)) a.currentTime = this.value / 100 * a.duration; });
    $vol.on('input', function () {
      a.volume = parseFloat(this.value); a.muted = a.volume === 0; fill($vol);
      $vol.attr('aria-valuetext', Math.round(a.volume * 100) + '%'); syncMute();
    });
    function syncMute() { $('#mute').attr({ 'aria-pressed': String(a.muted), 'aria-label': a.muted ? 'Unmute' : 'Mute' }).html(icon(a.muted ? 'mute' : 'volume', 'w-5 h-5')); }
    $('#mute').on('click', function () { a.muted = !a.muted; syncMute(); });
    fill($vol);

    // keyboard shortcuts scoped to the player region
    $player.on('keydown', function (e) {
      if ($(e.target).is('select, input[type=range]') && /Arrow/.test(e.key)) return; // let sliders handle arrows
      var k = e.key.toLowerCase();
      if (k === ' ' || k === 'k') { if (!$(e.target).is('button, a')) { e.preventDefault(); toggle(); } }
      else if (k === 'arrowleft') { e.preventDefault(); skip(-5); }
      else if (k === 'arrowright') { e.preventDefault(); skip(5); }
      else if (k === 'j') skip(-10);
      else if (k === 'l') skip(10);
      else if (k === 'm') { a.muted = !a.muted; syncMute(); }
    });

    // ADMIN publish toggle — optimistic, reverts on failure
    $('#pub-toggle').on('change', function () {
      var $t = $(this), on = $t.is(':checked');
      $t.prop('disabled', true);
      CE.actions.setPublished('announcement', ann.id, on).then(function () {
        ann.published = on;
        ui.toast('success', on ? 'Announcement published — listeners have been notified.' : 'Announcement unpublished. It’s now hidden from users.');
      }).catch(function (err) { $t.prop('checked', !on); CE.handleError(err); })
        .finally(function () { $t.prop('disabled', false); });
    });
    $('#del-btn').on('click', function () {
      CE.actions.remove({ action: 'announcement:delete', path: '/announcements/' + ann.id, title: ann.title, cacheKey: 'announcements' }).then(function (ok) {
        if (ok) { CE.flash.set('success', 'Announcement deleted.'); window.location.href = 'announcements.html'; }
      });
    });
  }

  function loadMore() {
    CE.data.announcements().then(function (list) {
      list = CE.data.visible(list).filter(function (x) { return x.id !== id; }).slice(0, 4);
      if (!list.length) { $('#more').closest('section').remove(); return; }
      $('#more').html(list.map(function (x) { return CE.views.announcementCard(x); }).join(''));
      CE.views.inlineAudio($('#more')); CE.views.lazyDurations($('#more')); ui.reveal($('#more'));
    }).catch(function () { $('#more').closest('section').remove(); });
  }

  function load() {
    if (!id) { $('#ann-root').html(ui.empty('No announcement selected', '', '<a href="announcements.html" class="btn btn-primary">See all announcements</a>', 'megaphone')); return; }
    CE.api.get('/announcements/' + encodeURIComponent(id)).then(function (r) {
      ann = r.data;
      if (!ann || (ann.published === false && !guard.can('content:viewUnpublished'))) throw new CE.ApiError(404, 'Not found');
      render(); loadMore();
    }).catch(function (err) {
      if (err.status === 404 || err.status === 500) $('#ann-root').html(ui.empty('Announcement not found', 'It may have been removed or unpublished.', '<a href="announcements.html" class="btn btn-primary">See all announcements</a>', 'megaphone'));
      else ui.errorState($('#ann-root'), err, load);
    });
  }

  CE.ready(load);
})(jQuery, window.CE);
