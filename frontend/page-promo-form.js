/* =========================================================================
   Promo create / edit (ADMIN ONLY)
     POST  /api/promos        multipart: title, description, caption_text,
                              plus either video (file) or video_link (YouTube/Vimeo URL)
     PUT   /api/promos/:id    multipart: same fields, video / video_link optional
     PATCH /api/promos/:id/publish | /unpublish
   Backend: uploadPromoVideo.single('video')
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, esc = CE.esc;
  var id = CE.param('id'), editing = !!id, existing = null, file = null, url = null;
  var source = 'file'; // 'file' = upload, 'link' = YouTube/Vimeo URL

  // Show the chosen source's input and the matching preview (video vs iframe).
  function setSource(next) {
    source = next;
    $('input[name=video_source][value=' + next + ']').prop('checked', true);
    $('#source-file').prop('hidden', next !== 'file');
    $('#source-link').prop('hidden', next !== 'link');
    ui.fieldError($('#video'), ''); ui.fieldError($('#video_link'), '');
    refreshPreview();
  }

  function refreshPreview() {
    var v = document.getElementById('preview'), $embed = $('#preview-embed');
    var link = source === 'link' ? CE.videoLink($('#video_link').val()) : null;
    $(v).prop('hidden', source === 'link'); $embed.prop('hidden', source !== 'link');
    // timed captions only apply to uploaded files; linked players show their own
    $('#timeline-box').prop('hidden', source === 'link');
    $('#preview-title').text(source === 'link' ? 'Preview' : 'Preview with captions');
    if (source === 'link') {
      if (!v.paused) v.pause();
      if (link) {
        if ($embed.attr('src') !== link.embed) $embed.attr('src', link.embed);
        $('#preview-hint').text(link.label + ' video. ' + link.label + ' shows its own captions; your caption text below becomes the transcript.');
      } else {
        $embed.removeAttr('src');
        $('#preview-hint').text($.trim($('#video_link').val()) ? 'That doesn’t look like a YouTube or Vimeo link yet.' : 'Paste a link to preview the video here.');
      }
    } else {
      $embed.removeAttr('src');
      $('#preview-hint').text(file ? 'Previewing your file locally — nothing is uploaded until you save.' : (existing && !CE.videoLink(existing.video_url) ? 'Current video. Edit the captions to see them update live.' : 'Choose a video to preview it here with your captions overlaid.'));
    }
  }

  function refreshCaptions() {
    var v = document.getElementById('preview');
    var cues = CE.captions.attach(v, $('#caption_text').val());
    $('#cue-list').html(cues.length ? cues.map(function (c) {
      return '<li class="flex gap-3 rounded-lg bg-white/70 border border-paper-200 px-3 py-1.5"><span class="font-mono text-ink-400 shrink-0">' + CE.fmt.duration(c.start) + '–' + CE.fmt.duration(c.end) + '</span><span class="text-ink-700">' + esc(c.text) + '</span></li>';
    }).join('') : '<li class="text-ink-400">No captions yet.</li>');
  }

  CE.ready(function () {
    var $f = $('#promo-form'), dirty = CE.forms.dirtyGuard($f);
    var v = document.getElementById('preview');
    v.addEventListener('loadedmetadata', refreshCaptions);

    if (editing) {
      ui.setTitle('Edit promo');
      $('#form-title').text('Edit promo'); $('#submit-btn').text('Save changes');
      $('#video-req').remove(); $('#video-hint').text('Optional — upload a new file to replace the current video (MP4, MOV, AVI or MKV up to 8 MB).');
      $('#link-hint').text('Optional — paste a new YouTube or Vimeo link to replace the current video.');
      $('#back-link, #cancel-link').attr('href', 'promo.html?id=' + encodeURIComponent(id));
      $f.find('input, textarea, button').prop('disabled', true);
      CE.api.get('/promos/' + encodeURIComponent(id)).then(function (r) {
        existing = r.data;
        $('#title').val(existing.title); $('#description').val(existing.description || '');
        $('#caption_text').val(existing.caption_text || '');
        $('#published').prop('checked', existing.published !== false);
        $f.find('input, textarea, button').prop('disabled', false);
        var link = CE.videoLink(existing.video_url);
        if (link) { $('#video_link').val(link.watch); setSource('link'); }
        else { v.src = CE.mediaUrl(existing.video_url); setSource('file'); }
        refreshCaptions(); dirty.clean();
      }).catch(function (err) { ui.errorState($f, err, function () { window.location.reload(); }); });
    } else {
      ui.setTitle('New promo');
      $('#title').trigger('focus');
      refreshCaptions();
    }

    $('#caption_text').on('input', CE.debounce(refreshCaptions, 300));
    $('input[name=video_source]').on('change', function () { if (this.checked) setSource(this.value); });
    $('#video_link').on('input', CE.debounce(function () { ui.fieldError($('#video_link'), ''); refreshPreview(); }, 350));

    CE.forms.picker({
      zone: '#dropzone', input: '#video', kind: 'video',
      onChange: function (f) {
        file = f;
        if (url) URL.revokeObjectURL(url);
        url = f ? URL.createObjectURL(f) : null;
        $('#video-meta').toggleClass('hidden', !f).toggleClass('flex', !!f).html(f ? CE.forms.fileMeta(f) : '');
        if (f) v.src = url;
        else if (existing && !CE.videoLink(existing.video_url)) v.src = CE.mediaUrl(existing.video_url);
        else v.removeAttribute('src');
        refreshPreview();
      }
    });

    $f.on('submit', function (e) {
      e.preventDefault();
      if (!CE.guard.can(editing ? 'promo:edit' : 'promo:create')) return ui.forbiddenModal(); // ACTION GUARD
      ui.clearErrors($f);
      var title = $.trim($('#title').val()), desc = $.trim($('#description').val()), cap = $.trim($('#caption_text').val());
      var pub = $('#published').is(':checked'), ok = true;
      if (title.length < 3) ok = ui.fieldError($('#title'), 'Give the promo a title (at least 3 characters).') && ok;
      if (!desc) ok = ui.fieldError($('#description'), 'A short description is required.') && ok;
      var linkRaw = $.trim($('#video_link').val()), link = CE.videoLink(linkRaw);
      // a link only replaces the video when it's new (or the promo isn't a link yet)
      var sendLink = source === 'link' && link && !(existing && existing.video_url === link.watch);
      var sendFile = source === 'file' && file;
      if (source === 'file') {
        if (!editing && !file) ok = ui.fieldError($('#video'), 'Choose a video file to upload.') && ok;
        if (file) { var fe = ui.validateFile(file, 'video'); if (fe) ok = ui.fieldError($('#video'), fe) && ok; }
      } else if (linkRaw && !link) {
        ok = ui.fieldError($('#video_link'), 'Paste a YouTube or Vimeo link, e.g. https://www.youtube.com/watch?v=… or https://vimeo.com/…') && ok;
      } else if (!link && !(editing && CE.videoLink(existing && existing.video_url))) {
        ok = ui.fieldError($('#video_link'), 'Paste a YouTube or Vimeo link.') && ok;
      }
      if (!cap) ok = ui.fieldError($('#caption_text'), 'Captions are required so everyone can follow along.') && ok;
      if (!ok) { $f.find('[aria-invalid=true]').first().trigger('focus'); return; }

      var fd = new FormData();
      fd.append('title', title); fd.append('description', desc); fd.append('caption_text', cap);
      if (!editing) fd.append('published', pub ? 'true' : 'false');
      if (sendFile) fd.append('video', file);
      if (sendLink) fd.append('video_link', link.watch);

      var $btn = $('#submit-btn'), $prog = $f.find('.js-progress');
      ui.busy($btn, true, sendFile ? 'Uploading…' : 'Saving…');
      CE.forms.progress($prog, sendFile ? 0 : null);

      CE.api.upload(editing ? 'PUT' : 'POST', editing ? '/promos/' + encodeURIComponent(id) : '/promos', fd, function (p) { if (sendFile) CE.forms.progress($prog, p); })
        .then(function (r) {
          var saved = r.data || {}, pid = saved.id || id;
          var wasPub = editing ? existing.published !== false : saved.published !== false;
          return (wasPub !== pub ? CE.actions.setPublished('promo', pid, pub) : Promise.resolve()).then(function () { return pid; });
        })
        .then(function (pid) {
          dirty.clean();
          CE.cache.invalidate('promos'); CE.cache.invalidate('notifs');
          CE.flash.set('success', editing ? 'Promo updated.' : (sendLink ? 'Promo added' : 'Promo uploaded') + (pub ? ' and published — members were notified.' : ' as unpublished.'));
          window.location.href = 'promo.html?id=' + encodeURIComponent(pid);
        })
        .catch(function (err) {
          ui.busy($btn, false); CE.forms.progress($prog, null);
          if (err.status === 400) ui.applyServerErrors($f, err);
          CE.handleError(err, { retry: function () { $f.trigger('submit'); } });
        });
    });
  });
})(jQuery, window.CE);
