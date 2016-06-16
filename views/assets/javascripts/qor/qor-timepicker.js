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
  var EVENT_KEYDOWN = 'keydown.' + NAMESPACE;
  var EVENT_BLUR = 'blur.' + NAMESPACE;
  var EVENT_CHANGE_TIME = 'selectTime.' + NAMESPACE;

  var CLASS_PARENT = '.qor-field__datetimepicker';
  var CLASS_TIME_SELECTED = '.ui-timepicker-selected';
  var CLASS_TIME_WRAPPER = '.ui-timepicker-wrapper';

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
            showOn: null,
            wrapHours: false,
            scrollDefault: 'now'
          };

      if (this.isDateTimePicker) {
        this.$targetInput
          .timepicker(pickerOptions)
          .on(EVENT_CHANGE_TIME, $.proxy(this.changeTime, this))
          .on(EVENT_BLUR, $.proxy(this.blur, this))
          .on(EVENT_KEYDOWN, $.proxy(this.keydown, this));
      }

      this.$element.on(EVENT_CLICK, $.proxy(this.show, this));
    },

    unbind: function () {
      this.$element.off(EVENT_CLICK, this.show);

      if (this.isDateTimePicker) {
        this.$targetInput
        .off(EVENT_CHANGE_TIME, this.changeTime)
        .off(EVENT_BLUR, this.blur)
        .off(EVENT_KEYDOWN, this.keydown);
      }
    },

    blur: function () {
      var inputValue = this.$targetInput.val();

      if (!inputValue) {
        return;
      }
    },

    keydown: function (e) {
      var keycode = e.keyCode;
      var keys = [48,49,50,51,52,53,54,55,56,57,8,37,38,39,40,27,32,20,189,16,186,96,97,98,99,100,101,102,103,104,105];
      if (keys.indexOf(keycode) == -1) {
        e.preventDefault()
      }
    },

    checkDate: function () {
      var regCheckDate = /^(?:(?!0000)[0-9]{4}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[0-9]{1,2}(?:0[48]|[2468][048]|[13579][26])|(?:0[48]|[2468][048]|[13579][26])00)-02-29)$/
    },

    checkTime: function () {
      var regCheckDate = /^([01]\d|2[0-3]):?([0-5]\d)$/;
    },

    changeTime: function () {
      var $targetInput = this.$targetInput;

      var oldValue = this.oldValue;
      var timeReg = /\d{1,2}:\d{1,2}/;
      var dateReg = /^\d{4}-\d{1,2}-\d{1,2}/;
      var hasDate = dateReg.test(oldValue);
      var hasTime = timeReg.test(oldValue);
      var selectedTime = $targetInput.data().timepickerList.find(CLASS_TIME_SELECTED).html();
      var newValue;

      if (!oldValue || !hasDate || !selectedTime) {
        return;
      }

      if (hasTime) {
        newValue = oldValue.replace(timeReg,selectedTime)
      } else {
        newValue = oldValue + ' ' + selectedTime;
      }

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