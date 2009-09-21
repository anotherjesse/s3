Components.utils.import("resource://s3/auth.js");

var Cc = Components.classes;
var Ci = Components.interfaces;

const mimeSVC = Cc['@mozilla.org/mime;1']
                  .getService(Ci.nsIMIMEService);

const gClipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"]
                           .getService(Ci.nsIClipboardHelper);

var $ = function(x) { return document.getElementById(x); };

var bucket, prefix;
var xslt = new XSLTProcessor();

function deleteKey(node) {
  var key = node.getAttribute('href').substring(1);
  if (confirm('Are you sure you want to delete:\n' + key)) {
    fm.delete( escape(key), node );
  }
}

function saveAs() {
  alert('FIXME: implement me');
}

function copyHTTP() {
  var key = document.popupNode.getAttribute('href').substring(1);
  gClipboardHelper.copyString(S3Ajax.httpFor(bucket, key));
}

function copySIGNED() {
  var key = document.popupNode.getAttribute('href').substring(1);
  key = encodeURIComponent(key);
  gClipboardHelper.copyString(S3Ajax.signedURL(bucket, key));
}

function showDelete() {
  deleteKey(document.popupNode);
}

var fm = {
  init: function() {


    var creds = s3_auth.get();
    if (creds) {
      S3Ajax.KEY_ID = creds.key;
      S3Ajax.SECRET_KEY = creds.secret;
    }

    var req = new XMLHttpRequest();
    req.open("GET", "chrome://s3/content/keys.xsl", false);
    req.send(null);

    xslt.importStylesheet(req.responseXML);

    bucket = window.top.location.host;
    prefix = unescape(window.top.location.pathname.slice(1));

    var bucketLabel = document.createElement('label');
    bucketLabel.setAttribute('value', window.location.host);
    bucketLabel.setAttribute('class', 'text-link s3');
    bucketLabel.setAttribute('href', '/');
    $('location').appendChild(bucketLabel);

    if (prefix != '') {
      S3Ajax.head(bucket, escape(prefix), function() { fm.display(); },
                                  function() { fm.listKeys(); })
    }
    else {
      fm.listKeys();
    }
  },

  display: function() {
    var iframe = document.createElement('iframe');
    iframe.setAttribute("src", 'http://s3.amazonaws.com/' + bucket + '/' + prefix);
    iframe.setAttribute("flex", '1');
    // iframe.setAttribute("src", S3Ajax.signedURL(bucket, prefix));
    $('active').appendChild(iframe);
  },

  listKeys: function() {
    $('active').className = 'busy';
    S3Ajax.listKeys(bucket,
      {prefix: prefix, delimiter: '/'},
      function (req) {
        var keylist = $('keys');
        if (keylist) {
          keylist.parentNode.removeChild(keylist);
        }
        var fragment = xslt.transformToFragment(req.responseXML, document);
        $('active').appendChild(fragment);

        $('active').className = null;
      }, function(req) {
        $('active').className = null;
        alert(req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent);
      });
  },

  delete: function(key, element) {
    S3Ajax.deleteKey( bucket, key, function() {
      element.parentNode.removeChild(element);
    }, function(req) {
      alert(req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent);
    });
  },

  upload: function() {
    var picker = Cc["@mozilla.org/filepicker;1"]
      .createInstance(Ci.nsIFilePicker);

    picker.init(window, 'Choose file(s) to upload to S3', Ci.nsIFilePicker.modeOpenMultiple);

    if (picker.show() == Ci.nsIFilePicker.returnOK) {
      var enumerator = picker.files;
      while (enumerator.hasMoreElements()) {
        var file = enumerator.getNext();
        file.QueryInterface(Ci.nsIFile);
        Uploader.add(file);
      }
    }
  }
};

window.onload = fm.init;
