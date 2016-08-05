$(function () {

    'use strict';

    var $body = $('body'),
        Slideout,
        BottomSheets,

        CLASS_IS_SELECTED = 'is-selected',

        hasSlideoutTheme = $body.hasClass('qor-theme-slideout'),
        isSlideoutOpened = function(){
            return $body.hasClass('qor-slideout-open');
        };


    $body.qorBottomSheets();
    if (hasSlideoutTheme) {
        $body.qorSlideout();
    }

    Slideout = $body.data('qor.slideout');
    BottomSheets = $body.data('qor.bottomsheets');

    function clearSelectedCss(){
        $('[data-url]').removeClass(CLASS_IS_SELECTED);
    }

    function toggleSelectedCss(ele){
        $('[data-url]').removeClass(CLASS_IS_SELECTED);
        ele.addClass(CLASS_IS_SELECTED);
    }

    $(document).on('click.qor.openUrl', '[data-url]', function () {
        var $this = $(this),
            isNewBottom = $this.hasClass('qor-button--new'),
            isEditBottom = $this.hasClass('qor-button--edit'),
            isInTable = $this.closest('.qor-js-table').size(),
            data = $this.data();


        // Will open in slideout: table items, new buttom, edit buttom
        // Will open in bottomsheets: slideout is opened
        if (isInTable || isNewBottom || isEditBottom || data.openType == 'slideout') {
            if ($this.hasClass(CLASS_IS_SELECTED)) {
                Slideout.hide();
                clearSelectedCss();
            } else {
                Slideout.open(data);
                toggleSelectedCss($this);
            }


        } else if (isSlideoutOpened() || data.openType == 'bottomsheets') {
            BottomSheets.open(data);
        }

        return false;

    });

});
