$(function() {

    let html = `<div id="dialog" style="display: none;">
                  <div class="mdl-dialog-bg"></div>
                  <div class="mdl-dialog">
                      <div class="mdl-dialog__content">
                        <p><i class="material-icons">warning</i></p>
                        <p class="mdl-dialog__message dialog-message">
                        </p>
                      </div>
                      <div class="mdl-dialog__actions">
                        <button type="button" class="mdl-button mdl-button--raised mdl-button--colored dialog-ok dialog-button" data-type="confirm">
                          ok
                        </button>
                        <button type="button" class="mdl-button dialog-cancel dialog-button" data-type="">
                          cancel
                        </button>
                      </div>
                    </div>
                </div>`,
        $dialog = $(html).appendTo('body');

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

    window.QOR.qorConfirm = function(data, callback) {
        let okBtn = $dialog.find('.dialog-ok'),
            cancelBtn = $dialog.find('.dialog-cancel');

        if (data.confirmOk && data.confirmCancel) {
            okBtn.text(data.confirmOk);
            cancelBtn.text(data.confirmCancel);
        } else {
            okBtn.text('ok');
            cancelBtn.text('cancel');
        }

        $dialog.find('.dialog-message').text(data.confirm);
        $dialog.show();
        window.QOR.qorConfirmCallback = callback;
        return false;
    };
});
