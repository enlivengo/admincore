(function(factory) {
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
})(function($) {

    'use strict';

    var $document = $(document);
    var FormData = window.FormData;
    var _ = window._;
    var NAMESPACE = 'qor.slideout';
    var EVENT_KEYUP = 'keyup.' + NAMESPACE;
    var EVENT_CLICK = 'click.' + NAMESPACE;
    var EVENT_SUBMIT = 'submit.' + NAMESPACE;
    var EVENT_SHOW = 'show.' + NAMESPACE;
    var EVENT_SLIDEOUT_SUBMIT_COMPLEMENT = 'slideoutSubmitComplete.' + NAMESPACE;
    var EVENT_SLIDEOUT_CLOSED = 'slideoutClosed.' + NAMESPACE;
    var EVENT_SLIDEOUT_LOADED = 'slideoutLoaded.' + NAMESPACE;
    var EVENT_SLIDEOUT_BEFORESEND = 'slideoutBeforeSend.' + NAMESPACE;
    var EVENT_SHOWN = 'shown.' + NAMESPACE;
    var EVENT_HIDE = 'hide.' + NAMESPACE;
    var EVENT_HIDDEN = 'hidden.' + NAMESPACE;
    var EVENT_TRANSITIONEND = 'transitionend';
    var CLASS_OPEN = 'qor-slideout-open';
    var CLASS_MINI = 'qor-slideout-mini';
    var CLASS_IS_SHOWN = 'is-shown';
    var CLASS_IS_SLIDED = 'is-slided';
    var CLASS_IS_SELECTED = 'is-selected';
    var CLASS_MAIN_CONTENT = '.mdl-layout__content.qor-page';
    var CLASS_HEADER_LOCALE = '.qor-actions__locale';
    var CLASS_BODY_LOADING = '.qor-body__loading';

    function QorSlideout(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, QorSlideout.DEFAULTS, $.isPlainObject(options) && options);
        this.slided = false;
        this.disabled = false;
        this.slideoutType = false;
        this.init();
    }

    QorSlideout.prototype = {
        constructor: QorSlideout,

        init: function() {
            this.build();
            this.bind();
        },

        build: function() {
            var $slideout;

            this.$slideout = $slideout = $(QorSlideout.TEMPLATE).appendTo('body');
            this.$slideoutTemplate = $slideout.html();
        },

        unbuild: function() {
            this.$slideout.remove();
        },

        bind: function() {
            this.$slideout.
            on(EVENT_SUBMIT, 'form', $.proxy(this.submit, this))
                .on(EVENT_CLICK, '[data-dismiss="slideout"]', $.proxy(this.hide, this));

            $document.
            on(EVENT_KEYUP, $.proxy(this.keyup, this));
        },

        unbind: function() {
            this.$slideout.
            off(EVENT_SUBMIT, this.submit);

            $document.
            off(EVENT_KEYUP, this.keyup).
            off(EVENT_CLICK, this.hide);
        },

        keyup: function(e) {
            if (e.which === 27) {
                if ($('.qor-bottomsheets').is(':visible') || $('.qor-modal').is(':visible') || $('#redactor-modal-box').length) {
                    return;
                }

                this.hide();
                this.removeSelectedClass();
            }
        },

        loadScript: function(src, url, response) {
            var script = document.createElement('script');
            script.src = src;
            script.onload = function() {
                // exec qorSliderAfterShow after script loaded
                var qorSliderAfterShow = $.fn.qorSliderAfterShow;
                for (var name in qorSliderAfterShow) {
                    if (qorSliderAfterShow.hasOwnProperty(name) && !qorSliderAfterShow[name]['isLoaded']) {
                        qorSliderAfterShow[name].call(this, url, response);
                    }
                }

            };

            document.body.appendChild(script);
        },

        loadStyle: function(src) {
            var ss = document.createElement('link');
            ss.type = 'text/css';
            ss.rel = 'stylesheet';
            ss.href = src;
            document.getElementsByTagName('head')[0].appendChild(ss);
        },

        pushArrary: function($ele, prop) {
            var array = [];
            $ele.each(function() {
                array.push($(this).prop(prop));
            });
            return array;
        },

        loadExtraResource: function($body, $response, url, response) {
            var dataBody = $body;
            dataBody = dataBody.join('');
            dataBody = dataBody.replace(/<\s*body/gi, '<div');
            dataBody = dataBody.replace(/<\s*\/body/gi, '</div');
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

            var styleDifferenceUrl = _.difference(slideoutStylesUrls, currentPageStylesUrls);
            var scriptDifferenceUrl = _.difference(slideoutScriptsUrls, currentPageScriptsUrls);

            var styleDifferenceUrlLength = styleDifferenceUrl.length;
            var scriptDifferenceUrlLength = scriptDifferenceUrl.length;

            if (styleDifferenceUrlLength === 1) {
                this.loadStyle(styleDifferenceUrl);
            } else if (styleDifferenceUrlLength > 1) {
                for (var i = styleDifferenceUrlLength - 1; i >= 0; i--) {
                    this.loadStyle(styleDifferenceUrl[i]);
                }
            }

            if (scriptDifferenceUrlLength === 1) {
                this.loadScript(scriptDifferenceUrl, url, response);
            } else if (scriptDifferenceUrlLength > 1) {
                for (var j = scriptDifferenceUrlLength - 1; j >= 0; j--) {
                    this.loadScript(scriptDifferenceUrl[j], url, response);
                }
            }

        },

        removeSelectedClass: function() {
            this.$element.find('[data-url]').removeClass(CLASS_IS_SELECTED);
        },

        addLoading: function() {
            $(CLASS_BODY_LOADING).remove();
            var $loading = $(QorSlideout.TEMPLATE_LOADING);
            $loading.appendTo($('body')).trigger('enable');
        },

        submit: function(e) {
            var $slideout = this.$slideout;
            var $body = this.$body;
            var form = e.target;
            var $form = $(form);
            var _this = this;
            var $submit = $form.find(':submit');

            $slideout.trigger(EVENT_SLIDEOUT_BEFORESEND);

            if (FormData) {
                e.preventDefault();

                $.ajax($form.prop('action'), {
                    method: $form.prop('method'),
                    data: new FormData(form),
                    dataType: 'html',
                    processData: false,
                    contentType: false,
                    beforeSend: function() {
                        $submit.prop('disabled', true);
                        $.fn.qorSlideoutBeforeHide = null;
                    },
                    success: function(html) {
                        var returnUrl = $form.data('returnUrl');
                        var refreshUrl = $form.data('refreshUrl');

                        $slideout.trigger(EVENT_SLIDEOUT_SUBMIT_COMPLEMENT);

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
                            $(html).find('.qor-alert').each(function(i, e) {
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
                    error: function(xhr, textStatus, errorThrown) {
                        var $error;

                        if (xhr.status === 422) {

                            $body.find('.qor-error').remove();
                            $form.find('.qor-field').removeClass('is-error').find('.qor-field__error').remove();

                            $error = $(xhr.responseText).find('.qor-error');
                            $form.before($error);

                            $error.find('> li > label').each(function() {
                                var $label = $(this);
                                var id = $label.attr('for');

                                if (id) {
                                    $form.find('#' + id).
                                    closest('.qor-field').
                                    addClass('is-error').
                                    append($label.clone().addClass('qor-field__error'));
                                }
                            });

                            $slideout.scrollTop(0);
                        } else {
                            window.alert([textStatus, errorThrown].join(': '));
                        }
                    },
                    complete: function() {
                        $submit.prop('disabled', false);
                    }
                });
            }
        },

        load: function(url, data) {
            var options = this.options;
            var method;
            var dataType;
            var load;
            var $slideout = this.$slideout;
            var $title;

            if (!url) {
                return;
            }

            data = $.isPlainObject(data) ? data : {};

            method = data.method ? data.method : 'GET';
            dataType = data.datatype ? data.datatype : 'html';

            load = $.proxy(function() {
                $.ajax(url, {
                    method: method,
                    dataType: dataType,
                    success: $.proxy(function(response) {
                        var $response,
                            $content,
                            $qorFormContainer;

                        $(CLASS_BODY_LOADING).remove();

                        if (method === 'GET') {
                            $response = $(response);

                            $content = $response.find(CLASS_MAIN_CONTENT);
                            $qorFormContainer = $content.find('.qor-form-container');

                            this.slideoutType = $qorFormContainer.length && $qorFormContainer.data().slideoutType;

                            if (!$content.length) {
                                return;
                            }

                            // Get response body tag: http://stackoverflow.com/questions/7001926/cannot-get-body-element-from-ajax-response
                            var bodyHtml = response.match(/<\s*body.*>[\s\S]*<\s*\/body\s*>/ig);
                            // if no body tag return
                            if (bodyHtml) {
                                this.loadExtraResource(bodyHtml, $response, url, response);
                            }

                            $content.find('.qor-button--cancel').attr('data-dismiss', 'slideout').removeAttr('href');

                            // reset slideout header and body
                            $slideout.html(this.$slideoutTemplate);
                            $title = $slideout.find('.qor-slideout__title');
                            this.$body = $slideout.find('.qor-slideout__body');

                            $title.html($response.find(options.title).html());
                            this.$body.html($content.html());
                            this.$body.find(CLASS_HEADER_LOCALE).remove();

                            $slideout.one(EVENT_SHOWN, function() {

                                // Enable all Qor components within the slideout
                                $(this).trigger('enable');
                            }).one(EVENT_HIDDEN, function() {

                                // Destroy all Qor components within the slideout
                                $(this).trigger('disable');

                            });

                            this.show();

                            // callback for after slider loaded HTML
                            // this callback is deprecated, use slideoutLoaded.qor.slideout event.
                            var qorSliderAfterShow = $.fn.qorSliderAfterShow;
                            if (qorSliderAfterShow) {
                                for (var name in qorSliderAfterShow) {
                                    if (qorSliderAfterShow.hasOwnProperty(name) && $.isFunction(qorSliderAfterShow[name])) {
                                        qorSliderAfterShow[name]['isLoaded'] = true;
                                        qorSliderAfterShow[name].call(this, url, response);
                                    }
                                }
                            }

                            // will trigger slideoutLoaded.qor.slideout event after slideout loaded
                            $slideout.trigger(EVENT_SLIDEOUT_LOADED, [url, response]);

                        } else {
                            if (data.returnUrl) {
                                this.load(data.returnUrl);
                            } else {
                                this.refresh();
                            }
                        }


                    }, this),


                    error: $.proxy(function() {
                        var errors;
                        $(CLASS_BODY_LOADING).remove();
                        if ($('.qor-error span').length > 0) {
                            errors = $('.qor-error span').map(function() {
                                return $(this).text();
                            }).get().join(', ');
                        } else {
                            errors = 'Server error, please try again later!';
                        }                        
                        window.alert(errors);
                    }, this)

                });
            }, this);

            if (this.slided) {
                this.hide();
                this.$slideout.one(EVENT_HIDDEN, load);
            } else {
                load();
            }
        },

        open: function(options) {
            this.addLoading();
            this.load(options.url, options.data);
        },

        show: function() {
            var $slideout = this.$slideout;
            var showEvent;

            if (this.slided) {
                return;
            }

            showEvent = $.Event(EVENT_SHOW);
            $slideout.trigger(showEvent);

            if (showEvent.isDefaultPrevented()) {
                return;
            }

            $slideout.removeClass(CLASS_MINI);
            (this.slideoutType == 'mini') && $slideout.addClass(CLASS_MINI);

            $slideout.addClass(CLASS_IS_SHOWN).get(0).offsetWidth;
            $slideout.
            one(EVENT_TRANSITIONEND, $.proxy(this.shown, this)).
            addClass(CLASS_IS_SLIDED).
            scrollTop(0);
        },

        shown: function() {
            this.slided = true;

            // Disable to scroll body element
            $('body').addClass(CLASS_OPEN);

            this.$slideout.trigger(EVENT_SHOWN);
        },

        hide: function() {

            if ($.fn.qorSlideoutBeforeHide) {
                if (window.confirm('You have unsaved changes on this slideout. If you close this slideout, you will lose all unsaved changes!')) {
                    this.hideSlideout();
                }
            } else {
                this.hideSlideout();
            }

            this.removeSelectedClass();
        },

        hideSlideout: function() {
            var $slideout = this.$slideout;
            var hideEvent;
            var $datePicker = $('.qor-datepicker').not('.hidden');

            // remove onbeforeunload event
            window.onbeforeunload = null;

            $.fn.qorSlideoutBeforeHide = null;

            if ($datePicker.length) {
                $datePicker.addClass('hidden');
            }

            if (!this.slided) {
                return;
            }

            hideEvent = $.Event(EVENT_HIDE);
            $slideout.trigger(hideEvent);

            if (hideEvent.isDefaultPrevented()) {
                return;
            }

            $slideout.
            one(EVENT_TRANSITIONEND, $.proxy(this.hidden, this)).
            removeClass(CLASS_IS_SLIDED);

            $slideout.trigger(EVENT_SLIDEOUT_CLOSED);
        },

        hidden: function() {
            this.slided = false;

            // Enable to scroll body element
            $('body').removeClass(CLASS_OPEN);

            this.$slideout.removeClass(CLASS_IS_SHOWN).trigger(EVENT_HIDDEN);
        },

        refresh: function() {
            this.hide();

            setTimeout(function() {
                window.location.reload();
            }, 350);
        },

        destroy: function() {
            this.unbind();
            this.unbuild();
            this.$element.removeData(NAMESPACE);
        }
    };

    QorSlideout.DEFAULTS = {
        title: '.qor-form-title, .mdl-layout-title',
        content: false
    };

    QorSlideout.TEMPLATE = (
        `<div class="qor-slideout">
            <div class="qor-slideout__header">
            <button type="button" class="mdl-button mdl-button--icon mdl-js-button mdl-js-repple-effect qor-slideout__close" data-dismiss="slideout">
                <span class="material-icons">close</span>
            </button>
                <h3 class="qor-slideout__title"></h3>
            </div>
            <div class="qor-slideout__body"></div>
        </div>`
    );

    QorSlideout.TEMPLATE_LOADING = (
        `<div class="qor-body__loading">
            <div><div class="mdl-spinner mdl-js-spinner is-active qor-layout__bottomsheet-spinner"></div></div>
        </div>`
    );

    QorSlideout.plugin = function(options) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data(NAMESPACE);
            var fn;

            if (!data) {
                if (/destroy/.test(options)) {
                    return;
                }

                $this.data(NAMESPACE, (data = new QorSlideout(this, options)));
            }

            if (typeof options === 'string' && $.isFunction(fn = data[options])) {
                fn.apply(data);
            }
        });
    };

    $.fn.qorSlideout = QorSlideout.plugin;

    return QorSlideout;

});