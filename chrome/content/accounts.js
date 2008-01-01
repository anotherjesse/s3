// Copyright Jesse Andrews, 2005-2007
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
  var htmlNS = "http://www.w3.org/1999/xhtml";
	
	function s3Control() {
		var inst = this;

		const PREFS = CC['@mozilla.org/preferences-service;1'].getService(CI.nsIPrefService).getBranch('extension.s3.');
		
		this.save = function() {
	    PREFS.setCharPref('key', $('s3-key').value);
	    PREFS.setCharPref('secret_key', $('s3-secret-key').value);
	    // inst.load();
	  }

	  this.load = function() {
	    S3Ajax.KEY_ID = PREFS.getCharPref('key');
	    S3Ajax.SECRET_KEY = PREFS.getCharPref('secret_key');
	    inst.list();
	  }

	  this.setup = function() {
	    if (PREFS.getPrefType('key')) {
	      $('s3-key').value = PREFS.getCharPref('key');
	    }
	    if (PREFS.getPrefType('secret_key')) {
	      $('s3-secret-key').value = PREFS.getCharPref('secret_key');
	      inst.load();
	    }
      
	  }
	  
	  this.addDir = function( dirname ) {
      var tr=document.createElementNS(htmlNS, 'tr');
      tr.setAttribute('id', dirname);

      var td=document.createElementNS(htmlNS, 'td');
      var a=document.createElementNS(htmlNS, 'a');
      a.appendChild( document.createTextNode( dirname ));
      a.setAttribute("href", "s3://" + dirname);
      td.appendChild( a );
      tr.appendChild( td );

      $('keys').appendChild( tr );
    }
	
    this.list = function() {
      while ($('files').hasChildNodes()) 
        $('files').removeChild( $('files').lastChild );

      var table = document.createElementNS(htmlNS, 'table');
      table.setAttribute('id', 'keys');
      var tr = document.createElementNS(htmlNS, 'tr');
      var th = document.createElementNS(htmlNS, 'th');
      th.appendChild( document.createTextNode('Key') );
      tr.appendChild( th );
      var th = document.createElementNS(htmlNS, 'th');
      th.appendChild( document.createTextNode('Last Modified') );
      tr.appendChild( th );
      var th = document.createElementNS(htmlNS, 'th');
      th.appendChild( document.createTextNode('Size') );
      tr.appendChild( th );
      var th = document.createElementNS(htmlNS, 'th');
      th.appendChild( document.createTextNode('Actions') );
      tr.appendChild( th );
      
      table.appendChild(tr);
      $('files').appendChild( table );

      S3Ajax.listBuckets(
        function(xml, objs) {
          var buckets = objs.ListAllMyBucketsResult.Buckets.Bucket;
          for (var i=0; i<buckets.length; i++) {
            inst.addDir(buckets[i].Name);
          }
        });
    }
	}
	