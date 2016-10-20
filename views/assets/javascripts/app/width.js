$(function () {

  'use strict';

  $('.qor-js-table .qor-table__content').each(function () {
    var $this = $(this);
    var width = $this.width();
    var parentWidth = $this.parent().width();

    if (width >= 180 && width < parentWidth) {
      $this.css('max-width', parentWidth);
    }
  });

  // $('.qor-table--medialibrary [data-heading="Image"] a').each(function () {
  //   var $this = $(this),
  //       url = $this.prop('href');
  //   if (url.match(/\.mp4$/)) {
  //       $this.html('<video width=200 height=200><source src="' + url + '" type="video/mp4"></video>');
  //   }

  // });

  // $('.qor-table--medialibrary [data-heading="Image"] img').each(function () {
  //   var $this = $(this),
  //       url = $this.prop('src');

  //   if (url == 'http://localhost:7000/system/product_images/13/image.@qor_preview.jpg') {
  //       $this.parent().html('<iframe width="200" height="200" src="https://www.youtube.com/embed/3ya0fZcNA9E?showinfo=0&controls=0&rel=0&fs=0&modestbranding=1&disablekb=1" frameborder="0" allowfullscreen></iframe>');
  //   }
  // });


});
