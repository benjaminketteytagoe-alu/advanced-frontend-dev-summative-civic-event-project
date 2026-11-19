/* =========================================================================
   Promo detail — GET /api/promos/:id
   <video controls> with a <track kind="captions" srclang="en" label="English">
   built from caption_text, enabled by default. Native controls provide
   play/pause, volume and fullscreen; we add a captions toggle and an
   interactive transcript (click a line to jump there).

   YouTube/Vimeo promos (video_url is a link) play in the provider's own
   embedded player, which has its own captions and fullscreen controls; the
   caption text is shown as a plain transcript.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, guard = CE.guard;
  var id = CE.param('id'), promo = null, cues = [];

  function render() {
    var src = CE.mediaUrl(promo.video_url), link = CE.videoLink(promo.video_url);
    ui.setTitle(promo.title);
    var player = link
      ? '<iframe id="embed" class="block w-full aspect-video border-0 bg-ink-950" src="' + esc(link.embed) + '" title="' + esc(promo.title) + ' (' + esc(link.label) + ' video)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
      // preload="metadata": only headers are fetched until the user presses play (lazy media)
      : '<video id="video" class="w-full aspect-video bg-ink-950" controls playsinline preload="metadata" poster="' + CE.dice.glass(promo.id) + '" aria-label="' + esc(promo.title) + '" aria-describedby="promo-desc">' +
        '<source src="' + esc(src) + '">' +
        '<p class="p-6 text-white">Your browser can’t play this video. <a class="underline" href="' + esc(src) + '" download>Download it</a> and read the transcript below.</p>' +
        '</video>';
    var tools = link
      ? '<span class="inline-flex items-center gap-2 text-sm text-ink-600">' + icon('cc', 'w-4 h-4') + 'Captions and fullscreen are in the player’s controls.</span>' +
        '<a href="' + esc(link.watch) + '" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">' + icon('external', 'w-4 h-4') + 'Watch on ' + esc(link.label) + '<span class="sr-only"> (opens in new tab)</span></a>'
      : '<button type="button" id="cc-btn" class="btn btn-sm btn-primary" aria-pressed="true" ' + (promo.caption_text ? '' : 'disabled') + '>' + icon('cc', 'w-4 h-4') + '<span>Captions on</span></button>' +
        '<button type="button" id="fs-btn" class="btn btn-sm btn-ghost">' + icon('external', 'w-4 h-4') + 'Fullscreen</button>' +
        '<a href="' + esc(src) + '" download class="btn btn-sm btn-ghost">' + icon('download', 'w-4 h-4') + 'Download</a>';
    var html = '<div class="grid lg:grid-cols-[1fr_22rem] gap-8 items-start">' +
      '<div class="min-w-0">' +
      '<div class="crop-marks reveal"><div class="relative rounded-[1.5rem] overflow-hidden bg-ink-950 shadow-lift">' +
      player + '</div></div>' +
      '<div class="mt-4 md:mt-12 flex flex-wrap items-center gap-2 reveal">' + tools +
      '<span id="video-error" class="hidden text-sm text-ember-700" role="alert"></span></div>' +
      '<header class="mt-8 reveal"><div class="flex flex-wrap items-center gap-2 mb-3"><span class="badge badge-ink">' + icon('film', 'w-3 h-3') + 'Promo</span>' +
      (promo.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '') +
      '<span class="text-xs text-ink-500">' + esc(fmt.date(promo.created_at)) + '</span></div>' +
      '<h1 class="font-display text-3xl sm:text-5xl leading-tight text-ink-900">' + esc(promo.title) + '</h1>' +
      '<p id="promo-desc" class="mt-4 text-lg text-ink-700 leading-relaxed whitespace-pre-line max-w-3xl">' + esc(promo.description || '') + '</p></header>' +
      '</div>' +

      '<aside class="lg:sticky lg:top-24 space-y-4">' +
      // ADMIN-ONLY management card
      (guard.can('promo:edit') ? '<div class="card p-4 reveal" aria-label="Admin controls"><div class="flex items-center justify-between mb-3">' +
        '<span class="badge badge-ember">' + icon('shield', 'w-3 h-3') + 'Admin</span>' +
        '<span class="flex items-center gap-2"><label for="pub-toggle" class="text-sm font-medium text-ink-800">Published</label><input id="pub-toggle" type="checkbox" class="switch" role="switch" ' + (promo.published !== false ? 'checked' : '') + '></span></div>' +
        '<div class="grid grid-cols-2 gap-2"><a href="promo-form.html?id=' + encodeURIComponent(promo.id) + '" class="btn btn-ghost btn-sm">' + icon('edit', 'w-4 h-4') + 'Edit</a>' +
        (guard.can('promo:delete') ? '<button type="button" id="del-btn" class="btn btn-danger btn-sm">' + icon('trash', 'w-4 h-4') + 'Delete</button>' : '') + '</div></div>' : '') +
      '<section class="card overflow-hidden reveal" aria-labelledby="tr-h"><div class="px-5 py-4 border-b border-paper-200 flex items-center justify-between">' +
      '<h2 id="tr-h" class="font-display text-xl text-ink-900">Transcript</h2>' + (link ? '' : '<span class="text-xs text-ink-500">Click a line to jump</span>') + '</div>' +
      '<ol id="transcript" class="max-h-[28rem] overflow-y-auto p-2 text-sm" aria-label="Transcript lines">' +
      (promo.caption_text ? '' : '<li class="p-4 text-ink-500">No captions or transcript were provided for this promo.</li>') + '</ol></section>' +
      '</aside></div>';

    $('#promo-root').attr('aria-busy', 'false').html(html);
    ui.reveal($('#promo-root'));
    bind();
  }

  function renderTranscript() {
    if (!cues.length) return;
    $('#transcript').html(cues.map(function (c, i) {
      return '<li><button type="button" class="tr-line w-full text-left flex gap-3 rounded-lg px-3 py-2 hover:bg-paper-100 transition" data-i="' + i + '">' +
        '<span class="font-mono text-xs text-ink-400 pt-0.5 shrink-0">' + fmt.duration(c.start) + '</span><span class="text-ink-700">' + esc(c.text) + '</span></button></li>';
    }).join(''));
  }

  // Linked (YouTube/Vimeo) promos: the transcript is plain text, since the
  // embedded player's timeline can't be read or controlled from here.
  function bindEmbed() {
    if (promo.caption_text) {
      var lines = CE.captions.cues(promo.caption_text, 60);
      $('#transcript').html(lines.map(function (c) { return '<li class="px-3 py-2 text-ink-700">' + esc(c.text) + '</li>'; }).join(''));
    }
  }

  function bind() {
    bindAdmin();
    if (!document.getElementById('video')) return bindEmbed();
    var v = document.getElementById('video');
    var ccOn = true;

    function buildCaptions() {
      cues = CE.captions.attach(v, promo.caption_text);
      renderTranscript();
      setCC(ccOn);
    }
    function setCC(on) {
      ccOn = on;
      for (var i = 0; i < v.textTracks.length; i++) if (v.textTracks[i].kind === 'captions') v.textTracks[i].mode = on ? 'showing' : 'hidden';
      $('#cc-btn').attr('aria-pressed', String(on)).toggleClass('btn-primary', on).toggleClass('btn-ghost', !on)
        .find('span').text(on ? 'Captions on' : 'Captions off');
    }
    // Before metadata we build provisional captions; rebuild once the real duration is known.
    if (promo.caption_text) buildCaptions();
    v.addEventListener('loadedmetadata', function () { if (promo.caption_text && !CE.captions.isVtt(promo.caption_text)) buildCaptions(); });
    v.addEventListener('error', showErr, true);
    $(v).find('source').on('error', showErr);
    function showErr() { $('#video-error').removeClass('hidden').text('The video couldn’t be loaded. Try downloading it instead.'); }

    // highlight the active transcript line
    v.addEventListener('timeupdate', function () {
      var t = v.currentTime, idx = -1;
      for (var i = 0; i < cues.length; i++) if (t >= cues[i].start && t < cues[i].end) { idx = i; break; }
      var $lines = $('#transcript .tr-line');
      $lines.removeClass('bg-ember-50 !text-ink-900').removeAttr('aria-current');
      if (idx > -1) {
        var $cur = $lines.eq(idx).addClass('bg-ember-50').attr('aria-current', 'true');
        var box = $('#transcript')[0], el = $cur[0];
        if (el && (el.offsetTop < box.scrollTop || el.offsetTop > box.scrollTop + box.clientHeight - 40)) box.scrollTop = el.offsetTop - 40;
      }
    });
    $('#transcript').on('click', '.tr-line', function () {
      var c = cues[$(this).data('i')]; if (!c) return;
      v.currentTime = c.start + 0.01;
      var p = v.play(); if (p && p.catch) p.catch(function () { });
    });
    // keep our toggle in sync if the user uses the native CC menu
    if (v.textTracks && v.textTracks.addEventListener) v.textTracks.addEventListener('change', function () {
      for (var i = 0; i < v.textTracks.length; i++) if (v.textTracks[i].kind === 'captions') { var on = v.textTracks[i].mode === 'showing'; if (on !== ccOn) setCC(on); }
    });
    $('#cc-btn').on('click', function () { setCC(!ccOn); });
    $('#fs-btn').on('click', function () {
      var el = v; (el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen || function () { }).call(el);
    });

  }

  function bindAdmin() {
    // ADMIN publish toggle (optimistic + revert)
    $('#pub-toggle').on('change', function () {
      var $t = $(this), on = $t.is(':checked');
      $t.prop('disabled', true);
      CE.actions.setPublished('promo', promo.id, on).then(function () {
        promo.published = on;
        ui.toast('success', on ? 'Promo published.' : 'Promo unpublished — hidden from users.');
      }).catch(function (err) { $t.prop('checked', !on); CE.handleError(err); })
        .finally(function () { $t.prop('disabled', false); });
    });
    $('#del-btn').on('click', function () {
      CE.actions.remove({ action: 'promo:delete', path: '/promos/' + promo.id, title: promo.title, cacheKey: 'promos' }).then(function (ok) {
        if (ok) { CE.flash.set('success', 'Promo deleted.'); window.location.href = 'promos.html'; }
      });
    });
  }

  function load() {
    if (!id) { $('#promo-root').html(ui.empty('No promo selected', '', '<a href="promos.html" class="btn btn-primary">See all promos</a>', 'film')); return; }
    CE.api.get('/promos/' + encodeURIComponent(id)).then(function (r) {
      promo = r.data;
      if (!promo || (promo.published === false && !guard.can('content:viewUnpublished'))) throw new CE.ApiError(404, 'Not found');
      render();
    }).catch(function (err) {
      if (err.status === 404 || err.status === 500) $('#promo-root').html(ui.empty('Promo not found', 'It may have been removed or unpublished.', '<a href="promos.html" class="btn btn-primary">See all promos</a>', 'film'));
      else ui.errorState($('#promo-root'), err, load);
    });
  }

  CE.ready(load);
})(jQuery, window.CE);
