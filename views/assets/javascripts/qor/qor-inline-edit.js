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

    const $window = $(window),
        NAMESPACE = 'qor.inlineEdit',
        EVENT_ENABLE = 'enable.' + NAMESPACE,
        EVENT_DISABLE = 'disable.' + NAMESPACE,
        EVENT_CLICK = 'click.' + NAMESPACE,
        CLASS_FIELD = '.qor-field',
        CLASS_FIELD_SHOW = '.qor-field__show',
        CLASS_FIELD_EDIT = '.qor-field__edit';

    function QorInlineEdit(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, QorInlineEdit.DEFAULTS, $.isPlainObject(options) && options);
        this.init();
    }

    QorInlineEdit.prototype = {
        constructor: QorInlineEdit,

        init: function() {
            this.bind();
        },

        bind: function() {

        },

        unbind: function() {

        },

        build: function() {

        },

        unbuild: function() {},

        destroy: function() {
            this.unbind();
            this.unbuild();
            this.$element.removeData(NAMESPACE);
        }
    };

    QorInlineEdit.DEFAULTS = {};

    QorInlineEdit.plugin = function(options) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data(NAMESPACE);
            var fn;

            if (!data) {
                $this.data(NAMESPACE, (data = new QorInlineEdit(this, options)));
            }

            if (typeof options === 'string' && $.isFunction(fn = data[options])) {
                fn.call(data);
            }
        });
    };

    $(function() {
        let selector = '[data-toggle="qor.inlineEdit"]',
            options = {};

        $(document).
        on(EVENT_DISABLE, function(e) {
            QorInlineEdit.plugin.call($(selector, e.target), 'destroy');
        }).
        on(EVENT_ENABLE, function(e) {
            QorInlineEdit.plugin.call($(selector, e.target), options);
        }).
        triggerHandler(EVENT_ENABLE);
    });

    return QorInlineEdit;

});
