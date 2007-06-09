//
// BEGIN FLOCK GPL
// 
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
// 
// END FLOCK GPL
//

const flockIS3Service    = Components.interfaces.flockIS3Service;
const flockIS3Object      = Components.interfaces.flockIS3Object;
const FLOCK_S3_SERVICE_CONTRACTID      = '@mozilla.org/rdf/datasource;1?name=flock-s3';

var gFlockS3SVC = Components.classes[FLOCK_S3_SERVICE_CONTRACTID]
        .getService(flockIS3Service); 

var s3DNDObserver = {

    canHandleMultipleItems: true,

    onDragOver: function(aEvent, aFlavor, aSession) {
        dump("s3DNDObserver: onDragOver\n");
    },
    
    onDragEnter: function(aEvent, aSession) {
        dump("s3DNDObserver: onDragEnter\n");
    },
    
    onDragExit: function(aEvent, aSession) {
        dump("s3DNDObserver: onDragExit\n");
    },

	onDragStart: function(event, transferData, action) {
        dump ("s3DNDObserver: onDragStart\n");
	},
	
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
function spinner_fade () {
    if (spinner_opacity > 0) {
        spinner_opacity -= 0.1;
        $('spinner').style.opacity = spinner_opacity;
        window.setTimeout (spinner_fade, 100);
    } else {
        $('spinner').setAttribute ('hidden', true);
    }
}
function spinner_unfade () {
    spinner_opacity = 0.5;
    $('spinner').style.opacity = 0.5;
    $('spinner').setAttribute ('hidden', false);
}

function loaded () {
    // spinner_fade ();
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

function close() {
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
	if (aEvent.button == 2 || aEvent.originalTarget.localName != "treechildren")
      return;
    
	var index = $('s3-tree').view.selection.currentIndex;
    var url = $('s3-tree').builder.getResourceAtIndex(index).ValueUTF8;

    openUILinkIn(url, whereToOpenLink(aEvent));
}
