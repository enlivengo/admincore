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

    let _ = window._,
        NAMESPACE = 'qor.replicator',
        EVENT_ENABLE = 'enable.' + NAMESPACE,
        EVENT_DISABLE = 'disable.' + NAMESPACE,
        EVENT_SUBMIT = 'submit.' + NAMESPACE,
        EVENT_CLICK = 'click.' + NAMESPACE,
        EVENT_SLIDEOUTBEFORESEND = 'slideoutBeforeSend.qor.slideout.replicator',
        EVENT_SELECTCOREBEFORESEND = 'selectcoreBeforeSend.qor.selectcore.replicator bottomsheetBeforeSend.qor.bottomsheets.replicator',
        EVENT_REPLICATOR_ADDED = 'added.' + NAMESPACE,
        EVENT_REPLICATORS_ADDED = 'addedMultiple.' + NAMESPACE,
        EVENT_REPLICATORS_ADDED_DONE = 'addedMultipleDone.' + NAMESPACE,
        CLASS_CONTAINER = '.qor-fieldset-container';

    function QorReplicator(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, QorReplicator.DEFAULTS, $.isPlainObject(options) && options);
        this.index = 0;
        this.init();
    }

    QorReplicator.prototype = {
        constructor: QorReplicator,

        init: function() {
            let $element = this.$element,
                $template = $element.find('> .qor-field__block > .qor-fieldset--new'),
                fieldsetName;

            this.isInSlideout = $element.closest('.qor-slideout').length;
            this.hasInlineReplicator = $element.find(CLASS_CONTAINER).length;
            this.maxitems = $element.data('maxItem');
            this.isSortable = $element.hasClass('qor-fieldset-sortable');

            if (!$template.length || $element.closest('.qor-fieldset--new').length) {
                return;
            }

            // Should destroy all components here
            $template.trigger('disable');

            // if have isMultiple data value or template length large than 1
            this.isMultipleTemplate = $element.data('isMultiple');

            if (this.isMultipleTemplate) {
                this.fieldsetName = [];
                this.template = {};
                this.index = [];

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
            this.resetButton();
            this.resetPositionButton();
        },

        resetPositionButton: function() {
            let sortableButton = this.$element.find('> .qor-sortable__button');

            if (this.isSortable) {
                if (this.getCurrentItems() > 1) {
                    sortableButton.show();
                } else {
                    sortableButton.hide();
                }
            }
        },

        getCurrentItems: function() {
            return this.$element.find('> .qor-field__block > .qor-fieldset').not('.qor-fieldset--new,.is-deleted').length;
        },

        toggleButton: function(isHide) {
            let $button = this.$element.find(this.options.addClass);

            if (isHide) {
                $button.hide();
            } else {
                $button.show();
            }
        },

        resetButton: function() {
            if (this.maxitems <= this.getCurrentItems()) {
                this.toggleButton(true);
            } else {
                this.toggleButton();
            }
        },

        parse: function() {
            let template;

            if (!this.template) {
                return;
            }
            template = this.initTemplate(this.template);
            this.template = template.template;
            this.index = template.index;
        },

        parseMultiple: function() {
            let template,
                name,
                fieldsetName = this.fieldsetName;

            for (let i = 0, len = fieldsetName.length; i < len; i++) {
                name = fieldsetName[i];
                template = this.initTemplate(this.template[name]);
                this.template[name] = template.template;
                this.index.push(template.index);
            }

            this.multipleIndex = _.max(this.index);
        },

        initTemplate: function(template) {
            let i,
                hasInlineReplicator = this.hasInlineReplicator;

            template = template.replace(/(\w+)\="(\S*\[\d+\]\S*)"/g, function(attribute, name, value) {
                value = value.replace(/^(\S*)\[(\d+)\]([^\[\]]*)$/, function(input, prefix, index, suffix) {
                    if (input === value) {
                        if (name === 'name' && !i) {
                            i = index;
                        }

                        if (hasInlineReplicator && /\[\d+\]/.test(prefix)) {
                            return input.replace(/\[\d+\]/, '[{{index}}]');
                        } else {
                            return prefix + '[{{index}}]' + suffix;
                        }
                    }
                });

                return name + '="' + value + '"';
            });

            return {
                template: template,
                index: parseFloat(i)
            };
        },

        bind: function() {
            let options = this.options;

            this.$element
                .on(EVENT_CLICK, options.addClass, $.proxy(this.add, this))
                .on(EVENT_CLICK, options.delClass, $.proxy(this.del, this));

            !this.isInSlideout && $(document).on(EVENT_SUBMIT, 'form', this.removeData.bind(this));
            $(document)
                .on(EVENT_SLIDEOUTBEFORESEND, '.qor-slideout', this.removeData.bind(this))
                .on(EVENT_SELECTCOREBEFORESEND, this.removeData.bind(this));
        },

        unbind: function() {
            this.$element.off(EVENT_CLICK);

            !this.isInSlideout && $(document).off(EVENT_SUBMIT, 'form');
            $(document).off(EVENT_SLIDEOUTBEFORESEND, '.qor-slideout').off(EVENT_SELECTCOREBEFORESEND);
        },

        removeData: function() {
            this.$element.find('.qor-fieldset--new').remove();
        },

        add: function(e, data, isAutomatically) {
            var options = this.options,
                $item,
                template;

            if (this.maxitems <= this.getCurrentItems()) {
                return false;
            }

            if (!isAutomatically) {
                var $target = $(e.target).closest(options.addClass),
                    templateName = $target.data('template'),
                    parents = $target.closest(this.$element),
                    parentsChildren = parents.children(options.childrenClass),
                    $fieldset = $target.closest(options.childrenClass).children('fieldset');
            }

            if (this.isMultipleTemplate) {
                this.parseNestTemplate(templateName);
                template = this.template[templateName];

                $item = $(template.replace(/\{\{index\}\}/g, this.multipleIndex));

                for (var dataKey in $target.data()) {
                    if (dataKey.match(/^sync/)) {
                        var k = dataKey.replace(/^sync/, '');
                        $item.find("input[name*='." + k + "']").val($target.data(dataKey));
                    }
                }

                if ($fieldset.length) {
                    $fieldset.last().after($item.show());
                } else {
                    parentsChildren.prepend($item.show());
                }
                $item.data('itemIndex', this.multipleIndex).removeClass('qor-fieldset--new');
                this.multipleIndex++;
            } else {
                if (!isAutomatically) {
                    $item = this.addSingle();
                    $target.before($item.show());
                    this.index++;
                } else {
                    if (data && data.length) {
                        this.addMultiple(data);
                        $(document).trigger(EVENT_REPLICATORS_ADDED_DONE);
                    }
                }
            }

            if (!isAutomatically) {
                $item.trigger('enable');
                $(document).trigger(EVENT_REPLICATOR_ADDED, [$item]);
                e.stopPropagation();
            }

            this.resetPositionButton();
            this.resetButton();
        },

        addMultiple: function(data) {
            let $item;

            for (let i = 0, len = data.length; i < len; i++) {
                $item = this.addSingle();
                this.index++;
                $(document).trigger(EVENT_REPLICATORS_ADDED, [$item, data[i]]);
            }
        },

        addSingle: function() {
            let $item,
                $element = this.$element;

            $item = $(this.template.replace(/\{\{index\}\}/g, this.index));
            // add order property for sortable fieldset
            if (this.isSortable) {
                let order = $element.find('> .qor-field__block > .qor-sortable__item').not('.qor-fieldset--new').length;
                $item.attr('order-index', order).css('order', order);
            }

            $item.data('itemIndex', this.index).removeClass('qor-fieldset--new');

            return $item;
        },

        del: function(e) {
            let options = this.options,
                $item = $(e.target).closest(options.itemClass),
                $alert;

            $item.addClass('is-deleted').children(':visible').addClass('hidden').hide();
            $alert = $(options.alertTemplate.replace('{{name}}', this.parseName($item)));
            $alert.find(options.undoClass).one(
                EVENT_CLICK,
                function() {
                    if (this.maxitems <= this.getCurrentItems()) {
                        window.QOR.qorConfirm(this.$element.data('maxItemHint'));
                        return false;
                    }

                    $item.find('> .qor-fieldset__alert').remove();
                    $item.removeClass('is-deleted').children('.hidden').removeClass('hidden').show();
                    this.resetButton();
                    this.resetPositionButton();
                }.bind(this)
            );
            this.resetButton();
            this.resetPositionButton();
            $item.append($alert);
        },

        parseNestTemplate: function(templateType) {
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

        parseName: function($item) {
            let name = $item.find('input[name]').attr('name') || $item.find('textarea[name]').attr('name');

            if (name) {
                return name.replace(/[^\[\]]+$/, '');
            }
        },

        destroy: function() {
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
        alertTemplate:
            '<div class="qor-fieldset__alert">' +
            '<input type="hidden" name="{{name}}._destroy" value="1">' +
            '<button class="mdl-button mdl-button--accent mdl-js-button mdl-js-ripple-effect qor-fieldset__undo" type="button">Undo delete</button>' +
            '</div>'
    };

    QorReplicator.plugin = function(options) {
        return this.each(function() {
            let $this = $(this),
                data = $this.data(NAMESPACE),
                fn;

            if (!data) {
                $this.data(NAMESPACE, (data = new QorReplicator(this, options)));
            }

            if (typeof options === 'string' && $.isFunction((fn = data[options]))) {
                fn.call(data);
            }
        });
    };

    $(function() {
        let selector = CLASS_CONTAINER;
        let options = {};

        $(document)
            .on(EVENT_DISABLE, function(e) {
                QorReplicator.plugin.call($(selector, e.target), 'destroy');
            })
            .on(EVENT_ENABLE, function(e) {
                QorReplicator.plugin.call($(selector, e.target), options);
            })
            .triggerHandler(EVENT_ENABLE);
    });

    return QorReplicator;
});
