// Promos page: the list of videos, with search, filter and page numbers
(function ($, CE) {
  'use strict';
  var ui = CE.ui;

  var perPage = 9;
  var promos = [];      // every promo from the server
  var search = '';      // the text in the search box
  var status = 'all';   // all, published or draft (the filter only admins see)
  var page = 1;

  function matchesSearch(p) {
    var text = (p.title || '') + ' ' + (p.description || '');
    return text.toLowerCase().indexOf(search.toLowerCase()) > -1;
  }

  function matchesStatus(p) {
    if (status === 'all') return true;
    var draft = p.published === false;
    return status === 'draft' ? draft : !draft;
  }

  // The promos to show, after the search and the filter
  function matches() {
    return CE.data.visible(promos).filter(function (p) {
      return matchesSearch(p) && matchesStatus(p);
    });
  }

  // The message when there is nothing to show
  function showEmpty() {
    if (promos.length) {
      $('#promo-grid').html(ui.empty('No matches', 'Try another search.', '', 'film'));
      return;
    }
    var button = '';
    if (CE.guard.can('promo:create')) button = '<a href="promo-form.html" class="btn btn-primary">Upload the first promo</a>';
    $('#promo-grid').html(ui.empty('No promos yet', 'Community videos will appear here once published.', button, 'film'));
  }

  function showCards(list) {
    var $grid = $('#promo-grid');
    var cards = list.map(function (p) { return CE.views.promoCard(p, { q: search }); });
    $grid.html(cards.join(''));
    CE.views.lazyVideos($grid);           // load thumbnails only when they scroll into view
    ui.stagger($grid.find('.reveal'), 70); // cards appear one after another
    ui.reveal($grid);
  }

  function goToPage(n) {
    page = n;
    show();
    $('html,body').animate({ scrollTop: 0 }, 300);
  }

  // Draw the page
  function show() {
    var list = matches();
    var pages = Math.max(1, Math.ceil(list.length / perPage));
    page = Math.min(page, pages); // deleting the last card can leave us past the end

    var start = (page - 1) * perPage;
    var part = list.slice(start, start + perPage);

    if (part.length) showCards(part);
    else showEmpty();

    $('#promo-grid').attr('aria-busy', 'false');
    ui.pagination($('#pager'), page, pages, goToPage);
  }

  // Get the promos. fresh = true skips the saved copy
  function load(fresh) {
    $('#promo-grid').attr('aria-busy', 'true').html(ui.skeletonCards(6));
    CE.data.promos(fresh)
      .then(function (list) { promos = list; show(); })
      .catch(function (err) {
        ui.errorState($('#promo-grid'), err, refresh);
        $('#promo-grid').attr('aria-busy', 'false');
      });
  }

  function refresh() { load(true); }

  function changeSearch() {
    search = $.trim(this.value);
    page = 1;
    show();
  }

  function changeStatus() {
    status = $(this).data('status');
    page = 1;
    $('.chip[data-status]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    show();
  }

  function removePromo() {
    var $button = $(this), id = $button.attr('data-id');
    CE.actions.remove({
      action: 'promo:delete',
      path: '/promos/' + id,
      title: $button.attr('data-title'),
      cacheKey: 'promos',
      $card: $button.closest('.promo-card'),
      after: function () {
        promos = promos.filter(function (p) { return p.id !== id; });
        show();
      }
    });
  }

  // Start
  CE.ready(function () {
    load();
    $('#p-q').on('input', CE.debounce(changeSearch, 200)); // wait until typing stops
    $('#p-refresh').on('click', refresh);
    $('.chip[data-status]').on('click', changeStatus);
    $('#promo-grid').on('click', '.js-del-promo', removePromo);
  });
})(jQuery, window.CE);
