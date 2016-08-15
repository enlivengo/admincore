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
  var FormData = window.FormData;
  var Mustache = window.Mustache;
  var NAMESPACE = 'qor.bottomsheets';
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_SUBMIT = 'submit.' + NAMESPACE;
  var EVENT_SHOW = 'show.' + NAMESPACE;
  var EVENT_SHOWN = 'shown.' + NAMESPACE;
  var EVENT_HIDE = 'hide.' + NAMESPACE;
  var EVENT_HIDDEN = 'hidden.' + NAMESPACE;
  var CLASS_OPEN = 'qor-bottomsheets-open';
  var CLASS_IS_SHOWN = 'is-shown';
  var CLASS_IS_SLIDED = 'is-slided';
  var CLASS_MAIN_CONTENT = '.mdl-layout__content.qor-page';

  function QorBottomSheets(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorBottomSheets.DEFAULTS, $.isPlainObject(options) && options);
    this.disabled = false;
    this.resourseData = {};
    this.init();
  }

  QorBottomSheets.prototype = {
    constructor: QorBottomSheets,

    init: function () {
      this.build();
      this.bind();
    },

    build: function () {
      var $bottomsheets;

      this.$bottomsheets = $bottomsheets = $(QorBottomSheets.TEMPLATE).appendTo('body');
      this.$body = $bottomsheets.find('.qor-bottomsheets__body');
      this.$title = $bottomsheets.find('.qor-bottomsheets__title');
      this.$bodyClass = $('body').prop('class');

    },

    unbuild: function () {
      this.$body = null;
      this.bottomsheets.remove();
    },

    bind: function () {
      this.$bottomsheets
        .on(EVENT_SUBMIT, 'form', this.submit.bind(this))
        .on(EVENT_CLICK, '[data-dismiss="bottomsheets"]', this.hide.bind(this))
        .on(EVENT_CLICK, 'tr', this.tableClick.bind(this));

    },

    unbind: function () {
      this.$bottomsheets.
        off(EVENT_SUBMIT, this.submit);

      $document.off(EVENT_CLICK, this.click);
    },

    renderActionSelectedData: function (actionSelectedData) {
      var $form = this.$body.find('[data-toggle="qor-action-slideout"]').find('form');
      for (var i = actionSelectedData.length - 1; i >= 0; i--) {
        $form.prepend('<input type="hidden" name="primary_values[]" value="' + actionSelectedData[i] + '" />');
      }
    },

    selectOneTmpl: function (data) {
      var tmpl = '<p class="qor-field__selected"><span>[[ value ]]</span><a href="javascripr://" class="qor-selected__remvoe"><i class="material-icons">remove_circle_outline</i></a></p>';
      return Mustache.render(tmpl, data);
    },

    tableClick: function (e) {
      var resourseData = this.resourseData,
          $this = $(e.target).closest('tr'),
          valueHtml = $this.find('[data-heading="Name"]')[0] || $this.find('[data-heading="Title"]')[0] || $this.find('[data-heading="Code"]')[0],
          $target = resourseData.$ele,
          $targetParent = $target.parent(),
          selectedName,
          selectedId,
          $selector = $(this.resourseData.selectId);

      if (resourseData.selectOne) {
        selectedName = valueHtml.dataset.value;
        selectedId = $this.data().primaryKey;
        $targetParent.find('.qor-field__selected').remove();
        $target.before(this.selectOneTmpl({value:selectedName}));
        $selector[0].value = selectedId;
        this.hide();
      }

      return false;

    },

    submit: function (e) {
      var $bottomsheets = this.$bottomsheets;
      var $body = this.$body;
      var form = e.target;
      var $form = $(form);
      var _this = this;
      var $submit = $form.find(':submit');

      if (FormData) {
        e.preventDefault();

        $.ajax($form.prop('action'), {
          method: $form.prop('method'),
          data: new FormData(form),
          dataType: 'html',
          processData: false,
          contentType: false,
          beforeSend: function () {
            $submit.prop('disabled', true);
          },
          success: function (html) {
            var returnUrl = $form.data('returnUrl');
            var refreshUrl = $form.data('refreshUrl');

            if (refreshUrl) {
              window.location.href = refreshUrl;
              return;
            }

            if (returnUrl == 'refresh') {
              _this.refresh();
              return;
            }

            if (returnUrl && returnUrl != 'refresh') {
              _this.load(returnUrl);
            } else {

              if (_this.resourseData.selectOne) {

                var selectId = $(html).find('[name="QorResource.ID"]').val(),
                    selectName = $(html).find('[name="QorResource.Name"]').val(),
                    $target = _this.resourseData.$target,
                    $targetParent = $target.parent(),
                    $select = $(_this.resourseData.selectId);

                $targetParent.find('.qor-field__selected').remove();
                $target.before(_this.selectOneTmpl({value:selectName}));

                $select.append('<option value="' + selectId + '" >' + selectName + '</option>');

                $select[0].value = selectId;

                _this.hide();

              } else {
                _this.refresh();
              }

            }
          },
          error: function (xhr, textStatus, errorThrown) {
            var $error;

            // Custom HTTP status code
            if (xhr.status === 422) {

              // Clear old errors
              $body.find('.qor-error').remove();
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

              // Scroll to top to view the errors
              $bottomsheets.scrollTop(0);
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

    load: function (url, data) {
      var options = this.options;
      var method;
      var dataType;
      var load;
      var actionSelectedData = data.actionSelectedData;

      if (!url) {
        return;
      }

      data = $.isPlainObject(data) ? data : {};

      method = data.method ? data.method : 'GET';
      dataType = data.datatype ? data.datatype : 'html';

      load = $.proxy(function () {
        $.ajax(url, {
          method: method,
          dataType: dataType,
          success: $.proxy(function (response) {
            var $response;
            var $content;

            if (method === 'GET') {
              $response = $(response);

              $content = $response.find(CLASS_MAIN_CONTENT);

              if (!$content.length) {
                return;
              }

              $content.find('.qor-button--cancel').attr('data-dismiss', 'bottomsheets');

              this.$body.html($content.html());
              this.$title.html($response.find(options.title).html());

              if (this.resourseData.selectOne) {
                this.$body.find('.qor-button--new').data('selectOne',true).data('$target',this.resourseData.$ele).data('selectId',this.resourseData.selectId);
              }

              this.$title.after(this.$body.find('.qor-button--new'));

              if (actionSelectedData && actionSelectedData.length) {
                this.renderActionSelectedData(actionSelectedData);
              }

              this.$bottomsheets.one(EVENT_SHOWN, function () {

                // Enable all Qor components within the bottomSheets
                $(this).trigger('enable');
              }).one(EVENT_HIDDEN, function () {

                // Destroy all Qor components within the bottomSheets
                $(this).trigger('disable');

              });

              this.show();

              // callback for after bottomSheets loaded HTML
              if (options.afterShow){
                var qorBottomsheetsAfterShow = $.fn.qorBottomsheetsAfterShow;

                for (var name in qorBottomsheetsAfterShow) {
                  if (qorBottomsheetsAfterShow.hasOwnProperty(name) && $.isFunction(qorBottomsheetsAfterShow[name])) {
                    qorBottomsheetsAfterShow[name].call(this, url, response);
                  }
                }

              }

            } else {
              if (data.returnUrl) {
                this.load(data.returnUrl);
              } else {
                this.refresh();
              }
            }


          }, this),


          error: $.proxy (function (response) {
            var errors;
            if ($('.qor-error span').size() > 0) {
              errors = $('.qor-error span').map(function () {
                return $(this).text();
              }).get().join(', ');
            } else {
              errors = response.responseText;
            }
            window.alert(errors);
          }, this)

        });
      }, this);

      load();

    },

    open: function (options) {
      this.resourseData = options;
      this.load(options.url,options);
    },

    show: function () {
      var $bottomsheets = this.$bottomsheets;
      var showEvent;

      showEvent = $.Event(EVENT_SHOW);
      $bottomsheets.trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      }

      $bottomsheets.addClass(CLASS_IS_SHOWN).get(0).offsetWidth;
      $bottomsheets.
        trigger(EVENT_SHOWN).
        addClass(CLASS_IS_SLIDED);

      $('body').addClass(CLASS_OPEN);

    },

    hide: function () {
      var $bottomsheets = this.$bottomsheets;
      var hideEvent;
      var $datePicker = $('.qor-datepicker').not('.hidden');

      if ($datePicker.size()){
        $datePicker.addClass('hidden');
      }

      hideEvent = $.Event(EVENT_HIDE);
      $bottomsheets.trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      // empty body html when hide slideout
      this.$body.html('');

      $bottomsheets.
        removeClass(CLASS_IS_SLIDED).
        removeClass(CLASS_IS_SHOWN).
        trigger(EVENT_HIDDEN);

      $('body').removeClass(CLASS_OPEN);
      return false;
    },

    refresh: function () {
      this.hide();

      setTimeout(function () {
        window.location.reload();
      }, 350);
    },

    destroy: function () {
      this.unbind();
      this.unbuild();
      this.$element.removeData(NAMESPACE);
    }
  };

  QorBottomSheets.DEFAULTS = {
    title: '.qor-form-title, .mdl-layout-title',
    content: false
  };

  QorBottomSheets.TEMPLATE = (
    '<div class="qor-bottomsheets">' +
      '<div class="qor-bottomsheets__header">' +
        '<h3 class="qor-bottomsheets__title"></h3>' +
        '<button type="button" class="mdl-button mdl-button--icon mdl-js-button mdl-js-repple-effect qor-bottomsheets__close" data-dismiss="bottomsheets">' +
          '<span class="material-icons">close</span>' +
        '</button>' +
      '</div>' +
      '<div class="qor-bottomsheets__body"></div>' +
    '</div>'
  );

  QorBottomSheets.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorBottomSheets(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $.fn.qorBottomSheets = QorBottomSheets.plugin;

  return QorBottomSheets;

});
