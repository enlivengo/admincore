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
  var CLASS_SELECT_ICON = '.qor-selectmany__select-icon';
  var CLASS_SELECT_HINT = '.qor-selectmany__hint';
  var CLASS_PARENT = '.qor-field__selectmany';
  var CLASS_BOTTOMSHEETS = '.qor-bottomsheets';
  var CLASS_SELECTED = 'is_selected';


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
      this.$element.on(EVENT_CLICK, CLASS_CLEAR_SELECT, this.clearSelect.bind(this));
    },

    clearSelect: function (e) {
      var $target = $(e.target),
          $selectFeild = $target.closest(CLASS_PARENT);

      $target.closest('[data-primary-key]').remove();
      this.updateSelectInputData($selectFeild);

      return false;
    },

    openBottomSheets: function (e) {
      var data = $(e.target).data();

      this.BottomSheets = $body.data('qor.bottomsheets');
      this.$selector = $(data.selectId);
      this.$selectFeild = this.$selector.closest(CLASS_PARENT).find(CLASS_SELECT_FIELD);

      data.url = data.selectmanyUrl;

      this.BottomSheets.open(data, this.handleSelectMany.bind(this));

    },

    renderSelectMany: function (data) {
      return Mustache.render(QorSelectMany.SELECT_MANY_TEMPLATE, data);
    },

    renderHint: function (data) {
      return Mustache.render(QorSelectMany.SELECT_MANY_HINT, data);
    },

    initItems: function () {
      var $tr = $(CLASS_BOTTOMSHEETS).find('tbody tr'),
          selectedIconTmpl = QorSelectMany.SELECT_MANY_SELECTED_ICON,
          unSelectedIconTmpl = QorSelectMany.SELECT_MANY_UNSELECTED_ICON,
          selectedIDs = [],
          primaryKey,
          $selectedItems = this.$selectFeild.find('[data-primary-key]');

      $selectedItems.each(function () {
        selectedIDs.push($(this).data().primaryKey);
      });

      $tr.each(function () {
        var $this = $(this),
            $td = $this.find('td:first');

        primaryKey = $this.data().primaryKey;

        if (selectedIDs.indexOf(primaryKey) !='-1') {
          $this.addClass(CLASS_SELECTED);
          $td.append(selectedIconTmpl);
        } else {
          $td.append(unSelectedIconTmpl);
        }
      });

      this.updateHint(this.getSelectedItemData());

    },

    getSelectedItemData: function() {
      var selecedItems = $(CLASS_BOTTOMSHEETS).find('.is_selected');
      return {
        selectedNum: selecedItems.size()
      };
    },

    updateHint: function (data) {
      var hint = this.renderHint(data);

      $(CLASS_SELECT_HINT).remove();
      $(CLASS_BOTTOMSHEETS).find('.qor-bottomsheets__body').prepend(hint);
    },

    updateSelectInputData: function ($selectFeild) {
      var $selectList = $selectFeild ?  $selectFeild : this.$selectFeild,
          $selectedItems = $selectList.find('[data-primary-key]'),
          $selector = $selectFeild ? $selectFeild.find('select') : this.$selector,
          options = $selector.find('option');

      options.prop('selected', false);

      $selectedItems.each(function () {
        options.filter('[value="' + $(this).data().primaryKey + '"]').prop('selected', true);
      });
    },

    changeIcon: function ($ele, template) {
      $ele.find(CLASS_SELECT_ICON).remove();
      $ele.find('td:first').prepend(template);
    },

    removeItem: function (data) {
      var primaryKey = data.primaryKey;

      this.$selectFeild.find('[data-primary-key="' + primaryKey + '"]').remove();
      this.changeIcon(data.$clickElement, QorSelectMany.SELECT_MANY_UNSELECTED_ICON);
    },

    addItem: function (data, isNewData) {
      var template = this.renderSelectMany(data),
          $option;

      this.$selectFeild.append(template);

      if (isNewData) {
        $option = $(Mustache.render(QorSelectMany.SELECT_MANY_OPTION_TEMPLATE, data));
        this.$selector.append($option);
        $option.prop('selected', true);
        this.BottomSheets.hide();
        return;
      }


      this.changeIcon(data.$clickElement, QorSelectMany.SELECT_MANY_SELECTED_ICON);



    },

    handleSelectMany: function () {
      var $bottomsheets = $(CLASS_BOTTOMSHEETS),
          options = {
            formatOnSelect: this.formatSelectResults.bind(this),  // render selected item after click item lists
            formatOnSubmit: this.formatSubmitResults.bind(this)   // render new items after new item form submitted
          };

      $bottomsheets.qorSelectCore(options);
      this.initItems();
    },

    formatSelectResults: function (data) {
      this.formatResults(data);
    },

    formatSubmitResults: function (data) {
      this.formatResults(data, true);
    },

    formatResults: function (data, isNewData) {
      if (isNewData) {
        this.addItem(data, true);
        return;
      }

      var $element = data.$clickElement,
          isSelected;

      $element.toggleClass(CLASS_SELECTED);
      isSelected = $element.hasClass(CLASS_SELECTED);

      if (isSelected) {
        this.addItem(data);
      } else {
        this.removeItem(data);
      }

      this.updateHint(this.getSelectedItemData());
      this.updateSelectInputData();

    }

  };

  QorSelectMany.SELECT_MANY_OPTION_TEMPLATE = '<option value="[[ primaryKey ]]" >[[ Name ]]</option>';

  // For selected icon indicator
  QorSelectMany.SELECT_MANY_SELECTED_ICON = '<span class="qor-selectmany__select-icon"><i class="material-icons">check_circle</i></span>';

  // For unselected icon indicator
  QorSelectMany.SELECT_MANY_UNSELECTED_ICON = '<span class="qor-selectmany__select-icon"><i class="material-icons">panorama_fish_eye</i></span>';

  // For select many tips
  QorSelectMany.SELECT_MANY_HINT = '<div class="qor-selectmany__hint clearfix"><span>[[ selectedNum ]] items selected</span><a href="javascript://" data-dismiss="bottomsheets">DONE</a></div>';

  QorSelectMany.SELECT_MANY_TEMPLATE = (
    '<li data-primary-key="[[ primaryKey ]]">' +
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
