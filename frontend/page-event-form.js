/* =========================================================================
   Event create / edit (ADMIN ONLY — page guarded by data-auth="admin")
     POST /api/events      multipart/form-data, file field "image"
     PUT  /api/events/:id  multipart/form-data, optional "image"
   Backend: uploadEventImage.single('image') → metadata.image_url
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, fmt = CE.fmt;
  var id = CE.param('id'), editing = !!id, existing = null, file = null, objectUrl = null;

  function previewEvent() {
    var fake = {
      id: id || 'preview-' + ($('#title').val() || 'new'),
      title: $('#title').val() || 'Your event title',
      description: $('#description').val() || 'A short description will appear here.',
      location: $('#location').val() || 'Location',
      starts_at: $('#starts_at').val() ? new Date($('#starts_at').val()).toISOString() : new Date(Date.now() + 864e5 * 7).toISOString(),
      ends_at: $('#ends_at').val() ? new Date($('#ends_at').val()).toISOString() : null,
      published: $('#published').is(':checked'),
      metadata: { image_url: objectUrl || (existing && existing.metadata && existing.metadata.image_url) || '' }
    };
    $('#preview').html(CE.views.eventCard(fake)).find('.reveal').addClass('is-visible');
  }

  function setImagePreview(src) {
    if (src) { $('#img-preview').attr('src', src).removeClass('hidden').hide().fadeIn(300); }
    else { $('#img-preview').addClass('hidden').attr('src', ''); }
  }

  function validate() {
    var $f = $('#event-form'); ui.clearErrors($f);
    var ok = true;
    var title = $.trim($('#title').val()), loc = $.trim($('#location').val());
    var s = $('#starts_at').val(), e = $('#ends_at').val();
    if (title.length < 3) ok = ui.fieldError($('#title'), 'Give the event a title (at least 3 characters).') && ok;
    if (!loc) ok = ui.fieldError($('#location'), 'Where is it happening?') && ok;
    if (!s) ok = ui.fieldError($('#starts_at'), 'Choose a start date and time.') && ok;
    if (!e) ok = ui.fieldError($('#ends_at'), 'Choose an end date and time.') && ok;
    if (s && e && new Date(e) <= new Date(s)) ok = ui.fieldError($('#ends_at'), 'The end must be after the start.') && ok;
    if (!editing && s && new Date(s) < new Date(Date.now() - 6e4)) ok = ui.fieldError($('#starts_at'), 'New events should start in the future.') && ok;
    if (file) { var fe = ui.validateFile(file, 'image'); if (fe) ok = ui.fieldError($('#image'), fe) && ok; }
    if (!ok) $f.find('[aria-invalid=true]').first().trigger('focus');
    return ok;
  }

  function fill(ev) {
    $('#title').val(ev.title); $('#description').val(ev.description || '').trigger('input');
    $('#location').val(ev.location || '');
    $('#starts_at').val(fmt.toLocalInput(ev.starts_at)); $('#ends_at').val(fmt.toLocalInput(ev.ends_at));
    $('#published').prop('checked', ev.published !== false);
    if (ev.metadata && ev.metadata.image_url) setImagePreview(CE.mediaUrl(ev.metadata.image_url));
  }

  CE.ready(function () {
    var $f = $('#event-form');
    var dirty = CE.forms.dirtyGuard($f);

    if (editing) {
      $('#form-title').text('Edit event'); $('#submit-btn').text('Save changes');
      $('#back-link, #cancel-link').attr('href', 'event.html?id=' + encodeURIComponent(id));
      ui.setTitle('Edit event');
      $f.attr('aria-busy', 'true').find('input, textarea, button').prop('disabled', true);
      CE.api.get('/events/' + encodeURIComponent(id)).then(function (r) {
        existing = r.data; fill(existing); previewEvent();
        $f.attr('aria-busy', 'false').find('input, textarea, button').prop('disabled', false);
        dirty.clean();
      }).catch(function (err) {
        ui.errorState($f, err, function () { window.location.reload(); });
      });
    } else {
      ui.setTitle('New event');
      // sensible defaults: next Saturday 10:00–12:00
      var d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(10, 0, 0, 0);
      $('#starts_at').val(fmt.toLocalInput(d)); $('#ends_at').val(fmt.toLocalInput(new Date(d.getTime() + 2 * 36e5)));
      $('#title').trigger('focus');
    }

    // location suggestions from existing events
    CE.data.events().then(function (list) {
      var seen = {};
      list.forEach(function (e) { if (e.location) seen[e.location.trim()] = 1; });
      $('#loc-suggestions').html(Object.keys(seen).map(function (l) { return '<option value="' + CE.esc(l) + '">'; }).join(''));
    }).catch(function () { });

    $('#description').on('input', function () { $('#desc-count').text(this.value.length); });
    $('#starts_at').on('change', function () {
      // keep end after start automatically
      var s = new Date(this.value), e = new Date($('#ends_at').val());
      if (this.value && (!$('#ends_at').val() || e <= s)) $('#ends_at').val(fmt.toLocalInput(new Date(s.getTime() + 2 * 36e5)));
    });
    $f.on('input change', CE.debounce(previewEvent, 120));
    previewEvent();

    CE.forms.picker({
      zone: '#dropzone', input: '#image', kind: 'image',
      onChange: function (f) {
        file = f;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = f ? URL.createObjectURL(f) : null;
        setImagePreview(objectUrl || (existing && existing.metadata && existing.metadata.image_url ? CE.mediaUrl(existing.metadata.image_url) : ''));
        $('#img-meta').toggleClass('hidden', !f).toggleClass('flex', !!f).html(f ? CE.forms.fileMeta(f) : '');
        $('#img-clear').toggleClass('hidden', !f);
        previewEvent();
      }
    });
    $('#img-clear').on('click', function () {
      try { $('#image').val(''); } catch (e) { }
      $('#image').trigger('change');
    });

    $f.on('submit', function (e) {
      e.preventDefault();
      if (!CE.guard.can(editing ? 'event:edit' : 'event:create')) return ui.forbiddenModal(); // ACTION GUARD
      if (!validate()) return;

      var fd = new FormData();
      fd.append('title', $.trim($('#title').val()));
      fd.append('description', $.trim($('#description').val()));
      fd.append('location', $.trim($('#location').val()));
      fd.append('starts_at', new Date($('#starts_at').val()).toISOString());
      fd.append('ends_at', new Date($('#ends_at').val()).toISOString());
      fd.append('published', $('#published').is(':checked') ? 'true' : 'false');
      if (file) fd.append('image', file);

      var $btn = $('#submit-btn'), $prog = $f.find('.js-progress');
      ui.busy($btn, true, editing ? 'Saving…' : 'Creating…');
      $f.attr('aria-busy', 'true');
      CE.forms.progress($prog, file ? 0 : null);

      CE.api.upload(editing ? 'PUT' : 'POST', editing ? '/events/' + encodeURIComponent(id) : '/events', fd, function (p) { if (file) CE.forms.progress($prog, p); })
        .then(function (r) {
          dirty.clean();
          CE.cache.invalidate('events');
          CE.cache.invalidate('notifs');
          var saved = r.data || {};
          CE.flash.set('success', editing ? 'Event updated successfully.' : 'Event created — a notification was sent to everyone.');
          window.location.href = 'event.html?id=' + encodeURIComponent(saved.id || id);
        })
        .catch(function (err) {
          ui.busy($btn, false); $f.attr('aria-busy', 'false');
          CE.forms.progress($prog, null);
          if (err.status === 400) ui.applyServerErrors($f, err);
          CE.handleError(err, { retry: function () { $f.trigger('submit'); } });
        });
    });
  });
})(jQuery, window.CE);
