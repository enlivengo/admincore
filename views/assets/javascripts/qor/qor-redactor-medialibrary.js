// Add media library button for refactor editor
// By Jason weng @theplant

$.Redactor.prototype.medialibrary = function() {
    return {
        init: function () {
            var button = this.button.add('medialibrary', 'MediaLibrary');
            this.button.addCallback(button, this.medialibrary.medialibrary);
            this.events.imageEditing = true;
        },
        medialibrary: function(buttonName) {
            alert(buttonName);
        }
    };
};