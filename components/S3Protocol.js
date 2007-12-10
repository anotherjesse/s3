const CLASS_ID    = Components.ID("{363b503c-a2f6-11dc-8314-0800200c9a66}");
const CLASS_NAME  = "S3 Protocol Handler";
const CONTRACT_ID = "@mozilla.org/network/protocol;1?name=s3";

function s3Handler() {}

/******************************************************************************
 * nsIProtocolHandler
 ******************************************************************************/

s3Handler.prototype.scheme = 's3';
s3Handler.prototype.defaultPort = -1;
s3Handler.prototype.protocolFlags = 0;
s3Handler.prototype.allowPort = function (port, scheme) { return false; }
s3Handler.prototype.newChannel = 
function (URI) {
  var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

  if (URI.spec.match(/\?download$/)) {
    var bucket = URI.spec.split('/')[2];
    var url = 'http://' + bucket + '.s3.amazonaws.com/' + URI.spec.slice(6+bucket.length).split('?')[0];
    var channel = ios.newChannel(url, null, null);
  }
  else {
    var channel = ios.newChannel("chrome://s3/content/browse.html", null, null);
  }
  return channel;
}
  
s3Handler.prototype.newURI = 
function (spec, originCharset, baseURI) {
  var url = Components.classes["@mozilla.org/network/simple-uri;1"].createInstance(Components.interfaces.nsIURI);

  try {
    url.spec = spec;
  } catch (e) {
    try {
      url.spec = this.scheme + ":" + spec;
    } catch (e) {
      url.spec = "javascript:void(0)";
    }
  }

  return url;
}

/******************************************************************************
 * nsIClassInfo
 ******************************************************************************/

s3Handler.prototype.getInterfaces = 
function (aCount) {
  var interfaces = [Components.interfaces.nsIProtocolHandler, Components.interfaces.nsIClassInfo];
  aCount.value = interfaces.length;
  return interfaces;
}

s3Handler.prototype.getHelperForLanguage = function (aLanguage) { return null; }
s3Handler.prototype.contractID = CONTRACT_ID;
s3Handler.prototype.classDescription = CLASS_NAME;
s3Handler.prototype.classID = CLASS_ID;
s3Handler.prototype.implementationLanguage = Components.interfaces.nsIProgrammingLanguage.JAVASCRIPT;
s3Handler.prototype.flags = null;
s3Handler.prototype.QueryInterface = 
function (aIID) {
  if (!aIID.equals(Components.interfaces.nsISupports) && !aIID.equals(Components.interfaces.nsIProtocolHandler) && !aIID.equals(Components.interfaces.nsIClassInfo))
    throw Components.results.NS_ERROR_NO_INTERFACE;
  return this;
}

/******************************************************************************
 * XPCOM Functions for construction and registration
 ******************************************************************************/
var Module = {
  _firstTime: true,
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    if (this._firstTime) {
      this._firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    }
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    if (aCID.equals(CLASS_ID))
      return Factory;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

var Factory = {
  createInstance: function(aOuter, aIID) {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new s3Handler ()).QueryInterface(aIID);
  }
};

function NSGetModule(aCompMgr, aFileSpec) { return Module; }