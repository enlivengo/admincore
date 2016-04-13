$(function () {

  'use strict';

  $(document).on('click.qor.alert', '[data-dismiss="alert"]', function () {
    $(this).closest('.qor-alert').remove();
  });

  setTimeout(function () {
    $('.qor-alert[data-dismissible="true"]').remove();
  }, 5000);

  $(window).on("beforeunload", function(t) {
    return "You have unsaved changes on this page. If you leave this page, you will lose all unsaved changes."
  })

});
