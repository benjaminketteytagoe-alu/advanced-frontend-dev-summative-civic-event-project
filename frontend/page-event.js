// Event page: details, registering, reviews, and for admins the list of who is coming
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, can = CE.guard.can;

  var id = CE.param('id');
  var ev;                // the event
  var myReg = null;      // registered, cancelled or nothing
  var myReview = null;   // this person's review
  var people = [];       // who is coming (admins only)

  // ---------- text and links ----------

  function mapLink() { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ev.location); }
  function newTab() { return '<span class="sr-only">(opens in new tab)</span>'; }
  function fileName() { return (ev.title || 'event').replace(/[^\w\- ]+/g, ''); } // only safe characters

  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }

  function times() {
    if (!ev.ends_at) return fmt.time(ev.starts_at);
    var end = sameDay(ev.starts_at, ev.ends_at) ? fmt.time(ev.ends_at) : fmt.dateTime(ev.ends_at);
    return fmt.time(ev.starts_at) + ' – ' + end;
  }

  // ---------- top of the page ----------

  function dateStub() {
    var s = fmt.stub(ev.starts_at);
    return '<div class="date-stub !min-w-[4.5rem] !py-3 shadow-lift hidden sm:grid">' +
      '<span class="text-xs tracking-[.2em] text-ember-200 font-semibold">' + esc(s.mon) + '</span>' +
      '<span class="font-display text-4xl leading-none">' + esc(s.day) + '</span>' +
      '<span class="text-xs text-ink-300">' + esc(s.wk) + '</span></div>';
  }

  function badges() {
    var html = CE.views.isPast(ev) ? '<span class="badge bg-white/15 text-white">Past event</span>' : '<span class="badge bg-ember-500 text-white">Upcoming</span>';
    if (ev.published === false) html += '<span class="badge badge-danger">Unpublished</span>';
    return '<div class="flex flex-wrap gap-2 mb-3">' + html + '</div>';
  }

  // Uses generated art when there is no image, or when it fails to load
  function picture() {
    var own = CE.views.eventImage(ev), art = CE.dice.cover(ev.id);
    var alt = own ? 'Image for ' + ev.title : '';
    return '<img src="' + esc(own || art) + '" alt="' + esc(alt) + '" class="w-full h-full object-cover" onerror="this.onerror=null;this.src=\'' + art + '\'">';
  }

  function banner() {
    return '<div class="crop-marks reveal"><header class="relative h-72 sm:h-[26rem] rounded-[1.75rem] overflow-hidden bg-ink-900 shadow-lift">' + picture() +
      '<div class="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent"></div>' +
      '<div class="absolute left-0 right-0 bottom-0 p-6 sm:p-10 flex items-end gap-5">' + dateStub() +
      '<div class="text-white min-w-0">' + badges() +
      '<h1 class="font-display text-3xl sm:text-5xl leading-tight max-w-3xl break-words">' + esc(ev.title) + '</h1></div></div></header></div>';
  }

  // ---------- left side ----------

  function about() {
    return '<section class="reveal" aria-labelledby="about-h"><h2 id="about-h" class="eyebrow mb-4">About this event</h2>' +
      '<div class="prose-civic text-ink-700 text-lg leading-relaxed break-words">' + esc(ev.description || 'No description has been provided yet.') + '</div></section>';
  }

  function map() {
    if (!ev.location) return '';
    return '<section class="mt-12 reveal" aria-labelledby="map-h"><h2 id="map-h" class="eyebrow mb-4">Getting there</h2><div class="card overflow-hidden">' +
      '<iframe title="Map showing ' + esc(ev.location) + '" class="w-full h-64 border-0 grayscale-[30%]" loading="lazy" referrerpolicy="no-referrer-when-downgrade"' +
      ' src="https://maps.google.com/maps?q=' + encodeURIComponent(ev.location) + '&z=14&output=embed"></iframe>' +
      '<div class="p-4 flex flex-wrap items-center justify-between gap-3">' +
      '<p class="flex items-center gap-2 text-ink-800 font-medium">' + icon('pin', 'w-4 h-4 text-ember-600') + esc(ev.location) + '</p>' +
      '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + mapLink() + '">Open in Maps ' + icon('external', 'w-3.5 h-3.5') + newTab() + '</a></div></div></section>';
  }

  function peopleBox() {
    if (!can('event:viewRegistrants')) return '';
    return '<section class="mt-12 reveal" aria-labelledby="reg-h"><div class="flex items-center justify-between mb-4">' +
      '<h2 id="reg-h" class="eyebrow">Registrants <span id="reg-count" class="badge badge-ink ml-2">…</span></h2>' +
      '<button type="button" id="csv-btn" class="btn btn-ghost btn-sm" disabled>' + icon('download', 'w-4 h-4') + 'Export CSV</button></div>' +
      '<div id="registrants" class="card overflow-hidden"></div></section>';
  }

  function reviewsBox() {
    return '<section class="mt-12 reveal" aria-labelledby="fb-h"><h2 id="fb-h" class="eyebrow mb-4">Feedback</h2><div id="feedback"></div></section>';
  }

  // ---------- right side ----------

  function fact(ic, colour, label, text) {
    return '<div class="flex gap-3"><dt class="shrink-0 grid place-items-center w-10 h-10 rounded-xl ' + colour + '">' + icon(ic, 'w-5 h-5') +
      '<span class="sr-only">' + label + '</span></dt><dd class="min-w-0 self-center">' + text + '</dd></div>';
  }

  function bold(text) { return '<span class="block font-semibold text-ink-900 break-words">' + esc(text) + '</span>'; }

  function dateText() {
    var date = fmt.date(ev.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return bold(date) + '<span class="text-sm text-ink-600">' + esc(times()) + '</span>';
  }

  function placeText() {
    if (!ev.location) return bold('To be announced');
    return bold(ev.location) + '<a class="text-sm text-ember-700 underline underline-offset-2" target="_blank" rel="noopener" href="' + mapLink() + '">Get directions' + newTab() + '</a>';
  }

  function side() {
    return '<aside class="lg:sticky lg:top-24 self-start space-y-4 min-w-0"><div class="card star-border p-6 reveal" style="--d:100ms"><dl class="space-y-5 mb-6">' +
      fact('calendar', 'bg-ink-900 text-white', 'Date', dateText()) +
      fact('pin', 'bg-ember-100 text-ember-700', 'Location', placeText()) +
      fact('star', 'bg-paper-200 text-ink-700', 'Rating', '<span id="side-rating" class="text-sm text-ink-600">…</span>') +
      '</dl><div id="reg-block">' + mainButton() + '</div></div>' + tools() + '</aside>';
  }

  function tools() {
    var calendar = '';
    if (ev.starts_at) calendar = '<a id="ics" class="btn btn-ghost btn-sm flex-1" download="' + esc(fileName()) + '.ics">' + icon('calendar', 'w-4 h-4') + 'Add to calendar</a>';
    return '<div class="card p-4 flex gap-2 reveal" style="--d:160ms">' + calendar +
      '<button type="button" id="share" class="btn btn-ghost btn-sm flex-1">' + icon('external', 'w-4 h-4') + 'Copy link</button></div>';
  }

  // Users register, admins edit and delete
  function mainButton() {
    if (can('event:register')) return registerButton();
    return '<div class="grid grid-cols-2 gap-2">' +
      '<a href="event-form.html?id=' + encodeURIComponent(ev.id) + '" class="btn btn-primary">' + icon('edit', 'w-4 h-4') + 'Edit</a>' +
      '<button type="button" id="del-btn" class="btn btn-danger">' + icon('trash', 'w-4 h-4') + 'Delete</button></div>';
  }

  function registerButton() {
    if (CE.views.isPast(ev)) return '<p class="text-sm text-ink-600 rounded-xl bg-paper-200 px-4 py-3">This event has ended. Registration is closed.</p>';
    if (myReg === 'registered') {
      return '<p class="flex items-center gap-2 text-sm font-medium text-moss-700 mb-3">' + icon('check', 'w-4 h-4') + 'You’re registered for this event.</p>' +
        '<button type="button" id="reg-btn" class="btn btn-lg w-full btn-danger">' + icon('x', 'w-4 h-4') + 'Cancel registration</button>';
    }
    var note = myReg === 'cancelled' ? '<p class="mt-2 text-xs text-ink-500">You cancelled before. You can register again.</p>' : '';
    return '<button type="button" id="reg-btn" class="btn btn-lg w-full btn-primary">' + icon('ticket', 'w-4 h-4') + 'Register for this event</button>' + note;
  }

  // ---------- draw the page ----------

  function show() {
    ui.setTitle(ev.title);
    $('#event-root').attr('aria-busy', 'false').html(
      banner() +
      '<div class="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-10 mt-10">' +
      '<div class="min-w-0">' + about() + map() + peopleBox() + reviewsBox() + '</div>' + side() + '</div>'
    );
    $('#temp-title').remove(); // the real title is on the page now
    if (ev.starts_at) $('#ics').attr('href', calendarFile());
    ui.reveal($('#event-root'));
    loadReviews();
    if (can('event:viewRegistrants')) loadPeople();
  }

  // ---------- calendar file, link, delete ----------

  // 2027-01-31T10:00:00.000Z becomes 20270131T100000Z
  function calendarDate(date) { return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

  // Some characters mean something in calendar files, so put a backslash before them
  function calendarText(text) { return String(text || '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n'); }

  function calendarFile() {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CivicEvents+//EN', 'BEGIN:VEVENT',
      'UID:' + ev.id + '@civicevents',
      'DTSTAMP:' + calendarDate(new Date()),
      'DTSTART:' + calendarDate(ev.starts_at),
      'DTEND:' + calendarDate(ev.ends_at || ev.starts_at),
      'SUMMARY:' + calendarText(ev.title),
      'DESCRIPTION:' + calendarText(ev.description),
      'LOCATION:' + calendarText(ev.location),
      'END:VEVENT', 'END:VCALENDAR'];
    return URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  }

  function copyLink() {
    var link = window.location.href;
    var copying = navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject();
    copying
      .then(function () { ui.toast('success', 'Link copied to clipboard.'); })
      .catch(function () { window.prompt('Copy this link:', link); });
  }

  function removeEvent() {
    CE.actions.remove({ action: 'event:delete', path: '/events/' + ev.id, title: ev.title, cacheKey: 'events' }).then(function (done) {
      if (!done) return;
      CE.flash.set('success', '“' + ev.title + '” was deleted.');
      window.location.href = 'events.html';
    });
  }

  // ---------- registering ----------

  function setReg(status) {
    myReg = status;
    $('#reg-block').html(registerButton());
  }

  function register() {
    ui.busy($('#reg-btn'), true, 'Registering…');
    CE.api.post('/event-registrations/register', { event_id: ev.id })
      .then(function () {
        setReg('registered');
        ui.toast('success', 'You’re registered! See you at ' + ev.title + '.');
        CE.fx.success();
      })
      .catch(function (err) {
        if (err.status === 409) return setReg('registered'); // done before, perhaps in another tab
        ui.busy($('#reg-btn'), false);
        CE.handleError(err, { retry: register });
      });
  }

  function cancel() {
    ui.busy($('#reg-btn'), true, 'Cancelling…');
    CE.api.post('/event-registrations/cancel', { event_id: ev.id })
      .then(function () {
        setReg('cancelled');
        ui.toast('success', 'Your registration was cancelled.');
      })
      .catch(function (err) {
        ui.busy($('#reg-btn'), false);
        CE.handleError(err, { retry: cancel });
      });
  }

  function clickRegister() {
    if (!can('event:register')) return ui.forbiddenModal();
    if (myReg !== 'registered') return register();
    ui.confirm({ title: 'Cancel your registration?', message: 'Your spot will be released for someone else.', confirmText: 'Cancel registration', danger: true })
      .then(function (yes) { if (yes) cancel(); });
  }

  // ---------- who is coming (admins) ----------

  function personRow(p) {
    return '<tr><td><span class="flex items-center gap-3">' + ui.avatarImg(p.user_id, p.full_name, 'w-8 h-8') +
      '<span class="font-medium text-ink-900">' + esc(p.full_name) + '</span></span></td>' +
      '<td class="text-ink-600"><a class="hover:underline" href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></td>' +
      '<td class="text-ink-500 whitespace-nowrap">' + esc(fmt.relative(p.created_at)) + '</td></tr>';
  }

  function showPeople() {
    $('#reg-count').text(people.length);
    $('#csv-btn').prop('disabled', people.length === 0);
    if (!people.length) return $('#registrants').html('<p class="p-6 text-sm text-ink-600">No one has registered yet.</p>');
    $('#registrants').html('<div class="overflow-x-auto"><table class="table w-full text-sm">' +
      '<thead><tr><th scope="col">Attendee</th><th scope="col">Email</th><th scope="col">Registered</th></tr></thead>' +
      '<tbody>' + people.map(personRow).join('') + '</tbody></table></div>');
  }

  function loadPeople() {
    $('#registrants').html('<div class="p-4 space-y-3">' + ui.skeletonCards(3, 'row') + '</div>');
    CE.api.get('/event-registrations/event/' + encodeURIComponent(ev.id) + '/attendees')
      .then(function (reply) { people = reply.data; showPeople(); })
      .catch(function (err) { ui.errorState($('#registrants'), err, loadPeople); });
  }

  // One box of the spreadsheet. A starting = + - or @ would run as a formula, so put a ' before it
  function csvCell(text) {
    var safe = /^[=+\-@]/.test(text) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  }

  function csvRow(p) { return [p.full_name, p.email, p.created_at].map(csvCell).join(','); }

  function downloadCsv() {
    var lines = ['Name,Email,Registered at'].concat(people.map(csvRow));
    var link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    link.download = fileName() + '-registrants.csv';
    link.click();
  }

  // ---------- reviews ----------

  function average(list) {
    var total = 0;
    list.forEach(function (f) { total += f.rating; });
    return total / list.length;
  }

  // One bar of the chart: how many gave this many stars
  function bar(list, stars) {
    var count = list.filter(function (f) { return f.rating === stars; }).length;
    var percent = list.length ? Math.round(count / list.length * 100) : 0;
    return '<div class="flex items-center gap-3 text-xs"><span class="w-3 text-ink-600">' + stars + '</span>' +
      '<span class="flex-1 h-2 rounded-full bg-paper-200 overflow-hidden"><span class="block h-full rounded-full bg-[#d08a1e]" style="width:' + percent + '%"></span></span>' +
      '<span class="w-8 text-right text-ink-500">' + count + '</span></div>';
  }

  function summary(list) {
    var avg = average(list);
    var bars = [5, 4, 3, 2, 1].map(function (stars) { return bar(list, stars); });
    return '<div class="card p-6 grid sm:grid-cols-[auto_1fr] gap-6 items-center mb-6">' +
      '<div class="text-center sm:pr-6 sm:border-r border-paper-200"><p class="font-display text-6xl text-ink-900 leading-none">' + avg.toFixed(1) + '</p>' +
      '<div class="mt-2 flex justify-center">' + ui.stars(avg, 'w-5 h-5') + '</div>' +
      '<p class="text-xs text-ink-500 mt-2">' + list.length + (list.length === 1 ? ' review' : ' reviews') + '</p></div>' +
      '<div class="space-y-1.5">' + bars.join('') + '</div></div>';
  }

  function review(f, mine) {
    var name = mine ? 'Your feedback' : f.full_name;
    var comment = f.comment ? '<p class="mt-2 text-ink-700 leading-relaxed whitespace-pre-line break-words">' + esc(f.comment) + '</p>' : '<p class="mt-2 text-sm text-ink-500 italic">No comment.</p>';
    var edit = mine ? '<button type="button" id="fb-edit" class="mt-3 text-sm font-semibold text-ember-700 hover:underline inline-flex items-center gap-1">' + icon('edit', 'w-3.5 h-3.5') + 'Edit my feedback</button>' : '';
    return '<li class="card p-5 reveal"><div class="flex items-start gap-3">' + ui.avatarImg(f.user_id, f.full_name, 'w-10 h-10') +
      '<div class="flex-1 min-w-0"><div class="flex flex-wrap items-center gap-x-3 gap-y-1"><p class="font-semibold text-ink-900">' + esc(name) + '</p>' + ui.stars(f.rating) +
      '<span class="text-xs text-ink-500">' + esc(fmt.relative(f.updated_at)) + '</span></div>' + comment + edit + '</div></div></li>';
  }

  // Admins see everyone's
  function showAllReviews(list) {
    if (!list.length) {
      $('#side-rating').text('No ratings yet');
      return $('#feedback').html('<p class="text-sm text-ink-600">No feedback has been submitted for this event yet.</p>');
    }
    var avg = average(list);
    $('#side-rating').html('<span class="flex items-center gap-2">' + ui.stars(avg) + '<strong class="text-ink-900">' + avg.toFixed(1) + '</strong> (' + list.length + ')</span>');
    var items = list.map(function (f) { return review(f, false); });
    $('#feedback').html(summary(list) + '<ul class="space-y-3">' + items.join('') + '</ul>');
  }

  // Users see their own, or a form
  function showMyReview(list) {
    myReview = list.filter(function (f) { return f.event_id === ev.id; })[0] || null;
    var note = '<p class="text-xs text-ink-500 mt-4">Ratings from other attendees are shared privately with the organisers.</p>';
    if (myReview) {
      $('#side-rating').html('<span class="flex items-center gap-2">' + ui.stars(myReview.rating) + '<span>Your rating</span></span>');
      $('#feedback').html('<ul>' + review($.extend({}, myReview, { full_name: CE.auth.user().full_name }), true) + '</ul>' + note);
    } else {
      $('#side-rating').text('You haven’t rated this yet');
      $('#feedback').html(reviewForm() + note);
    }
  }

  function loadReviews() {
    var all = can('event:viewAllFeedback');
    var path = all ? '/event-feedback/event/' + encodeURIComponent(ev.id) : '/event-feedback/my-feedback';
    $('#feedback').html('<div class="skeleton h-40"></div>');
    CE.api.get(path)
      .then(function (reply) {
        if (all) showAllReviews(reply.data);
        else showMyReview(reply.data);
        ui.reveal($('#feedback'));
      })
      .catch(function (err) { ui.errorState($('#feedback'), err, loadReviews); });
  }

  // ---------- review form ----------

  // Five stars, written from 5 to 1 because the style shows them in reverse
  function starInputs(chosen) {
    return [5, 4, 3, 2, 1].map(function (n) {
      var label = n + (n === 1 ? ' star' : ' stars');
      return '<input type="radio" id="rate-' + n + '" name="rating" value="' + n + '"' + (n === chosen ? ' checked' : '') + '>' +
        '<label for="rate-' + n + '" title="' + label + '">★<span class="sr-only">' + label + '</span></label>';
    }).join('');
  }

  function reviewForm() {
    var old = myReview || { rating: 0, comment: '' };
    var title = myReview ? 'Update your feedback' : 'How was it?';
    var text = myReview ? 'You can only leave one review per event, so edit it below.' : 'Share a rating and a few words to help organisers improve.';
    var cancelButton = myReview ? '<button type="button" id="fb-cancel" class="btn btn-ghost">Cancel</button>' : '';
    return '<form id="fb-form" class="card p-6 reveal" novalidate>' +
      '<h3 class="font-display text-2xl text-ink-900 mb-1">' + title + '</h3><p class="text-sm text-ink-600 mb-5">' + text + '</p>' +
      '<fieldset class="form-row mb-5"><legend class="field-label">Your rating</legend><div class="stars" id="rating-group">' + starInputs(old.rating) + '</div></fieldset>' +
      '<div class="form-row mb-5"><label for="fb-comment" class="field-label">Comment <span class="font-normal text-ink-500">(optional)</span></label>' +
      '<textarea id="fb-comment" name="comment" rows="4" maxlength="1000" class="field resize-y" placeholder="What stood out? What could be better?">' + esc(old.comment || '') + '</textarea>' +
      '<p class="field-hint text-right"><span id="fb-count">' + (old.comment || '').length + '</span>/1000</p></div>' +
      '<div class="flex flex-wrap gap-2"><button type="submit" class="btn btn-primary">' + (myReview ? 'Save changes' : 'Submit feedback') + '</button>' + cancelButton + '</div></form>';
  }

  function editReview() {
    $('#feedback').html(reviewForm());
    ui.reveal($('#feedback'));
    $('#rate-' + myReview.rating).trigger('focus');
  }

  function countLetters() { $('#fb-count').text(this.value.length); }

  // New reviews use POST, changed ones use PUT
  function sendReview(rating, comment) {
    if (myReview) return CE.api.put('/event-feedback/' + myReview.id, { rating: rating, comment: comment });
    return CE.api.post('/event-feedback', { event_id: ev.id, rating: rating, comment: comment });
  }

  function submitReview(e) {
    e.preventDefault();
    if (!can('event:feedback')) return ui.forbiddenModal();
    var rating = Number($('input[name=rating]:checked').val());
    if (!rating) {
      ui.fieldError($('#rating-group'), 'Choose a rating from 1 to 5 stars.');
      return $('#rate-5').trigger('focus');
    }
    var $button = $('#fb-form [type=submit]');
    ui.busy($button, true, 'Saving…');
    sendReview(rating, $.trim($('#fb-comment').val()))
      .then(function () {
        ui.toast('success', myReview ? 'Your feedback was updated.' : 'Thanks for your feedback!');
        loadReviews();
      })
      .catch(function (err) {
        ui.busy($button, false);
        if (err.status !== 409) return CE.handleError(err);
        ui.toast('warning', 'You’ve already left feedback for this event, so you can edit it.');
        loadReviews();
      });
  }

  // ---------- load ----------

  function showMissing(title, text) {
    $('#event-root').attr('aria-busy', 'false').html(ui.empty(title, text, '<a href="events.html" class="btn btn-primary">Browse events</a>', 'calendar'));
  }

  // Is this person registered? Without the answer we only lose the Cancel button
  function loadMyReg() {
    if (!can('event:register')) return null;
    return CE.data.myRegistrations()
      .then(function (list) {
        var mine = list.filter(function (r) { return r.event_id === id; })[0];
        if (mine) myReg = mine.status;
      })
      .catch(function () { });
  }

  function load() {
    if (!id) return showMissing('No event selected', 'Pick an event from the calendar.');
    Promise.all([CE.api.get('/events/' + encodeURIComponent(id)), loadMyReg()])
      .then(function (results) { ev = results[0].data; show(); })
      .catch(function (err) {
        if (err.status === 404) return showMissing('Event not found', 'It may have been removed or the link is incorrect.');
        ui.errorState($('#event-root'), err, load);
      });
  }

  // Start
  CE.ready(function () {
    load();
    $('#event-root')
      .on('click', '#reg-btn', clickRegister)
      .on('click', '#del-btn', removeEvent)
      .on('click', '#share', copyLink)
      .on('click', '#csv-btn', downloadCsv)
      .on('click', '#fb-edit', editReview)
      .on('click', '#fb-cancel', loadReviews)
      .on('input', '#fb-comment', countLetters)
      .on('change', 'input[name=rating]', function () { ui.fieldError($('#rating-group'), ''); })
      .on('submit', '#fb-form', submitReview);
  });
})(jQuery, window.CE);
