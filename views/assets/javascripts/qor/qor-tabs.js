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

  var $document = $(document);
  var NAMESPACE = 'qor.tabbar';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var CLASS_TAB = '.qor-layout__tab-button';
  var CLASS_TAB_CONTENT = '.qor-layout__tab-content';
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
      this.bind();
    },

    bind: function () {
      this.$element.on(EVENT_CLICK, CLASS_TAB, this.click.bind(this));
    },

    unbind: function () {
      this.$element.off(EVENT_CLICK, CLASS_TAB, this.click);
    },

    click: function (e) {
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
            $element.find(CLASS_TAB_CONTENT).hide();
          },
          success: function (html) {
            var $content = $(html).find(CLASS_TAB_CONTENT).html();

            $element.find(CLASS_TAB_CONTENT).show().html($content).trigger('enable');

          }
        });

      return false;
    },

    destroy: function () {
      this.unbind();
    }
  };

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
