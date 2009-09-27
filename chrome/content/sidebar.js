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

try {
  var creds = s3_auth.get();
  S3Ajax.KEY_ID = creds.key;
  S3Ajax.SECRET_KEY = creds.secret;
}
catch(e) {}

S3Ajax.listBuckets(
  function(xml, objs) {
    var buckets = xml.responseXML.getElementsByTagName('Bucket');
    for (var i=0; i<buckets.length; i++) {
      var name = buckets[i].getElementsByTagName('Name')[0].textContent;
      var option = document.createElement('option');
      option.value = name;
      option.innerHTML = name;
      $('#buckets').append(option);
    }
  });

function list(newBucket) {
  bucket = newBucket;
  $('#files').html('<ul id="start" class="jqueryFileTree"><li class="wait">Loading...</li></ul></div>');
  showTree($('#files'), '', true);
}

var xslt = new XSLTProcessor();
var req = new XMLHttpRequest();
req.open("GET", "chrome://s3/content/sidebar.xsl", false);
req.send(null);
xslt.importStylesheet(req.responseXML);

function clicked(event) {
  if (event.target.nodeName != 'span') {
    return;
  }
  var element = $(event.target);
  var p = element.parent();
  if (p.hasClass('directory') ) {
    if (p.hasClass('expanded') ) {
      p.removeClass('expanded');
      p.find('ul').remove();
    } else {
      showTree( p, element.attr('rel') );
      p.addClass('expanded');
    }
  } else {
    openUILinkIn(S3Ajax.httpFor(bucket, element.attr('rel')),
                 whereToOpenLink(event));
  }

  return true;
}

document.addEventListener('click', clicked, false);

function showTree(li, directory, first) {
  li.addClass('wait');
  S3Ajax.listKeys(bucket, {prefix: directory, delimiter: '/'},
    function(req) {
      if (first) { li.html(''); }
      var fragment = xslt.transformToFragment(req.responseXML, document);
      li.append(fragment).removeClass('wait');
    }, function(req) {
      alert('error');
    });
}


