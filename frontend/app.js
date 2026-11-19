/* =========================================================================
   CivicEvents+ — core application module (jQuery)
   -------------------------------------------------------------------------
   Loaded on every page AFTER jQuery. Exposes a single global namespace `CE`
   with:
     CE.config   – API base URL & upload limits
     CE.auth     – global auth context { token, user:{id, full_name, role} }
     CE.api      – fetch wrapper that attaches `Authorization: Bearer <token>`
     CE.guard    – ROLE-BASED ACCESS GUARDS (see section 5)
     CE.cache    – small TTL cache for lists (invalidated on create/update)
     CE.notifs   – notification inbox state + unread count
     CE.ui       – toasts, modals, skeletons, pagination, icons, helpers
     CE.ready(fn)– register a page initialiser; runs once guards pass

   Each page declares who may view it with <body data-auth="...">:
     public – anyone          guest – only signed-out visitors
     user   – any signed-in   admin – signed-in admins only
   ========================================================================= */
(function ($, window, document) {
  'use strict';

  /* ----------------------------------------------------------------------
     1. CONFIG
     The API base URL can be overridden without editing code:
       • window.CIVIC_API_BASE set in a <script> before app.js, or
       • localStorage key "ce_api_base" (handy for demos), or
       • ?api=http://host:port/api once in the URL (persisted).
     ---------------------------------------------------------------------- */
  var DEFAULT_API = 'http://localhost:4000/api';
  (function captureApiOverride() {
    try {
      var p = new URLSearchParams(window.location.search).get('api');
      if (p) localStorage.setItem('ce_api_base', p.replace(/\/$/, ''));
    } catch (e) { /* storage blocked – fall back to default */ }
  })();

  function readApiBase() {
    var stored = null;
    try { stored = localStorage.getItem('ce_api_base'); } catch (e) { }
    return (window.CIVIC_API_BASE || stored || DEFAULT_API).replace(/\/$/, '');
  }

  var config = {
    API_BASE: readApiBase(),
    get ORIGIN() { return this.API_BASE.replace(/\/api$/, ''); },
    SUPPORT_EMAIL: 'support@civicevents.example',
    // Mirrors backend multer limits (backend/src/middlewares/upload.middleware.js)
    UPLOADS: {
      image: { max: 2 * 1024 * 1024, ext: ['jpg', 'jpeg', 'png', 'gif'], label: 'JPG, PNG or GIF up to 2 MB' },
      audio: { max: 5 * 1024 * 1024, ext: ['mp3', 'wav', 'm4a', 'ogg'], label: 'MP3, WAV, M4A or OGG up to 5 MB' },
      video: { max: 8 * 1024 * 1024, ext: ['mp4', 'mov', 'avi', 'mkv'], label: 'MP4, MOV, AVI or MKV up to 8 MB' }
    }
  };

  /* ----------------------------------------------------------------------
     2. SMALL UTILITIES
     ---------------------------------------------------------------------- */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function param(name) { return new URLSearchParams(window.location.search).get(name); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function currentPage() { return (window.location.pathname.split('/').pop() || 'index.html'); }

  // Resolve media URLs. The backend returns absolute URLs built from its own
  // host; if a relative /uploads path ever comes back, prefix the API origin.
  function mediaUrl(u) {
    if (!u) return '';
    if (/^https?:\/\//i.test(u) || u.indexOf('blob:') === 0 || u.indexOf('data:') === 0) return u;
    return config.ORIGIN + (u.charAt(0) === '/' ? '' : '/') + u;
  }

  // Promo videos can be an uploaded file or a YouTube/Vimeo link (the backend
  // stores links in video_url in canonical form). Returns details for embedding,
  // or null for an uploaded file. Mirrors backend/src/utils/videoLink.js.
  function videoLink(raw) {
    if (!raw || typeof raw !== 'string') return null;
    var u; try { u = new URL(raw.trim()); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    var host = u.hostname.toLowerCase(), parts = u.pathname.split('/').filter(Boolean), yt = null;
    if (host === 'youtu.be') yt = parts[0];
    else if (/^((www|m|music)\.)?youtube(-nocookie)?\.com$/.test(host)) {
      if (parts[0] === 'watch') yt = u.searchParams.get('v');
      else if (['shorts', 'embed', 'live', 'v'].indexOf(parts[0]) > -1) yt = parts[1];
    }
    if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) {
      return {
        provider: 'youtube', label: 'YouTube', id: yt,
        watch: 'https://www.youtube.com/watch?v=' + yt,
        // privacy-enhanced embed; captions on by default; no unrelated suggestions
        embed: 'https://www.youtube-nocookie.com/embed/' + yt + '?rel=0&cc_load_policy=1&modestbranding=1',
        thumb: 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg'
      };
    }
    if (/^((www|player)\.)?vimeo\.com$/.test(host)) {
      var vm = host === 'player.vimeo.com' ? parts[1] : parts.filter(function (p) { return /^\d+$/.test(p); })[0];
      if (vm && /^\d{6,12}$/.test(vm)) {
        return {
          provider: 'vimeo', label: 'Vimeo', id: vm,
          watch: 'https://vimeo.com/' + vm,
          embed: 'https://player.vimeo.com/video/' + vm + '?dnt=1&texttrack=en',
          thumb: '' // Vimeo thumbnails need their API, so cards use generated artwork
        };
      }
    }
    return null;
  }

  var fmt = {
    _d: function (v) { var d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : d; },
    date: function (v, opts) { var d = fmt._d(v); return d ? d.toLocaleDateString(undefined, opts || { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'; },
    time: function (v) { var d = fmt._d(v); return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''; },
    dateTime: function (v) { var d = fmt._d(v); return d ? fmt.date(d) + ' · ' + fmt.time(d) : '—'; },
    range: function (a, b) {
      var s = fmt._d(a), e = fmt._d(b);
      if (!s) return 'Date to be announced';
      if (!e) return fmt.dateTime(s);
      if (s.toDateString() === e.toDateString()) return fmt.date(s) + ' · ' + fmt.time(s) + ' – ' + fmt.time(e);
      return fmt.dateTime(s) + ' → ' + fmt.dateTime(e);
    },
    stub: function (v) {
      var d = fmt._d(v);
      if (!d) return { day: '—', mon: 'TBA', wk: '' };
      return { day: d.getDate(), mon: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(), wk: d.toLocaleDateString(undefined, { weekday: 'short' }) };
    },
    relative: function (v) {
      var d = fmt._d(v); if (!d) return '';
      var s = Math.round((Date.now() - d.getTime()) / 1000), a = Math.abs(s), fut = s < 0;
      var out = a < 45 ? 'just now'
        : a < 3600 ? Math.round(a / 60) + 'm'
          : a < 86400 ? Math.round(a / 3600) + 'h'
            : a < 604800 ? Math.round(a / 86400) + 'd'
              : null;
      if (!out) return fmt.date(d, { day: 'numeric', month: 'short', year: 'numeric' });
      if (out === 'just now') return out;
      return fut ? 'in ' + out : out + ' ago';
    },
    duration: function (sec) {
      sec = Math.max(0, Math.floor(num(sec)));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      var mm = h ? String(m).padStart(2, '0') : String(m);
      return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
    },
    bytes: function (b) { b = num(b); return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; },
    // ISO → value for <input type="datetime-local"> in the viewer's timezone
    toLocalInput: function (v) {
      var d = fmt._d(v); if (!d) return '';
      var off = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - off).toISOString().slice(0, 16);
    }
  };

  // Safe storage wrappers: private windows / blocked storage must never crash the app.
  function store(kind) {
    var s = null;
    try { s = window[kind]; var k = '__ce_t'; s.setItem(k, '1'); s.removeItem(k); } catch (e) { s = null; }
    var mem = {};
    return {
      available: !!s,
      get: function (k) { try { return s ? s.getItem(k) : (k in mem ? mem[k] : null); } catch (e) { return null; } },
      set: function (k, v) { try { if (s) s.setItem(k, v); else mem[k] = v; return true; } catch (e) { return false; } },
      del: function (k) { try { if (s) s.removeItem(k); else delete mem[k]; } catch (e) { } },
      json: function (k, fb) { try { var v = this.get(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
      setJson: function (k, v) { return this.set(k, JSON.stringify(v)); }
    };
  }
  var local = store('localStorage');
  var session = store('sessionStorage');

  /* ----------------------------------------------------------------------
     3. AUTH CONTEXT
     Holds { token, user: { id, full_name, email, role } }.
     Storage rule (security trade-off):
       • "Keep me signed in" ticked  → localStorage  (survives browser
         restarts, but readable by any script on this origin → larger XSS
         blast radius; we mitigate by escaping all rendered data).
       • Not ticked (default)        → sessionStorage (cleared when the tab
         closes; the safer choice on shared computers).
     The backend issues 1-hour JWTs; we read `exp` from the token payload and
     sign the user out automatically when it lapses.
     ---------------------------------------------------------------------- */
  var TOKEN_KEY = 'ce_token', USER_KEY = 'ce_user';
  var expiryTimer = null;

  function decodeJwt(token) {
    try {
      var p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(p).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
    } catch (e) { return null; }
  }

  var auth = {
    _bucket: function () { return session.get(TOKEN_KEY) ? session : (local.get(TOKEN_KEY) ? local : null); },
    token: function () { var b = auth._bucket(); return b ? b.get(TOKEN_KEY) : null; },
    user: function () { var b = auth._bucket(); return b ? b.json(USER_KEY, null) : null; },
    isLoggedIn: function () { return !!auth.token() && !auth.isExpired(); },
    // NOTE: role checks in the UI are UX only – the backend `authorize(['admin'])`
    // middleware is the real security boundary.
    isAdmin: function () { var u = auth.user(); return !!u && u.role === 'admin'; },
    persistent: function () { return auth._bucket() === local; },
    expiresAt: function () { var t = auth.token(), p = t && decodeJwt(t); return p && p.exp ? p.exp * 1000 : null; },
    isExpired: function () { var e = auth.expiresAt(); return e ? Date.now() >= e : false; },
    save: function (token, user, remember) {
      auth.clear();
      var b = remember ? local : session;
      b.set(TOKEN_KEY, token);
      b.setJson(USER_KEY, { id: user.id, full_name: user.full_name, email: user.email, role: user.role, is_active: user.is_active });
      auth.scheduleExpiry();
    },
    updateUser: function (patch) {
      var b = auth._bucket(); if (!b) return;
      var u = $.extend({}, auth.user(), patch);
      b.setJson(USER_KEY, { id: u.id, full_name: u.full_name, email: u.email, role: u.role, is_active: u.is_active });
    },
    clear: function () {
      [local, session].forEach(function (s) { s.del(TOKEN_KEY); s.del(USER_KEY); });
      cache.clearAll();
      clearTimeout(expiryTimer);
    },
    // Ends the session and sends the user to login with an explanatory message.
    expire: function (message, type) {
      auth.clear();
      flash.set(type || 'warning', message || 'Your session has expired. Please sign in again.');
      var here = currentPage() + window.location.search;
      window.location.href = 'login.html' + (/^(login|signup)\.html/.test(here) ? '' : '?next=' + encodeURIComponent(here));
    },
    logout: function () {
      auth.clear();
      flash.set('success', 'You have been signed out. See you soon!');
      window.location.href = 'login.html';
    },
    scheduleExpiry: function () {
      clearTimeout(expiryTimer);
      var e = auth.expiresAt(); if (!e) return;
      var ms = e - Date.now();
      if (ms <= 0) return;
      // setTimeout max is ~24.8 days; tokens here live 1h so this is safe.
      expiryTimer = setTimeout(function () { auth.expire('Your session expired after an hour of inactivity. Please sign in again.'); }, Math.min(ms, 2147483000));
    }
  };

  // One-shot messages that survive a redirect (e.g. "Account created" toast on login page).
  var flash = {
    set: function (type, message) { session.setJson('ce_flash', { type: type, message: message }); },
    consume: function () { var f = session.json('ce_flash', null); session.del('ce_flash'); return f; }
  };

  /* ----------------------------------------------------------------------
     4. API CLIENT
     All requests go through CE.api.request(). It:
       • prefixes CE.config.API_BASE
       • attaches  Authorization: Bearer <token>  for protected endpoints
       • sends JSON, or multipart/form-data when `form` (FormData) is given
       • reports upload progress via onProgress(percent)
       • normalises errors into { status, message, errors[] }
       • on 401 → signs out & redirects to login with a message
     ---------------------------------------------------------------------- */
  function ApiError(status, message, errors, raw) {
    this.status = status; this.message = message; this.errors = errors || []; this.raw = raw;
  }

  function toApiError(xhr, textStatus) {
    var json = xhr && xhr.responseJSON;
    if ((!json) && xhr && xhr.responseText) { try { json = JSON.parse(xhr.responseText); } catch (e) { } }
    var status = xhr ? xhr.status : 0;
    var errors = (json && json.errors) || [];
    var msg = json && json.message;
    if (errors.length && (!msg || msg === 'Validation failed')) msg = errors.map(function (e) { return e.message || e.msg; }).join(' · ');

    if (textStatus === 'timeout') return new ApiError(0, 'The server took too long to respond. Please try again.', [], xhr);
    // Name the address we tried, so a stopped backend or a wrong port is easy to spot.
    if (status === 0) return new ApiError(0, 'We couldn’t reach the CivicEvents+ server at ' + config.API_BASE + '. Check your connection (or that the API is running) and try again.', [], xhr);
    if (status === 413) msg = msg || 'That file is too large for the server.';
    if (status === 404) msg = msg || 'We couldn’t find what you were looking for.';
    if (status === 403) msg = msg || 'You don’t have permission to do that.';
    if (status >= 500) msg = 'Something went wrong on our side (' + status + ')' + (msg && msg !== 'Internal Server Error' ? ': ' + msg : '. Please try again shortly.');
    return new ApiError(status, msg || ('Request failed (' + status + ')'), errors, xhr);
  }

  var api = {
    request: function (method, path, opts) {
      opts = opts || {};
      return new Promise(function (resolve, reject) {
        var headers = {};
        var token = auth.token();
        if (token && !opts.public) headers.Authorization = 'Bearer ' + token;

        var settings = {
          url: config.API_BASE + path,
          method: method,
          headers: headers,
          dataType: 'json',
          timeout: opts.timeout || 30000
        };
        if (opts.form) {
          settings.data = opts.form;
          settings.processData = false;
          settings.contentType = false;
          settings.timeout = opts.timeout || 180000;
          settings.xhr = function () {
            var x = $.ajaxSettings.xhr();
            if (opts.onProgress && x.upload) {
              x.upload.addEventListener('progress', function (e) {
                if (e.lengthComputable) opts.onProgress(Math.round((e.loaded / e.total) * 100));
              });
            }
            return x;
          };
        } else if (opts.body !== undefined) {
          settings.data = JSON.stringify(opts.body);
          settings.contentType = 'application/json';
        } else if (opts.query) {
          settings.data = opts.query;
        }

        $.ajax(settings)
          .done(function (res) { resolve(res || {}); })
          .fail(function (xhr, textStatus) { reject(toApiError(xhr, textStatus)); });
      }).catch(function (err) {
        // Expired / invalid token → sign out immediately (except on the login call itself).
        if (err.status === 401 && !opts.public) {
          auth.expire(err.message === 'Invalid or expired token' || err.message === 'User not found'
            ? 'Your session has expired. Please sign in again.'
            : err.message);
          return new Promise(function () { }); // halt the chain while redirecting
        }
        throw err;
      });
    },
    get: function (p, q, o) { return api.request('GET', p, $.extend({ query: q }, o)); },
    post: function (p, b, o) { return api.request('POST', p, $.extend({ body: b }, o)); },
    put: function (p, b, o) { return api.request('PUT', p, $.extend({ body: b }, o)); },
    patch: function (p, b, o) { return api.request('PATCH', p, $.extend({ body: b }, o)); },
    del: function (p, o) { return api.request('DELETE', p, o); },
    upload: function (method, p, formData, onProgress) { return api.request(method, p, { form: formData, onProgress: onProgress }); },
    // Ping the backend health endpoint (outside /api) for the footer status light.
    health: function () {
      return new Promise(function (res) {
        $.ajax({ url: config.ORIGIN + '/health', timeout: 5000, dataType: 'json' }).done(function () { res(true); }).fail(function () { res(false); });
      });
    }
  };

  /* Friendly central error handler.
     - 403 → explains the permission problem and offers "contact admin"
     - network/5xx with a retry callback → toast with a Retry action
     - everything else → error toast with the API's own message           */
  function handleError(err, opts) {
    opts = opts || {};
    if (!err) return;
    if (!(err instanceof ApiError)) { console.error(err); err = new ApiError(-1, err.message || 'Unexpected error'); }
    if (err.status === 403) { ui.forbiddenModal(err.message); return; }
    var retryable = opts.retry && (err.status === 0 || err.status >= 500);
    ui.toast('error', (opts.prefix ? opts.prefix + ' ' : '') + err.message, retryable ? { action: 'Retry', onAction: opts.retry, duration: 9000 } : null);
  }

  /* ----------------------------------------------------------------------
     5. ROLE-BASED ACCESS GUARDS  (UX layer — backend is the real authority)
     -------------------------------------------------------------------------
     There are three layers of client-side guarding in this app:

     (a) PAGE GUARD — <body data-auth="user|admin|guest|public">
         Evaluated in boot() before any page code runs:
           - "user"  : no valid token → redirect to login.html?next=…
           - "admin" : not signed in → login; signed in but role !== 'admin'
                       → page content replaced with a 403 panel (the page's
                       own init never runs, so no admin API calls fire).
           - "guest" : already signed in → redirect to home / dashboard.

     (b) ELEMENT GUARD — markup attribute data-role="admin" | "user" | "guest"
         CE.guard.apply() REMOVES (not just hides) any element whose
         data-role does not match the current user, so admin controls are
         absent from the DOM for normal users. Pages call it again after
         rendering dynamic content.

     (c) ACTION GUARD — CE.guard.can(action) is checked inside handlers that
         build admin buttons (edit/delete/publish) or user-only buttons
         (register/feedback) in templated HTML, and before firing the
         request. If a check is bypassed, the backend still answers 403 and
         handleError() shows the "contact an administrator" dialog.
     ---------------------------------------------------------------------- */
  var ADMIN_ACTIONS = [
    'event:create', 'event:edit', 'event:delete', 'event:viewRegistrants', 'event:viewAllFeedback',
    'announcement:create', 'announcement:edit', 'announcement:delete', 'announcement:publish',
    'promo:create', 'promo:edit', 'promo:delete', 'promo:publish',
    'notification:delete', 'users:manage', 'dashboard:view', 'content:viewUnpublished'
  ];
  var USER_ACTIONS = ['event:register', 'event:feedback'];

  var guard = {
    role: function () { var u = auth.isLoggedIn() && auth.user(); return u ? u.role : 'guest'; },
    can: function (action) {
      var role = guard.role();
      if (role === 'admin') return ADMIN_ACTIONS.indexOf(action) > -1;
      if (role === 'user') return USER_ACTIONS.indexOf(action) > -1;
      return false;
    },
    // (b) element guard
    apply: function (root) {
      var role = guard.role();
      $(root || document).find('[data-role]').each(function () {
        var allowed = String($(this).attr('data-role')).split(/[\s,]+/);
        // "auth" = any signed-in user (admin or user)
        var ok = allowed.indexOf(role) > -1 || (role !== 'guest' && allowed.indexOf('auth') > -1);
        if (!ok) $(this).remove(); else $(this).removeAttr('hidden');
      });
    },
    // (a) page guard — returns true when the page may initialise
    page: function () {
      var need = $('body').data('auth') || 'public';
      var loggedIn = auth.isLoggedIn();
      if (auth.token() && auth.isExpired()) { auth.expire(); return false; }

      if (need === 'guest' && loggedIn) {
        window.location.replace(auth.isAdmin() ? 'admin.html' : 'index.html');
        return false;
      }
      if ((need === 'user' || need === 'admin') && !loggedIn) {
        flash.set('info', 'Please sign in to continue.');
        window.location.replace('login.html?next=' + encodeURIComponent(currentPage() + window.location.search));
        return false;
      }
      if (need === 'admin' && !auth.isAdmin()) {
        // Signed-in normal user on an admin page → 403 panel, page init skipped.
        ui.forbiddenPage($('#main'));
        return 'forbidden';
      }
      return true;
    }
  };

  /* ----------------------------------------------------------------------
     6. CACHE — short-lived list cache in sessionStorage, scoped per user.
        Lists (events, promos, announcements) are cached for 2 minutes and
        invalidated whenever an admin creates/updates/deletes that resource.
     ---------------------------------------------------------------------- */
  var cache = {
    _k: function (key) { var u = auth.user(); return 'ce_cache:' + (u ? u.id : 'anon') + ':' + key; },
    get: function (key) {
      var e = session.json(cache._k(key), null);
      if (!e || Date.now() > e.exp) return null;
      return e.v;
    },
    set: function (key, value, ttlMs) { session.setJson(cache._k(key), { v: value, exp: Date.now() + (ttlMs || 120000) }); },
    invalidate: function (prefix) {
      var p = cache._k(prefix);
      try {
        var keys = [];
        for (var i = 0; i < sessionStorage.length; i++) { var k = sessionStorage.key(i); if (k && k.indexOf(p) === 0) keys.push(k); }
        keys.forEach(function (k) { sessionStorage.removeItem(k); });
      } catch (e) { }
    },
    clearAll: function () {
      try {
        var keys = [];
        for (var i = 0; i < sessionStorage.length; i++) { var k = sessionStorage.key(i); if (k && k.indexOf('ce_cache:') === 0) keys.push(k); }
        keys.forEach(function (k) { sessionStorage.removeItem(k); });
      } catch (e) { }
    },
    // fetch-through helper: returns cached value or loads & stores it.
    through: function (key, loader, ttlMs) {
      var hit = cache.get(key);
      if (hit) return Promise.resolve(hit);
      return loader().then(function (v) { cache.set(key, v, ttlMs); return v; });
    }
  };

  // Shared loaders so every page reads lists the same way.
  var data = {
    events: function (force) {
      if (force) cache.invalidate('events');
      return cache.through('events', function () { return api.get('/events').then(function (r) { return r.data || []; }); });
    },
    announcements: function (force) {
      if (force) cache.invalidate('announcements');
      return cache.through('announcements', function () { return api.get('/announcements', { limit: 100 }).then(function (r) { return r.data || []; }); });
    },
    promos: function (force) {
      if (force) cache.invalidate('promos');
      return cache.through('promos', function () { return api.get('/promos', { limit: 100 }).then(function (r) { return r.data || []; }); });
    },
    myRegistrations: function () {
      return api.get('/event-registrations/my-registrations').then(function (r) { return r.data || []; });
    },
    // Visibility rule: normal users only ever see published=true content.
    visible: function (list) {
      if (guard.can('content:viewUnpublished')) return list;
      return (list || []).filter(function (x) { return x.published !== false; });
    }
  };

  /* ----------------------------------------------------------------------
     7. ICONS (inline SVG, stroke style)
     ---------------------------------------------------------------------- */
  var ICONS = {
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8.5 3 8.5H3S6 15 6 8z"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    mic: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 8.5a5 5 0 0 1 0 7M18 5.5a9 9 0 0 1 0 13"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    inbox: '<path d="M3 13.5 5.5 5h13l2.5 8.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2.5a1.5 1.5 0 0 0 0-3z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
    cc: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M10.5 10.2a2.5 2.5 0 1 0 0 3.6M17.5 10.2a2.5 2.5 0 1 0 0 3.6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    message: '<path d="M4 5h16v11H9l-5 4z"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h2l8 5V4L6 9H4a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    toggle: '<rect x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="16.5" cy="12" r="2.8"/>',
    rewind: '<path d="M11 18 4 12l7-6zM20 18l-7-6 7-6z" fill="currentColor" stroke="none"/>',
    forward: '<path d="m13 6 7 6-7 6zM4 6l7 6-7 6z" fill="currentColor" stroke="none"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    wifiOff: '<path d="M2 8.5a15 15 0 0 1 5-3M22 8.5A15 15 0 0 0 11 4.6M5 12a10 10 0 0 1 4-2.4M19 12a10 10 0 0 0-3.3-2.2M8.5 15.5a5 5 0 0 1 7 0M12 19.5v.01M3 3l18 18"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || 'w-5 h-5') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  /* ----------------------------------------------------------------------
     8. DICEBEAR — generated artwork (https://www.dicebear.com)
     avatars: people · cover: event placeholder · art: announcement/promo
     ---------------------------------------------------------------------- */
  var DB = 'https://api.dicebear.com/9.x/';
  var dice = {
    avatar: function (seed) { return DB + 'notionists/svg?seed=' + encodeURIComponent(seed || 'civic') + '&backgroundColor=f3c2a8,c9d1e1,e2d8c3,c3dba8,fae3d6&backgroundType=solid'; },
    initials: function (seed) { return DB + 'initials/svg?seed=' + encodeURIComponent(seed || 'CE') + '&backgroundColor=121a2e,283656,a9441f,466625&fontWeight=600'; },
    cover: function (seed) { return DB + 'shapes/svg?seed=' + encodeURIComponent(seed || 'event') + '&backgroundColor=121a2e,1c2742,283656,6b2c19,36476c&shape1Color=ea9a74,f3c2a8,c3dba8,9aa8c4&shape2Color=df7447,fae3d6,e2d8c3&shape3Color=c8562a,c9d1e1,5b7f2f'; },
    rings: function (seed) { return DB + 'rings/svg?seed=' + encodeURIComponent(seed || 'audio') + '&backgroundColor=121a2e,283656,6b2c19&ringColor=ea9a74,f3c2a8,c9d1e1,fae3d6'; },
    glass: function (seed) { return DB + 'glass/svg?seed=' + encodeURIComponent(seed || 'promo') + '&backgroundColor=121a2e,283656,a9441f,36476c'; }
  };

  /* ----------------------------------------------------------------------
     9. UI KIT
     ---------------------------------------------------------------------- */
  var ui = {
    icon: icon,

    /* --- toasts (aria-live region) --- */
    toast: function (type, message, opts) {
      opts = opts || {};
      var $region = $('#toast-region');
      if (!$region.length) $region = $('<div id="toast-region" role="region" aria-label="Notifications"></div>').appendTo('body');
      var dur = opts.duration || (type === 'error' ? 7000 : 4500);
      var ic = { success: 'check', error: 'alert', warning: 'alert', info: 'info' }[type] || 'info';
      var $t = $('<div class="toast" data-type="' + esc(type) + '" role="' + (type === 'error' ? 'alert' : 'status') + '">' +
        '<span class="toast-icon mt-0.5">' + icon(ic) + '</span>' +
        '<div class="flex-1 text-sm leading-relaxed"></div>' +
        (opts.action ? '<button type="button" class="toast-action text-xs font-bold uppercase tracking-wider underline underline-offset-4 mt-0.5">' + esc(opts.action) + '</button>' : '') +
        '<button type="button" class="toast-close opacity-70 hover:opacity-100" aria-label="Dismiss">' + icon('x', 'w-4 h-4') + '</button>' +
        '<span class="toast-timer" style="animation-duration:' + dur + 'ms"></span></div>');
      $t.find('.flex-1').text(message);
      function close() { $t.addClass('is-leaving'); setTimeout(function () { $t.remove(); }, 300); }
      $t.on('click', '.toast-close', close);
      $t.on('click', '.toast-action', function () { close(); if (opts.onAction) opts.onAction(); });
      var timer = setTimeout(close, dur);
      $t.on('mouseenter', function () { clearTimeout(timer); $t.find('.toast-timer').css('animation-play-state', 'paused'); })
        .on('mouseleave', function () { timer = setTimeout(close, 2000); });
      $region.append($t);
    },

    /* --- generic modal with focus trap; returns a controller --- */
    modal: function (opts) {
      var lastFocus = document.activeElement;
      var id = 'm' + Math.random().toString(36).slice(2, 8);
      var $ov = $('<div class="overlay"></div>');
      var $wrap = $('<div class="modal-wrap"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t"></div></div>');
      var $m = $wrap.find('.modal');
      $m.html(
        '<div class="p-6 sm:p-7">' +
        '<div class="flex items-start justify-between gap-4 mb-4">' +
        '<h2 id="' + id + '-t" class="font-display text-2xl text-ink-900"></h2>' +
        '<button type="button" class="icon-btn -mr-2 -mt-1" data-close aria-label="Close dialog">' + icon('x') + '</button></div>' +
        '<div class="modal-body text-ink-700"></div>' +
        (opts.footer ? '<div class="modal-foot mt-6 flex flex-wrap justify-end gap-2"></div>' : '') +
        '</div>');
      $m.find('h2').text(opts.title || '');
      $m.find('.modal-body').html(opts.body || '');
      if (opts.footer) $m.find('.modal-foot').html(opts.footer);
      if (opts.wide) $m.css('width', 'min(46rem, 100%)');
      $('body').append($ov, $wrap).css('overflow', 'hidden');
      requestAnimationFrame(function () { $ov.addClass('is-open'); $m.addClass('is-open'); });

      function close(result) {
        $ov.removeClass('is-open'); $m.removeClass('is-open');
        $(document).off('keydown.' + id);
        setTimeout(function () { $ov.remove(); $wrap.remove(); if (!$('.modal').length && !$('.drawer.is-open').length) $('body').css('overflow', ''); }, 300);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        if (opts.onClose) opts.onClose(result);
      }
      $ov.on('click', function () { close(false); });
      $wrap.on('click', '[data-close]', function () { close(false); });
      $wrap.on('click', function (e) { if (e.target === $wrap[0]) close(false); });
      $(document).on('keydown.' + id, function (e) {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Tab') ui.trapFocus($m, e);
      });
      setTimeout(function () {
        var $f = $m.find('[autofocus]').first();
        ($f.length ? $f : $m.find('button, a, input, select, textarea').not('[data-close]').first()).trigger('focus');
      }, 60);
      return { $el: $m, close: close };
    },

    trapFocus: function ($container, e) {
      var f = $container.find('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])').filter(':visible');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },

    /* --- confirm dialog → Promise<boolean> --- */
    confirm: function (opts) {
      return new Promise(function (resolve) {
        var done = false;
        var m = ui.modal({
          title: opts.title || 'Are you sure?',
          body: '<p class="text-sm leading-relaxed"></p>',
          footer: '<button type="button" class="btn btn-ghost" data-close>Cancel</button>' +
            '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ok autofocus>' + esc(opts.confirmText || 'Confirm') + '</button>',
          onClose: function () { if (!done) resolve(false); }
        });
        m.$el.find('.modal-body p').text(opts.message || '');
        m.$el.on('click', '[data-ok]', function () { done = true; resolve(true); m.close(true); });
      });
    },

    /* --- 403 messaging --- */
    forbiddenModal: function (message) {
      ui.modal({
        title: 'Access restricted',
        body: '<div class="flex gap-4"><span class="shrink-0 grid place-items-center w-12 h-12 rounded-full bg-ember-100 text-ember-700">' + icon('lock', 'w-6 h-6') + '</span>' +
          '<div class="text-sm leading-relaxed"><p class="font-medium text-ink-900 mb-1">' + esc(message || 'You don’t have permission to perform this action.') + '</p>' +
          '<p>If you believe this is a mistake, ask a CivicEvents+ administrator to review your account.</p></div></div>',
        footer: '<a class="btn btn-ghost" href="mailto:' + config.SUPPORT_EMAIL + '?subject=CivicEvents%2B%20access%20request">' + icon('mail', 'w-4 h-4') + 'Contact admin</a>' +
          '<button class="btn btn-primary" data-close>Okay</button>'
      });
    },
    forbiddenPage: function ($target) {
      ($target && $target.length ? $target : $('main')).html(
        '<section class="max-w-xl mx-auto px-4 py-24 text-center page-enter">' +
        '<div class="mx-auto mb-6 grid place-items-center w-20 h-20 rounded-full bg-ember-100 text-ember-700 float-slow">' + icon('shield', 'w-10 h-10') + '</div>' +
        '<p class="eyebrow mb-3">Error 403 · Admins only</p>' +
        '<h1 class="font-display text-4xl text-ink-900 mb-4">This area is reserved for administrators</h1>' +
        '<p class="text-ink-600 mb-8">Your account doesn’t have permission to view this page. If you need access, please contact an administrator.</p>' +
        '<div class="flex flex-wrap justify-center gap-3"><a href="index.html" class="btn btn-primary">' + icon('home', 'w-4 h-4') + 'Back to home</a>' +
        '<a href="mailto:' + config.SUPPORT_EMAIL + '?subject=CivicEvents%2B%20admin%20access" class="btn btn-ghost">' + icon('mail', 'w-4 h-4') + 'Contact admin</a></div></section>');
    },

    /* --- loading / empty / error states --- */
    skeletonCards: function (n, kind) {
      var out = '';
      for (var i = 0; i < (n || 6); i++) {
        out += kind === 'row'
          ? '<div class="card p-4 flex items-center gap-4" aria-hidden="true"><div class="skeleton w-12 h-12 rounded-full"></div><div class="flex-1 space-y-2"><div class="skeleton h-4 w-2/3"></div><div class="skeleton h-3 w-1/3"></div></div></div>'
          : '<div class="card overflow-hidden" aria-hidden="true"><div class="skeleton h-44 rounded-none"></div><div class="p-5 space-y-3"><div class="skeleton h-3 w-1/3"></div><div class="skeleton h-5 w-4/5"></div><div class="skeleton h-3 w-full"></div><div class="skeleton h-3 w-2/3"></div><div class="flex gap-2 pt-2"><div class="skeleton h-9 w-24 rounded-full"></div><div class="skeleton h-9 w-24 rounded-full"></div></div></div></div>';
      }
      return out;
    },
    empty: function (title, text, actionHtml, ic) {
      return '<div class="col-span-full card p-10 sm:p-14 text-center page-enter">' +
        '<div class="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-paper-200 text-ink-500 float-slow">' + icon(ic || 'inbox', 'w-8 h-8') + '</div>' +
        '<h3 class="font-display text-2xl text-ink-900 mb-2">' + esc(title) + '</h3>' +
        '<p class="text-ink-600 max-w-md mx-auto">' + esc(text || '') + '</p>' +
        (actionHtml ? '<div class="mt-6">' + actionHtml + '</div>' : '') + '</div>';
    },
    errorState: function ($el, err, retry) {
      var offline = err && err.status === 0;
      $el.html('<div class="col-span-full card p-10 text-center page-enter" role="alert">' +
        '<div class="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-ember-100 text-ember-700">' + icon(offline ? 'wifiOff' : 'alert', 'w-8 h-8') + '</div>' +
        '<h3 class="font-display text-2xl text-ink-900 mb-2">' + (offline ? 'You appear to be offline' : 'We hit a snag') + '</h3>' +
        '<p class="text-ink-600 max-w-md mx-auto mb-6 err-msg"></p>' +
        (retry ? '<button type="button" class="btn btn-primary retry">' + icon('refresh', 'w-4 h-4') + 'Try again</button>' : '') + '</div>');
      $el.find('.err-msg').text((err && err.message) || 'Something went wrong.');
      if (retry) $el.find('.retry').on('click', retry);
    },

    /* --- button busy state --- */
    busy: function ($btn, on, label) {
      $btn = $($btn);
      if (on) {
        $btn.data('orig', $btn.html()).prop('disabled', true).attr('aria-busy', 'true')
          .html('<span class="spinner" aria-hidden="true"></span><span>' + esc(label || 'Working…') + '</span>');
      } else {
        if ($btn.data('orig') != null) $btn.html($btn.data('orig'));
        $btn.prop('disabled', false).removeAttr('aria-busy');
      }
    },

    /* --- pagination control --- */
    pagination: function ($el, page, pages, onChange) {
      if (pages <= 1) { $el.empty(); return; }
      var items = [], i;
      var add = function (p) { items.push(p); };
      add(1);
      for (i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) add(i);
      if (pages > 1) add(pages);
      items = items.filter(function (v, idx, a) { return a.indexOf(v) === idx; }).sort(function (a, b) { return a - b; });
      var html = '<nav class="flex items-center justify-center gap-1.5" aria-label="Pagination">' +
        '<button class="icon-btn border border-paper-300 bg-white/70 disabled:opacity-40" data-p="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + ' aria-label="Previous page">' + icon('left', 'w-4 h-4') + '</button>';
      var prev = 0;
      items.forEach(function (p) {
        if (p - prev > 1) html += '<span class="px-1 text-ink-400" aria-hidden="true">…</span>';
        html += '<button class="min-w-[2.5rem] h-10 px-3 rounded-full text-sm font-semibold transition ' + (p === page ? 'bg-ink-900 text-white shadow-card' : 'text-ink-700 hover:bg-white') + '" data-p="' + p + '" ' + (p === page ? 'aria-current="page"' : '') + ' aria-label="Page ' + p + '">' + p + '</button>';
        prev = p;
      });
      html += '<button class="icon-btn border border-paper-300 bg-white/70 disabled:opacity-40" data-p="' + (page + 1) + '" ' + (page >= pages ? 'disabled' : '') + ' aria-label="Next page">' + icon('right', 'w-4 h-4') + '</button></nav>';
      $el.html(html).off('click').on('click', 'button[data-p]', function () {
        var p = Number($(this).data('p'));
        if (p >= 1 && p <= pages && p !== page) onChange(p);
      });
    },

    /* --- scroll reveal (IntersectionObserver) --- */
    _io: null,
    reveal: function (root) {
      var $els = $(root || document).find('.reveal:not(.is-visible)');
      if (!('IntersectionObserver' in window)) { $els.addClass('is-visible'); return; }
      if (!ui._io) {
        ui._io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { $(e.target).addClass('is-visible'); ui._io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
      }
      $els.each(function () { ui._io.observe(this); });
    },
    stagger: function ($items, step) { $items.each(function (i) { this.style.setProperty('--d', Math.min(i * (step || 60), 600) + 'ms'); }); },

    /* --- count-up numbers for stats --- */
    countUp: function ($el, to, ms) {
      to = num(to); ms = ms || 1100;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { $el.text(to.toLocaleString()); return; }
      var start = performance.now();
      (function step(t) {
        var p = Math.min(1, (t - start) / ms), eased = 1 - Math.pow(1 - p, 4);
        $el.text(Math.round(to * eased).toLocaleString());
        if (p < 1) requestAnimationFrame(step);
      })(start);
    },

    /* --- inline field errors --- */
    fieldError: function ($input, msg) {
      $input = $($input);
      var id = $input.attr('id') + '-err';
      var $err = $('#' + id);
      if (!$err.length) { $err = $('<p class="field-error" id="' + id + '" aria-live="polite"></p>'); $input.closest('.form-row').length ? $input.closest('.form-row').append($err) : $err.insertAfter($input); }
      $err.text(msg || '');
      $input.attr('aria-invalid', msg ? 'true' : 'false');
      var d = ($input.attr('aria-describedby') || '').split(' ').filter(Boolean);
      if (msg && d.indexOf(id) < 0) d.push(id);
      $input.attr('aria-describedby', d.join(' '));
      return !msg;
    },
    clearErrors: function ($form) { $form.find('.field-error').text(''); $form.find('[aria-invalid]').attr('aria-invalid', 'false'); },
    // Map backend validation errors [{field, message}] onto inputs.
    applyServerErrors: function ($form, err) {
      (err.errors || []).forEach(function (e) {
        var $i = $form.find('[name="' + (e.field || e.path || e.param) + '"]');
        if ($i.length) ui.fieldError($i, e.message || e.msg);
      });
    },

    /* --- client-side file validation (size/type) before upload --- */
    validateFile: function (file, kind) {
      var rule = config.UPLOADS[kind];
      if (!file) return null;
      var ext = (file.name.split('.').pop() || '').toLowerCase();
      if (rule.ext.indexOf(ext) < 0) return 'Unsupported file type “.' + ext + '”. Allowed: ' + rule.label + '.';
      if (file.size > rule.max) return 'File is ' + fmt.bytes(file.size) + ' — the limit is ' + fmt.bytes(rule.max) + '.';
      return null;
    },

    /* --- drag & drop file picker wiring --- */
    dropzone: function ($zone, $input, onFile) {
      $zone.on('dragenter dragover', function (e) { e.preventDefault(); $zone.addClass('is-dragging'); })
        .on('dragleave dragend drop', function (e) { e.preventDefault(); $zone.removeClass('is-dragging'); })
        .on('drop', function (e) {
          var f = e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files;
          if (f && f.length) {
            try { var dt = new DataTransfer(); dt.items.add(f[0]); $input[0].files = dt.files; } catch (x) { }
            onFile(f[0]);
          }
        });
      $input.on('change', function () { onFile(this.files[0] || null); });
    },

    avatarImg: function (seed, name, cls) {
      return '<img src="' + dice.avatar(seed) + '" alt="' + esc(name ? 'Avatar for ' + name : '') + '" class="' + (cls || 'w-10 h-10') + ' rounded-full ring-2 ring-white bg-paper-200 object-cover" loading="lazy" width="40" height="40">';
    },

    stars: function (rating, cls) {
      var r = Math.round(num(rating)), out ='<span class="inline-flex items-center gap-0.5 text-[#d08a1e]" aria-label="' + num(rating).toFixed(1) + ' out of 5 stars">';
      for (var i = 1; i <= 5; i++) {
        out += '<svg class="' + (cls || 'w-4 h-4') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="' + (i <= r ? 'currentColor' : '#e2d8c3') + '"/></svg>';
      }
      return out + '</span>';
    },

    highlight: function (text, q) {
      var t = esc(text);
      if (!q) return t;
      var safe = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return t.replace(new RegExp('(' + safe + ')', 'ig'), '<mark class="hl">$1</mark>');
    },

    setTitle: function (t) { document.title = t ? t + ' · CivicEvents+' : 'CivicEvents+'; }
  };

  /* ----------------------------------------------------------------------
     10. NOTIFICATIONS
     GET /api/notifications returns broadcast (recipient_id = null) and items
     targeted at the current user. The API has no "mark as read" endpoint, so
     read state is kept per user in localStorage and applied OPTIMISTICALLY:
     the UI updates instantly and reverts if persisting fails.
     ---------------------------------------------------------------------- */
  var notifs = {
    items: [],
    loaded: false,
    _key: function () { var u = auth.user(); return 'ce_read:' + (u ? u.id : 'anon'); },
    readSet: function () { return local.json(notifs._key(), []); },
    isRead: function (n) { return n.read === true || notifs.readSet().indexOf(n.id) > -1; },
    unread: function () { return notifs.items.filter(function (n) { return !notifs.isRead(n); }).length; },
    load: function (force) {
      if (!auth.isLoggedIn()) return Promise.resolve([]);
      if (!force) { var c = cache.get('notifs'); if (c) { notifs.items = c; notifs.loaded = true; notifs.emit(); return Promise.resolve(c); } }
      return api.get('/notifications').then(function (r) {
        notifs.items = r.data || []; notifs.loaded = true;
        cache.set('notifs', notifs.items, 30000);
        notifs.emit();
        return notifs.items;
      });
    },
    // optimistic mark-as-read with revert on failure
    markRead: function (ids) {
      ids = [].concat(ids);
      var before = notifs.readSet();
      var next = before.concat(ids.filter(function (id) { return before.indexOf(id) < 0; }));
      notifs.emit(next); // optimistic UI update
      var ok = local.setJson(notifs._key(), next.slice(-500));
      if (!ok) {
        notifs.emit(before); // revert
        ui.toast('error', 'Couldn’t save read status on this device. Changes were reverted.');
        return false;
      }
      return true;
    },
    remove: function (id) {
      // optimistic removal, reverted if the API rejects the delete
      var snapshot = notifs.items.slice();
      notifs.items = notifs.items.filter(function (n) { return n.id !== id; });
      cache.invalidate('notifs'); notifs.emit();
      return api.del('/notifications/' + id).catch(function (err) {
        notifs.items = snapshot; notifs.emit();
        throw err;
      });
    },
    // pub/sub so header badge, drawer and inbox page stay in sync
    _subs: [],
    on: function (fn) { notifs._subs.push(fn); },
    emit: function (readOverride) {
      var read = readOverride || notifs.readSet();
      var count = notifs.items.filter(function (n) { return !(n.read === true || read.indexOf(n.id) > -1); }).length;
      notifs._subs.forEach(function (fn) { try { fn(count, read); } catch (e) { console.error(e); } });
    },
    link: function (n) {
      var m = n.metadata || {};
      if (m.event_id) return { href: 'event.html?id=' + encodeURIComponent(m.event_id), label: 'Open event' };
      if (m.announcement_id) return { href: 'announcement.html?id=' + encodeURIComponent(m.announcement_id), label: 'Listen to announcement' };
      if (m.promo_id) return { href: 'promo.html?id=' + encodeURIComponent(m.promo_id), label: 'Watch promo' };
      return null;
    },
    typeIcon: function (t) { return { event: 'calendar', announcement: 'megaphone', promo: 'film', system: 'info' }[t] || 'bell'; }
  };

  /* ----------------------------------------------------------------------
     11. LAYOUT — header, mobile menu, notification drawer, footer
     ---------------------------------------------------------------------- */
  var layout = {
    navLinks: function () {
      // Links shown depend on role (element guard logic applied in code).
      var links = [
        { href: 'events.html', label: 'Events', match: /^event/ },
        { href: 'announcements.html', label: 'Announcements', match: /^announcement/ },
        { href: 'promos.html', label: 'Promos', match: /^promo/ }
      ];
      if (guard.role() === 'user') links.push({ href: 'my-registrations.html', label: 'My events', match: /^my-registrations/ });
      if (guard.can('dashboard:view')) links.push({ href: 'admin.html', label: 'Dashboard', match: /^admin/ });
      return links;
    },

    header: function () {
      var page = currentPage();
      var u = auth.isLoggedIn() ? auth.user() : null;
      var links = layout.navLinks();
      var nav = links.map(function (l) {
        return '<a class="nav-link" href="' + l.href + '"' + (l.match.test(page) ? ' aria-current="page"' : '') + '>' + l.label + '</a>';
      }).join('');
      var q = page === 'search.html' ? esc(param('q') || '') : '';

      var right = u
        ? '<button type="button" id="bell-btn" class="icon-btn relative" aria-haspopup="dialog" aria-controls="notif-drawer" aria-label="Notifications">' +
        '<span class="bell-icon inline-block">' + icon('bell') + '</span><span id="bell-count" class="bell-badge" hidden>0</span></button>' +
        '<div class="relative" id="profile-menu-wrap">' +
        '<button type="button" id="profile-btn" class="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-white/80 transition" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu">' +
        ui.avatarImg(u.id || u.email, u.full_name, 'w-9 h-9') +
        '<span class="hidden xl:block text-sm font-medium text-ink-800 max-w-[9rem] truncate">' + esc((u.full_name || '').split(' ')[0]) + '</span>' +
        icon('down', 'w-4 h-4 text-ink-500 hidden sm:block') + '</button>' +
        '<div id="profile-menu" class="menu" role="menu" aria-labelledby="profile-btn">' +
        '<div class="px-3 py-3 mb-1 border-b border-paper-200"><p class="text-sm font-semibold text-ink-900 truncate">' + esc(u.full_name) + '</p>' +
        '<p class="text-xs text-ink-500 truncate">' + esc(u.email || '') + '</p>' +
        '<span class="badge ' + (u.role === 'admin' ? 'badge-ember' : 'badge-ink') + ' mt-2">' + icon(u.role === 'admin' ? 'shield' : 'user', 'w-3 h-3') + esc(u.role) + '</span></div>' +
        '<a role="menuitem" href="index.html">' + icon('home', 'w-4 h-4') + 'My dashboard</a>' +
        '<a role="menuitem" href="profile.html">' + icon('user', 'w-4 h-4') + 'My profile</a>' +
        (guard.role() === 'user' ? '<a role="menuitem" href="my-registrations.html">' + icon('ticket', 'w-4 h-4') + 'My registrations</a>' : '') +
        '<a role="menuitem" href="notifications.html">' + icon('inbox', 'w-4 h-4') + 'Notifications</a>' +
        // ADMIN-ONLY menu entries (guard.can('users:manage'))
        (guard.can('users:manage')
          ? '<div class="my-1 border-t border-paper-200"></div><p class="px-3 pt-2 pb-1 eyebrow !text-[0.62rem]">Admin</p>' +
          '<a role="menuitem" href="admin.html">' + icon('chart', 'w-4 h-4') + 'Dashboard</a>' +
          '<a role="menuitem" href="admin-users.html">' + icon('users', 'w-4 h-4') + 'Manage users</a>' +
          '<a role="menuitem" href="admin-content.html">' + icon('grid', 'w-4 h-4') + 'Manage content</a>' +
          '<a role="menuitem" href="admin-notifications.html">' + icon('bell', 'w-4 h-4') + 'Manage notifications</a>'
          : '') +
        '<div class="my-1 border-t border-paper-200"></div>' +
        '<button role="menuitem" type="button" id="logout-btn" class="!text-ember-700">' + icon('logout', 'w-4 h-4') + 'Sign out</button>' +
        '</div></div>'
        : '<a href="login.html" class="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</a><a href="signup.html" class="btn btn-primary btn-sm">Join free</a>';

      var searchForm = function (id, extra) {
        return '<form role="search" action="search.html" method="get" class="relative ' + (extra || '') + '">' +
          '<label for="' + id + '" class="sr-only">Search events, announcements and promos</label>' +
          '<span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">' + icon('search', 'w-4 h-4') + '</span>' +
          '<input id="' + id + '" name="q" type="search" value="' + q + '" placeholder="Search CivicEvents+" autocomplete="off" ' +
          'class="w-full rounded-full border border-paper-300 bg-white/80 py-2.5 pl-10 pr-12 text-sm placeholder:text-ink-400 focus:border-ink-400 focus:bg-white focus:ring-4 focus:ring-ink-100 transition">' +
          '<kbd class="hidden md:inline absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-400 border border-paper-300 rounded px-1.5 py-0.5">/</kbd>' +
          '</form>';
      };

      return '' +
        '<header class="sticky top-0 z-50 border-b border-paper-300/70 bg-paper/80 backdrop-blur-md">' +
        '<div class="mx-auto max-w-page px-4 sm:px-6 h-16 flex items-center gap-4 lg:gap-6">' +
        '<a href="index.html" class="flex items-center gap-2.5 shrink-0 group" aria-label="CivicEvents+ home">' +
        '<span class="relative grid place-items-center w-9 h-9 rounded-xl bg-ink-900 text-white shadow-card transition-transform duration-500 group-hover:rotate-[-8deg]">' +
        '<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 10 12 5l8 5M6 10v8M10 10v8M14 10v8M18 10v8M3.5 20h17"/></svg>' +
        '<span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ember-500 ring-2 ring-paper"></span></span>' +
        '<span class="font-display text-xl font-semibold text-ink-900 tracking-tight">Civic<span class="text-ember-600">Events+</span></span></a>' +
        (u ? '<nav class="hidden lg:flex items-center gap-5" aria-label="Primary">' + nav + '</nav>' : '') +
        '<div class="flex-1"></div>' +
        (u ? searchForm('global-search', 'hidden md:block w-56 xl:w-72') : '') +
        '<div class="flex items-center gap-1 sm:gap-2">' + right +
        (u ? '<button type="button" id="mobile-menu-btn" class="icon-btn lg:hidden" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">' + icon('menu') + '</button>' : '') +
        '</div></div>' +
        (u ? '<div id="mobile-menu" class="lg:hidden hidden border-t border-paper-300/70 bg-paper/95 backdrop-blur">' +
          '<div class="px-4 py-4 space-y-3">' + searchForm('mobile-search', 'md:hidden') +
          '<nav class="grid gap-1" aria-label="Mobile">' + links.map(function (l) {
            return '<a href="' + l.href + '" class="px-3 py-2.5 rounded-xl font-medium ' + (l.match.test(page) ? 'bg-white text-ink-900 shadow-card' : 'text-ink-700 hover:bg-white/70') + '"' + (l.match.test(page) ? ' aria-current="page"' : '') + '>' + l.label + '</a>';
          }).join('') + '</nav></div></div>' : '') +
        '</header>';
    },

    footer: function () {
      var y = new Date().getFullYear();
      return '' +
        '<footer class="mt-24 border-t border-paper-300/80 bg-ink-950 text-ink-200 relative overflow-hidden">' +
        '<div aria-hidden="true" class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-ember-600/20 blur-3xl"></div>' +
        '<div class="relative mx-auto max-w-page px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">' +
        '<div class="lg:col-span-1"><p class="font-display text-2xl text-white mb-3">Civic<span class="text-ember-300">Events+</span></p>' +
        '<p class="text-sm leading-relaxed text-ink-300">Connecting residents with the town halls, clean-ups, workshops and festivals that shape our community.</p>' +
        '<p class="mt-5 inline-flex items-center gap-2 text-xs text-ink-300"><span id="api-dot" class="w-2 h-2 rounded-full bg-ink-500"></span><span id="api-status">Checking API…</span></p></div>' +
        '<nav aria-label="Explore"><p class="eyebrow !text-ember-300 mb-4">Explore</p><ul class="space-y-2.5 text-sm">' +
        '<li><a class="hover:text-white transition" href="events.html">Upcoming events</a></li>' +
        '<li><a class="hover:text-white transition" href="announcements.html">Audio announcements</a></li>' +
        '<li><a class="hover:text-white transition" href="promos.html">Video promos</a></li>' +
        '<li><a class="hover:text-white transition" href="notifications.html">Notification inbox</a></li></ul></nav>' +
        '<div><p class="eyebrow !text-ember-300 mb-4">Help &amp; contact</p><ul class="space-y-2.5 text-sm">' +
        '<li class="flex items-center gap-2">' + icon('mail', 'w-4 h-4 text-ink-400') + '<a class="hover:text-white transition" href="mailto:' + config.SUPPORT_EMAIL + '">' + config.SUPPORT_EMAIL + '</a></li>' +
        '<li class="flex items-center gap-2">' + icon('clock', 'w-4 h-4 text-ink-400') + 'Mon–Fri, 9:00–17:00</li>' +
        '<li class="flex items-center gap-2">' + icon('pin', 'w-4 h-4 text-ink-400') + 'Civic Centre, Main Street</li>' +
        '<li><a class="hover:text-white transition" href="profile.html">Account settings</a></li></ul></div>' +
        '<div><p class="eyebrow !text-ember-300 mb-4">Accessibility</p>' +
        '<p class="text-sm leading-relaxed text-ink-300">Audio announcements include keyboard-friendly controls and promos ship with captions on by default. Press <kbd class="font-mono text-xs border border-ink-700 rounded px-1">/</kbd> to search from anywhere.</p></div>' +
        '</div>' +
        '<div class="relative border-t border-white/10"><div class="mx-auto max-w-page px-4 sm:px-6 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-ink-400">' +
        '<p>© ' + y + ' CivicEvents+. Built with HTML, Tailwind CSS &amp; jQuery.</p>' +
        '<p>Avatars &amp; artwork by <a class="underline underline-offset-2 hover:text-white" href="https://www.dicebear.com" target="_blank" rel="noopener">DiceBear</a></p></div></div>' +
        '</footer>';
    },

    drawer: function () {
      return '<div id="notif-overlay" class="overlay"></div>' +
        '<aside id="notif-drawer" class="drawer" role="dialog" aria-modal="true" aria-labelledby="notif-title" aria-hidden="true">' +
        '<div class="flex items-center justify-between px-5 h-16 border-b border-paper-300 shrink-0">' +
        '<div class="flex items-center gap-2"><button type="button" id="notif-back" class="icon-btn -ml-2" aria-label="Back to all notifications" hidden>' + icon('arrowLeft') + '</button>' +
        '<h2 id="notif-title" class="font-display text-xl text-ink-900">Notifications</h2></div>' +
        '<div class="flex items-center gap-1"><button type="button" id="notif-readall" class="btn btn-ghost btn-sm">' + icon('check', 'w-4 h-4') + 'Mark all read</button>' +
        '<button type="button" id="notif-close" class="icon-btn" aria-label="Close notifications">' + icon('x') + '</button></div></div>' +
        '<div id="notif-body" class="flex-1 overflow-y-auto"></div>' +
        '<div class="p-4 border-t border-paper-300 shrink-0"><a href="notifications.html" class="btn btn-primary w-full">Open inbox ' + icon('arrowRight', 'w-4 h-4') + '</a></div>' +
        '</aside>';
    },

    renderDrawerList: function () {
      var $b = $('#notif-body');
      $('#notif-back').attr('hidden', true);
      $('#notif-title').text('Notifications');
      if (!notifs.loaded) { $b.html('<div class="p-4 space-y-3">' + ui.skeletonCards(4, 'row') + '</div>'); return; }
      if (!notifs.items.length) { $b.html('<div class="p-6">' + ui.empty('You’re all caught up', 'New events, announcements and promos will appear here.', '', 'bell') + '</div>'); return; }
      var html = '<ul class="divide-y divide-paper-200" role="list">';
      notifs.items.slice(0, 30).forEach(function (n, i) {
        var unread = !notifs.isRead(n);
        html += '<li class="reveal" style="--d:' + Math.min(i * 40, 400) + 'ms"><button type="button" class="notif-item w-full text-left px-5 py-4 flex gap-3 hover:bg-white/80 transition" data-id="' + esc(n.id) + '">' +
          '<span class="shrink-0 grid place-items-center w-10 h-10 rounded-full ' + (unread ? 'bg-ember-100 text-ember-700' : 'bg-paper-200 text-ink-500') + '">' + icon(notifs.typeIcon(n.type), 'w-5 h-5') + '</span>' +
          '<span class="flex-1 min-w-0"><span class="flex items-center gap-2"><span class="text-sm ' + (unread ? 'font-semibold text-ink-900' : 'font-medium text-ink-700') + ' truncate">' + esc(n.title) + '</span>' +
          (unread ? '<span class="w-2 h-2 rounded-full bg-ember-500 shrink-0" aria-label="Unread"></span>' : '') + '</span>' +
          '<span class="block text-sm text-ink-600 clamp-2 mt-0.5">' + esc(n.message) + '</span>' +
          '<span class="block text-xs text-ink-400 mt-1.5">' + esc(fmt.relative(n.created_at)) + ' · <span class="capitalize">' + esc(n.type) + '</span>' + (n.recipient_id ? ' · For you' : ' · Broadcast') + '</span></span></button></li>';
      });
      $b.html(html + '</ul>');
      ui.reveal($b);
    },

    renderDrawerDetail: function (id) {
      var n = notifs.items.filter(function (x) { return x.id === id; })[0];
      if (!n) return layout.renderDrawerList();
      notifs.markRead(n.id);
      var link = notifs.link(n);
      $('#notif-back').removeAttr('hidden');
      $('#notif-title').text('Notification');
      $('#notif-body').html('<article class="p-6 page-enter">' +
        '<span class="badge badge-ember capitalize mb-4">' + icon(notifs.typeIcon(n.type), 'w-3 h-3') + esc(n.type) + '</span>' +
        '<h3 class="font-display text-2xl text-ink-900 mb-2">' + esc(n.title) + '</h3>' +
        '<p class="text-xs text-ink-500 mb-5">' + esc(fmt.dateTime(n.created_at)) + (n.recipient_id ? ' · Sent to you' : ' · Broadcast to everyone') + '</p>' +
        '<p class="text-ink-700 leading-relaxed whitespace-pre-line">' + esc(n.message) + '</p>' +
        '<div class="mt-8 flex flex-wrap gap-2">' +
        (link ? '<a class="btn btn-primary" href="' + link.href + '">' + esc(link.label) + icon('arrowRight', 'w-4 h-4') + '</a>' : '') +
        // ADMIN-ONLY: delete control rendered only when guard allows
        (guard.can('notification:delete') ? '<button type="button" class="btn btn-danger" data-del="' + esc(n.id) + '">' + icon('trash', 'w-4 h-4') + 'Delete</button>' : '') +
        '</div></article>');
      $('#notif-back').trigger('focus');
    },

    openDrawer: function () {
      layout._lastFocus = document.activeElement;
      $('#notif-overlay').addClass('is-open');
      $('#notif-drawer').addClass('is-open').attr('aria-hidden', 'false');
      $('body').css('overflow', 'hidden');
      layout.renderDrawerList();
      notifs.load(true).then(layout.renderDrawerList).catch(function (e) { ui.errorState($('#notif-body'), e, function () { notifs.load(true).then(layout.renderDrawerList); }); });
      setTimeout(function () { $('#notif-close').trigger('focus'); }, 80);
    },
    closeDrawer: function () {
      $('#notif-overlay').removeClass('is-open');
      $('#notif-drawer').removeClass('is-open').attr('aria-hidden', 'true');
      $('body').css('overflow', '');
      if (layout._lastFocus) layout._lastFocus.focus();
    },

    bind: function () {
      // profile dropdown
      var $pb = $('#profile-btn'), $pm = $('#profile-menu');
      function closeMenu() { $pm.removeClass('is-open'); $pb.attr('aria-expanded', 'false'); }
      $pb.on('click', function (e) {
        e.stopPropagation();
        var open = !$pm.hasClass('is-open');
        $pm.toggleClass('is-open', open); $pb.attr('aria-expanded', String(open));
        if (open) setTimeout(function () { $pm.find('[role=menuitem]').first().trigger('focus'); }, 50);
      });
      $pm.on('keydown', function (e) {
        var $items = $pm.find('[role=menuitem]'), i = $items.index(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); $items.eq((i + 1) % $items.length).trigger('focus'); }
        if (e.key === 'ArrowUp') { e.preventDefault(); $items.eq((i - 1 + $items.length) % $items.length).trigger('focus'); }
        if (e.key === 'Escape') { closeMenu(); $pb.trigger('focus'); }
        if (e.key === 'Tab') closeMenu();
      });
      $(document).on('click', function (e) { if (!$(e.target).closest('#profile-menu-wrap').length) closeMenu(); });
      $('#logout-btn').on('click', auth.logout);

      // mobile menu
      $('#mobile-menu-btn').on('click', function () {
        var $m = $('#mobile-menu'), open = $m.hasClass('hidden');
        $m.toggleClass('hidden', !open).toggleClass('page-enter', open);
        $(this).attr('aria-expanded', String(open)).attr('aria-label', open ? 'Close menu' : 'Open menu').html(icon(open ? 'x' : 'menu'));
      });

      // "/" focuses search
      $(document).on('keydown', function (e) {
        if (e.key === '/' && !$(e.target).is('input, textarea, select, [contenteditable]')) {
          var $s = $('#global-search:visible, #mobile-search:visible').first();
          if ($s.length) { e.preventDefault(); $s.trigger('focus'); }
        }
      });

      // notification drawer
      $('#bell-btn').on('click', layout.openDrawer);
      $('#notif-close, #notif-overlay').on('click', layout.closeDrawer);
      $('#notif-back').on('click', function () { layout.renderDrawerList(); });
      $('#notif-readall').on('click', function () {
        if (notifs.markRead(notifs.items.map(function (n) { return n.id; }))) { layout.renderDrawerList(); ui.toast('success', 'All notifications marked as read.'); }
      });
      $('#notif-drawer').on('click', '.notif-item', function () { layout.renderDrawerDetail($(this).data('id')); })
        .on('click', '[data-del]', function () {
          var id = $(this).data('del');
          // ACTION GUARD: admin-only delete
          if (!guard.can('notification:delete')) return ui.forbiddenModal();
          ui.confirm({ title: 'Delete notification?', message: 'This removes it for every user. This cannot be undone.', confirmText: 'Delete', danger: true }).then(function (ok) {
            if (!ok) return;
            layout.renderDrawerList();
            notifs.remove(id).then(function () { ui.toast('success', 'Notification deleted.'); }).catch(function (e) { layout.renderDrawerList(); handleError(e); });
          });
        })
        .on('keydown', function (e) {
          if (e.key === 'Escape') layout.closeDrawer();
          if (e.key === 'Tab') ui.trapFocus($('#notif-drawer'), e);
        });

      // live badge
      var lastCount = null;
      notifs.on(function (count) {
        var $c = $('#bell-count');
        $c.text(count > 99 ? '99+' : count).attr('hidden', count < 1);
        $('#bell-btn').attr('aria-label', 'Notifications' + (count ? ', ' + count + ' unread' : ''));
        if (lastCount !== null && count > lastCount) { $c.removeClass('pop'); void $c[0].offsetWidth; $c.addClass('pop'); $('.bell-icon').removeClass('bell-ring'); void $('.bell-icon')[0].offsetWidth; $('.bell-icon').addClass('bell-ring'); }
        if (lastCount === null && count > 0) $('.bell-icon').addClass('bell-ring');
        lastCount = count;
        if ($('#notif-drawer').hasClass('is-open') && $('#notif-back').is('[hidden]')) layout.renderDrawerList();
      });
    },

    render: function () {
      $('#app-header').replaceWith(layout.header());
      $('#app-footer').replaceWith(layout.footer());
      if (auth.isLoggedIn()) $('body').append(layout.drawer());
      layout.bind();
      api.health().then(function (ok) {
        $('#api-dot').removeClass('bg-ink-500').addClass(ok ? 'bg-moss-500' : 'bg-ember-500');
        $('#api-status').text(ok ? 'API online · ' + config.ORIGIN.replace(/^https?:\/\//, '') : 'API unreachable at ' + config.ORIGIN.replace(/^https?:\/\//, ''));
      });
    }
  };

  /* ----------------------------------------------------------------------
     12. BOOT
     ---------------------------------------------------------------------- */
  var readyQueue = [];
  function ready(fn) { readyQueue.push(fn); }

  function boot() {
    $('body').prepend('<a href="#main" class="skip-link">Skip to main content</a>');
    if (!$('#toast-region').length) $('body').append('<div id="toast-region" role="region" aria-live="polite" aria-label="Notifications"></div>');

    var allowed = guard.page();      // (a) page guard
    if (allowed === false) return;   // redirecting
    layout.render();
    guard.apply(document);           // (b) element guard on static markup

    var f = flash.consume();
    if (f) setTimeout(function () { ui.toast(f.type, f.message); }, 250);

    if (auth.isLoggedIn()) {
      auth.scheduleExpiry();
      notifs.load().catch(function () { /* badge stays hidden; non-critical */ });
      // Refresh the profile in the background: keeps name/role in sync and
      // signs out accounts an admin has disabled since login.
      api.get('/users/profile/me').then(function (r) {
        var me = r.data;
        if (!me) return;
        if (me.is_active === false) return auth.expire('Your account has been disabled. Please contact an administrator.', 'error');
        var before = auth.user() || {};
        auth.updateUser({ full_name: me.full_name, email: me.email, role: me.role, is_active: me.is_active });
        if (before.role && before.role !== me.role) window.location.reload();
      }).catch(function () { });
      // refresh notifications every 60s while the tab is visible
      setInterval(function () { if (!document.hidden) notifs.load(true).catch(function () { }); }, 60000);
    }

    if (allowed === 'forbidden') return; // (a) admin page viewed by normal user: skip page init
    $('#main').addClass('page-enter');
    readyQueue.forEach(function (fn) {
      try { fn(); } catch (e) { console.error(e); ui.toast('error', 'Something went wrong loading this page.'); }
    });
    ui.reveal(document);
  }

  window.CE = {
    config: config, esc: esc, param: param, num: num, debounce: debounce, fmt: fmt, mediaUrl: mediaUrl, videoLink: videoLink,
    local: local, session: session, auth: auth, flash: flash, api: api, ApiError: ApiError,
    handleError: handleError, guard: guard, cache: cache, data: data, notifs: notifs,
    ui: ui, icon: icon, dice: dice, layout: layout, ready: ready
  };

  $(boot);
})(jQuery, window, document);
