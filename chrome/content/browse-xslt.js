Components.utils.import("resource://s3/auth.js");

var Cc = Components.classes;
var Ci = Components.interfaces;

const mimeSVC = Cc['@mozilla.org/mime;1']
                  .getService(Ci.nsIMIMEService);

var $ = function(x) { return document.getElementById(x) }

var bucket, prefix;
var xslt = new XSLTProcessor();

function deleteKey(node) {
  var key = node.getAttribute('key');
  if (confirm('Are you sure you want to delete:\n' + key)) {
    fm.delete( escape(key), node );
  }
}

var fm = {
  init: function() {

    var creds = s3_auth.get();
    if (creds) {
      S3Ajax.KEY_ID = creds.key;
      S3Ajax.SECRET_KEY = creds.secret;
//      window.removeAttribute("unauth");
    }
    else {
      // if the keys aren't set proceed without them
      // S3Ajax will do anonymous calls
//      document.body.setAttribute("unauth", true);
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

    fm.listKeys();
  },

  listKeys: function() {
    $('active').className = 'busy';
    S3Ajax.listKeys(bucket,
      {prefix: prefix, delimiter: '/'},
      function (req) {
        var keylist = $('keylist');
        if (keylist) {
          keylist.parentNode.removeChild(keylist);
        }
        var fragment = xslt.transformToFragment(req.responseXML, document);
        $('active').appendChild(fragment);

        $('active').className = null;
      }, function(req) {
        $('active').removeClass('busy');
        humanMsg.displayMsg('Listing in <strong>' + bucket + '</strong>: ' +
          req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent)
      });
  },

  delete: function(key, element) {
    S3Ajax.deleteKey( bucket, key, function() {
      $(element).remove();
    }, function(req) {
      humanMsg.displayMsg('Deletion in <strong>' + bucket + '</strong>: ' +
        req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent)
    });
  },

  upload: function() {
    var picker = Cc["@mozilla.org/filepicker;1"]
      .createInstance(Ci.nsIFilePicker);

    picker.init(window, 'Choose file(s) to upload to S3', Ci.nsIFilePicker.modeOpenMultiple);

    if (picker.show() == Ci.nsIFilePicker.returnOK) {
      var enum = picker.files;
      while (enum.hasMoreElements()) {
        var file = enum.getNext();
        file.QueryInterface(Ci.nsIFile);
        Uploader.add(file);
      }
    }
  }
}

window.onload = fm.init
