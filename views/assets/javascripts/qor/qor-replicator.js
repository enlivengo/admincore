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

    var NAMESPACE = 'qor.replicator';
    var EVENT_ENABLE = 'enable.' + NAMESPACE;
    var EVENT_DISABLE = 'disable.' + NAMESPACE;
    var EVENT_CLICK = 'click.' + NAMESPACE;
    var EVENT_REPLICATOR_ADDED = 'added.' + NAMESPACE;

    function QorReplicator(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, QorReplicator.DEFAULTS, $.isPlainObject(options) && options);
        this.index = 0;
        this.init();
    }

    QorReplicator.prototype = {
        constructor: QorReplicator,

        init: function() {
            var $this = this.$element;
            var options = this.options;
            var $all = $this.children(options.childrenClass).children(options.itemClass);
            var $template;
            var $multipleTemplates = {};

            this.isMultipleTemplate = $this.data().isMultiple;

            if (!$all.length) {
                return;
            }

            $template = $all.filter(options.newClass);
            if (!$template.length) {
                return;
            }

            // Should destroy all components here
            $template.trigger('disable');

            if (this.isMultipleTemplate) {
                $template.each(function() {
                    $multipleTemplates[$(this).data().fieldsetName] = $(this);
                });
                this.$multipleTemplates = $multipleTemplates;

            } else {
                this.template = $template.prop('outerHTML');
                this.parse();
            }

            $template.hide();
            this.bind();

        },

        parse: function(hasIndex) {
            var i = 0;

            if (!this.template) {
                return;
            }

            this.template = this.template.replace(/(\w+)\="(\S*\[\d+\]\S*)"/g, function(attribute, name, value) {
                value = value.replace(/^(\S*)\[(\d+)\]([^\[\]]*)$/, function(input, prefix, index, suffix) {
                    if (input === value) {
                        if (name === 'name') {
                            i = index;
                        }

                        return (prefix + '[{{index}}]' + suffix);
                    }
                });

                return (name + '="' + value + '"');
            });
            if (hasIndex) {
                return;
            }
            this.index = parseFloat(i);
        },

        bind: function() {
            var options = this.options;

            this.$element.
            on(EVENT_CLICK, options.addClass, $.proxy(this.add, this)).
            on(EVENT_CLICK, options.delClass, $.proxy(this.del, this));

            $(document).on('slideoutBeforeSend.qor.slideout', '.qor-slideout', this.removeData);

        },

        unbind: function() {
            this.$element.
            off(EVENT_CLICK, this.add).
            off(EVENT_CLICK, this.del);

            $(document).off('slideoutBeforeSend.qor.slideout', '.qor-slideout', this.removeData);
        },

        removeData: function() {
            $('.qor-slideout form').find('.qor-fieldset--new').remove();
        },

        add: function(e) {
            var options = this.options,
                $target = $(e.target).closest(this.options.addClass),
                templateName = $target.data().template,
                parents = $target.closest(this.$element),
                parentsChildren = parents.children(options.childrenClass),
                $item,
                $fieldset = $target.closest(options.childrenClass).children('fieldset');

            if (this.isMultipleTemplate) {
                this.template = this.$multipleTemplates[templateName].prop('outerHTML');
                this.parse();
                this.parseNestTemplate();

                $item = $(this.template.replace(/\{\{index\}\}/g, this.index));

                for (var dataKey in $target.data()) {
                    if (dataKey.match(/^sync/)) {
                        var k = dataKey.replace(/^sync/, '');
                        $item.find('input[name*=\'.' + k + '\']').val($target.data(dataKey));
                    }
                }

                if ($fieldset.size()) {
                    $fieldset.last().after($item.show());
                } else {
                    parentsChildren.prepend($item.show());
                }

            } else {
                this.parseNestTemplate();
                $item = $(this.template.replace(/\{\{index\}\}/g, this.index));
                $target.before($item.show());
            }


            $item && $item.trigger('enable').data('index', this.index).removeClass('qor-fieldset--new');
            this.index++;

            $(document).trigger(EVENT_REPLICATOR_ADDED, [$item]);
            e.stopPropagation();
        },

        del: function(e) {
            var options = this.options;
            var $item = $(e.target).closest(options.itemClass);
            var $alert;

            $item.children(':visible').addClass('hidden').hide();
            $alert = $(options.alertTemplate.replace('{{name}}', this.parseName($item)));
            $alert.find(options.undoClass).one(EVENT_CLICK, function() {
                $item.find('> .qor-fieldset__alert').remove();
                $item.children('.hidden').removeClass('hidden').show();

            });

            $item.append($alert);
        },

        parseNestTemplate: function() {
            var $element = this.$element,
                parentForm = $element.parents('.qor-fieldset-container'),
                index;

            if (parentForm.size()) {
                index = $element.closest('.qor-fieldset').data().index;
                if (index) {
                    this.template = this.template.replace(/\[\d+\]/g, '[' + index + ']');
                }

            }
        },

        parseName: function($item) {
            var name = $item.find('input[name]').attr('name');

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
        itemClass: false,
        newClass: false,
        addClass: false,
        delClass: false,
        childrenClass: false,
        alertTemplate: ''
    };

    QorReplicator.plugin = function(options) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data(NAMESPACE);
            var fn;

            if (!data) {
                $this.data(NAMESPACE, (data = new QorReplicator(this, options)));
            }

            if (typeof options === 'string' && $.isFunction(fn = data[options])) {
                fn.call(data);
            }
        });
    };

    $(function() {
        var selector = '.qor-fieldset-container';
        var options = {
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

        $(document).
        on(EVENT_DISABLE, function(e) {
            QorReplicator.plugin.call($(selector, e.target), 'destroy');
        }).
        on(EVENT_ENABLE, function(e) {
            QorReplicator.plugin.call($(selector, e.target), options);
        }).
        triggerHandler(EVENT_ENABLE);
    });

    return QorReplicator;

});