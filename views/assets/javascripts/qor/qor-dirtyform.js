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

  var hasChanged = function (ele, options) {
    var hasChangedObj = false;

    if (this instanceof jQuery) {
        options = ele;
        ele = this;

    } else if (!(ele instanceof jQuery)) {
        ele = $(ele);
    }

    ele.each(function (item, element) {
        var $ele = $(element);

        if ($ele.is('form')) {
            hasChangedObj = hasChanged($ele.find('input:not([type="hidden"]):not(".search-field input"):not(".chosen-search input"), textarea, select'), options);
            if (hasChangedObj) {
                return false;
            }
        } else if ($ele.is(':checkbox') || $ele.is(':radio')) {

            if (element.checked != element.defaultChecked) {
                hasChangedObj = true;
                return false;
            }

        } else if ($ele.is('input') || $ele.is('textarea')) {

            if (element.value != element.defaultValue) {
                hasChangedObj = true;
                return false;
            }
        } else if ($ele.is('select')) {

            var option;
            var defaultSelectedIndex = 0;
            var numberOfOptions = element.options.length;

            for (var i = 0; i < numberOfOptions; i++) {
                option = element.options[ i ];
                hasChangedObj = (hasChangedObj || (option.selected != option.defaultSelected));
                if (option.defaultSelected) {
                    defaultSelectedIndex = i;
                }
            }

            if (hasChangedObj && !element.multiple) {
                hasChangedObj = (defaultSelectedIndex != element.selectedIndex);
            }

            if (hasChangedObj) {
                return false;
            }
        }

    });

    return hasChangedObj;

    };

    $.fn.extend({
        hasChanged : hasChanged
    });

    $(function () {
        $(document).on('change', 'form:not(".qor-search-container")', function () {

            if ($(this).hasChanged()){
                window.onbeforeunload = function () {
                    return "You have unsaved changes on this page. If you leave this page, you will lose all unsaved changes.";
                };
            } else {
                window.onbeforeunload = null;
            }
        });
    });

});
