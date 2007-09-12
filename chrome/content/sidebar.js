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
var CC = Components.classes;
var CI = Components.interfaces;

function S3Bar() {
  var inst=this;

  const RDFS = CC['@mozilla.org/rdf/rdf-service;1'].getService(CI.nsIRDFService);
  const RDFCU = CC['@mozilla.org/rdf/container-utils;1'].getService(CI.nsIRDFContainerUtils);
  const NSRDF = function(name) { return RDFS.GetResource('http://home.netscape.com/NC-rdf#'+name); }
  const PREFS = CC['@mozilla.org/preferences-service;1'].getService(CI.nsIPrefService).getBranch('extension.s4.');

  this.ds = RDFS.GetDataSource('rdf:s3', false);

  var buckets = {}
  buckets.urn = 'urn:buckets';
  buckets.bag = RDFCU.MakeBag(inst.ds, RDFS.GetResource(buckets.urn));
  buckets.add = function(bucket) {
    buckets.bag.AppendElement(bucket);
  }
  
  this.bucketByUrn = {};

  var uploads = {};
  uploads.urn = 'urn:uploads';
  uploads.bag = RDFCU.MakeBag(inst.ds, RDFS.GetResource(uploads.urn));
  uploads.add = function(fileName) {
    var resource = RDFS.GetResource('urn:upload:' + fileName);
    inst.ds.Assert(resource, NSRDF('fileName'), RDFS.GetLiteral(fileName), true);
    inst.ds.Assert(resource, NSRDF('type'), RDFS.GetLiteral('upload'), true);
    inst.ds.Assert(resource, NSRDF('status'), RDFS.GetLiteral('uploading'), true);
    uploads.bag.AppendElement(resource);
    return resource;
  }
  uploads.remove = function(resource) {
    uploads.bag.RemoveElement(resource, true);
  }
  uploads.errors = function(resource) {
    inst.ds.Assert(resource, NSRDF('status'), RDFS.GetLiteral('error'), true);
  }

  var Bucket = function(name) {
    this.urn = 'urn:' + name;
    var bag = RDFCU.MakeBag(inst.ds, RDFS.GetResource(this.urn));
    var resource = RDFS.GetResource(this.urn);
    inst.ds.Assert(resource, NSRDF('name'), RDFS.GetLiteral(name), true);
    inst.ds.Assert(resource, NSRDF('type'), RDFS.GetLiteral('bucket'), true);
    buckets.add(resource);
    inst.bucketByUrn[this.urn] = this;
    
    // the following is UGLY
    
    this.load = function() {
      inst.ds.Assert(resource, NSRDF('loaded'), RDFS.GetLiteral('loaded'), true);
    }
    
    this.loaded = function() {
      return inst.ds.HasAssertion(resource, NSRDF('loaded'), RDFS.GetLiteral('loaded'), true);
    }
    
    this.name = name;
    
    this.add = function( uri, val ) {
      var resource = RDFS.GetResource(uri);
      for (var k in val) {
        inst.ds.Assert(resource, NSRDF(k), RDFS.GetLiteral(val[k]), true);
      }
      bag.AppendElement(resource);
    }
    
    this.remove = function(uri) {
      var resource = RDFS.GetResource(uri);
      bag.RemoveElement(resource, true);
    }
    
    this.clear = function() {
      inst.ds.beginUpdateBatch();
      var children = bag.GetElements();
      while (children.hasMoreElements()) {
        bag.RemoveElement(children.getNext(), false);
      }
      inst.ds.endUpdateBatch();
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
    inst.refreshList();
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
  
  this.refreshList = function() {
    // this happens on EVERY load... costs $0.00001 per load :0
    S3.listBuckets(function(xml, objs) {
      var buckets = objs.ListAllMyBucketsResult.Buckets.Bucket;
      for (var i=0; i<buckets.length; i++) {
        new Bucket(buckets[i].Name);
      }
    });
  }
  
  this.refresh = function() {
    inst.refreshBucket(inst.getCurrentBucket(), true);
  }
  
  this.refreshBucket = function(bucket, force) {
    if (bucket.loaded()) {
      if (force) {
        bucket.clear();
      }
      else {
        return;
      }
    }
    S3.listKeys( bucket.name, '', function(xml,objs) {
      var keys = objs.ListBucketResult.Contents;
      for (var i=0; i<keys.length; i++) {
         var obj = {};
         var urn = 'http://s3.amazonaws.com/' + bucket.name + '/' + keys[i].Key;
         obj.size= Math.round(keys[i].Size / 1024);
         obj.fileName = keys[i].Key;
         bucket.add(urn, obj);
       }
       bucket.load();
     },
     function() { alert('failure'); });
  }
  
  this.selectBucket = function(urn) {
    inst.refreshBucket(inst.bucketByUrn[urn]);
    $('s3-tree').setAttribute('ref', urn)
  }
  
  this.getCurrentBucket = function() {
    return inst.bucketByUrn[$('s3-tree').getAttribute('ref')];
  }
  
  this.deleteItem = function() {
    var index = $('s3-tree').view.selection.currentIndex;
    var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;
    var key = url.match(/^http:\/\/[^\/]*s3\.amazonaws\.com\/[^\/]*\/(.*)$/)[1];

    S3.deleteKey(inst.getCurrentBucket().name, escape(key), function() {
        var bucket = inst.bucketByUrn['urn:'+$('s3-tree').getAttribute('ref').slice(4)];
        bucket.remove(url);
      }, function(a,b) { alert('error deleting - ' + a.responseText + '\n\n' +  b + '\n\n');}    );
  }
  
  this.copyLink = function() {
    var index = $('s3-tree').view.selection.currentIndex;
    var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;
    inst.copyUrl(url)
  }

  this.copyTorrent = function() {
    var index = $('s3-tree').view.selection.currentIndex;
    var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;
    inst.copyUrl(url+"?torrent");
  }

  this.copyUrl = function(url) {
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

  this.onClick = function(aEvent) {
    if (aEvent.button == 2 || aEvent.originalTarget.localName != "treechildren") {
      return;
    }

    var index = $('s3-tree').view.selection.currentIndex;
    var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;

    openUILinkIn(url, whereToOpenLink(aEvent));
  }
  
  this.upload = function(file) {
    var params = {};
    try {
      params.content_type = CC['@mozilla.org/mime;1'].createInstance(CI.nsIMIMEService).getTypeFromFile(file);
      // TODO: if this fails, we should do our own lookup ... instead of just defaulting to text/plain
    } catch(e) {};
    var tmpInputStream = CC["@mozilla.org/network/file-input-stream;1"].createInstance(CI.nsIFileInputStream);
    tmpInputStream.init(file, 1, 0644, 0);
    var tmpInputBufferStream = CC["@mozilla.org/network/buffered-input-stream;1"].createInstance(CI.nsIBufferedInputStream);
    tmpInputBufferStream.init(tmpInputStream, 65536 * 4);
    var upResource = uploads.add(file.leafName);
    S3.put(inst.getCurrentBucket().name, escape(file.leafName), tmpInputBufferStream, params, function() {
      var obj = {};
      var urn = 'http://s3.amazonaws.com/' + inst.getCurrentBucket().name + '/' + file.leafName;
      obj.size = Math.round(file.fileSize / 1024);
      obj.fileName = file.leafName;
      inst.getCurrentBucket().add(urn, obj);
      uploads.remove(upResource);
    }, function(a,b) { 
      uploads.error(upResource, a, b);
    });
  }
  
  if (PREFS.getPrefType('key') && PREFS.getPrefType('secret_key')) {
    inst.load();
  }
  else {
    inst.setup();
  }
}

var s3 = new S3Bar();

var s3DNDObserver = {
  onDragOver: function(aEvent, aFlavor, aSession) { dump("s3DNDObserver: onDragOver\n"); },
  onDragEnter: function(aEvent, aSession) { dump("s3DNDObserver: onDragEnter\n"); },
  onDragExit: function(aEvent, aSession) { dump("s3DNDObserver: onDragExit\n"); },
  onDragStart: function(event, transferData, action) { dump("s3DNDObserver: onDragStart\n"); },

  canHandleMultipleItems: true,

  onDrop: function(aEvent, aDropData, aSession) {
    for (var c = 0; c < aDropData.dataList.length; c++) {
      var supports = aDropData.dataList[c].dataList[0].supports;
      var contentType = aDropData.dataList[c].dataList[0].flavour.contentType;
            
      switch (contentType) {
        case "application/x-moz-file":
          var file = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
          file.initWithPath( aDropData.dataList[c].dataList[0].data.path );
          s3.upload(file);
          break;
        case "text/x-moz-url":
          var url = aDropData.dataList[c].dataList[0].data;
          if (url.slice(0,7) == 'file://') {
            var file = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
            file.initWithPath( aDropData.dataList[c].dataList[0].data.slice(7) );
            s3.upload(file);
          }
          else {
            alert('need to write code to upload the contents of url');
          }
          break;
        default:
          alert('add handler for: ' + contentType);
          break;
      }
    }
  },
  
  getSupportedFlavours: function() {
    var flavors = new FlavourSet();
    flavors.appendFlavour("application/x-moz-file", "nsIFile");
    flavors.appendFlavour("text/x-moz-url");
    // don't think the following work, but worth a shot...
    flavors.appendFlavour("image/png");
    flavors.appendFlavour("image/gif");
    flavors.appendFlavour("image/jpeg");
    return flavors;
  }
}
