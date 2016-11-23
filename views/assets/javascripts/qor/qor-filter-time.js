(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var location = window.location;
  var NAMESPACE = 'qor.filter';
  var EVENT_FILTER_CHANGE = 'filterChanged.' + NAMESPACE;
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var CLASS_BOTTOMSHEETS = '.qor-bottomsheets';
  var CLASS_DATE_START = '.qor-filter__start';
  var CLASS_DATE_END = '.qor-filter__end';
  var CLASS_SEARCH_PARAM = '[data-search-param]';
  var CLASS_IS_SELECTED = 'is-selected';

  function QorFilterTime(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorFilterTime.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorFilterTime.prototype = {
    constructor: QorFilterTime,

    init: function () {
      this.bind();
      this.$timeStart = this.$element.find(CLASS_DATE_START);
      this.$timeEnd = this.$element.find(CLASS_DATE_END);
      this.$searchParam = this.$element.find(CLASS_SEARCH_PARAM);

      this.startWeekDate = window.moment().startOf('isoweek').toDate();
      this.endWeekDate = window.moment().endOf('isoweek').toDate();

      this.startMonthDate = window.moment().startOf('month').toDate();
      this.endMonthDate = window.moment().endOf('month').toDate();

    },

    bind: function () {
      var options = this.options;

      this.$element.
        on(EVENT_CLICK, options.trigger, this.show.bind(this)).
        on(EVENT_CLICK, options.label, this.setFilterTime.bind(this)).
        on(EVENT_CLICK, options.button, this.search.bind(this));
    },

    unbind: function () {
      var options = this.options;
      this.$element.
        off(EVENT_CLICK, options.trigger, this.show.bind(this)).
        off(EVENT_CLICK, options.label, this.setFilterTime.bind(this)).
        off(EVENT_CLICK, options.button, this.search.bind(this));
    },

    show: function () {
      var scheduleStartAt = this.getUrlParameter('schedule_start_at'),
          scheduleEndAt = this.getUrlParameter('schedule_end_at');

      if (scheduleStartAt || scheduleEndAt) {
        this.$timeStart.val(scheduleStartAt);
        this.$timeEnd.val(scheduleEndAt);
      }

      this.$element.find('.qor-filter__block').toggle();
    },

    setFilterTime: function (e) {
      var $target = $(e.target),
          data = $target.data(),
          range = data.filterRange,
          startTime, endTime, startDate, endDate;

      if (!range) {
        return false;
      }

      $(this.options.label).removeClass(CLASS_IS_SELECTED);
      $target.addClass(CLASS_IS_SELECTED);

      if (range == 'events') {
        this.$timeStart.val(data.scheduleStartAt);
        this.$timeEnd.val(data.scheduleEndAt);
        return false;
      }

      switch(range) {
        case 'today':
          startDate = endDate = new Date();
          break;
        case 'week':
          startDate = this.startWeekDate;
          endDate = this.endWeekDate;
          break;
        case 'month':
          startDate = this.startMonthDate;
          endDate = this.endMonthDate;
          break;
      }

      if (!startDate || !endDate) {
        return false;
      }

      startTime = this.getTime(startDate) + ' 00:00';
      endTime =  this.getTime(endDate) + ' 23:59';

      this.$timeStart.val(startTime);
      this.$timeEnd.val(endTime);
    },

    getTime: function (dateNow) {
      var month = dateNow.getMonth() + 1,
          date = dateNow.getDate();

      month = (month < 8) ? ('0' + month) : month;
      date = (date < 10) ? ('0' + date) : date;

      return (dateNow.getFullYear() + '-' + month + '-' + date);
    },

    getUrlParameter: function(name) {
      var search = location.search;
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    },

    updateQueryStringParameter: function(key, value, uri) {
      var href = uri || location.href,
          escapedkey = String(key).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
          re = new RegExp('([?&])' + escapedkey + '=.*?(&|$)', 'i'),
          separator = href.indexOf('?') !== -1 ? '&' : '?';

      if (href.match(re)) {
        return href.replace(re, '$1' + key + '=' + value + '$2');
      } else {
        return href + separator + key + '=' + value;
      }
    },

    search: function () {
      var $searchParam = this.$searchParam, uri, _this = this;


      if (!$searchParam.size()) {
        return;
      }

      $searchParam.each(function () {
        var $this = $(this);
        uri = _this.updateQueryStringParameter($this.data().searchParam, $this.val(), uri);
      });

      if (this.$element.closest(CLASS_BOTTOMSHEETS).length) {
        // $(CLASS_BOTTOMSHEETS).trigger(EVENT_FILTER_CHANGE, [search, paramName]);
      } else {
        location.href = uri;
      }


    },

    destroy: function () {
      this.unbind();
      this.$element.removeData(NAMESPACE);
    }
  };

  QorFilterTime.DEFAULTS = {
    label: false,
    trigger: false,
    button: false
  };

  QorFilterTime.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorFilterTime(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.filter.time"]';
    var options = {
          label: '.qor-filter__block-buttons button',
          trigger: 'a.qor-filter-toggle',
          button: '.qor-filter__button-search'
        };

    $(document).
      on(EVENT_DISABLE, function (e) {
        QorFilterTime.plugin.call($(selector, e.target), 'destroy');
      }).
      on(EVENT_ENABLE, function (e) {
        QorFilterTime.plugin.call($(selector, e.target), options);
      }).
      triggerHandler(EVENT_ENABLE);
  });

  return QorFilterTime;

});
