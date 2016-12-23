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
    var IS_TEMPLATE = 'is-template';

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
            var $all = $this.find(options.itemClass);
            var $template;
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

            this.$template = $template;
            var $filteredTemplateHtml = $template.filter($this.children(options.childrenClass).children(options.newClass));

            if (this.isMultipleTemplate) {
                this.$template = $filteredTemplateHtml;
                if ($this.children(options.childrenClass).children(options.itemClass).size()) {
                    this.template = $filteredTemplateHtml.prop('outerHTML');
                    this.parse();
                }
            } else {
                this.template = $filteredTemplateHtml.prop('outerHTML');
                $template.data(IS_TEMPLATE, true).hide();
                this.parse();
            }

            // remove hidden empty template, make sure no empty data submit to DB
            $filteredTemplateHtml.remove();

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
        },

        unbind: function() {
            this.$element.
            off(EVENT_CLICK, this.add).
            off(EVENT_CLICK, this.del);
        },

        add: function(e) {
            var options = this.options,
                $target = $(e.target).closest(options.addClass),
                templateName = $target.data().template,
                parents = $target.closest(options.selector),
                parentsChildren = parents.children(options.childrenClass),
                isMultipleTemplate = parents.data().isMultiple,
                $item = this.$template,
                $muptipleTargetTempalte,
                $childrenFieldset = $target.closest(options.childrenClass).children('fieldset'),
                multipleTemplates = {};

            if (isMultipleTemplate) { // For multiple fieldset template
                this.$template.each(function() {
                    multipleTemplates[$(this).data().fieldsetName] = $(this);
                });

                $muptipleTargetTempalte = multipleTemplates[templateName];
                this.template = $muptipleTargetTempalte.prop('outerHTML');
                this.parse(true);
                $item = $(this.template.replace(/\{\{index\}\}/g, ++this.index));

                for (var dataKey in $target.data()) {
                    if (dataKey.match(/^sync/)) {
                        var k = dataKey.replace(/^sync/, '');
                        $item.find('input[name*=\'.' + k + '\']').val($target.data(dataKey));
                    }
                }

                if ($childrenFieldset.size()) {
                    $childrenFieldset.last().after($item.show());
                } else {
                    // If user delete all template
                    parentsChildren.prepend($item.show());
                }
            } else { //For individual fieldset tempalte 
                $item = $(this.template.replace(/\{\{index\}\}/g, this.index));
                $target.before($item.show());
                this.index++;
            }

            $item && $item.trigger('enable');
            $(document).trigger(EVENT_REPLICATOR_ADDED, [$item]);
            return false;
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
            selector: '.qor-fieldset-container',
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