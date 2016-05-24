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

  var _ = window._;
  var NAMESPACE = 'qor.tabbar';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var CLASS_TAB = '.qor-layout__tab-button';
  var CLASS_TAB_CONTENT = '.qor-layout__tab-content';
  var CLASS_TAB_BAR = '.qor-layout__tab-bar';
  var CLASS_TAB_BAR_MORE = '.qor-layout__tab-more';
  var CLASS_ACTIVE = 'is-active';

  function QorTab(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorTab.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorTab.prototype = {
    constructor: QorTab,

    init: function () {
      $(CLASS_TAB).first().addClass(CLASS_ACTIVE);
      this.initTab();
      this.bind();
    },

    bind: function () {
      this.$element.on(EVENT_CLICK, CLASS_TAB, this.switchTab.bind(this));
      this.$element.on(EVENT_CLICK, CLASS_TAB_BAR_MORE, this.scrollTab.bind(this));
    },

    unbind: function () {
      this.$element.off(EVENT_CLICK, CLASS_TAB, this.switchTab);
      this.$element.off(EVENT_CLICK, CLASS_TAB_BAR_MORE, this.scrollTab);
    },

    initTab: function () {
      var slideoutWidth = $(CLASS_TAB_CONTENT).outerWidth();
      var tabWidth = 0;

      _.each($(CLASS_TAB), function(ele) {
        tabWidth = tabWidth + $(ele).outerWidth();
      });

      if (tabWidth > slideoutWidth) {
        this.$element.find(CLASS_TAB_BAR).append(QorTab.ARROW);
      }

    },

    scrollTab: function (e) {
      e.stopPropagation();

      var $target = $(e.target),
          $element = this.$element,
          data = $target.data();

      // scroll to right

    },

    switchTab: function (e) {
      e.stopPropagation();

      var $target = $(e.target),
          $element = this.$element,
          data = $target.data();

      if ($target.hasClass(CLASS_ACTIVE)){
        return;
      }

      $element.find(CLASS_TAB).removeClass(CLASS_ACTIVE);
      $target.addClass(CLASS_ACTIVE);

      $.ajax(data.tabUrl, {
          method: 'GET',
          dataType: 'html',
          processData: false,
          contentType: false,
          beforeSend: function () {
            $('.qor-layout__tab-spinner').remove();
            var $spinner = '<div class="mdl-spinner mdl-js-spinner is-active qor-layout__tab-spinner"></div>';
            $element.find(CLASS_TAB_CONTENT).hide().before($spinner);
            componentHandler.upgradeElement($('.qor-layout__tab-spinner')[0]);
          },
          success: function (html) {
            $('.qor-layout__tab-spinner').remove();
            var $content = $(html).find(CLASS_TAB_CONTENT).html();
            $element.find(CLASS_TAB_CONTENT).show().html($content).trigger('enable');
          },
          error: function () {
            $('.qor-layout__tab-spinner').remove();
          }
        });

      return false;
    },

    destroy: function () {
      this.unbind();
    }
  };

  QorTab.ARROW = '<a href="javascript://" class="qor-layout__tab-more"></a>';

  QorTab.DEFAULTS = {};

  QorTab.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorTab(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.tab"]';

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorTab.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorTab.plugin.call($(selector, e.target));
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorTab;

});
