// Promo form: make a new promo, or edit one when the address has an id.
// The video is either an uploaded file or a YouTube or Vimeo link
(function ($, CE) {
  'use strict';
  var ui = CE.ui, esc = CE.esc, fmt = CE.fmt;

  var id = CE.param('id');
  var editing = !!id;      // !! turns the id into true or false
  var old = null;          // the promo being edited
  var source = 'file';     // file or link
  var file = null;         // the chosen video
  var preview = null;      // a temporary address for playing it here
  var video;               // the preview player
  var unsaved;             // warns before leaving with unsaved changes

  function typed(name) { return $.trim($('#' + name).val()); }
  function isPublished() { return $('#published').is(':checked'); }
  function typedLink() { return CE.videoLink(typed('video_link')); } // nothing when it is not a good link
  function oldLink() { return old ? CE.videoLink(old.video_url) : null; }

  // ---------- preview ----------

  function linkHint(link) {
    if (link) return link.label + ' video. ' + link.label + ' shows its own captions, and your caption text becomes the transcript.';
    if (typed('video_link')) return 'That doesn’t look like a YouTube or Vimeo link yet.';
    return 'Paste a link to preview the video here.';
  }

  function fileHint() {
    if (file) return 'Previewing your file here. Nothing is uploaded until you save.';
    if (old && !oldLink()) return 'Current video. Edit the captions to see them change.';
    return 'Choose a video to preview it here with your captions.';
  }

  function showLink() {
    var link = typedLink(), $frame = $('#preview-embed');
    video.pause();
    if (!link) $frame.removeAttr('src');
    else if ($frame.attr('src') !== link.embed) $frame.attr('src', link.embed); // setting it again would restart it
    $('#preview-hint').text(linkHint(link));
  }

  function showFile() {
    $('#preview-embed').removeAttr('src'); // stops the linked video
    $('#preview-hint').text(fileHint());
  }

  // Show the parts that belong to the chosen source
  function showPreview() {
    var isLink = source === 'link';
    $('#source-file, #preview, #timeline-box').prop('hidden', isLink);
    $('#source-link, #preview-embed').prop('hidden', !isLink);
    $('#preview-title').text(isLink ? 'Preview' : 'Preview with captions');
    if (isLink) showLink();
    else showFile();
  }

  function setSource(name) {
    source = name;
    $('input[name=video_source][value=' + name + ']').prop('checked', true);
    ui.fieldError($('#video'), '');
    ui.fieldError($('#video_link'), '');
    showPreview();
  }

  function changeLink() {
    ui.fieldError($('#video_link'), '');
    showPreview();
  }

  // Play the new file, or the saved one, or nothing
  function setVideo() {
    if (file) video.src = preview;
    else if (old && !oldLink()) video.src = CE.mediaUrl(old.video_url);
    else video.removeAttribute('src');
  }

  function changeFile(f) {
    file = f;
    if (preview) URL.revokeObjectURL(preview); // free the last one
    preview = f ? URL.createObjectURL(f) : null;
    $('#video-meta').toggleClass('hidden', !f).toggleClass('flex', !!f).html(f ? CE.forms.fileMeta(f) : '');
    setVideo();
    showPreview();
  }

  // ---------- captions ----------

  function cueLine(c) {
    return '<li class="flex gap-3 rounded-lg bg-white/70 border border-paper-200 px-3 py-1.5">' +
      '<span class="font-mono text-ink-500 shrink-0">' + fmt.duration(c.start) + '–' + fmt.duration(c.end) + '</span>' +
      '<span class="text-ink-700 min-w-0 break-words">' + esc(c.text) + '</span></li>';
  }

  function showCaptions() {
    var cues = CE.captions.attach(video, $('#caption_text').val());
    $('#cue-list').html(cues.length ? cues.map(cueLine).join('') : '<li class="text-ink-500">No captions yet.</li>');
  }

  // ---------- saving ----------

  function checkVideo() {
    if (source === 'file') {
      if (editing || file) return true;
      return ui.fieldError($('#video'), 'Choose a video file to upload.');
    }
    if (typedLink()) return true;
    return ui.fieldError($('#video_link'), 'Paste a YouTube or Vimeo link, e.g. https://www.youtube.com/watch?v=… or https://vimeo.com/…');
  }

  // Check the form. True when everything is fine
  function check() {
    var ok = true;
    ui.clearErrors($('#promo-form'));
    if (typed('title').length < 3) ok = ui.fieldError($('#title'), 'Give the promo a title (at least 3 characters).');
    if (!typed('description')) ok = ui.fieldError($('#description'), 'A short description is required.');
    if (!checkVideo()) ok = false;
    if (!typed('caption_text')) ok = ui.fieldError($('#caption_text'), 'Captions are required so everyone can follow along.');
    if (!ok) $('#promo-form [aria-invalid=true]').first().trigger('focus');
    return ok;
  }

  function sendingFile() { return source === 'file' && !!file; }
  function showProgress(percent) { CE.forms.progress($('#promo-form .js-progress'), percent); }

  function formData() {
    var data = new FormData();
    data.append('title', typed('title'));
    data.append('description', typed('description'));
    data.append('caption_text', typed('caption_text'));
    if (!editing) data.append('published', isPublished() ? 'true' : 'false');
    if (sendingFile()) data.append('video', file);
    if (source === 'link') data.append('video_link', typedLink().watch);
    return data;
  }

  // Publishing an old promo has its own address, because it also notifies everyone
  function savePublished(reply) {
    if (!editing || isPublished() === (old.published !== false)) return reply;
    return CE.actions.setPublished('promo', id, isPublished()).then(function () { return reply; });
  }

  function send() {
    var onProgress = sendingFile() ? showProgress : null;
    if (onProgress) showProgress(0);
    if (editing) return CE.api.upload('PUT', '/promos/' + encodeURIComponent(id), formData(), onProgress).then(savePublished);
    return CE.api.upload('POST', '/promos', formData(), onProgress);
  }

  function doneMessage() {
    if (editing) return 'Promo updated.';
    if (isPublished()) return 'Promo published. Members were notified.';
    return 'Promo saved as a draft. Only admins can see it.';
  }

  // Saved: go to the promo's page
  function done(reply) {
    unsaved.clean();
    CE.cache.invalidate('promos');
    CE.cache.invalidate('notifs');
    CE.flash.set('success', doneMessage());
    window.location.href = 'promo.html?id=' + encodeURIComponent(reply.data.id);
  }

  function failed(err) {
    ui.busy($('#submit-btn'), false);
    showProgress(null);
    if (err.status === 400) ui.applyServerErrors($('#promo-form'), err);
    CE.handleError(err, { retry: function () { $('#promo-form').trigger('submit'); } });
  }

  function submit(e) {
    e.preventDefault();
    if (!CE.guard.can(editing ? 'promo:edit' : 'promo:create')) return ui.forbiddenModal();
    if (!check()) return;
    ui.busy($('#submit-btn'), true, sendingFile() ? 'Uploading…' : 'Saving…');
    send().then(done).catch(failed);
  }

  // ---------- start ----------

  function lock(on) { $('#promo-form').find('input, textarea, button').prop('disabled', on); }

  function fill(reply) {
    old = reply.data;
    $('#title').val(old.title);
    $('#description').val(old.description);
    $('#caption_text').val(old.caption_text);
    $('#published').prop('checked', old.published !== false);
    lock(false);
    if (oldLink()) $('#video_link').val(oldLink().watch);
    setVideo();
    setSource(oldLink() ? 'link' : 'file');
    showCaptions();
    unsaved.clean();
  }

  // Set the page up for editing, and load the promo
  function startEdit() {
    ui.setTitle('Edit promo');
    $('#form-title').text('Edit promo');
    $('#submit-btn').text('Save changes');
    $('#video-req').remove();
    $('#video-hint').text('Optional. Upload a new file to replace the current video (MP4, MOV, AVI or MKV up to 8 MB).');
    $('#link-hint').text('Paste a new YouTube or Vimeo link to replace the current video.');
    $('#back-link, #cancel-link').attr('href', 'promo.html?id=' + encodeURIComponent(id));
    lock(true);
    CE.api.get('/promos/' + encodeURIComponent(id)).then(fill).catch(function (err) {
      ui.errorState($('#promo-form'), err, function () { window.location.reload(); });
    });
  }

  function startNew() {
    ui.setTitle('New promo');
    $('#title').trigger('focus');
    showCaptions();
  }

  CE.ready(function () {
    video = $('#preview')[0];
    unsaved = CE.forms.dirtyGuard($('#promo-form'));
    if (editing) startEdit();
    else startNew();

    $(video).on('loadedmetadata', showCaptions); // the length is known now
    $('#caption_text').on('input', CE.debounce(showCaptions, 300));
    $('input[name=video_source]').on('change', function () { setSource(this.value); });
    $('#video_link').on('input', CE.debounce(changeLink, 350));
    $('#promo-form').on('submit', submit);
    CE.forms.picker({ zone: '#dropzone', input: '#video', kind: 'video', onChange: changeFile }); // checks size and type
  });
})(jQuery, window.CE);
