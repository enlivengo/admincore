$(function() {

    let $dialog = $('#dialog');

    $(document).on('keyup.qor.confirm', function(e) {
        if (e.which === 27) {
            if ($dialog.is(':visible')) {
                setTimeout(function() {
                    $dialog.hide();
                }, 100);
            }
        }
    }).on('click.qor.confirm', '.dialog-button', function() {
        let value = $(this).data('type'),
            callback = window.QOR.qorConfirmCallback;

        $.isFunction(callback) && callback(value);
        $dialog.hide();
        window.QOR.qorConfirmCallback = undefined;
        return false;
    });

    window.QOR.qorConfirm = function(message, callback) {
        $dialog.show().find('.dialog-message').text(message);
        window.QOR.qorConfirmCallback = callback;
        return false;
    };
});
