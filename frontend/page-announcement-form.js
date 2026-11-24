// Announcement form: make a new one, or edit one when the address has an id
(function ($, CE) {
  'use strict';
  var ui = CE.ui;

  var id = CE.param('id');
  var editing = !!id;      // !! turns the id into true or false
  var old = null;          // the announcement being edited
  var file = null;         // the chosen audio file
  var preview = null;      // a temporary address for playing it here
  var unsaved;             // warns before leaving with unsaved changes

  function buttonText() {
    if (editing) return 'Save changes';
    return $('#published').is(':checked') ? 'Publish announcement' : 'Save as unpublished';
  }

  function showButtonText() { $('#submit-btn').text(buttonText()); }

  function lock(on) { $('#ann-form').find('input, button').prop('disabled', on); }

  // my-road_news.mp3 becomes My Road News
  function titleFrom(name) {
    var words = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    return words.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  // Let the admin listen before uploading
  function showPreview() {
    var player = $('#audio-player')[0];
    $('#audio-meta').html(CE.forms.fileMeta(file));
    $('#audio-dur').text('');
    player.onloadedmetadata = function () { $('#audio-dur').text(CE.fmt.duration(player.duration)); };
    player.onerror = function () { $('#audio-dur').text('Preview unavailable in this browser'); };
    player.src = preview;
  }

  function changeFile(f) {
    file = f;
    $('#audio-player')[0].pause();
    if (preview) URL.revokeObjectURL(preview); // free the last one
    preview = f ? URL.createObjectURL(f) : null;

    $('#audio-preview').toggleClass('hidden', !f);
    if (!f) return;
    showPreview();
    if (!$.trim($('#title').val())) $('#title').val(titleFrom(f.name));
  }

  // Check the form. True when everything is fine
  function check() {
    var ok = true;
    ui.clearErrors($('#ann-form'));

    if ($.trim($('#title').val()).length < 3) {
      ok = ui.fieldError($('#title'), 'Give the announcement a title (at least 3 characters).');
    }
    if (!editing && !file) {
      ok = ui.fieldError($('#audio'), 'Choose an audio file to upload.');
    }
    if (!ok) $('#ann-form [aria-invalid=true]').first().trigger('focus');
    return ok;
  }

  function showProgress(percent) { CE.forms.progress($('#ann-form .js-progress'), percent); }

  // Send the title, and the file if there is one
  function send(method, path, data) {
    data.append('title', $.trim($('#title').val()));
    if (!file) return CE.api.upload(method, path, data);

    data.append('audio', file);
    showProgress(0);
    return CE.api.upload(method, path, data, showProgress);
  }

  function saveNew(published) {
    var data = new FormData();
    data.append('published', published ? 'true' : 'false');
    return send('POST', '/announcements', data);
  }

  // Publishing has its own address, because it also notifies everyone
  function saveEdit(published) {
    var wasPublished = old.published !== false;
    return send('PUT', '/announcements/' + encodeURIComponent(id), new FormData()).then(function (reply) {
      if (published === wasPublished) return reply;
      return CE.actions.setPublished('announcement', id, published).then(function () { return reply; });
    });
  }

  function doneMessage(published) {
    if (editing) return 'Announcement updated.';
    if (published) return 'Announcement uploaded. Members have been notified.';
    return 'Announcement saved as a draft. Only admins can see it.';
  }

  // Saved: go to the announcement's page
  function done(reply, published) {
    unsaved.clean();
    CE.cache.invalidate('announcements');
    CE.cache.invalidate('notifs');
    CE.flash.set('success', doneMessage(published));
    window.location.href = 'announcement.html?id=' + encodeURIComponent(reply.data.id);
  }

  function failed(err) {
    ui.busy($('#submit-btn'), false);
    showProgress(null);
    if (err.status === 400) ui.applyServerErrors($('#ann-form'), err);
    CE.handleError(err, { retry: function () { $('#ann-form').trigger('submit'); } });
  }

  function submit(e) {
    e.preventDefault();
    if (!CE.guard.can(editing ? 'announcement:edit' : 'announcement:create')) return ui.forbiddenModal();
    if (!check()) return;

    var published = $('#published').is(':checked');
    ui.busy($('#submit-btn'), true, editing ? 'Saving…' : 'Uploading…');
    (editing ? saveEdit(published) : saveNew(published))
      .then(function (reply) { done(reply, published); })
      .catch(failed);
  }

  function fill(reply) {
    old = reply.data;
    $('#title').val(old.title);
    $('#published').prop('checked', old.published !== false);
    $('#current-audio').removeClass('hidden');
    $('#current-player').attr('src', CE.mediaUrl(old.audio_url));
    lock(false);
    unsaved.clean();
  }

  // Set the page up for editing, and load the announcement
  function startEdit() {
    ui.setTitle('Edit announcement');
    $('#form-title').text('Edit announcement');
    $('#audio-label').text('New audio file (leave empty to keep the current one)');
    $('#audio').prop('required', false);
    $('#back-link, #cancel-link').attr('href', 'announcement.html?id=' + encodeURIComponent(id));
    lock(true);
    CE.api.get('/announcements/' + encodeURIComponent(id)).then(fill).catch(function (err) {
      ui.errorState($('#ann-form'), err, function () { window.location.reload(); });
    });
  }

  function startNew() {
    ui.setTitle('New announcement');
    $('#title').trigger('focus');
  }

  // Start
  CE.ready(function () {
    unsaved = CE.forms.dirtyGuard($('#ann-form'));
    if (editing) startEdit();
    else startNew();

    showButtonText();
    $('#published').on('change', showButtonText);
    $('#ann-form').on('submit', submit);
    CE.forms.picker({ zone: '#dropzone', input: '#audio', kind: 'audio', onChange: changeFile }); // checks size and type
  });
})(jQuery, window.CE);
