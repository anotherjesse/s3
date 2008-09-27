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

var dnd = {
  onDragOver: function(aEvent, aFlavor, aSession) {},
  onDragEnter: function(aEvent, aSession) {},
  onDragExit: function(aEvent, aSession) {},
  onDragStart: function(event, transferData, action) {},
  canHandleMultipleItems: true,

  onDrop: function(aEvent, aDropData, aSession) {
    aEvent.stopPropagation();
    for (var c = 0; c < aDropData.dataList.length; c++) {
      var supports = aDropData.dataList[c].dataList[0].supports;
      var contentType = aDropData.dataList[c].dataList[0].flavour.contentType;

      switch (contentType) {
        case "application/x-moz-file":
          var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
          file.initWithPath( aDropData.dataList[c].dataList[0].data.path );
          Uploader.add(file);
          break;
        case "text/x-moz-url":
          var url = aDropData.dataList[c].dataList[0].data;
          if (url.slice(0,7) == 'file://') {
            var file = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath( aDropData.dataList[c].dataList[0].data.slice(7) );
            Uploader.add(bucket, file);
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
    return flavors;
  }
}

var dropListener = {
  handleEvent: function(event) {
    nsDragAndDrop.drop(event, dnd);
  }
}

$(function() {
  document.addEventListener('dragdrop', dropListener, true);
});
