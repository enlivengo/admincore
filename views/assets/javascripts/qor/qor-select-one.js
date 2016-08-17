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

  var $body = $('body');
  var $document = $(document);
  var Mustache = window.Mustache;
  var NAMESPACE = 'qor.selectone';
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var CLASS_CLEAR_SELECT = '.qor-selected__remove';
  var CLASS_SELECT_FIELD = '.qor-field__selected';
  var CLASS_SELECT_INPUT = '.qor-field__selectone-input';
  var CLASS_SELECT_TRIGGER = '.qor-field__selectone-trigger';
  var CLASS_PARENT = '.qor-field__selectone';
  var CLASS_BOTTOMSHEETS = '.qor-bottomsheets';

  function QorSelectOne(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorSelectOne.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorSelectOne.prototype = {
    constructor: QorSelectOne,

    init: function () {
      this.bind();
    },

    bind: function () {
      $document.on(EVENT_CLICK, '[data-selectone-url]', this.openBottomSheets.bind(this));
      this.$element.on(EVENT_CLICK, CLASS_CLEAR_SELECT, this.clearSelect);
    },

    clearSelect: function () {
      var $target = $(this),
          $parent = $target.closest(CLASS_PARENT);

      $parent.find(CLASS_SELECT_FIELD).remove();
      $parent.find(CLASS_SELECT_INPUT)[0].value = '';
      $parent.find(CLASS_SELECT_TRIGGER).show();

      return false;
    },

    openBottomSheets: function (e) {
      var data = $(e.target).data();

      this.BottomSheets = $body.data('qor.bottomsheets');
      this.bottomsheetsData = data;
      data.url = data.selectoneUrl;

      this.BottomSheets.open(data, this.handleSelectOne.bind(this));

    },

    renderSelectOne: function (data) {
      return Mustache.render(QorSelectOne.SELECT_ONE_SELECTED_TEMPLATE, data);
    },

    handleSelectOne: function () {
      var options = {
        formatOnSelect: this.formatSelectResults.bind(this), //render selected item after click item lists
        formatOnSubmit: this.formatSubmitResults.bind(this)  //render new items after new item form submitted
      }

      $(CLASS_BOTTOMSHEETS).qorSelectCore(options);
    },

    formatSelectResults: function (data) {
      this.formatResults(data);
    },

    formatSubmitResults: function (data) {
      this.formatResults(data, true);
    },

    formatResults: function (data, insertData) {
      var tmpl,
          bottomsheetsData = this.bottomsheetsData,
          $select = $(bottomsheetsData.selectId),
          $target = $select.closest(CLASS_PARENT),
          $selectFeild = $target.find(CLASS_SELECT_FIELD);

      $select[0].value = data.primaryKey;
      tmpl = this.renderSelectOne(data);

      if ($selectFeild.size()) {
        $selectFeild.remove();
      }

      $target.prepend(tmpl);
      $target.find(CLASS_SELECT_TRIGGER).hide();

      if (insertData && data.ID) {
        $select.append(Mustache.render(QorSelectOne.SELECT_ONE_OPTION_TEMPLATE, data));
        $select[0].value = data.ID;
      }

      this.BottomSheets.hide();
    }

  };

  QorSelectOne.SELECT_ONE_OPTION_TEMPLATE = '<option value="[[ ID ]]" >[[ Name ]]</option>';

  QorSelectOne.SELECT_ONE_SELECTED_TEMPLATE = (
    '<p class="qor-field__selected">' +
      '<span>[[ Name ]]</span>' +
      '<a href="javascripr://" class="qor-selected__remove"><i class="material-icons">remove_circle_outline</i></a>' +
    '</p>'
  );

  QorSelectOne.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorSelectOne(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.selectone"]';
    $(document).
      on(EVENT_DISABLE, function (e) {
        QorSelectOne.plugin.call($(selector, e.target), 'destroy');
      }).
      on(EVENT_ENABLE, function (e) {
        QorSelectOne.plugin.call($(selector, e.target));
      }).
      triggerHandler(EVENT_ENABLE);
  });

  return QorSelectOne;

});
