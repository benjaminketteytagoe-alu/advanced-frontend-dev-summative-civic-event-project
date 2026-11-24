// Announcements page: the list of audio messages, with search, sort, filter and page numbers
(function ($, CE) {
  'use strict';
  var ui = CE.ui;

  var perPage = 10;
  var anns = [];        // every announcement from the server
  var search = '';      // the text in the search box
  var sort = 'new';     // new, old or az
  var status = 'all';   // all, published or draft (the filter only admins see)
  var page = 1;
  var player;           // the one audio player all the cards share

  function matchesSearch(a) {
    return (a.title || '').toLowerCase().indexOf(search.toLowerCase()) > -1;
  }

  function matchesStatus(a) {
    if (status === 'all') return true;
    var draft = a.published === false;
    return status === 'draft' ? draft : !draft;
  }

  // Which of two comes first. Below zero means a, above zero means b
  function order(a, b) {
    if (sort === 'az') return (a.title || '').localeCompare(b.title || '');
    var newest = new Date(b.created_at) - new Date(a.created_at);
    return sort === 'old' ? -newest : newest;
  }

  // The announcements to show, after the search, the filter and the sort
  function matches() {
    var list = CE.data.visible(anns).filter(function (a) {
      return matchesSearch(a) && matchesStatus(a);
    });
    return list.sort(order);
  }

  function showCount(n) {
    var text = n === 1 ? '1 announcement' : n + ' announcements';
    $('#a-summary').text(n ? text : '');
  }

  // The message when there is nothing to show
  function showEmpty() {
    if (anns.length) {
      $('#ann-list').html(ui.empty('No matches', 'Try another search term.', '', 'megaphone'));
      return;
    }
    var button = '';
    if (CE.guard.can('announcement:create')) button = '<a href="announcement-form.html" class="btn btn-primary">Record the first one</a>';
    $('#ann-list').html(ui.empty('No announcements yet', 'Audio announcements will appear here as soon as they’re published.', button, 'megaphone'));
  }

  function showCards(list) {
    var $list = $('#ann-list');
    var cards = list.map(function (a) { return CE.views.announcementCard(a, { q: search }); });
    $list.html(cards.join(''));
    CE.views.lazyDurations($list);         // read each length from its audio file
    ui.stagger($list.find('.reveal'), 60); // cards appear one after another
    ui.reveal($list);
  }

  function goToPage(n) {
    page = n;
    show();
    $('html,body').animate({ scrollTop: 0 }, 300);
  }

  // Draw the page
  function show() {
    player.pause(); // the old cards are about to go, and their pause buttons with them

    var list = matches();
    var pages = Math.max(1, Math.ceil(list.length / perPage));
    page = Math.min(page, pages); // deleting the last card can leave us past the end

    var start = (page - 1) * perPage;
    var part = list.slice(start, start + perPage);

    showCount(list.length);
    if (part.length) showCards(part);
    else showEmpty();

    $('#ann-list').attr('aria-busy', 'false');
    ui.pagination($('#pager'), page, pages, goToPage);
  }

  // Get the announcements. fresh = true skips the saved copy
  function load(fresh) {
    $('#ann-list').attr('aria-busy', 'true').html(ui.skeletonCards(6, 'row'));
    CE.data.announcements(fresh)
      .then(function (list) { anns = list; show(); })
      .catch(function (err) {
        ui.errorState($('#ann-list'), err, function () { load(true); });
        $('#ann-list').attr('aria-busy', 'false');
      });
  }

  function changeSearch() {
    search = $.trim(this.value);
    page = 1;
    show();
  }

  function changeSort() {
    sort = this.value;
    show();
  }

  function changeStatus() {
    status = $(this).data('status');
    page = 1;
    $('.chip[data-status]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    show();
  }

  function removeAnn() {
    var $button = $(this), id = $button.attr('data-id');
    CE.actions.remove({
      action: 'announcement:delete',
      path: '/announcements/' + id,
      title: $button.attr('data-title'),
      cacheKey: 'announcements',
      $card: $button.closest('.ann-card'),
      after: function () {
        anns = anns.filter(function (a) { return a.id !== id; });
        show();
      }
    });
  }

  // Start
  CE.ready(function () {
    player = CE.views.inlineAudio($('#ann-list'));
    load();
    $('#a-q').on('input', CE.debounce(changeSearch, 200)); // wait until typing stops
    $('#a-sort').on('change', changeSort);
    $('.chip[data-status]').on('click', changeStatus);
    $('#ann-list').on('click', '.js-del-ann', removeAnn);
  });
})(jQuery, window.CE);
