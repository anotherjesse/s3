Components.utils.import("resource://s3/auth.js");

var creds = s3_auth.get();
S3Ajax.KEY_ID = creds.key;
S3Ajax.SECRET_KEY = creds.secret;

function createBucket() {
  var bucket = document.getElementById('bucket-name').value;
  var acl = document.getElementById('acl').selectedItem.label;
  var location = document.getElementById('location').selectedItem.label;

  function success(req) {
    window.arguments[0].success = true;
    window.close();
  }

  function error(req) {
    var msg = req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent.split('.')[0];
    var node = document.getElementById('message');
    node.value = msg;
    node.hidden = false;
    node.style.background = 'red';
  }

  S3Ajax.createBucket(bucket, success, error, acl, location);

  var node = document.getElementById('message');
  node.value = 'Requesting Bucket';
  node.hidden = false;
  node.style.background = 'url(chrome://s3/skin/rotate.gif) right top no-repeat';
}
