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
  var CLASS_CLEAR_SELECT = '.qor-selected-many__remove';
  var CLASS_SELECT_FIELD = '.qor-field__selected-many';
  var CLASS_SELECT_INPUT = '.qor-field__selectone-input';
  var CLASS_SELECT_TRIGGER = '.qor-field__selectmany-trigger';
  var CLASS_PARENT = '.qor-field__selectmany';
  var CLASS_BOTTOMSHEETS = '.qor-bottomsheets';

  function QorSelectMany(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorSelectMany.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorSelectMany.prototype = {
    constructor: QorSelectMany,

    init: function () {
      this.bind();
    },

    bind: function () {
      $document.on(EVENT_CLICK, '[data-selectmany-url]', this.openBottomSheets.bind(this));
      this.$element.on(EVENT_CLICK, CLASS_CLEAR_SELECT, this.clearSelect);
    },

    clearSelect: function (e) {
      var $target = $(e.target),
          $parent = $target.closest(CLASS_PARENT);

      // $parent.find(CLASS_SELECT_FIELD).remove();
      // $parent.find(CLASS_SELECT_INPUT)[0].value = '';
      // $parent.find(CLASS_SELECT_TRIGGER).show();

      return false;
    },

    openBottomSheets: function (e) {
      var data = $(e.target).data();

      this.BottomSheets = $body.data('qor.bottomsheets');
      this.bottomsheetsData = data;
      data.url = data.selectmanyUrl;

      this.BottomSheets.open(data, this.handleSelectMany.bind(this));

    },

    renderSelectOne: function (data) {
      return Mustache.render(QorSelectMany.SELECT_MANY_TEMPLATE, data);
    },

    handleSelectMany: function () {
      var $bottomsheets = $(CLASS_BOTTOMSHEETS),
          options = {
            formatOnSelect:     this.formatSelectResults.bind(this),  //render selected item after click item lists
            formatOnSubmit:     this.formatSubmitResults.bind(this),  //render new items after new item form submitted
            selectIcon:         true,                                 //show icon indicator when item selected, need 'selectedIconTmpl' and 'unSelectedIconTmpl' options
            selectedIconTmpl:   QorSelectMany.SELECT_MANY_SELECTED,   // selected item icon template
            unSelectedIconTmpl: QorSelectMany.SELECT_MANY_UNSELECTED  // unselected item icon template
          };

      $bottomsheets.qorSelectCore(options);

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

      $selectFeild.append(tmpl);
      // $target.find(CLASS_SELECT_TRIGGER).hide();

      if (insertData && data.ID) {
        $select.append('<option value="' + data.ID + '" >' + data.Name + '</option>');
        $select[0].value = data.ID;
      }


      // this.BottomSheets.hide();
    }

  };

  // For selected icon indicator
  QorSelectMany.SELECT_MANY_SELECTED = '<i class="material-icons">check_circle</i>';

  // For unselected icon indicator
  QorSelectMany.SELECT_MANY_UNSELECTED = '<i class="material-icons">panorama_fish_eye</i>';

  QorSelectMany.SELECT_MANY_TEMPLATE = (
    '<li>' +
      '<span>[[ Name ]]</span>' +
      '<a href="javascripr://" class="qor-selected-many__remove"><i class="material-icons">clear</i></a>' +
    '</li>'
  );

  QorSelectMany.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorSelectMany(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.selectmany"]';
    $(document).
      on(EVENT_DISABLE, function (e) {
        QorSelectMany.plugin.call($(selector, e.target), 'destroy');
      }).
      on(EVENT_ENABLE, function (e) {
        QorSelectMany.plugin.call($(selector, e.target));
      }).
      triggerHandler(EVENT_ENABLE);
  });

  return QorSelectMany;

});
