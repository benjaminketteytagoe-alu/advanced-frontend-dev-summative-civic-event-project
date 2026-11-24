// Event form: make a new event, or edit one when the address has an id
(function ($, CE) {
  'use strict';
  var ui = CE.ui, fmt = CE.fmt, esc = CE.esc;

  var id = CE.param('id');
  var editing = !!id;      // !! turns the id into true or false
  var old = null;          // the event being edited
  var file = null;         // the chosen image
  var preview = '';        // a temporary address for showing it here
  var unsaved;             // warns before leaving with unsaved changes
  var hour = 60 * 60 * 1000;

  function typed(name) { return $.trim($('#' + name).val()); }
  function isoDate(name) { return typed(name) ? new Date(typed(name)).toISOString() : null; }
  function isPublished() { return $('#published').is(':checked'); }

  // ---------- the picture ----------

  function oldImage() { return old && old.metadata ? CE.mediaUrl(old.metadata.image_url) : ''; }

  // The new one, or the saved one, or none
  function showImage() {
    var address = preview || oldImage();
    $('#img-preview').attr('src', address).toggleClass('hidden', !address);
  }

  function changeFile(f) {
    file = f;
    if (preview) URL.revokeObjectURL(preview); // free the last one
    preview = f ? URL.createObjectURL(f) : '';

    $('#img-meta').toggleClass('hidden', !f).toggleClass('flex', !!f).html(f ? CE.forms.fileMeta(f) : '');
    $('#img-clear').toggleClass('hidden', !f);
    showImage();
    showCard();
  }

  function clearFile() { $('#image').val('').trigger('change'); }

  // ---------- the live preview ----------

  // Draw the card as it will look, using what is typed so far
  function showCard() {
    var card = CE.views.eventCard({
      id: id || 'preview',
      title: typed('title') || 'Your event title',
      description: typed('description') || 'A short description will appear here.',
      location: typed('location') || 'Location',
      starts_at: isoDate('starts_at'),
      ends_at: isoDate('ends_at'),
      published: isPublished(),
      metadata: { image_url: preview || oldImage() }
    });
    $('#preview').html(card).find('.reveal').addClass('is-visible');
  }

  function showLetters() { $('#desc-count').text($('#description').val().length); }

  // ---------- dates ----------

  // Next Saturday at 10 in the morning. Sunday is day 0 and Saturday is day 6
  function nextSaturday() {
    var d = new Date();
    var wait = 6 - d.getDay();
    if (wait === 0) wait = 7; // today is Saturday, so take the next one
    d.setDate(d.getDate() + wait);
    d.setHours(10, 0, 0, 0);
    return d;
  }

  function setEnd(start) { $('#ends_at').val(fmt.toLocalInput(new Date(start.getTime() + 2 * hour))); }

  // Move the end when it is no longer after the start
  function changeStart() {
    if (!typed('starts_at')) return;
    var start = new Date(typed('starts_at'));
    if (!typed('ends_at') || new Date(typed('ends_at')) <= start) setEnd(start);
  }

  // ---------- saving ----------

  function checkDates() {
    var ok = true;
    var start = new Date(typed('starts_at')), end = new Date(typed('ends_at'));
    if (!typed('starts_at')) ok = ui.fieldError($('#starts_at'), 'Choose a start date and time.');
    if (!typed('ends_at')) ok = ui.fieldError($('#ends_at'), 'Choose an end date and time.');
    if (end <= start) ok = ui.fieldError($('#ends_at'), 'The end must be after the start.');
    if (!editing && start < new Date()) ok = ui.fieldError($('#starts_at'), 'New events should start in the future.');
    return ok;
  }

  // Check the form. True when everything is fine
  function check() {
    var ok = true;
    ui.clearErrors($('#event-form'));
    if (typed('title').length < 3) ok = ui.fieldError($('#title'), 'Give the event a title (at least 3 characters).');
    if (!typed('location')) ok = ui.fieldError($('#location'), 'Where is it happening?');
    if (!checkDates()) ok = false;
    if (!ok) $('#event-form [aria-invalid=true]').first().trigger('focus');
    return ok;
  }

  function showProgress(percent) { CE.forms.progress($('#event-form .js-progress'), percent); }

  function formData() {
    var data = new FormData();
    data.append('title', typed('title'));
    data.append('description', typed('description'));
    data.append('location', typed('location'));
    data.append('starts_at', isoDate('starts_at'));
    data.append('ends_at', isoDate('ends_at'));
    data.append('published', isPublished() ? 'true' : 'false');
    if (file) data.append('image', file);
    return data;
  }

  // A new event uses POST, an edit uses PUT
  function send() {
    if (file) showProgress(0);
    var onProgress = file ? showProgress : null;
    if (editing) return CE.api.upload('PUT', '/events/' + encodeURIComponent(id), formData(), onProgress);
    return CE.api.upload('POST', '/events', formData(), onProgress);
  }

  function doneMessage(event) {
    if (editing) return 'Event updated successfully.';
    if (event.published) return 'Event created. A notification was sent to everyone.';
    return 'Event saved as a draft. Only admins can see it.';
  }

  // Saved: go to the event's page
  function done(reply) {
    unsaved.clean();
    CE.cache.invalidate('events');
    CE.cache.invalidate('notifs');
    CE.flash.set('success', doneMessage(reply.data));
    window.location.href = 'event.html?id=' + encodeURIComponent(reply.data.id);
  }

  function failed(err) {
    ui.busy($('#submit-btn'), false);
    showProgress(null);
    if (err.status === 400) ui.applyServerErrors($('#event-form'), err);
    CE.handleError(err, { retry: function () { $('#event-form').trigger('submit'); } });
  }

  function submit(e) {
    e.preventDefault();
    if (!CE.guard.can(editing ? 'event:edit' : 'event:create')) return ui.forbiddenModal();
    if (!check()) return;
    ui.busy($('#submit-btn'), true, editing ? 'Saving…' : 'Creating…');
    send().then(done).catch(failed);
  }

  // ---------- start ----------

  function lock(on) {
    $('#event-form').attr('aria-busy', String(on)).find('input, textarea, button').prop('disabled', on);
  }

  function fill(reply) {
    old = reply.data;
    $('#title').val(old.title);
    $('#description').val(old.description || '');
    $('#location').val(old.location || '');
    $('#starts_at').val(fmt.toLocalInput(old.starts_at));
    $('#ends_at').val(fmt.toLocalInput(old.ends_at));
    $('#published').prop('checked', old.published !== false);
    showLetters();
    showImage();
    showCard();
    lock(false);
    unsaved.clean();
  }

  // Set the page up for editing, and load the event
  function startEdit() {
    ui.setTitle('Edit event');
    $('#form-title').text('Edit event');
    $('#submit-btn').text('Save changes');
    $('#back-link, #cancel-link').attr('href', 'event.html?id=' + encodeURIComponent(id));
    lock(true);
    CE.api.get('/events/' + encodeURIComponent(id)).then(fill).catch(function (err) {
      ui.errorState($('#event-form'), err, function () { window.location.reload(); });
    });
  }

  function startNew() {
    ui.setTitle('New event');
    $('#starts_at').val(fmt.toLocalInput(nextSaturday()));
    setEnd(nextSaturday());
    $('#title').trigger('focus');
  }

  // Suggest places used before. Without them the form still works
  function loadPlaces() {
    CE.data.events().then(function (list) {
      var seen = {};
      list.forEach(function (e) { if (e.location) seen[e.location.trim()] = true; });
      var options = Object.keys(seen).map(function (place) { return '<option value="' + esc(place) + '">'; });
      $('#loc-suggestions').html(options.join(''));
    }).catch(function () { });
  }

  CE.ready(function () {
    unsaved = CE.forms.dirtyGuard($('#event-form'));
    if (editing) startEdit();
    else startNew();
    showCard();
    loadPlaces();

    $('#description').on('input', showLetters);
    $('#starts_at').on('change', changeStart);
    $('#img-clear').on('click', clearFile);
    $('#event-form').on('input change', CE.debounce(showCard, 120)).on('submit', submit);
    CE.forms.picker({ zone: '#dropzone', input: '#image', kind: 'image', onChange: changeFile }); // checks size and type
  });
})(jQuery, window.CE);
