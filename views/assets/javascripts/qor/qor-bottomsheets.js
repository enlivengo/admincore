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
  var _ = window._;
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
        .on(EVENT_SUBMIT, 'form', $.proxy(this.submit, this))
        .on(EVENT_CLICK, '[data-dismiss="bottomsheets"]', $.proxy(this.hide, this));

      // $document.;
    },

    unbind: function () {
      this.$bottomsheets.
        off(EVENT_SUBMIT, this.submit);

      $document.off(EVENT_CLICK, this.click);
    },

    loadScript: function (src, url, response) {
      var options = this.options;
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () {
        // exec qorBottomsheetsAfterShow after script loaded
        if (options.afterShow){
          var qorBottomsheetsAfterShow = $.fn.qorBottomsheetsAfterShow;
          for (var name in qorBottomsheetsAfterShow) {
            if (qorBottomsheetsAfterShow.hasOwnProperty(name)) {
              qorBottomsheetsAfterShow[name].call(this, url, response);
            }
          }
        }
      };
      document.body.appendChild(script);
    },

    loadStyle: function (src) {
      var ss = document.createElement('link');
      ss.type = 'text/css';
      ss.rel = 'stylesheet';
      ss.href = src;
      document.getElementsByTagName('head')[0].appendChild(ss);
    },

    pushArrary: function ($ele,prop) {
      var array = [];
      $ele.each(function () {
        array.push($(this).prop(prop));
      });
      return array;
    },

    click: function (e) {
      var bottomsheets = this.$bottomsheets.get(0);
      var target = e.target;
      var $target;

      if (e.isDefaultPrevented()) {
        return;
      }

      while (target !== document) {
        $target = $(target);

        if ($target.prop('disabled')) {
          break;
        }

        if (target === bottomsheets) {
          break;
        } else if ($target.data('dismiss') === 'bottomsheets') {
          this.hide();
          break;
        }

      }
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
              var prefix = '/' + location.pathname.split('/')[1];
              var flashStructs = [];
              $(html).find('.qor-alert').each(function (i, e) {
                var message = $(e).find('.qor-alert-message').text().trim();
                var type = $(e).data('type');
                if (message !== '') {
                  flashStructs.push({ Type: type, Message: message, Keep: true });
                }
              });
              if (flashStructs.length > 0) {
                document.cookie = 'qor-flashes=' + btoa(unescape(encodeURIComponent(JSON.stringify(flashStructs)))) + '; path=' + prefix;
              }
              _this.refresh();
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

      if (!url) {
        return;
      }

      data = $.isPlainObject(data) ? data : {};

      method = data.method ? data.method : 'GET';
      dataType = data.datatype ? data.datatype : 'html';

      data.url = data.method = data.datatype = data.ajaxForm = data.upgraded = undefined;

      load = $.proxy(function () {
        $.ajax(url, {
          method: method,
          data: data,
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

              // Get response body tag: http://stackoverflow.com/questions/7001926/cannot-get-body-element-from-ajax-response
              var dataBody = response.match(/<\s*body.*>[\s\S]*<\s*\/body\s*>/ig);
              // if no body tag return
              if (dataBody) {

                dataBody  = dataBody.join('');
                dataBody  = dataBody.replace(/<\s*body/gi, '<div');
                dataBody  = dataBody.replace(/<\s*\/body/gi, '</div');
                var bodyClass = $(dataBody).prop('class');
                $('body').addClass(bodyClass);

                // Get links and scripts, compare slideout and inline, load style and script if has new style or script.
                var $slideoutStyles = $response.filter('link');
                var $currentPageStyles = $('link');
                var $slideoutScripts = $response.filter('script');
                var $currentPageScripts = $('script');

                var slideoutStylesUrls = this.pushArrary($slideoutStyles, 'href');
                var currentPageStylesUrls = this.pushArrary($currentPageStyles, 'href');

                var slideoutScriptsUrls = this.pushArrary($slideoutScripts, 'src');
                var currentPageScriptsUrls = this.pushArrary($currentPageScripts, 'src');

                var styleDifferenceUrl  = _.difference(slideoutStylesUrls, currentPageStylesUrls);
                var scriptDifferenceUrl = _.difference(slideoutScriptsUrls, currentPageScriptsUrls);

                var styleDifferenceUrlLength = styleDifferenceUrl.length;
                var scriptDifferenceUrlLength = scriptDifferenceUrl.length;

                if (styleDifferenceUrlLength === 1){
                  this.loadStyle(styleDifferenceUrl);
                } else if (styleDifferenceUrlLength > 1){
                  for (var i = styleDifferenceUrlLength - 1; i >= 0; i--) {
                    this.loadStyle(styleDifferenceUrl[i]);
                  }
                }

                if (scriptDifferenceUrlLength === 1){
                  this.loadScript(scriptDifferenceUrl, url, response);
                } else if (scriptDifferenceUrlLength > 1){
                  for (var j = scriptDifferenceUrlLength - 1; j >= 0; j--) {
                    this.loadScript(scriptDifferenceUrl[j], url, response);
                  }
                }

              }


              // end

              $content.find('.qor-button--cancel').attr('data-dismiss', 'bottomsheets').removeAttr('href');
              this.$body.html($content.html());
              this.$title.html($response.find(options.title).html());

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
      this.load(options.url,options.data);
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
      '<div class="qor-bottomsheets__title"></div>' +
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
