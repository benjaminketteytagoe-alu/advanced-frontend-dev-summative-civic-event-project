/* =========================================================================
   Announcement create / edit (ADMIN ONLY)
     POST  /api/announcements            multipart, file field "audio"
     PUT   /api/announcements/:id        title (audio is kept by the API)
     PATCH /api/announcements/:id/publish | /unpublish
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui;
  var id = CE.param('id'), editing = !!id, existing = null, file = null, url = null;

  function syncSubmitLabel() {
    if (editing) return;
    $('#submit-btn').text($('#published').is(':checked') ? 'Publish announcement' : 'Save as unpublished');
  }

  CE.ready(function () {
    var $f = $('#ann-form'), dirty = CE.forms.dirtyGuard($f);

    if (editing) {
      ui.setTitle('Edit announcement');
      $('#form-title').text('Edit announcement'); $('#submit-btn').text('Save changes');
      $('#audio-row').addClass('hidden'); $('#audio').prop('required', false);
      $('#back-link, #cancel-link').attr('href', 'announcement.html?id=' + encodeURIComponent(id));
      $f.find('input, button').prop('disabled', true);
      CE.api.get('/announcements/' + encodeURIComponent(id)).then(function (r) {
        existing = r.data;
        $('#title').val(existing.title);
        $('#published').prop('checked', existing.published !== false);
        $('#current-audio').removeClass('hidden');
        $('#current-player').attr('src', CE.mediaUrl(existing.audio_url));
        $f.find('input, button').prop('disabled', false);
        dirty.clean();
      }).catch(function (err) { ui.errorState($f, err, function () { window.location.reload(); }); });
    } else {
      ui.setTitle('New announcement');
      $('#title').trigger('focus');
    }
    $('#published').on('change', syncSubmitLabel);

    CE.forms.picker({
      zone: '#dropzone', input: '#audio', kind: 'audio',
      onChange: function (f) {
        file = f;
        if (url) URL.revokeObjectURL(url);
        url = f ? URL.createObjectURL(f) : null;
        $('#audio-preview').toggleClass('hidden', !f);
        if (f) {
          $('#audio-meta').html(CE.forms.fileMeta(f));
          $('#audio-dur').text('');
          var p = document.getElementById('audio-player');
          p.src = url;
          p.onloadedmetadata = function () { $('#audio-dur').text(CE.fmt.duration(p.duration)); };
          p.onerror = function () { $('#audio-dur').text('Preview unavailable in this browser'); };
          if (!$.trim($('#title').val())) $('#title').val(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }));
        }
      }
    });

    $f.on('submit', function (e) {
      e.preventDefault();
      if (!CE.guard.can(editing ? 'announcement:edit' : 'announcement:create')) return ui.forbiddenModal(); // ACTION GUARD
      ui.clearErrors($f);
      var title = $.trim($('#title').val()), pub = $('#published').is(':checked'), ok = true;
      if (title.length < 3) ok = ui.fieldError($('#title'), 'Give the announcement a title (at least 3 characters).') && ok;
      if (!editing && !file) ok = ui.fieldError($('#audio'), 'Choose an audio file to upload.') && ok;
      if (file) { var fe = ui.validateFile(file, 'audio'); if (fe) ok = ui.fieldError($('#audio'), fe) && ok; }
      if (!ok) { $f.find('[aria-invalid=true]').first().trigger('focus'); return; }

      var $btn = $('#submit-btn'), $prog = $f.find('.js-progress');
      ui.busy($btn, true, editing ? 'Saving…' : 'Uploading…');
      var req;
      if (editing) {
        var fd = new FormData(); fd.append('title', title);
        req = CE.api.upload('PUT', '/announcements/' + encodeURIComponent(id), fd).then(function (r) {
          // status changes go through the dedicated publish/unpublish endpoints
          if ((existing.published !== false) !== pub) return CE.actions.setPublished('announcement', id, pub).then(function () { return r; });
          return r;
        });
      } else {
        var fd2 = new FormData();
        fd2.append('title', title);
        fd2.append('published', pub ? 'true' : 'false');
        fd2.append('audio', file);
        CE.forms.progress($prog, 0);
        req = CE.api.upload('POST', '/announcements', fd2, function (p) { CE.forms.progress($prog, p); });
      }
      req.then(function (r) {
        dirty.clean();
        CE.cache.invalidate('announcements'); CE.cache.invalidate('notifs');
        CE.flash.set('success', editing ? 'Announcement updated.' : 'Announcement uploaded — members have been notified.');
        window.location.href = 'announcement.html?id=' + encodeURIComponent((r.data && r.data.id) || id);
      }).catch(function (err) {
        ui.busy($btn, false); CE.forms.progress($prog, null);
        if (err.status === 400) ui.applyServerErrors($f, err);
        CE.handleError(err, { retry: function () { $f.trigger('submit'); } });
      });
    });
  });
})(jQuery, window.CE);
