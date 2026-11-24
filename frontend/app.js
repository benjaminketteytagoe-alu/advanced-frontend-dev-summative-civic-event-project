// The base of every page: settings, login, requests to the backend, who may do what, saved lists
// and notifications. Everything shared lives on CE. Loaded first, after jQuery
(function ($) {
  'use strict';
  var CE = window.CE = {};

  // ---------- settings ----------

  // The backend's address can be changed once with ?api=http://localhost:4001/api.
  // Only this computer or the site's own host is accepted, so a bad link cannot send passwords elsewhere
  function safeApi(address) {
    try {
      var host = new URL(address).hostname;
      return ['localhost', '127.0.0.1', window.location.hostname].indexOf(host) > -1;
    } catch (err) {
      return false; // not an address at all
    }
  }

  function findApi() {
    var asked = param('api');
    if (asked && safeApi(asked)) local.set('ce_api_base', asked);
    var kept = local.get('ce_api_base');
    var address = window.CIVIC_API_BASE || (safeApi(kept) ? kept : 'http://localhost:4000/api');
    return address.replace(/\/$/, ''); // no slash at the end
  }

  // ---------- small tools ----------

  // Make text safe to put in the page, so code typed by someone is only shown
  function esc(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // One value from the address, such as id in event.html?id=5
  function param(name) { return new URLSearchParams(window.location.search).get(name); }

  // Always a real number
  function num(value) { return Number(value) || 0; }

  // Wait until the calls stop, then run once
  function debounce(run, wait) {
    var timer;
    return function () {
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { run.call(self); }, wait);
    };
  }

  function pageName() { return window.location.pathname.split('/').pop() || 'index.html'; }

  // Files sometimes come as /uploads/..., which needs the backend's address in front
  function mediaUrl(address) {
    if (!address) return '';
    return /^(https?|blob|data):/.test(address) ? address : CE.config.ORIGIN + address;
  }

  // ---------- video links (the same rules as backend/src/utils/videoLink.js) ----------

  function youtubeId(url, parts) {
    if (url.hostname === 'youtu.be') return parts[0];
    if (!/^((www|m|music)\.)?youtube(-nocookie)?\.com$/.test(url.hostname)) return null;
    if (parts[0] === 'watch') return url.searchParams.get('v');
    return ['shorts', 'embed', 'live', 'v'].indexOf(parts[0]) > -1 ? parts[1] : null;
  }

  function vimeoId(url, parts) {
    if (url.hostname === 'player.vimeo.com') return parts[1];
    if (!/^(www\.)?vimeo\.com$/.test(url.hostname)) return null;
    return parts.filter(function (p) { return /^\d+$/.test(p); })[0]; // the part that is a number
  }

  function youtube(id) {
    return {
      label: 'YouTube',
      watch: 'https://www.youtube.com/watch?v=' + id,
      embed: 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&cc_load_policy=1&modestbranding=1',
      thumb: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'
    };
  }

  function vimeo(id) {
    return { label: 'Vimeo', watch: 'https://vimeo.com/' + id, embed: 'https://player.vimeo.com/video/' + id + '?dnt=1&texttrack=en', thumb: '' };
  }

  // Details of a YouTube or Vimeo link, or null for anything else
  function videoLink(text) {
    var url;
    try { url = new URL(text); } catch (err) { return null; }
    if (!/^https?:$/.test(url.protocol)) return null;

    var parts = url.pathname.split('/').filter(Boolean);
    var yt = youtubeId(url, parts), vm = vimeoId(url, parts);
    if (/^[A-Za-z0-9_-]{11}$/.test(yt)) return youtube(yt);
    if (/^\d{6,12}$/.test(vm)) return vimeo(vm);
    return null;
  }

  // ---------- dates, lengths and sizes as text ----------

  function toDate(value) {
    var d = new Date(value);
    return !value || isNaN(d) ? null : d; // null when it is not a date
  }

  function date(value, options) {
    var d = toDate(value);
    return d ? d.toLocaleDateString(undefined, options || { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }

  function time(value) {
    var d = toDate(value);
    return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
  }

  function dateTime(value) { return toDate(value) ? date(value) + ' · ' + time(value) : '—'; }

  // From a start to an end, shorter when both are on the same day
  function range(start, end) {
    if (!toDate(start)) return 'Date to be announced';
    if (!toDate(end)) return dateTime(start);
    if (date(start) === date(end)) return dateTime(start) + ' – ' + time(end);
    return dateTime(start) + ' → ' + dateTime(end);
  }

  // The three lines of a date stub: day, month, weekday
  function stub(value) {
    var d = toDate(value);
    if (!d) return { day: '—', mon: 'TBA', wk: '' };
    return { day: d.getDate(), mon: date(d, { month: 'short' }).toUpperCase(), wk: date(d, { weekday: 'short' }) };
  }

  // 5m ago, 3h ago, 2d ago, or the date when it is over a week
  function relative(value) {
    var d = toDate(value);
    if (!d) return '';
    var minutes = Math.round((Date.now() - d) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + 'm ago';
    if (minutes < 24 * 60) return Math.round(minutes / 60) + 'h ago';
    if (minutes < 7 * 24 * 60) return Math.round(minutes / (24 * 60)) + 'd ago';
    return date(d, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function two(n) { return String(n).padStart(2, '0'); }

  // 65 becomes 1:05, and 3665 becomes 1:01:05
  function duration(value) {
    var total = Math.max(0, Math.floor(num(value)));
    var hours = Math.floor(total / 3600), minutes = Math.floor(total / 60) % 60, seconds = total % 60;
    if (hours) return hours + ':' + two(minutes) + ':' + two(seconds);
    return minutes + ':' + two(seconds);
  }

  function bytes(size) {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB';
    return (size / 1024 / 1024).toFixed(1) + ' MB';
  }

  // What a date box in a form needs, in this person's own time zone
  function toLocalInput(value) {
    var d = toDate(value);
    if (!d) return '';
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  // ---------- the browser's storage ----------

  // Storage can be blocked, for example in a private window. Then nothing is kept, but nothing breaks
  function storage(name) {
    function get(key) { try { return window[name].getItem(key); } catch (err) { return null; } }
    function set(key, value) { try { window[name].setItem(key, value); return true; } catch (err) { return false; } }
    function del(key) { try { window[name].removeItem(key); } catch (err) { /* blocked */ } }
    function keys() { try { return Object.keys(window[name]); } catch (err) { return []; } }

    // JSON is how lists and objects become text
    function json(key, other) { try { return JSON.parse(get(key)) || other; } catch (err) { return other; } }
    function setJson(key, value) { return set(key, JSON.stringify(value)); }

    return { get: get, set: set, del: del, keys: keys, json: json, setJson: setJson };
  }

  var local = storage('localStorage');       // stays after the browser closes
  var session = storage('sessionStorage');   // gone when the tab closes

  // ---------- login ----------

  var endTimer;

  // Where the token is: the tab, or this device when "keep me signed in" was ticked
  function place() { return session.get('ce_token') ? session : local; }

  function token() { return place().get('ce_token'); }
  function user() { return place().json('ce_user', null); }
  function persistent() { return place() === local; }

  // The middle part of a token holds its end time, in seconds
  function expiresAt() {
    try {
      var middle = token().split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(middle)).exp * 1000;
    } catch (err) {
      return null; // no token, or a broken one
    }
  }

  function isLoggedIn() { return !!user() && expiresAt() > Date.now(); }

  function keepUser(u) {
    place().setJson('ce_user', { id: u.id, full_name: u.full_name, email: u.email, role: u.role, is_active: u.is_active });
  }

  function save(newToken, newUser, remember) {
    clear();
    (remember ? local : session).set('ce_token', newToken);
    keepUser(newUser);
  }

  function updateUser(changed) { keepUser($.extend({}, user(), changed)); }

  // Forget everything about this login
  function clear() {
    clearTimeout(endTimer);
    [local, session].forEach(function (s) {
      s.del('ce_token');
      s.del('ce_user');
    });
    clearCache();
  }

  function toLogin() {
    window.location.href = 'login.html?next=' + encodeURIComponent(pageName() + window.location.search);
  }

  // The login ended by itself
  function expire(message) {
    clear();
    setFlash('warning', message);
    toLogin();
  }

  function logout() {
    clear();
    setFlash('success', 'You have been signed out. See you soon!');
    window.location.href = 'login.html';
  }

  function startEndTimer() {
    endTimer = setTimeout(function () { expire('Your session has ended. Please sign in again.'); }, expiresAt() - Date.now());
  }

  // ---------- flash: a message kept for the next page ----------

  function setFlash(type, message) { session.setJson('ce_flash', { type: type, message: message }); }

  function takeFlash() {
    var kept = session.json('ce_flash', null);
    session.del('ce_flash');
    return kept;
  }

  // ---------- requests to the backend ----------

  // An error from the backend. Status 0 means no answer at all
  function ApiError(status, message, errors) {
    this.status = status;
    this.message = message;
    this.errors = errors || []; // the fields that were wrong
  }

  function errorText(status, reply) {
    if (status === 0) return 'We couldn’t reach the CivicEvents+ server at ' + CE.config.API_BASE + '. Check your connection (or that the API is running) and try again.';
    if (status >= 500) return 'Something went wrong on our side (' + status + '). Please try again shortly.';
    if (reply.errors) return reply.errors.map(function (e) { return e.message; }).join(' · ');
    return reply.message || 'Request failed (' + status + ')';
  }

  function toError(xhr) {
    var reply = xhr.responseJSON || {};
    return new ApiError(xhr.status, errorText(xhr.status, reply), reply.errors);
  }

  // Tells onProgress how much of a file has been sent, from 0 to 100
  function xhrWithProgress(onProgress) {
    var xhr = $.ajaxSettings.xhr();
    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
    };
    return xhr;
  }

  // Send with jQuery, and give back a normal promise
  function send(settings) {
    return new Promise(function (resolve, reject) {
      $.ajax(settings)
        .done(resolve)
        .fail(function (xhr) { reject(toError(xhr)); });
    });
  }

  // The backend no longer accepts our token
  function tokenRefused(err) {
    var disabled = err.message.indexOf('disabled') > -1;
    expire(disabled ? err.message : 'Your session has expired. Please sign in again.');
    return new Promise(function () { }); // never finishes, because we are leaving the page
  }

  // Every request goes through here. open = true for login and sign up, which need no token
  function request(method, path, more, open) {
    var settings = $.extend({ method: method, url: CE.config.API_BASE + path, dataType: 'json', timeout: 30000 }, more);
    if (token() && !open) settings.headers = { Authorization: 'Bearer ' + token() };
    return send(settings).catch(function (err) {
      if (err.status === 401 && !open) return tokenRefused(err);
      throw err;
    });
  }

  function asJson(body) { return { data: JSON.stringify(body), contentType: 'application/json' }; }

  function get(path, query) { return request('GET', path, { data: query }); }
  function post(path, body, options) { return request('POST', path, asJson(body), !!options && options.public); }
  function put(path, body) { return request('PUT', path, asJson(body)); }
  function patch(path, body) { return request('PATCH', path, asJson(body || {})); }
  function del(path) { return request('DELETE', path); }

  // A form with a file. jQuery must leave it alone, and it may take longer
  function upload(method, path, form, onProgress) {
    var settings = { data: form, processData: false, contentType: false, timeout: 180000 };
    if (onProgress) settings.xhr = function () { return xhrWithProgress(onProgress); };
    return request(method, path, settings);
  }

  // Is the backend running? For the light in the footer
  function health() {
    return new Promise(function (resolve) {
      $.ajax({ url: CE.config.ORIGIN + '/health', timeout: 5000 })
        .done(function () { resolve(true); })
        .fail(function () { resolve(false); });
    });
  }

  // Show an error. options.retry adds a Retry button when trying again could help
  function handleError(err, options) {
    if (err.status === undefined) console.error(err); // a mistake in our own code
    if (err.status === 403) return CE.ui.forbiddenModal(err.message);
    var canRetry = options && options.retry && (err.status === 0 || err.status >= 500);
    CE.ui.toast('error', err.message, canRetry ? { action: 'Retry', onAction: options.retry } : null);
  }

  // ---------- who may do what ----------
  // This only decides what is shown. The backend checks every request again

  var adminActions = [
    'event:create', 'event:edit', 'event:delete', 'event:viewRegistrants', 'event:viewAllFeedback',
    'announcement:create', 'announcement:edit', 'announcement:delete', 'announcement:publish',
    'promo:create', 'promo:edit', 'promo:delete', 'promo:publish',
    'notification:delete', 'request:manage', 'users:manage', 'dashboard:view', 'content:viewUnpublished'
  ];
  var userActions = ['event:register', 'event:feedback', 'request:create'];

  function role() { return isLoggedIn() ? user().role : 'guest'; }

  function can(action) {
    if (role() === 'admin') return adminActions.indexOf(action) > -1;
    if (role() === 'user') return userActions.indexOf(action) > -1;
    return false;
  }

  // Elements say who they are for with data-role. "auth" means anyone logged in
  function isForMe(roles) {
    return roles === role() || (roles === 'auth' && role() !== 'guest');
  }

  // Remove what is not for this person, and show the rest
  function applyRoles() {
    $('[data-role]').each(function () {
      if (isForMe($(this).attr('data-role'))) $(this).removeAttr('hidden');
      else $(this).remove();
    });
  }

  // May this person see this page? The body says who with data-auth.
  // Gives back yes, forbidden, or leaving when we go to another page
  function checkPage() {
    var need = $('body').data('auth');
    if (need === 'guest' && isLoggedIn()) {
      window.location.replace(role() === 'admin' ? 'admin.html' : 'index.html');
      return 'leaving';
    }
    if ((need === 'user' || need === 'admin') && !isLoggedIn()) {
      clear();
      setFlash('info', 'Please sign in to continue.');
      toLogin();
      return 'leaving';
    }
    return need === 'admin' && role() !== 'admin' ? 'forbidden' : 'yes';
  }

  // ---------- saved lists ----------
  // Lists are kept for 2 minutes, so moving between pages is quick. Each person has their own

  function cacheKey(name) { return 'ce_cache:' + (user() ? user().id : 'guest') + ':' + name; }

  function invalidate(name) { session.del(cacheKey(name)); }

  function clearCache() {
    session.keys().forEach(function (key) {
      if (key.indexOf('ce_cache:') === 0) session.del(key);
    });
  }

  // The saved list, or a new one from the backend
  function cached(name, path, query, fresh) {
    var kept = session.json(cacheKey(name), null);
    if (kept && kept.until > Date.now() && !fresh) return Promise.resolve(kept.list);
    return get(path, query).then(function (reply) {
      session.setJson(cacheKey(name), { list: reply.data, until: Date.now() + 2 * 60 * 1000 });
      return reply.data;
    });
  }

  function events(fresh) { return cached('events', '/events', null, fresh); }
  function announcements(fresh) { return cached('announcements', '/announcements', { limit: 100 }, fresh); }
  function promos(fresh) { return cached('promos', '/promos', { limit: 100 }, fresh); }

  // Not saved, because it changes often
  function myRegistrations() {
    return get('/event-registrations/my-registrations').then(function (reply) { return reply.data; });
  }

  // Users never see drafts
  function visible(list) {
    if (can('content:viewUnpublished')) return list;
    return list.filter(function (x) { return x.published !== false; });
  }

  // ---------- notifications ----------
  // The API cannot store what was read, so those ids are kept in this browser

  var notifs = { items: [], loaded: false };
  var listeners = []; // functions to call when something changes

  function readKey() { return 'ce_read:' + user().id; }

  notifs.readSet = function () { return local.json(readKey(), []); };
  notifs.isRead = function (n) { return notifs.readSet().indexOf(n.id) > -1; };

  notifs.unread = function () {
    return notifs.items.filter(function (n) { return !notifs.isRead(n); }).length;
  };

  notifs.on = function (run) { listeners.push(run); };

  // Tell the bell and the pages
  notifs.emit = function () {
    var count = notifs.unread();
    listeners.forEach(function (run) { run(count); });
  };

  notifs.load = function () {
    return get('/notifications').then(function (reply) {
      notifs.items = reply.data;
      notifs.loaded = true;
      notifs.emit();
    });
  };

  // Accepts one id or a list. Gives back false when the browser could not save it
  notifs.markRead = function (ids) {
    var read = notifs.readSet();
    [].concat(ids).forEach(function (id) { if (read.indexOf(id) === -1) read.push(id); });
    var saved = local.setJson(readKey(), read.slice(-500)); // the newest 500 are enough
    if (!saved) CE.ui.toast('error', 'Couldn’t save read status on this device.');
    notifs.emit();
    return saved;
  };

  // It goes at once, and comes back if the backend refuses
  notifs.remove = function (id) {
    var before = notifs.items;
    notifs.items = before.filter(function (n) { return n.id !== id; });
    notifs.emit();
    return del('/notifications/' + encodeURIComponent(id)).catch(function (err) {
      notifs.items = before;
      notifs.emit();
      throw err;
    });
  };

  function linkTo(page, id, label) { return { href: page + '.html?id=' + encodeURIComponent(id), label: label }; }

  // What a notification is about
  notifs.link = function (n) {
    var about = n.metadata || {};
    if (about.event_id) return linkTo('event', about.event_id, 'Open event');
    if (about.announcement_id) return linkTo('announcement', about.announcement_id, 'Listen to announcement');
    if (about.promo_id) return linkTo('promo', about.promo_id, 'Watch promo');
    if (about.service_request_id) return { href: 'requests.html', label: 'See your requests' };
    return null;
  };

  notifs.typeIcon = function (type) {
    return { event: 'calendar', announcement: 'megaphone', promo: 'film', service: 'message' }[type] || 'bell';
  };

  // ---------- starting a page ----------

  var waiting = []; // what the page's own script wants to run
  CE.ready = function (run) { waiting.push(run); };
  CE.runPage = function () { waiting.forEach(function (run) { run(); }); };

  // ---------- what the other files can use ----------

  var api = findApi();
  CE.config = {
    API_BASE: api,
    ORIGIN: api.replace(/\/api$/, ''),
    SUPPORT_EMAIL: 'support@civicevents.example',
    // The same limits as backend/src/middlewares/upload.middleware.js
    UPLOADS: {
      image: { max: 2 * 1024 * 1024, ext: ['jpg', 'jpeg', 'png', 'gif'], label: 'JPG, PNG or GIF up to 2 MB' },
      audio: { max: 5 * 1024 * 1024, ext: ['mp3', 'wav', 'm4a', 'ogg'], label: 'MP3, WAV, M4A or OGG up to 5 MB' },
      video: { max: 8 * 1024 * 1024, ext: ['mp4', 'mov', 'avi', 'mkv'], label: 'MP4, MOV, AVI or MKV up to 8 MB' }
    }
  };
  CE.esc = esc;
  CE.param = param;
  CE.num = num;
  CE.debounce = debounce;
  CE.pageName = pageName;
  CE.mediaUrl = mediaUrl;
  CE.videoLink = videoLink;
  CE.fmt = { date: date, time: time, dateTime: dateTime, range: range, stub: stub, relative: relative, duration: duration, bytes: bytes, toLocalInput: toLocalInput };
  CE.local = local;
  CE.auth = {
    user: user, isLoggedIn: isLoggedIn, persistent: persistent, expiresAt: expiresAt,
    save: save, updateUser: updateUser, expire: expire, logout: logout, startEndTimer: startEndTimer
  };
  CE.flash = { set: setFlash, take: takeFlash };
  CE.ApiError = ApiError;
  CE.api = { get: get, post: post, put: put, patch: patch, del: del, upload: upload, health: health };
  CE.handleError = handleError;
  CE.guard = { role: role, can: can, applyRoles: applyRoles, checkPage: checkPage };
  CE.cache = { invalidate: invalidate };
  CE.data = { events: events, announcements: announcements, promos: promos, myRegistrations: myRegistrations, visible: visible };
  CE.notifs = notifs;
})(jQuery);
