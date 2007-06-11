// Copyright Flock Inc. 2005-2007
// http://flock.com
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

function S3Bar() {
  var inst=this;
  var CC = Components.classes;
  var CI = Components.interfaces;
  const RDFS = CC['@mozilla.org/rdf/rdf-service;1'].getService(CI.nsIRDFService);
  const RDFCU = CC['@mozilla.org/rdf/container-utils;1'].getService(CI.nsIRDFContainerUtils);
  const NSRDF = function(name) { return RDFS.GetResource('http://home.netscape.com/NC-rdf#'+name); }
  var PREFS = CC['@mozilla.org/preferences-service;1'].getService(CI.nsIPrefService).getBranch('extension.s3bar.');

  this.ds = Components.classes['@mozilla.org/rdf/datasource;1?name=in-memory-datasource']
                      .createInstance(CI.nsIRDFDataSource);

  var Bag = function(name) {
    this.urn = 'urn:' + name;
    var bag = RDFCU.MakeBag(inst.ds, RDFS.GetResource(this.urn));
    
    this.name = name;
    this.add = function( uri, val ) {
      var resource = RDFS.GetResource(uri);
      for (var k in val) {
        inst.ds.Assert(resource, NSRDF(k), RDFS.GetLiteral(val[k]), true);
      }
      bag.AppendElement(resource);
    }
  }
  
  this.init = function() {
    $('s3-tree').database.AddDataSource(inst.ds);
    $('s3-tree').builder.rebuild();
  
    if (PREFS.getPrefType('key') && PREFS.getPrefType('secret_key')) {
      inst.load();
    }
    else {
      inst.setup();
    }
  }

  this.save = function() {
    PREFS.setCharPref('key', $('s3-key').value);
    PREFS.setCharPref('secret_key', $('s3-secret-key').value);
    inst.load();
  }
  
  this.load = function() {
    $('s3-deck').selectedIndex = 1;
    S3.KEY_ID = PREFS.getCharPref('key');
    S3.SECRET_KEY = PREFS.getCharPref('secret_key');
    inst.refresh();
  }
  
  this.setup = function() {
    if (PREFS.getPrefType('key')) {
      $('s3-key').value = PREFS.getCharPref('key');
    }
    if (PREFS.getPrefType('secret_key')) {
      $('s3-secret-key').value = PREFS.getCharPref('secret_key');
    }
    
    $('s3-deck').selectedIndex = 0;
  }
  
  this.refresh = function() {
    S3.listBuckets(function(xml, objs) {
      var buckets = objs.ListAllMyBucketsResult.Buckets.Bucket;
      for (var i=0; i<1; i++) {
        var bag = new Bag(buckets[i].Name);
        $('s3-tree').setAttribute('ref', bag.urn)
        S3.listKeys( bag.name, '', function(xml,objs) {
          var keys = objs.ListBucketResult.Contents;
          for (var i=0; i<keys.length; i++) {
             var obj = {};
             obj.s3ID = 'http://s3.amazonaws.com/' + bag.name + '/' + keys[i].Key;
             obj.type = 0; // file
             obj.size= Math.round(keys[i].Size / 1024);
             obj.fileName = keys[i].Key;
             bag.add(obj.s3ID, obj);
           }
         }, function() { alert('failure'); } );
      }
    });
  }
}

var s3 = new S3Bar();
s3.init();

var s3DNDObserver = {
  onDragOver: function(aEvent, aFlavor, aSession) { dump("s3DNDObserver: onDragOver\n"); },
  onDragEnter: function(aEvent, aSession) { dump("s3DNDObserver: onDragEnter\n"); },
  onDragExit: function(aEvent, aSession) { dump("s3DNDObserver: onDragExit\n"); },
  onDragStart: function(event, transferData, action) { dump("s3DNDObserver: onDragStart\n"); },

  canHandleMultipleItems: true,

  onDrop: function(aEvent, aDropData, aSession) {
    //dump("s3DNDObserver: onDrop: contentType: " + aDropData.flavour.contentType + " data: " + aDropData.data + "\n");
    for (var c = 0; c < aDropData.dataList.length; c++) {
      var supports = aDropData.dataList[c].dataList[0].supports;
      var contentType = aDropData.dataList[c].dataList[0].flavour.contentType;
      var url;
            
      switch (contentType) {
        case "application/x-moz-file":
          dump('!!!!!!>>>>>>>aDropData.data ' + aDropData.dataList[c].dataList[0].data.path + '\n');
          var s3DropObj = gFlockS3SVC.create(aDropData.dataList[c].dataList[0].data);
          s3DropObj.fileName = aDropData.dataList[c].dataList[0].data.path;
          gFlockS3SVC.add(s3DropObj);
          break;
        default:
          break;
      }
    }
  },
  
  getSupportedFlavours: function() {
    var flavors = new FlavourSet();
    flavors.appendFlavour("application/x-moz-file", "nsIFile");
    flavors.appendFlavour("text/x-moz-url");
    return flavors;
  }
}

var spinner_opacity = 0.5;
function spinner_fade() {
  if (spinner_opacity > 0) {
    spinner_opacity -= 0.1;
    $('spinner').style.opacity = spinner_opacity;
    window.setTimeout (spinner_fade, 100);
  }
  else {
    $('spinner').setAttribute ('hidden', true);
  }
}

function spinner_unfade() {
  spinner_opacity = 0.5;
  $('spinner').style.opacity = 0.5;
  $('spinner').setAttribute ('hidden', false);
}

function s3refresh () {
  // spinner_unfade ();
  // window.setTimeout (loaded, 2000);
  spinner_fade();
  gFlockS3SVC.refresh();
}

function init() {
  s3refresh();
}

function deleteItem() {
  var index = $('s3-tree').view.selection.currentIndex;
  var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;
  gFlockS3SVC.remove(url);
}


function copyLink() {
  var index = $('s3-tree').view.selection.currentIndex;
  var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;
  copyUrl(url)
}

function copyTorrent() {
  var index = $('s3-tree').view.selection.currentIndex;
  var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;
  copyUrl(url+"?torrent");
}

function copyUrl(url) {
  const kSuppWStringContractID = "@mozilla.org/supports-string;1";
  const kSuppWStringIID = Components.interfaces.nsISupportsString;
  const kXferableContractID = "@mozilla.org/widget/transferable;1";
  const kXferableIID = Components.interfaces.nsITransferable;
  var xferable = Components.classes[kXferableContractID].createInstance(kXferableIID);
  var unicodestring = Components.classes[kSuppWStringContractID].createInstance(kSuppWStringIID);

  xferable.addDataFlavor("text/unicode");
  unicodestring.data = url + '\n';
  xferable.setTransferData("text/unicode", unicodestring, (url.length+1)*2);

  const kClipboardContractID = "@mozilla.org/widget/clipboard;1";
  const kClipboardIID = Components.interfaces.nsIClipboard;
  var clipboard = Components.classes[kClipboardContractID].getService(kClipboardIID);
  clipboard.setData(xferable, null, kClipboardIID.kGlobalClipboard);
}

function onClick(aEvent) {
  dump("onClick\n");
  if (aEvent.button == 2 || aEvent.originalTarget.localName != "treechildren") {
    return;
  }

  var index = $('s3-tree').view.selection.currentIndex;
  var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;

  openUILinkIn(url, whereToOpenLink(aEvent));
}
