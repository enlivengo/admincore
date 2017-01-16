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

    let NAMESPACE = 'qor.replicator',
        EVENT_ENABLE = 'enable.' + NAMESPACE,
        EVENT_DISABLE = 'disable.' + NAMESPACE,
        EVENT_CLICK = 'click.' + NAMESPACE,
        EVENT_REPLICATOR_ADDED = 'added.' + NAMESPACE;

    function QorReplicator(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, QorReplicator.DEFAULTS, $.isPlainObject(options) && options);
        this.index = 0;
        this.init();
    }

    QorReplicator.prototype = {
        constructor: QorReplicator,

        init: function () {
            let $this = this.$element,
                $template = $this.find('> .qor-field__block > .qor-fieldset--new'),
                fieldsetName;

            this.isInSlideout = $this.closest('.qor-slideout').length;

            if (!$template.length) {
                return;
            }

            // Should destroy all components here
            $template.trigger('disable');

            // if have isMultiple data value or template length large than 1
            this.isMultipleTemplate = $this.data('isMultiple');

            if (this.isMultipleTemplate) {
                this.fieldsetName = [];
                this.template = {};
                this.index = {};

                $template.each((i, ele) => {
                    fieldsetName = $(ele).data('fieldsetName');
                    if (fieldsetName) {
                        this.template[fieldsetName] = $(ele).prop('outerHTML');
                        this.fieldsetName.push(fieldsetName);
                    }
                });
                this.parseMultiple();

            } else {
                this.template = $template.prop('outerHTML');
                this.parse();
            }

            $template.hide();
            this.bind();

        },

        parse: function () {
            let template;

            if (!this.template) {
                return;
            }
            template = this.initTemplate(this.template);
            this.template = template.template;
            this.index = template.index;
        },

        initTemplate: function (template) {
            let i;

            template = template.replace(/(\w+)\="(\S*\[\d+\]\S*)"/g, function (attribute, name, value) {
                value = value.replace(/^(\S*)\[(\d+)\]([^\[\]]*)$/, function (input, prefix, index, suffix) {
                    if (input === value) {
                        if (name === 'name' && !i) {
                            i = index;
                        }

                        return (prefix + '[{{index}}]' + suffix);
                    }
                });

                return (name + '="' + value + '"');
            });

            return {
                'template': template,
                'index': parseFloat(i)
            };
        },

        parseMultiple: function () {
            let template;

            this.fieldsetName.forEach((ele) => {
                template = this.initTemplate(this.template[ele]);
                this.template[ele] = template.template;
                this.index[ele] = template.index;
            });
        },

        bind: function () {
            let options = this.options;

            this.$element.
            on(EVENT_CLICK, options.addClass, $.proxy(this.add, this)).
            on(EVENT_CLICK, options.delClass, $.proxy(this.del, this));

            !this.isInSlideout && $(document).on('submit', 'form', this.removeData.bind(this));
            $(document).on('slideoutBeforeSend.qor.slideout', '.qor-slideout', this.removeData.bind(this));
        },

        unbind: function () {
            this.$element.
            off(EVENT_CLICK, this.add).
            off(EVENT_CLICK, this.del);

            !this.isInSlideout && $(document).off('submit', 'form', this.removeData.bind(this));
            $(document).off('slideoutBeforeSend.qor.slideout', '.qor-slideout', this.removeData.bind(this));
        },

        removeData: function () {
            this.$element.find('.qor-fieldset--new').remove();
        },

        addReplicators: function (data, $button) {
            for (let i = 0, len = data.length; i < len; i++) {
                this.add(null, $button, data[i]);
            }
        },

        add: function (e, $button, data) {
            let options = this.options,
                $target = $button ? $button : $(e.target).closest(options.addClass),
                templateName = $target.data('template'),
                parents = $target.closest(this.$element),
                parentsChildren = parents.children(options.childrenClass),
                $item,
                template,
                $fieldset = $target.closest(options.childrenClass).children('fieldset');

            if (this.isMultipleTemplate) {
                this.parseNestTemplate(templateName);
                template = this.template[templateName];
                $item = $(template.replace(/\{\{index\}\}/g, this.index[templateName]));

                for (var dataKey in $target.data()) {
                    if (dataKey.match(/^sync/)) {
                        var k = dataKey.replace(/^sync/, '');
                        $item.find('input[name*=\'.' + k + '\']').val($target.data(dataKey));
                    }
                }

                if ($fieldset.length) {
                    $fieldset.last().after($item.show());
                } else {
                    parentsChildren.prepend($item.show());
                }
                $item.data('itemIndex', this.index[templateName]);
                this.index[templateName]++;

            } else {
                this.parseNestTemplate();
                $item = $(this.template.replace(/\{\{index\}\}/g, this.index));
                $target.before($item.show());
                $item.data('itemIndex', this.index);
                this.index++;
            }

            $item.trigger('enable').removeClass('qor-fieldset--new');

            $(document).trigger(EVENT_REPLICATOR_ADDED, [$item, data]);
            e && e.stopPropagation();
        },

        del: function (e) {
            let options = this.options,
                $item = $(e.target).closest(options.itemClass),
                $alert;

            $item.children(':visible').addClass('hidden').hide();
            $alert = $(options.alertTemplate.replace('{{name}}', this.parseName($item)));
            $alert.find(options.undoClass).one(EVENT_CLICK, function () {
                $item.find('> .qor-fieldset__alert').remove();
                $item.children('.hidden').removeClass('hidden').show();
            });

            $item.append($alert);
        },

        parseNestTemplate: function (templateType) {
            let $element = this.$element,
                parentForm = $element.parents('.qor-fieldset-container'),
                index;

            if (parentForm.length) {
                index = $element.closest('.qor-fieldset').data('itemIndex');
                if (index) {
                    if (templateType) {
                        this.template[templateType] = this.template[templateType].replace(/\[\d+\]/g, '[' + index + ']');
                    } else {
                        this.template = this.template.replace(/\[\d+\]/g, '[' + index + ']');
                    }

                }

            }
        },

        parseName: function ($item) {
            let name = $item.find('input[name]').attr('name');

            if (name) {
                return name.replace(/[^\[\]]+$/, '');
            }
        },

        destroy: function () {
            this.unbind();
            this.$element.removeData(NAMESPACE);
        }
    };

    QorReplicator.DEFAULTS = {
        itemClass: '.qor-fieldset',
        newClass: '.qor-fieldset--new',
        addClass: '.qor-fieldset__add',
        delClass: '.qor-fieldset__delete',
        childrenClass: '.qor-field__block',
        undoClass: '.qor-fieldset__undo',
        alertTemplate: (
            '<div class="qor-fieldset__alert">' +
            '<input type="hidden" name="{{name}}._destroy" value="1">' +
            '<button class="mdl-button mdl-button--accent mdl-js-button mdl-js-ripple-effect qor-fieldset__undo" type="button">Undo delete</button>' +
            '</div>'
        )
    };

    QorReplicator.plugin = function (options) {
        return this.each(function () {
            let $this = $(this),
                data = $this.data(NAMESPACE),
                fn;

            if (!data) {
                $this.data(NAMESPACE, (data = new QorReplicator(this, options)));
            }

            if (typeof options === 'string' && $.isFunction(fn = data[options])) {
                fn.call(data);
            }
        });
    };

    $(function () {
        let selector = '.qor-fieldset-container';
        let options = {};

        $(document).
        on(EVENT_DISABLE, function (e) {
            QorReplicator.plugin.call($(selector, e.target), 'destroy');
        }).
        on(EVENT_ENABLE, function (e) {
            QorReplicator.plugin.call($(selector, e.target), options);
        }).
        triggerHandler(EVENT_ENABLE);
    });

    return QorReplicator;

});
