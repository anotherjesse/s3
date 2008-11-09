// Copyright Jesse Andrews, 2007-2008
// http://overstimulate.com
//
// This file may be used under the terms of of the
// GNU General Public License Version 2 or later (the "GPL"),
// http://www.gnu.org/licenses/gpl.html
//
// Software distributed under the License is distributed on an "AS IS" basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
// for the specific language governing rights and limitations under the
// License.

S3Ajax.upload = function(bucket, key, file, cb) {
  var params = {};
  try {
    params.content_type = mimeSVC.getTypeFromFile(file);
    // TODO: if this fails, we should do our own lookup ... instead of just defaulting to text/plain
  } catch(e) {};
  var realStart = -1;
  params.listener = function(position, total) {
    // HACK: firefox doesn't seem to reset the position to 0
    // between requests, so we take the value of the first callback
    // as approximately 0
    if (realStart < 0) { realStart = position; }
    position = position - realStart;

    $('uploadstatus').value = (Math.floor(100 * position / total));
  };
  S3Ajax.put(bucket, key, file, params, cb,
    function(req) {
      alert(req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent);
      cb();
    });
}

var Uploader = {
  working: false,
  queue: [],
  add: function(file) {
    var key = escape(prefix + file.leafName);
    Uploader.queue.push({key: key, file: file});
    $('queue').value  = Uploader.queue.length + ' remaining in queue.';
    if (!Uploader.working) {
      Uploader.upload();
    }
  },
  upload: function() {
    Uploader.working = true;
    var cur = Uploader.queue.shift();
    $('uploads').hidden = false;
    $('status').value = "Uploading " + cur.key;
    $('queue').value  = '';
    if (Uploader.queue.length > 0) {
      $('queue').value  = Uploader.queue.length + ' remaining in queue.';
    }
    S3Ajax.upload(bucket, cur.key, cur.file, Uploader.uploadComplete);
  },
  uploadComplete: function() {
    if (Uploader.queue.length > 0) {
      Uploader.upload();
    }
    else {
      Uploader.working = false;
      $('uploads').hidden = true;
      fm.listKeys();
    }
  }
}
