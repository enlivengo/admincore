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

  var FormData = window.FormData;
  var NAMESPACE = 'qor.selectcore';
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_SUBMIT = 'submit.' + NAMESPACE;
  var CLASS_TABLE_CONTENT = '.qor-table__content';
  var CLASS_SELECTED = 'is_selected';

  function QorSelectCore(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorSelectCore.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorSelectCore.prototype = {
    constructor: QorSelectCore,

    init: function () {
      this.bind();
      this.options.selectIcon && this.initItems();
    },

    bind: function () {
      this.$element.
        on(EVENT_CLICK, '.qor-table tbody tr', this.processingData.bind(this)).
        on(EVENT_SUBMIT, 'form', this.submit.bind(this));
    },

    unbind: function () {
      this.$element.
        off(EVENT_CLICK, '.qor-table tbody tr', this.processingData.bind(this)).
        off(EVENT_SUBMIT, 'form', this.submit.bind(this));
    },

    initItems: function () {
      var $ele = this.$element,
          $tr = $ele.find('tbody tr'),
          unSelectedIconTmpl = this.options.unSelectedIconTmpl;

      if (unSelectedIconTmpl) {
        $tr.each(function () {
          $(this).find('td:first').append(unSelectedIconTmpl);
        });
      }
    },

    processingData: function (e) {
      var $this = $(e.target).closest('tr'),
          $tds = $this.find('td'),
          $td,
          data = {},
          name,
          value,
          options = this.options,
          formatOnSelect = options.formatOnSelect;

      $this.toggleClass(CLASS_SELECTED);
      data.primaryKey = $this.data('primaryKey');

      $tds.each(function () {
        $td = $(this);
        name = $td.data('heading');
        value = $td.find(CLASS_TABLE_CONTENT).size() ? $td.find(CLASS_TABLE_CONTENT).html() : $td.html();
        if (name) {
          data[name] = value;
        }
      });

      if (options.selectIcon) {
        var $firstTD = $this.find('td:first'),
            isSelected = $this.hasClass(CLASS_SELECTED),
            selectedIconTmpl = options.selectedIconTmpl,
            unSelectedIconTmpl = options.unSelectedIconTmpl;

        if (isSelected) {
          selectedIconTmpl && $firstTD.html(selectedIconTmpl);
        } else {
          unSelectedIconTmpl && $firstTD.html(unSelectedIconTmpl);
        }

      }

      if (formatOnSelect && $.isFunction(formatOnSelect)) {
        formatOnSelect(data);
      }

      return false;

    },

    submit: function (e) {
      var form = e.target;
      var $form = $(form);
      var _this = this;
      var $submit = $form.find(':submit');

      if (FormData) {
        e.preventDefault();

        $.ajax($form.prop('action'), {
          method: $form.prop('method'),
          data: new FormData(form),
          dataType: 'json',
          processData: false,
          contentType: false,
          beforeSend: function () {
            $submit.prop('disabled', true);
          },
          success: function (json) {

            if (_this.options.formatOnSubmit && $.isFunction(_this.options.formatOnSubmit)) {
              _this.options.formatOnSubmit(json);
            } else {
              _this.refresh();
            }

          },
          error: function (xhr, textStatus, errorThrown) {

            var $error;
            // Custom HTTP status code
            if (xhr.status === 422) {

              // Clear old errors
              $form.find('.qor-error').remove();
              $form.find('.qor-field').removeClass('is-error').find('.qor-field__error').remove();

              // Append new errors
              $error = $(xhr.responseText).find('.qor-error');
              $form.before($error);

              $error.find('> li > label').each(function () {
                var $label = $(this);
                var id = $label.attr('for');

                if (id) {
                  $form.find('#' + id).
                    closest('.qor-field').
                    addClass('is-error').
                    append($label.clone().addClass('qor-field__error'));
                }
              });
            } else {
              window.alert([textStatus, errorThrown].join(': '));
            }
          },
          complete: function () {
            $submit.prop('disabled', false);
          }
        });
      }
    },

    refresh: function () {
      setTimeout(function () {
        window.location.reload();
      }, 350);
    },

    destroy: function () {
      this.unbind();
    }

  };

  QorSelectCore.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }
        $this.data(NAMESPACE, (data = new QorSelectCore(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $.fn.qorSelectCore = QorSelectCore.plugin;

  return QorSelectCore;

});
