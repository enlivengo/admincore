$(function() {
    $(document).on('keyup.qor.confirm', function(e) {
        if (e.which === 27) {
            if ($('#dialog').length) {
                setTimeout(function() {
                    $('#dialog').remove();
                }, 100);
            }
        }
    }).on('click.qor.confirm', '.dialog-button', function() {
        let value = $(this).data('type'),
            callback = window.QOR.qorConfirmCallback;

        $.isFunction(callback) && callback(value);
        $('#dialog').remove();
        window.QOR.qorConfirmCallback = undefined;
        return false;
    });

    window.QOR.qorConfirmHtml = `<div id="dialog"><div class="mdl-dialog-bg"></div><div class="mdl-dialog">
                      <div class="mdl-dialog__content">
                        <p><i class="material-icons">warning</i></p>
                        <p class="mdl-dialog__message">
                          [[message]]
                        </p>
                      </div>
                      <div class="mdl-dialog__actions">
                        <button type="button" class="mdl-button mdl-button--raised mdl-button--colored dialog-button" data-type="confirm">Confirm</button>
                        <button type="button" class="mdl-button dialog-button" data-type="">Cancel</button>
                      </div>
                    </div></div>`;

    window.QOR.qorConfirm = function(message, callback) {
        let $dialog = $(window.Mustache.render(window.QOR.qorConfirmHtml, {
            'message': message
        }));

        $('#dialog').remove();
        $dialog.appendTo($('body'));
        window.QOR.qorConfirmCallback = callback;
        return false;
    };
});
