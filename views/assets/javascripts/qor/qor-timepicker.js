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

  var NAMESPACE = 'qor.timepicker';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_CHANGE_TIME = 'selectTime.' + NAMESPACE;

  var CLASS_PARENT = '.qor-field__datetimepicker';
  var CLASS_SELECTED_TIME = '.ui-timepicker-selected';

  function QorTimepicker(element, options) {
    this.$element = $(element);
    this.options = $.extend(true, {}, QorTimepicker.DEFAULTS, $.isPlainObject(options) && options);
    this.formatDate = null;
    this.pickerData = this.$element.data();
    this.targetInputClass = this.pickerData.targetInput;
    this.parent = this.$element.closest(CLASS_PARENT);
    this.isDateTimePicker = this.targetInputClass && this.parent.size();
    this.$targetInput = this.parent.find(this.targetInputClass);
    this.init();
  }

  QorTimepicker.prototype = {
    init: function () {
      this.bind();
    },

    bind: function () {

      var pickerOptions = {
            timeFormat: 'H:i',
            showOn: [],
            wrapHours: false,
            showOnFocus: false,
            scrollDefault: 'now'
          };

      if (this.isDateTimePicker) {

        this.$targetInput
          .timepicker(pickerOptions)
          .on(EVENT_CHANGE_TIME, $.proxy(this.changeTime, this));
      }

      this.$element.on(EVENT_CLICK, $.proxy(this.show, this));
    },

    unbind: function () {
      this.isDateTimePicker && this.$targetInput.off(EVENT_CHANGE_TIME, this.changeTime);
      this.$element.off(EVENT_CLICK, this.show);
    },

    changeTime: function () {
      var $targetInput = this.$targetInput;

      var oldValue = this.oldValue;
      var timeReg = /\d{2}:\d{2}/;
      var dateReg = /^\d{4}-\d{2}-\d{2}/;
      var hasDate = dateReg.test(oldValue);
      var hasTime = timeReg.test(oldValue);
      var selectedTime = $(CLASS_SELECTED_TIME).text();
      var newValue;

      if (!oldValue || !hasDate) {
        return;
      }

      if (hasTime) {
        newValue = oldValue.replace(timeReg,selectedTime)
      } else {
        newValue = oldValue + ' ' + selectedTime;
      }

      console.log(oldValue)
      console.log(selectedTime)
      console.log(newValue)

      $targetInput.val(newValue);

    },

    show: function () {
      if (!this.isDateTimePicker) {
        return;
      }

      this.$targetInput.timepicker('show');
      this.oldValue = this.$targetInput.val();

    },

    destroy: function () {
      this.unbind();
      this.$targetInput.timepicker('remove');
      this.$element.removeData(NAMESPACE);
    }
  };

  QorTimepicker.DEFAULTS = {};

  QorTimepicker.plugin = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var options;
      var fn;

      if (!data) {
        if (!$.fn.datepicker) {
          return;
        }

        if (/destroy/.test(option)) {
          return;
        }

        options = $.extend(true, {}, $this.data(), typeof option === 'object' && option);
        $this.data(NAMESPACE, (data = new QorTimepicker(this, options)));
      }

      if (typeof option === 'string' && $.isFunction(fn = data[option])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.timepicker"]';

    $(document).
      on(EVENT_DISABLE, function (e) {
        QorTimepicker.plugin.call($(selector, e.target), 'destroy');
      }).
      on(EVENT_ENABLE, function (e) {
        QorTimepicker.plugin.call($(selector, e.target));
      }).
      triggerHandler(EVENT_ENABLE);
  });

  return QorTimepicker;

});