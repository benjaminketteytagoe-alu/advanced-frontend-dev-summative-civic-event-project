/* =========================================================================
   Promos list — GET /api/promos (cached 2 min, invalidated on admin changes)
   Thumbnails are the first frame of each video, loaded lazily on scroll.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, PER_PAGE = 9;
  var all = [], state = { q: '', status: 'all', page: 1 };

  function render() {
    var q = state.q.toLowerCase();
    var list = CE.data.visible(all).filter(function (p) {
      if (q && ((p.title || '') + ' ' + (p.description || '')).toLowerCase().indexOf(q) < 0) return false;
      if (state.status === 'published' && p.published === false) return false;
      if (state.status === 'draft' && p.published !== false) return false;
      return true;
    });
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    var $g = $('#promo-grid').attr('aria-busy', 'false');
    if (!slice.length) {
      $g.html(ui.empty(all.length ? 'No matches' : 'No promos yet', all.length ? 'Try another search.' : 'Community videos will appear here once published.',
        CE.guard.can('promo:create') && !all.length ? '<a href="promo-form.html" class="btn btn-primary">Upload the first promo</a>' : '', 'film'));
    } else {
      $g.html(slice.map(function (p) { return CE.views.promoCard(p, { q: state.q }); }).join(''));
      CE.views.lazyVideos($g);
      ui.stagger($g.find('.reveal'), 70); ui.reveal($g);
    }
    ui.pagination($('#pager'), state.page, pages, function (p) { state.page = p; render(); $('html,body').animate({ scrollTop: 0 }, 300); });
  }

  function load(force) {
    $('#promo-grid').attr('aria-busy', 'true').html(ui.skeletonCards(6));
    CE.data.promos(force).then(function (list) { all = list; render(); })
      .catch(function (e) { ui.errorState($('#promo-grid'), e, function () { load(true); }); });
  }

  CE.ready(function () {
    load();
    $('#p-q').on('input', CE.debounce(function () { state.q = $.trim(this.value); state.page = 1; render(); }, 200));
    $('#p-refresh').on('click', function () { load(true); });
    $('.chip[data-status]').on('click', function () {
      state.status = $(this).data('status'); state.page = 1;
      $('.chip[data-status]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); render();
    });
    $('#promo-grid').on('click', '.js-del-promo', function () {
      var $b = $(this), id = $b.data('id');
      CE.actions.remove({ action: 'promo:delete', path: '/promos/' + id, title: $b.data('title'), cacheKey: 'promos', $card: $b.closest('.promo-card'),
        after: function () { all = all.filter(function (p) { return p.id !== id; }); render(); } });
    });
  });
})(jQuery, window.CE);
