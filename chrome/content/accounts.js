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


function setkeys() {
  $('#account').show();
}

function s3Control() {
  const PREFS = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService).getBranch('extension.s3.');

  function addBucket( bucket ) {
    var tr=document.createElement('tr');
    tr.setAttribute('id', bucket);

    var td=document.createElement('td');
    var a=document.createElement('a');
    a.appendChild( document.createTextNode(bucket) );
    a.setAttribute("href", "s3://" + bucket);
    td.appendChild( a );
    tr.appendChild( td );

    document.getElementById('buckets').appendChild(tr);
  }

  function list() {
    $('#buckets').empty();

    S3Ajax.listBuckets(
      function(xml, objs) {
        var buckets = xml.responseXML.getElementsByTagName('Bucket');
        for (var i=0; i<buckets.length; i++) {
          addBucket(buckets[i].getElementsByTagName('Name')[0].textContent);
        }
        $('#active').show();
      });
  }

  function load() {
    try {
      S3Ajax.KEY_ID = PREFS.getCharPref('key');
      S3Ajax.SECRET_KEY = PREFS.getCharPref('secret_key');
      list();
    }
    catch(e) {};
  }
    
  this.save = function() {
    function set_pref(key, val) {
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
    
    set_pref('key', $('#s3-key').val());
    set_pref('secret_key', $('#s3-secret-key').val());
    load();
    $('#account').hide();
  }
  
  if (PREFS.getPrefType('key')) {
    $('#s3-key').val(PREFS.getCharPref('key'));
  }

  if (PREFS.getPrefType('secret_key')) {
    $('#s3-secret-key').val(PREFS.getCharPref('secret_key'));
  }

  load();
}

$(function() {
  s3_controller = new s3Control();
});

