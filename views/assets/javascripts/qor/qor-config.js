// init for slideout after show event
$.fn.qorSliderAfterShow = $.fn.qorSliderAfterShow || {};
window.QOR = {};

// change Mustache tags from {{}} to [[]]
window.Mustache && (window.Mustache.tags = ['[[', ']]']);

// clear close alert after ajax complete
$(document).ajaxComplete(function(event, xhr, settings) {
    if (settings.type == "POST" || settings.type == "PUT") {
        if ($.fn.qorSlideoutBeforeHide) {
            $.fn.qorSlideoutBeforeHide = null;
            window.onbeforeunload = null;
        }
    }
});


// select2 ajax common options
// $.fn.select2 = $.fn.select2 || function(){};
$.fn.select2.ajaxCommonOptions = {
    dataType: 'json',
    cache: true,
    delay: 250,
    data: function(params) {
        return {
            keyword: params.term, // search term
            page: params.page,
            per_page: 20
        };
    },
    processResults: function(data, params) {
        // parse the results into the format expected by Select2
        // since we are using custom formatting functions we do not need to
        // alter the remote JSON data, except to indicate that infinite
        // scrolling can be used
        params.page = params.page || 1;

        var processedData = $.map(data, function(obj) {
            obj.id = obj.Id || obj.ID;
            return obj;
        });

        return {
            results: processedData,
            pagination: {
                more: processedData.length >= 20
            }
        };
    }
};

// select2 ajax common options
// format ajax template data
$.fn.select2.ajaxFormatResult = function(data, tmpl) {
    var result = "";
    if (tmpl.length > 0) {
        result = window.Mustache.render(tmpl.html().replace(/{{(.*?)}}/g, '[[$1]]'), data);
    } else {
        result = data.text || data.Name || data.Title || data.Code || data[Object.keys(data)[0]];
    }

    // if is HTML
    if (/<(.*)(\/>|<\/.+>)/.test(result)) {
        return $(result);
    }
    return result;
};

window.QOR.qorConfirm = function(message, resultCallback) {
    let dialogHtml = `<div id="dialog"><div class="mdl-dialog-bg"></div><div class="mdl-dialog">
                        <div class="mdl-dialog__content">
                          <p><i class="material-icons">warning</i></p>
                          <p class="mdl-dialog__message">
                            ${message}
                          </p>
                        </div>
                        <div class="mdl-dialog__actions">
                          <button type="button" class="mdl-button mdl-button--raised mdl-button--colored dialog-button" data-type="confirm">Confirm</button>
                          <button type="button" class="mdl-button dialog-button" data-type="">Cancel</button>
                        </div>
                      </div></div>`,
        $dialog = $(dialogHtml);

    $('#dialog').remove();
    $dialog.appendTo($('body'));

    $(document)
        .off('click', '.dialog-button')
        .on('click', '.dialog-button', function() {
            let value = $(this).data('type');
            $.isFunction(resultCallback) && resultCallback(value);
            $('#dialog').remove();
            return false;
        });

    return false;

};
