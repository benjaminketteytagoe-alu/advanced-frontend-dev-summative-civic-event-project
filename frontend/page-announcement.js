// Announcement page: the audio player, and a few more announcements below
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, can = CE.guard.can;

  var id = CE.param('id');
  var ann;               // the announcement
  var audio;             // the browser's own audio player, driven by our buttons
  var seeking = false;   // true while the person drags the slider
  var morePlayer;        // the player the cards below share

  // ---------- pieces of the page ----------

  function audioAddress() { return esc(CE.mediaUrl(ann.audio_url)); }

  function roundButton(name, iconName, label) {
    return '<button type="button" id="' + name + '" class="icon-btn !text-white hover:!bg-white/10" aria-label="' + label + '">' + icon(iconName, 'w-5 h-5') + '</button>';
  }

  function heading() {
    var draft = ann.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '';
    return '<div class="flex flex-wrap items-center gap-2 mb-3">' +
      '<span class="badge bg-white/10 text-ember-200">' + icon('megaphone', 'w-3 h-3') + 'Announcement</span>' + draft +
      '<span class="text-xs text-ink-300">' + esc(fmt.dateTime(ann.created_at)) + '</span></div>' +
      '<h1 class="font-display text-3xl sm:text-5xl leading-tight mb-8 break-words">' + esc(ann.title) + '</h1>';
  }

  function speedBox() {
    var speeds = [0.75, 1, 1.25, 1.5, 2].map(function (s) {
      return '<option value="' + s + '"' + (s === 1 ? ' selected' : '') + '>' + s + '×</option>';
    });
    return '<label for="rate" class="sr-only">Playback speed</label>' +
      '<select id="rate" class="rounded-full bg-white/10 border border-white/15 text-sm px-3 py-1.5 text-white focus:bg-white/20">' + speeds.join('') + '</select>';
  }

  function mainButtons() {
    return '<div class="flex items-center gap-3 sm:gap-4">' + roundButton('back10', 'rewind', 'Rewind 10 seconds') +
      '<button type="button" id="play" class="grid place-items-center w-16 h-16 rounded-full bg-white text-ink-950 shadow-lift transition hover:scale-105 active:scale-95" aria-label="Play">' + icon('play', 'w-7 h-7 ml-1') + '</button>' +
      roundButton('fwd10', 'forward', 'Forward 10 seconds') +
      '<span class="eq text-ember-300 ml-2" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="flex-1"></div>' + speedBox() + '</div>';
  }

  function seekBar() {
    return '<div class="mt-6"><label for="seek" class="sr-only">Seek</label>' +
      '<input id="seek" type="range" class="range" min="0" max="100" step="0.1" value="0" aria-valuetext="0:00 of unknown length">' +
      '<div class="mt-2 flex justify-between text-xs font-mono text-ink-300"><span id="cur">0:00</span><span id="dur">–:––</span></div></div>';
  }

  function volumeBar() {
    return '<div class="mt-5 flex items-center gap-3 max-w-xs">' + roundButton('mute', 'volume', 'Mute') +
      '<label for="vol" class="sr-only">Volume</label><input id="vol" type="range" class="range" min="0" max="1" step="0.05" value="1" aria-valuetext="100%">' +
      '<a href="' + audioAddress() + '" download class="icon-btn !text-white hover:!bg-white/10 shrink-0" aria-label="Download audio">' + icon('download', 'w-5 h-5') + '</a></div>';
  }

  function player() {
    return '<article id="player" tabindex="0" class="relative overflow-hidden rounded-[1.75rem] bg-ink-950 text-white shadow-lift reveal"' +
      ' aria-label="Audio player for ' + esc(ann.title) + '. Press space to play or pause, arrow keys to seek.">' +
      '<div aria-hidden="true" class="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-ember-600/30 blur-3xl float-slow"></div>' +
      '<div class="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 p-6 sm:p-10 items-center">' +
      '<div class="mx-auto relative w-48 h-48 sm:w-64 sm:h-64">' +
      '<img src="' + CE.dice.rings(ann.id) + '" alt="" class="disc w-full h-full rounded-full object-cover shadow-lift ring-8 ring-white/5">' +
      '<span class="absolute inset-0 m-auto w-10 h-10 rounded-full bg-ink-950 ring-4 ring-white/10"></span></div>' +
      '<div class="min-w-0">' + heading() +
      '<audio id="audio" preload="metadata"><source src="' + audioAddress() + '"></audio>' +
      mainButtons() + seekBar() + volumeBar() +
      '<p id="audio-error" class="hidden mt-5 rounded-xl bg-ember-700/40 px-4 py-3 text-sm" role="alert"></p>' +
      '<p class="mt-5 text-xs text-ink-300">Keyboard: Space play or pause · ←/→ 5s · J/L 10s · M mute</p></div></div></article>';
  }

  function adminBar() {
    if (!can('announcement:edit')) return '';
    return '<div class="card p-4 mt-6 flex flex-wrap items-center justify-between gap-3 reveal">' +
      '<div class="flex items-center gap-3"><span class="badge badge-ember">' + icon('shield', 'w-3 h-3') + 'Admin</span>' +
      '<label for="pub-toggle" class="text-sm font-medium text-ink-800">Published</label>' +
      '<input id="pub-toggle" type="checkbox" class="switch" role="switch"' + (ann.published === false ? '' : ' checked') + '></div>' +
      '<div class="flex gap-2"><a href="announcement-form.html?id=' + encodeURIComponent(ann.id) + '" class="btn btn-ghost btn-sm">' + icon('edit', 'w-4 h-4') + 'Edit</a>' +
      '<button type="button" id="del-btn" class="btn btn-danger btn-sm">' + icon('trash', 'w-4 h-4') + 'Delete</button></div></div>';
  }

  // The database keeps no transcript, so people can ask for one
  function transcript() {
    var mail = 'mailto:' + CE.config.SUPPORT_EMAIL + '?subject=' + encodeURIComponent('Transcript request: ' + ann.title);
    return '<section class="mt-10 reveal"><details class="card p-6 group">' +
      '<summary class="flex items-center justify-between cursor-pointer list-none"><h2 class="font-display text-2xl text-ink-900">Transcript</h2>' +
      '<span class="transition-transform group-open:rotate-180">' + icon('down', 'w-5 h-5') + '</span></summary>' +
      '<p class="mt-4 text-ink-600">No transcript was provided for this announcement. If you need one, please <a class="underline" href="' + mail + '">ask the civic office</a>.</p></details></section>';
  }

  function show() {
    ui.setTitle(ann.title);
    $('#ann-root').attr('aria-busy', 'false').html(player() + adminBar() + transcript());
    $('#temp-title').remove(); // the real title is on the page now
    ui.reveal($('#ann-root'));
    startAudio();
  }

  // ---------- drawing the player ----------

  function length() { return isFinite(audio.duration) ? audio.duration : 0; } // 0 while unknown

  // Colour the part of a slider that is behind the handle
  function fillSlider($slider) {
    var percent = $slider.val() / $slider.attr('max') * 100;
    $slider[0].style.setProperty('--fill', percent + '%');
  }

  // Show where we are. A slider being dragged is left alone
  function showTime() {
    if (seeking) return;
    var now = fmt.duration(audio.currentTime);
    var total = length() ? fmt.duration(length()) : 'unknown length';
    $('#seek').val(length() ? audio.currentTime / length() * 100 : 0).attr('aria-valuetext', now + ' of ' + total);
    $('#cur').text(now);
    if (length()) $('#dur').text(total);
    fillSlider($('#seek'));
  }

  function showPlaying() {
    var playing = !audio.paused && !audio.ended;
    $('#player').toggleClass('is-playing', playing);
    $('#play').attr('aria-label', playing ? 'Pause' : 'Play').html(icon(playing ? 'pause' : 'play', playing ? 'w-7 h-7' : 'w-7 h-7 ml-1'));
  }

  function showVolume() {
    var silent = audio.muted || audio.volume === 0;
    $('#mute').attr('aria-label', silent ? 'Unmute' : 'Mute').html(icon(silent ? 'mute' : 'volume', 'w-5 h-5'));
    $('#vol').attr('aria-valuetext', Math.round(audio.volume * 100) + '%');
    fillSlider($('#vol'));
  }

  function showAudioError() {
    $('#audio-error').removeClass('hidden').html('This audio couldn’t be played in your browser. <a class="underline font-semibold" href="' + audioAddress() + '" download>Download it instead</a>.');
    showPlaying();
  }

  // ---------- controls ----------

  function togglePlay() {
    if (!audio.paused) return audio.pause();
    if (morePlayer) morePlayer.pause(); // only one sound at a time
    audio.play().catch(showAudioError);
  }

  // Move some seconds, but never before the start or past the end
  function skip(seconds) {
    if (!length()) return;
    audio.currentTime = Math.max(0, Math.min(length(), audio.currentTime + seconds));
  }

  function dragSeek() {
    seeking = true;
    $('#cur').text(fmt.duration(this.value / 100 * length()));
    fillSlider($('#seek'));
  }

  function dropSeek() {
    seeking = false;
    if (length()) audio.currentTime = this.value / 100 * length();
  }

  function changeVolume() {
    audio.volume = Number(this.value);
    audio.muted = false;
  }

  function toggleMute() { audio.muted = !audio.muted; }

  // Keys work anywhere in the player, except where a control needs the same key
  function pressKey(e) {
    var key = e.key.toLowerCase();
    var $on = $(e.target);
    if ($on.is('select')) return;
    if ($on.is('input') && key.indexOf('arrow') === 0) return;
    if ($on.is('button, a') && key === ' ') return;

    if (key === ' ' || key === 'k') togglePlay();
    else if (key === 'arrowleft') skip(-5);
    else if (key === 'arrowright') skip(5);
    else if (key === 'j') skip(-10);
    else if (key === 'l') skip(10);
    else if (key === 'm') toggleMute();
    else return;
    e.preventDefault(); // no scrolling
  }

  function startAudio() {
    audio = $('#audio')[0];
    $(audio)
      .on('loadedmetadata timeupdate', showTime)
      .on('play pause ended', showPlaying)
      .on('volumechange', showVolume)
      .find('source').on('error', showAudioError);
    showVolume();
  }

  // ---------- admin ----------

  // The switch moves at once, and moves back if saving fails
  function togglePublished() {
    var $switch = $(this), on = this.checked;
    $switch.prop('disabled', true);
    CE.actions.setPublished('announcement', ann.id, on)
      .then(function () { ui.toast('success', on ? 'Announcement published. Listeners have been notified.' : 'Announcement unpublished and hidden from users.'); })
      .catch(function (err) {
        $switch.prop('checked', !on);
        CE.handleError(err);
      })
      .finally(function () { $switch.prop('disabled', false); });
  }

  function removeAnn() {
    CE.actions.remove({ action: 'announcement:delete', path: '/announcements/' + ann.id, title: ann.title, cacheKey: 'announcements' }).then(function (done) {
      if (!done) return;
      CE.flash.set('success', 'Announcement deleted.');
      window.location.href = 'announcements.html';
    });
  }

  // ---------- more announcements ----------

  function hideMore() { $('#more').closest('section').hide(); }

  function showMore(list) {
    var others = CE.data.visible(list).filter(function (a) { return a.id !== id; }).slice(0, 4);
    if (!others.length) return hideMore();
    $('#more').html(others.map(function (a) { return CE.views.announcementCard(a); }).join(''));
    CE.views.lazyDurations($('#more')); // read each length from its audio file
    ui.reveal($('#more'));
  }

  function loadMore() { CE.data.announcements().then(showMore).catch(hideMore); }

  function removeMore() {
    var $button = $(this);
    CE.actions.remove({
      action: 'announcement:delete',
      path: '/announcements/' + $button.attr('data-id'),
      title: $button.attr('data-title'),
      cacheKey: 'announcements',
      $card: $button.closest('article'),
      after: loadMore
    });
  }

  function startMore() {
    morePlayer = CE.views.inlineAudio($('#more'));
    $(morePlayer).on('play', function () { if (audio) audio.pause(); }); // only one sound at a time
    $('#more').on('click', '.js-del-ann', removeMore);
    loadMore();
  }

  // ---------- load ----------

  function showMissing(title, text) {
    $('#ann-root').attr('aria-busy', 'false').html(ui.empty(title, text, '<a href="announcements.html" class="btn btn-primary">See all announcements</a>', 'megaphone'));
  }

  function load() {
    if (!id) return showMissing('No announcement selected', '');
    CE.api.get('/announcements/' + encodeURIComponent(id))
      .then(function (reply) { ann = reply.data; show(); })
      .catch(function (err) {
        if (err.status === 404) return showMissing('Announcement not found', 'It may have been removed or unpublished.');
        $('#ann-root').attr('aria-busy', 'false');
        ui.errorState($('#ann-root'), err, load);
      });
  }

  // Start
  CE.ready(function () {
    load();
    startMore();
    $('#ann-root')
      .on('click', '#play', togglePlay)
      .on('click', '#back10', function () { skip(-10); })
      .on('click', '#fwd10', function () { skip(10); })
      .on('click', '#mute', toggleMute)
      .on('change', '#rate', function () { audio.playbackRate = Number(this.value); })
      .on('input', '#seek', dragSeek)
      .on('change', '#seek', dropSeek)
      .on('input', '#vol', changeVolume)
      .on('keydown', '#player', pressKey)
      .on('change', '#pub-toggle', togglePublished)
      .on('click', '#del-btn', removeAnn);
  });
})(jQuery, window.CE);
