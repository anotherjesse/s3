// Copyright Jesse Andrews, 2005-2008
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

var $ = function(x) { return document.getElementById(x) };
var CC = Components.classes;
var CI = Components.interfaces;

function s3Control() {
  var inst = this;

  const PREFS = CC['@mozilla.org/preferences-service;1'].getService(CI.nsIPrefService).getBranch('extension.s3.');

  function set(key, val) {
    try {
      if (val) {
        val = val.replace(/^\s+|\s+$/g, '');
      }
      if (val && val.length > 0) {
        PREFS.setCharPref(key, val)
      }
      else {
        PREFS.clearUserPref(key)
      }
    }
    catch (e) {}
  }

  this.save = function() {
    set('key', $('s3-key').value);
    set('secret_key', $('s3-secret-key').value);
    inst.load();
    $('account').style.display = 'none';
  }

  this.load = function() {
    try {
      S3Ajax.KEY_ID = PREFS.getCharPref('key');
      S3Ajax.SECRET_KEY = PREFS.getCharPref('secret_key');
      inst.list();
    }
    catch(e) {};
  }

  this.setup = function() {
    if (PREFS.getPrefType('key')) {
      $('s3-key').value = PREFS.getCharPref('key');
    }
    if (PREFS.getPrefType('secret_key')) {
      $('s3-secret-key').value = PREFS.getCharPref('secret_key');
      if ($('s3-secret-key').value != '') {
        inst.load();
      }
      else {
        setkeys();
      }
    }
    else {
      setkeys();
    }
  }

  this.addDir = function( dirname ) {
    var tr=document.createElement('tr');
    tr.setAttribute('id', dirname);

    var td=document.createElement('td');
    var a=document.createElement('a');
    a.appendChild( document.createTextNode( dirname ));
    a.setAttribute("href", "s3://" + dirname);
    td.appendChild( a );
    tr.appendChild( td );

    $('buckets').appendChild( tr );
  }

  this.list = function() {
    $('buckets').innerHTML = '';

    S3Ajax.listBuckets(
      function(xml, objs) {
        var buckets = xml.responseXML.getElementsByTagName('Bucket');
        for (var i=0; i<buckets.length; i++) {
          inst.addDir(buckets[i].getElementsByTagName('Name')[0].textContent);
          $('active').style.display = '';
        }
      });
  }
}
