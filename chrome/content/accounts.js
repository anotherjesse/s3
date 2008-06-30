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

Components.utils.import("resource://s3/auth.js");

function setkeys() {
  $('#account').show();
}

function s3Control() {
  $('#updateCredentials').click(function() {
    $.blockUI($('#credentials'));

    return false;
  });

  $('#createBucket').click(function() {
    var bucket = prompt('Bucket Name?');
    if (bucket) {
      S3Ajax.createBucket(bucket, list, function(req) {
        humanMsg.displayMsg('<strong>' + bucket + '</strong>: ' +
	  req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent.split('.')[0]);
      });
    }

    return false;
  });

  function addBucket( bucket ) {
    var tr=document.createElement('tr');
    tr.setAttribute('id', bucket);

    var td=document.createElement('td');
    var a=document.createElement('a');
    a.appendChild( document.createTextNode(bucket) );
    a.setAttribute("href", "s3://" + bucket + "/");
    td.appendChild( a );
    tr.appendChild( td );

    var td=document.createElement('td');
    var a=document.createElement('a');
    a.appendChild( document.createTextNode('delete') );
    a.setAttribute('class', 'delete');
    a.setAttribute('style', 'display: none');
    a.setAttribute('href', '#');
    a.setAttribute("bucket", bucket);
    td.appendChild( a );
    tr.appendChild( td );

    document.getElementById('buckets').appendChild(tr);

    $(a).click(function() {
      S3Ajax.deleteBucket(this.getAttribute('bucket'), list, function(req) {
        humanMsg.displayMsg('<strong>' + bucket + '</strong>: ' +
	  req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent);
      });
      return false;
    });
  }

  function list() {
    $('#active').show();
    $('#active').addClass('busy');
    $('#buckets').hide().empty();

    S3Ajax.listBuckets(
      function(xml, objs) {
        var buckets = xml.responseXML.getElementsByTagName('Bucket');
        for (var i=0; i<buckets.length; i++) {
          addBucket(buckets[i].getElementsByTagName('Name')[0].textContent);
        }
        $('#buckets').show();
        $('#createBucket').animate({opacity: 'show'});
        $('#active').removeClass('busy');
      },
      function(req) {
        humanMsg.displayMsg(req.responseXML.getElementsByTagName('Message')[0].childNodes[0].textContent);
        $('#active').removeClass('busy');
      });
  }

  function load() {
    try {
      var creds = s3_auth.get();
      S3Ajax.KEY_ID = creds.key;
      S3Ajax.SECRET_KEY = creds.secret;
      list();
    }
    catch(e) {};
  }

  this.save = function() {
    function trim(val) {
      if (val) {
        return val.replace(/^\s+|\s+$/g, '');
      }
    }

    var key = trim($('#s3-key').val());
    var secret = trim($('#s3-secret-key').val());

    if (key && key.length > 0) {
      s3_auth.set(key, secret);
    }
    else {
      s3_auth.clear();
    }

    window.location = window.location.href;
  };

  var creds = s3_auth.get();

  if (creds) {
    $('#s3-key').val(creds.key);
    $('#s3-secret-key').val(creds.secret);
  }

  load();
}

$(function() {
  s3_controller = new s3Control();
});
