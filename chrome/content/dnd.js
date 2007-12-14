var dnd = {
  onDragOver: function(aEvent, aFlavor, aSession) {},
  onDragEnter: function(aEvent, aSession) {},
  onDragExit: function(aEvent, aSession) {},
  onDragStart: function(event, transferData, action) {},
  canHandleMultipleItems: true,

  onDrop: function(aEvent, aDropData, aSession) {
    for (var c = 0; c < aDropData.dataList.length; c++) {
      var supports = aDropData.dataList[c].dataList[0].supports;
      var contentType = aDropData.dataList[c].dataList[0].flavour.contentType;
            
      switch (contentType) {
        case "application/x-moz-file":
          var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Componens.interfaces..nsILocalFile);
          file.initWithPath( aDropData.dataList[c].dataList[0].data.path );
          alert('upload: ' + file);
          break;
        case "text/x-moz-url":
          var url = aDropData.dataList[c].dataList[0].data;
          if (url.slice(0,7) == 'file://') {
            var file = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath( aDropData.dataList[c].dataList[0].data.slice(7) );
            alert('upload: ' + file);
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
