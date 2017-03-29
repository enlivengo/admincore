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

    const NAMESPACE = 'qor.inlineEdit',
        EVENT_ENABLE = 'enable.' + NAMESPACE,
        EVENT_DISABLE = 'disable.' + NAMESPACE,
        EVENT_CLICK = 'click.' + NAMESPACE,
        EVENT_MOUSEENTER = 'mouseenter.' + NAMESPACE,
        EVENT_MOUSELEAVE = 'mouseleave.' + NAMESPACE,
        CLASS_FIELD = '.qor-field',
        CLASS_FIELD_SHOW = '.qor-field__show',
        CLASS_FIELD_EDIT = '.qor-field__edit',
        CLASS_EDIT = '.qor-inlineedit__edit',
        CLASS_SAVE = '.qor-inlineedit__save',
        CLASS_CANCEL = '.qor-inlineedit__cancel';

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
            this.$element
                .on(EVENT_MOUSEENTER, CLASS_FIELD_SHOW, this.showEditButton)
                .on(EVENT_MOUSELEAVE, CLASS_FIELD_SHOW, this.hideEditButton)
                .on(EVENT_CLICK, CLASS_CANCEL, this.hideEdit)
                .on(EVENT_CLICK, CLASS_SAVE, this.saveEdit)
                .on(EVENT_CLICK, CLASS_EDIT, this.showEdit);
        },

        unbind: function() {

        },

        showEditButton: function() {
            let $edit = $(QorInlineEdit.TEMPLATE_EDIT);
            $edit.appendTo($(this));
        },

        hideEditButton: function() {
            $('.qor-inlineedit__edit').remove();
        },

        showEdit: function() {
            let $parent = $(this).hide().closest('.qor-field').addClass('qor-inlineedit__field'),
                $save = $(QorInlineEdit.TEMPLATE_SAVE);

            $save.appendTo($parent.find(CLASS_FIELD_EDIT).show())
            $parent.find(CLASS_FIELD_SHOW).hide();
        },

        hideEdit: function() {
            let $parent = $(this).closest('.qor-field');
            $(`${CLASS_EDIT},${CLASS_SAVE}`).remove();
            $parent.find(CLASS_FIELD_EDIT).hide();
            $parent.find(CLASS_FIELD_SHOW).show();
        },

        saveEdit: function() {
            let $parent = $(this).closest('.qor-field');
        },

        destroy: function() {
            this.unbind();
            this.$element.removeData(NAMESPACE);
        }
    };

    QorInlineEdit.DEFAULTS = {};

    QorInlineEdit.TEMPLATE_EDIT = `<button class="mdl-button mdl-js-button mdl-button--icon mdl-button--colored qor-inlineedit__edit" type="button"><i class="material-icons">mode_edit</i></button>`;
    QorInlineEdit.TEMPLATE_SAVE = `<button class="mdl-button mdl-js-button mdl-button--icon mdl-button--colored qor-inlineedit__save" type="button"><i class="material-icons">done</i></button>
                                    <button class="mdl-button mdl-js-button mdl-button--icon qor-inlineedit__cancel" type="button"><i class="material-icons">close</i></button>`;

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
