// Promo page: the video with captions and a transcript. A link plays in YouTube's or Vimeo's own player
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, can = CE.guard.can;

  var id = CE.param('id');
  var promo;
  var link;              // details of the YouTube or Vimeo link, or nothing for an uploaded file
  var video;             // the video player, for uploaded files
  var cues = [];         // caption lines, each with a start, an end and a text
  var captionsOn = true;

  // ---------- pieces of the page ----------

  function videoAddress() { return CE.mediaUrl(promo.video_url); }

  function linkPlayer() {
    return '<iframe class="block w-full aspect-video border-0 bg-ink-950" src="' + esc(link.embed) + '"' +
      ' title="' + esc(promo.title) + ' (' + esc(link.label) + ' video)"' +
      ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"' +
      ' allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }

  // preload="metadata" fetches only the length until someone presses play
  function filePlayer() {
    var address = esc(videoAddress());
    return '<video id="video" class="w-full aspect-video bg-ink-950" controls playsinline preload="metadata"' +
      ' poster="' + CE.dice.glass(promo.id) + '" aria-label="' + esc(promo.title) + '" aria-describedby="promo-desc">' +
      '<source src="' + address + '">' +
      '<p class="p-6 text-white">Your browser can’t play this video. <a class="underline" href="' + address + '" download>Download it</a> and read the transcript below.</p></video>';
  }

  function linkTools() {
    return '<span class="inline-flex items-center gap-2 text-sm text-ink-600">' + icon('cc', 'w-4 h-4') + 'Captions and fullscreen are in the player’s controls.</span>' +
      '<a href="' + esc(link.watch) + '" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">' + icon('external', 'w-4 h-4') +
      'Watch on ' + esc(link.label) + '<span class="sr-only"> (opens in new tab)</span></a>';
  }

  function fileTools() {
    return '<button type="button" id="cc-btn" class="btn btn-sm btn-primary" aria-pressed="true"' + (promo.caption_text ? '' : ' disabled') + '>' +
      icon('cc', 'w-4 h-4') + '<span>Captions on</span></button>' +
      '<button type="button" id="fs-btn" class="btn btn-sm btn-ghost">' + icon('external', 'w-4 h-4') + 'Fullscreen</button>' +
      '<a href="' + esc(videoAddress()) + '" download class="btn btn-sm btn-ghost">' + icon('download', 'w-4 h-4') + 'Download</a>';
  }

  function heading() {
    var draft = promo.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '';
    return '<header class="mt-8 reveal"><div class="flex flex-wrap items-center gap-2 mb-3">' +
      '<span class="badge badge-ink">' + icon('film', 'w-3 h-3') + 'Promo</span>' + draft +
      '<span class="text-xs text-ink-500">' + esc(fmt.date(promo.created_at)) + '</span></div>' +
      '<h1 class="font-display text-3xl sm:text-5xl leading-tight text-ink-900 break-words">' + esc(promo.title) + '</h1>' +
      '<p id="promo-desc" class="mt-4 text-lg text-ink-700 leading-relaxed whitespace-pre-line break-words max-w-3xl">' + esc(promo.description) + '</p></header>';
  }

  function adminBox() {
    if (!can('promo:edit')) return '';
    return '<div class="card p-4 reveal"><div class="flex items-center justify-between mb-3">' +
      '<span class="badge badge-ember">' + icon('shield', 'w-3 h-3') + 'Admin</span>' +
      '<span class="flex items-center gap-2"><label for="pub-toggle" class="text-sm font-medium text-ink-800">Published</label>' +
      '<input id="pub-toggle" type="checkbox" class="switch" role="switch"' + (promo.published === false ? '' : ' checked') + '></span></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<a href="promo-form.html?id=' + encodeURIComponent(promo.id) + '" class="btn btn-ghost btn-sm">' + icon('edit', 'w-4 h-4') + 'Edit</a>' +
      '<button type="button" id="del-btn" class="btn btn-danger btn-sm">' + icon('trash', 'w-4 h-4') + 'Delete</button></div></div>';
  }

  function transcriptBox() {
    var hint = link ? '' : '<span class="text-xs text-ink-500">Click a line to jump</span>';
    return '<section class="card overflow-hidden reveal" aria-labelledby="tr-h">' +
      '<div class="px-5 py-4 border-b border-paper-200 flex items-center justify-between">' +
      '<h2 id="tr-h" class="font-display text-xl text-ink-900">Transcript</h2>' + hint + '</div>' +
      '<ol id="transcript" class="relative max-h-[28rem] overflow-y-auto p-2 text-sm"><li class="p-4 text-ink-500">No transcript was provided for this promo.</li></ol></section>';
  }

  function show() {
    link = CE.videoLink(promo.video_url);
    ui.setTitle(promo.title);
    $('#promo-root').attr('aria-busy', 'false').html(
      '<div class="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8 items-start"><div class="min-w-0">' +
      '<div class="crop-marks reveal"><div class="relative rounded-[1.5rem] overflow-hidden bg-ink-950 shadow-lift">' + (link ? linkPlayer() : filePlayer()) + '</div></div>' +
      '<div class="mt-4 md:mt-12 flex flex-wrap items-center gap-2 reveal">' + (link ? linkTools() : fileTools()) +
      '<span id="video-error" class="hidden text-sm text-ember-700" role="alert"></span></div>' +
      heading() + '</div>' +
      '<aside class="lg:sticky lg:top-24 space-y-4 min-w-0">' + adminBox() + transcriptBox() + '</aside></div>'
    );
    $('#temp-title').remove(); // the real title is on the page now
    ui.reveal($('#promo-root'));
    if (link) showPlainLines();
    else startVideo();
  }

  // ---------- transcript ----------

  // For links we cannot control the player, so the lines are only text
  function showPlainLines() {
    var lines = CE.captions.cues(promo.caption_text, 60);
    if (!lines.length) return;
    $('#transcript').html(lines.map(function (c) { return '<li class="px-3 py-2 text-ink-700">' + esc(c.text) + '</li>'; }).join(''));
  }

  function lineButton(c, i) {
    return '<li><button type="button" class="tr-line w-full text-left flex gap-3 rounded-lg px-3 py-2 hover:bg-paper-100 transition" data-i="' + i + '">' +
      '<span class="font-mono text-xs text-ink-500 pt-0.5 shrink-0">' + fmt.duration(c.start) + '</span>' +
      '<span class="text-ink-700">' + esc(c.text) + '</span></button></li>';
  }

  // Jump to the clicked line
  function jump() {
    video.currentTime = cues[$(this).data('i')].start + 0.01;
    video.play().catch(function () { }); // the browser may refuse to play, and that is fine
  }

  // Which line is being said now, or -1
  function lineNow() {
    for (var i = 0; i < cues.length; i++) {
      if (video.currentTime >= cues[i].start && video.currentTime < cues[i].end) return i;
    }
    return -1;
  }

  // Highlight that line and keep it in view
  function followVideo() {
    var $lines = $('.tr-line').removeClass('bg-ember-50').removeAttr('aria-current');
    var i = lineNow();
    if (i === -1) return;

    var line = $lines.eq(i).addClass('bg-ember-50').attr('aria-current', 'true')[0];
    var box = $('#transcript')[0], top = line.offsetTop;
    var outOfView = top < box.scrollTop || top > box.scrollTop + box.clientHeight - 40;
    if (outOfView) box.scrollTop = top - 40;
  }

  // ---------- captions ----------

  function captionTracks() {
    return Array.from(video.textTracks).filter(function (track) { return track.kind === 'captions'; });
  }

  function showButton() {
    $('#cc-btn').attr('aria-pressed', String(captionsOn))
      .toggleClass('btn-primary', captionsOn).toggleClass('btn-ghost', !captionsOn)
      .find('span').text(captionsOn ? 'Captions on' : 'Captions off');
  }

  function setCaptions(on) {
    captionsOn = on;
    captionTracks().forEach(function (track) { track.mode = on ? 'showing' : 'hidden'; });
    showButton();
  }

  // Someone used the player's own captions menu
  function captionsChanged() {
    var tracks = captionTracks();
    if (!tracks.length) return;
    captionsOn = tracks.some(function (track) { return track.mode === 'showing'; });
    showButton();
  }

  // Build the captions from the text
  function buildCaptions() {
    cues = CE.captions.attach(video, promo.caption_text);
    if (cues.length) $('#transcript').html(cues.map(lineButton).join(''));
    setCaptions(captionsOn);
  }

  function fullscreen() {
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iPhones
  }

  function showVideoError() {
    $('#video-error').removeClass('hidden').text('The video couldn’t be loaded. Try downloading it instead.');
  }

  function startVideo() {
    video = $('#video')[0];
    if (promo.caption_text) {
      buildCaptions();
      // Plain sentences are spread over the length, which is only known now
      if (!CE.captions.isVtt(promo.caption_text)) $(video).one('loadedmetadata', buildCaptions);
    }
    $(video).on('timeupdate', followVideo);
    $(video).find('source').on('error', showVideoError);
    video.textTracks.addEventListener('change', captionsChanged);
  }

  // ---------- admin ----------

  // The switch moves at once, and moves back if saving fails
  function togglePublished() {
    var $switch = $(this), on = this.checked;
    $switch.prop('disabled', true);
    CE.actions.setPublished('promo', promo.id, on)
      .then(function () { ui.toast('success', on ? 'Promo published.' : 'Promo unpublished and hidden from users.'); })
      .catch(function (err) {
        $switch.prop('checked', !on);
        CE.handleError(err);
      })
      .finally(function () { $switch.prop('disabled', false); });
  }

  function removePromo() {
    CE.actions.remove({ action: 'promo:delete', path: '/promos/' + promo.id, title: promo.title, cacheKey: 'promos' }).then(function (done) {
      if (!done) return;
      CE.flash.set('success', 'Promo deleted.');
      window.location.href = 'promos.html';
    });
  }

  // ---------- load ----------

  function showMissing(title, text) {
    $('#promo-root').attr('aria-busy', 'false').html(ui.empty(title, text, '<a href="promos.html" class="btn btn-primary">See all promos</a>', 'film'));
  }

  function load() {
    if (!id) return showMissing('No promo selected', '');
    CE.api.get('/promos/' + encodeURIComponent(id))
      .then(function (reply) { promo = reply.data; show(); })
      .catch(function (err) {
        if (err.status === 404) return showMissing('Promo not found', 'It may have been removed or unpublished.');
        $('#promo-root').attr('aria-busy', 'false');
        ui.errorState($('#promo-root'), err, load);
      });
  }

  // Start
  CE.ready(function () {
    load();
    $('#promo-root')
      .on('click', '.tr-line', jump)
      .on('click', '#cc-btn', function () { setCaptions(!captionsOn); })
      .on('click', '#fs-btn', fullscreen)
      .on('change', '#pub-toggle', togglePublished)
      .on('click', '#del-btn', removePromo);
  });
})(jQuery, window.CE);
