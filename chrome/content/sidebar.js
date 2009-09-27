// jQuery File Tree Plugin
//
// Version 1.01
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
// 24 March 2008
//
// TERMS OF USE
//
// This plugin is dual-licensed under the GNU General Public License and the MIT License and
// is copyright 2008 A Beautiful Site, LLC.
//

var bucket = 'pubpubpub';
function callback(key) {
  openUILinkIn(S3Ajax.httpFor(bucket, key), 'current');
}

var xslt = new XSLTProcessor();
var req = new XMLHttpRequest();
req.open("GET", "chrome://s3/content/sidebar.xsl", false);
req.send(null);
xslt.importStylesheet(req.responseXML);

function bindTree(t) {
  t.find('li a').bind('click',
    function() {
      var p = $(this).parent();
      if (p.hasClass('directory') ) {
        if (p.hasClass('expanded') ) {
          p.removeClass('expanded');
          p.find('ul').remove();
        } else {
          showTree( p, $(this).attr('rel') );
          p.addClass('expanded');
        }
      } else {
        callback($(this).attr('rel'));
      }
      return false;
    });
}

function showTree(li, directory, first) {
  li.addClass('wait');
  S3Ajax.listKeys(bucket, {prefix: directory, delimiter: '/'},
    function(req) {
      if (first) {
        li.html('');
      }
      var fragment = xslt.transformToFragment(req.responseXML, document);
      li.append(fragment).removeClass('wait');
      bindTree(li);
    }, function(req) {
      alert('error');
    });
}

showTree($('#files'), '', true);
