// Login and sign up pages
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon;
  var $form;   // the form on this page

  // ---------- used by both pages ----------

  function typed(id) { return $.trim($('#' + id).val()); }

  function goodEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email); }

  function showAlert(text) {
    $('#form-alert').text(text).toggleClass('hidden', !text).addClass('border-ember-200 bg-ember-50 text-ember-800');
  }

  function clearMessages() {
    ui.clearErrors($form);
    showAlert('');
  }

  function focusFirstError() { $form.find('[aria-invalid=true]').first().trigger('focus'); }

  function setBusy(on, text) { ui.busy($form.find('[type=submit]'), on, text); }

  // Show or hide the password
  function toggleEye() {
    var $input = $('#password');
    var hidden = $input.attr('type') === 'password';
    $input.attr('type', hidden ? 'text' : 'password');
    $(this).html(icon(hidden ? 'eyeOff' : 'eye', 'w-4 h-4')).attr('aria-label', hidden ? 'Hide password' : 'Show password');
  }

  function showFaces() {
    var names = ['Kofi', 'Amara', 'Lena', 'Tariq', 'Yaw', 'Noor', 'Efua'];
    var faces = names.map(function (name, i) {
      return '<img src="' + CE.dice.avatar(name) + '" alt="" class="w-12 h-12 rounded-full ring-4 ring-ink-950 bg-paper-200 reveal" style="--d:' + (i * 70) + 'ms">';
    });
    $('#auth-avatars').html(faces.join(''));
    ui.reveal(document);
  }

  // Anything we did not expect
  function otherError(err) {
    showAlert(err.message);
    if (err.status === 400) ui.applyServerErrors($form, err);
  }

  // ---------- login ----------

  // Where to go after login. Only our own pages, so a bad link cannot send people to another site
  function nextPage(user) {
    var next = CE.param('next') || '';
    if (/^[a-z0-9-]+\.html(\?.*)?$/i.test(next)) return next;
    return user.role === 'admin' ? 'admin.html' : 'index.html';
  }

  function checkLogin() {
    var ok = true;
    if (!goodEmail(typed('email'))) ok = ui.fieldError($('#email'), 'Enter a valid email address.');
    if (!$('#password').val()) ok = ui.fieldError($('#password'), 'Enter your password.');
    if (!ok) focusFirstError();
    return ok;
  }

  // Keep the token, then move on
  function loggedIn(reply) {
    var user = reply.data.user;
    CE.auth.save(reply.data.token, user, $('#remember').is(':checked'));
    CE.flash.set('success', 'Welcome back, ' + user.full_name.split(' ')[0] + '!');
    window.location.href = nextPage(user);
  }

  function loginFailed(err) {
    setBusy(false);
    if (err.status !== 401) return otherError(err);
    showAlert('That email and password combination didn’t match our records.');
    $('#password').val('').trigger('focus');
  }

  function login(e) {
    e.preventDefault();
    clearMessages();
    if (!checkLogin()) return;

    setBusy(true, 'Signing in…');
    CE.api.post('/auth/login', { email: typed('email'), password: $('#password').val() }, { public: true })
      .then(loggedIn)
      .catch(loginFailed);
  }

  function startLogin() {
    var email = CE.param('email'); // sent by the sign up page
    if (email) $('#email').val(email);
    $(email ? '#password' : '#email').trigger('focus');
    $form.on('submit', login);
  }

  // ---------- sign up ----------

  // The four password rules, the same as in the backend
  function passedRules(p) {
    return {
      len: p.length >= 8,
      case: /[a-z]/.test(p) && /[A-Z]/.test(p),
      num: /[0-9]/.test(p),
      sym: /[^A-Za-z0-9]/.test(p)
    };
  }

  // How many rules it passes, 0 to 4
  function score(p) {
    var passed = passedRules(p);
    return Number(passed.len) + Number(passed.case) + Number(passed.num) + Number(passed.sym);
  }

  // The bar. Full marks also need 10 characters
  function showStrength(p) {
    var labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
    var colours = ['text-ink-500', 'text-[#b42318]', 'text-ember-600', 'text-[#9a7414]', 'text-moss-600'];
    var level = score(p);
    if (level === 4 && p.length < 10) level = 3;

    $('#pw-meter').attr('data-score', level);
    $('#pw-strength-label').text(labels[level]).attr('class', 'text-xs font-semibold w-20 text-right ' + colours[level]);
  }

  // A tick beside each rule that passes
  function showTicks(p) {
    var passed = passedRules(p);
    $('#pw-rules li').each(function () {
      var ok = passed[$(this).data('rule')];
      $(this).toggleClass('text-moss-700', ok);
      $(this).find('.dot').toggleClass('bg-moss-500 border-moss-500 text-white', ok).html(ok ? icon('check', 'w-3 h-3') : '');
    });
  }

  function checkMatch() {
    var second = $('#confirm_password').val();
    var wrong = second && second !== $('#password').val();
    ui.fieldError($('#confirm_password'), wrong ? 'Passwords don’t match yet.' : '');
  }

  function changePassword() {
    showStrength(this.value);
    showTicks(this.value);
    checkMatch();
  }

  // The face follows the name
  function changeFace() {
    var $face = $('#avatar-preview');
    $face.attr('src', CE.dice.avatar(typed('full_name') || 'civic')).css('transform', 'rotate(-8deg) scale(1.06)');
    setTimeout(function () { $face.css('transform', ''); }, 350);
  }

  function checkSignup() {
    var ok = true, password = $('#password').val();
    if (typed('full_name').length < 2) ok = ui.fieldError($('#full_name'), 'Please enter your full name.');
    if (!goodEmail(typed('email'))) ok = ui.fieldError($('#email'), 'Enter a valid email address.');
    if (score(password) < 4) ok = ui.fieldError($('#password'), 'Use at least 8 characters with upper & lower case letters, a number and a special character.');
    if (password !== $('#confirm_password').val()) ok = ui.fieldError($('#confirm_password'), 'Passwords don’t match.');
    if (!ok) focusFirstError();
    return ok;
  }

  function signedUp() {
    CE.flash.set('success', 'Account created! Sign in to get started.');
    window.location.href = 'login.html?email=' + encodeURIComponent(typed('email').toLowerCase());
  }

  function signupFailed(err) {
    setBusy(false);
    if (err.status !== 409) return otherError(err);
    showAlert('That email is already registered. Try signing in instead.');
    ui.fieldError($('#email'), 'An account with this email already exists.');
    $('#email').trigger('focus');
  }

  // The role is never sent. Everyone who signs up is a normal user
  function signup(e) {
    e.preventDefault();
    clearMessages();
    if (!checkSignup()) return;

    setBusy(true, 'Creating account…');
    CE.api.post('/auth/signup', {
      full_name: typed('full_name'),
      email: typed('email').toLowerCase(),
      password: $('#password').val()
    }, { public: true })
      .then(signedUp)
      .catch(signupFailed);
  }

  function startSignup() {
    $('#full_name').trigger('focus').on('input', CE.debounce(changeFace, 300));
    $('#password').on('input', changePassword);
    $('#confirm_password').on('input', checkMatch);
    $form.on('submit', signup);
  }

  // Start
  CE.ready(function () {
    $form = $('#login-form, #signup-form');
    $('.js-reveal').html(icon('eye', 'w-4 h-4')).on('click', toggleEye);
    showFaces();
    if ($('body').data('page') === 'login') startLogin();
    else startSignup();
  });
})(jQuery, window.CE);
