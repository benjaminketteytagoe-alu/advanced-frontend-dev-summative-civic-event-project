/* =========================================================================
   Announcements list — GET /api/announcements (published only for users)
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, PER_PAGE = 10;
  var all = [], state = { q: '', sort: 'new', status: 'all', page: 1 };

  function render() {
    var q = state.q.toLowerCase();
    var list = CE.data.visible(all).filter(function (a) {
      if (q && (a.title || '').toLowerCase().indexOf(q) < 0) return false;
      if (state.status === 'published' && a.published === false) return false;
      if (state.status === 'draft' && a.published !== false) return false;
      return true;
    }).sort(function (a, b) {
      if (state.sort === 'az') return (a.title || '').localeCompare(b.title || '');
      var d = new Date(b.created_at) - new Date(a.created_at);
      return state.sort === 'old' ? -d : d;
    });
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    var $l = $('#ann-list').attr('aria-busy', 'false');
    $('#a-summary').text(list.length ? list.length + ' announcement' + (list.length === 1 ? '' : 's') : '');
    if (!slice.length) {
      $l.html(ui.empty(all.length ? 'No matches' : 'No announcements yet', all.length ? 'Try another search term.' : 'Audio announcements will appear here as soon as they’re published.',
        CE.guard.can('announcement:create') && !all.length ? '<a href="announcement-form.html" class="btn btn-primary">Record the first one</a>' : '', 'megaphone'));
    } else {
      $l.html(slice.map(function (a) { return CE.views.announcementCard(a, { q: state.q }); }).join(''));
      CE.views.lazyDurations($l);
      ui.stagger($l.find('.reveal'), 60); ui.reveal($l);
    }
    ui.pagination($('#pager'), state.page, pages, function (p) { state.page = p; render(); $('html,body').animate({ scrollTop: 0 }, 300); });
  }

  function load(force) {
    $('#ann-list').attr('aria-busy', 'true').html(ui.skeletonCards(6, 'row'));
    CE.data.announcements(force).then(function (list) { all = list; render(); })
      .catch(function (e) { ui.errorState($('#ann-list'), e, function () { load(true); }); });
  }

  CE.ready(function () {
    load();
    CE.views.inlineAudio($('#ann-list'));
    $('#a-q').on('input', CE.debounce(function () { state.q = $.trim(this.value); state.page = 1; render(); }, 200));
    $('#a-sort').on('change', function () { state.sort = this.value; render(); });
    $('.chip[data-status]').on('click', function () {
      state.status = $(this).data('status'); state.page = 1;
      $('.chip[data-status]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); render();
    });
    $('#ann-list').on('click', '.js-del-ann', function () {
      var $b = $(this), id = $b.data('id');
      CE.actions.remove({ action: 'announcement:delete', path: '/announcements/' + id, title: $b.data('title'), cacheKey: 'announcements', $card: $b.closest('.ann-card'),
        after: function () { all = all.filter(function (a) { return a.id !== id; }); render(); } });
    });
  });
})(jQuery, window.CE);
