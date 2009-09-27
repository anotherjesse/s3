// jQuery File Tree Plugin
//
// Version 1.01
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
// 24 March 2008
//
// Visit http://abeautifulsite.net/notebook.php?article=58 for more information
//
// Usage: $('.fileTreeDemo').fileTree( options, callback )
//
// Options:  root           - root folder to display; default = /
//           folderEvent    - event to trigger expand/collapse; default = click
//           expandSpeed    - default = 500 (ms); use -1 for no animation
//           collapseSpeed  - default = 500 (ms); use -1 for no animation
//           expandEasing   - easing function to use on expand (optional)
//           collapseEasing - easing function to use on collapse (optional)
//           multiFolder    - whether or not to limit the browser to one subfolder at a time
//           loadMessage    - Message to display while initial tree loads (can be HTML)
//
// History:
//
// 1.01 - updated to work with foreign characters in directory/file names (12 April 2008)
// 1.00 - released (24 March 2008)
//
// TERMS OF USE
//
// This plugin is dual-licensed under the GNU General Public License and the MIT License and
// is copyright 2008 A Beautiful Site, LLC.
//

// Updates by jesse - hook to S3, use XSLT to build HTML

if (jQuery) (function($){

  $.extend($.fn, {
    fileTree: function(o, h) {

      var xslt = new XSLTProcessor();
      var req = new XMLHttpRequest();
      req.open("GET", "chrome://s3/content/sidebar.xsl", false);
      req.send(null);
      xslt.importStylesheet(req.responseXML);

      // Defaults
      if (!o) o = {};
      if (o.root == undefined) o.root = '';
      if (o.multiFolder == undefined) o.multiFolder = true;
      if (o.loadMessage == undefined) o.loadMessage = 'Loading...';

      $(this).each( function() {
        function showTree(c, t) {
          c.addClass('wait');
          $(".jqueryFileTree.start").remove();
          S3Ajax.listKeys(o.bucket, {prefix: t, delimiter: '/'},
            function(req) {
              c.find('.start').html('');
              var fragment = xslt.transformToFragment(req.responseXML, document);
              c.removeClass('wait').append(fragment);
              c.find('UL:hidden').show();
              bindTree(c);
            }, function(req) {
              alert('error');
            });
        }

        function bindTree(t) {
          return
          t.find('li a').bind('click', function() {
            if( $(this).parent().hasClass('directory') ) {
              if( $(this).parent().hasClass('collapsed') ) {
                // Expand
                $(this).parent().parent().find('li.directory').removeClass('expanded').addClass('collapsed');
                showTree( $(this).parent(), $(this).attr('rel') );
                $(this).parent().removeClass('collapsed').addClass('expanded');
              } else {
                // Collapse
                $(this).parent().find('ul').hide();
                $(this).parent().removeClass('expanded').addClass('collapsed');
              }
            } else {
              h($(this).attr('rel'));
            }
            return false;
          });
        }

        // Loading message
        $(this).html('<ul class="jqueryFileTree start"><li class="wait">' + o.loadMessage + '<li></ul>');
        // Get the initial file list
        showTree( $(this), o.root );
      });
    }
  });

})(jQuery);
