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

  var real = URI.spec.split('#')[0].split('?')[0]
  var bucket = real.split('/')[2];
  var key = real.slice(6+bucket.length);

  if (key == '') {
    var channel = ios.newChannel("chrome://s3/content/browse-xslt.html", null, null);
  }
  else {
    var channel = new s3Channel(URI);
  }
  return channel;
}

s3Handler.prototype.newURI =
function (spec, originCharset, baseURI) {
  var cls = Components.classes['@mozilla.org/network/standard-url;1'];
  var url = cls.createInstance(Components.interfaces.nsIStandardURL);
  url.init(Components.interfaces.nsIStandardURL.URLTYPE_STANDARD, 80, spec, originCharset, baseURI);

  return url.QueryInterface(Components.interfaces.nsIURI);
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
 * Channel implementation
 ******************************************************************************/

function s3Channel(aURI) {
  this._uri = aURI;
  this.originalURI = aURI;
  this._status = Components.results.NS_OK;
  this._pending = true;
}

s3Channel.prototype._onload =
function s3Channel__onload(aEvent) {
  if (aEvent.target.status == 200) {
    this._redirectChannel(this._testURL);
  } else {
     this._redirectChannel("chrome://s3/content/browse-xslt.html");
  }
}

s3Channel.prototype._onerror =
function s3Channel__onerror(aEvent) {
  // this.sendData('oooops!')
 this._redirectChannel("chrome://s3/content/browse-xslt.html");
}

s3Channel.prototype._redirectChannel =
function s3Channel__redirectChannel(aSpec) {
  const NS_BINDING_REDIRECTED = 0x804b0003;
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
  var channel = ios.newChannel(aSpec, null, null);

  channel.asyncOpen(this._listener, this._context);
  this.cancel(NS_BINDING_REDIRECTED);

  channel.originalURI = this._uri;

  this._listener = null;
  this._context = null;
}

/******************************************************************************
 * nsIChannel
 ******************************************************************************/
 
s3Channel.prototype.finish =
function ()
{
   this.cancel(Components.results.NS_OK);
}
 
s3Channel.prototype.sendData =
function s3Channel_sendData(channel, data) {
   var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
       .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

   converter.charset = 'UTF-8';

   var convdata = converter.ConvertFromUnicode(data) + converter.Finish();

   var stream = Components.classes["@mozilla.org/io/string-input-stream;1"]
       .createInstance(Components.interfaces.nsIStringInputStream);

   var len = convdata.length;
   stream.setData(convdata, len);

   this.sendStream(stream, 0, len);

   this.finish();
}


s3Channel.prototype.contentCharset = "utf-8";
s3Channel.prototype.contentLength = -1;
s3Channel.prototype.contentType = "text/html";
s3Channel.prototype.notificationCallbacks = null;
s3Channel.prototype.owner = null;
s3Channel.prototype.securityInfo = null;
s3Channel.prototype.sendStream =
function (stream, offset, length) {
    this._listener.onDataAvailable(this, this._context, stream, offset, length);
}

s3Channel.prototype.__defineGetter__("URI",
function s3Channel_getter_URI() {
  return this._uri;
});

s3Channel.prototype.asyncOpen =
function s3Channel_asyncOpen(aListener, aContext) {
  this._listener = aListener;
  this._context = aContext;

  var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                      .createInstance(Components.interfaces.nsIXMLHttpRequest);

  var inst = this;
  xhr.onload = function s3Channel_asyncOpen_onload(aEvent) {
    inst._onload(aEvent);
  };
  xhr.onerror = function s3Channel_asyncOpen_onerror(aEvent) {
    inst._onerror(aEvent);
  };

  try {
    var bucket = this._uri.spec.split('/')[2];
    var url = 'http://' + bucket + '.s3.amazonaws.com/' + this._uri.spec.slice(6+bucket.length).split('?')[0];

    this._testURL = url;
    xhr.open("HEAD", this._testURL);
    xhr.send(null);
  }
  catch (ex) {
    this._onerror(null);
  }
}

s3Channel.prototype.open =
function s3Channel_open() {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
}

/******************************************************************************
 * nsIRequest
 ******************************************************************************/

s3Channel.prototype.loadGroup = null;
s3Channel.prototype.loadFlags = 0;

s3Channel.prototype.__defineGetter__("name",
function s3Channel_getter_name() {
  return this._uri.spec;
});

s3Channel.prototype.__defineGetter__("status",
function s3Channel_getter_status() {
  return this._status;
});

s3Channel.prototype.cancel =
function s3Channel_cancel(status) {
  if (this._pending) {
    this._pending = false;
    this._listener.onStopRequest(this, this._context, status);
  }
  this._status = status;
}

s3Channel.prototype.isPending =
function s3Channel_isPending() {
  return this._pending;
}

s3Channel.prototype.resume =
function s3Channel_resume() {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
}

s3Channel.prototype.suspend =
function s3Channel_suspend() {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
}

/******************************************************************************
 * nsIClassInfo
 ******************************************************************************/

s3Channel.prototype.getInterfaces =
function (aCount) {
  var interfaces = [Components.interfaces.nsIChannel, Components.interfaces.nsIClassInfo];
  aCount.value = interfaces.length;
  return interfaces;
}

s3Channel.prototype.getHelperForLanguage = function (aLanguage) { return null; }
s3Channel.prototype.contractID = CONTRACT_ID;
s3Channel.prototype.classDescription = CLASS_NAME;
s3Channel.prototype.classID = CLASS_ID;
s3Channel.prototype.implementationLanguage = Components.interfaces.nsIProgrammingLanguage.JAVASCRIPT;
s3Channel.prototype.flags = null;
s3Channel.prototype.QueryInterface =
function (aIID) {
  if (!aIID.equals(Components.interfaces.nsISupports) && !aIID.equals(Components.interfaces.nsIChannel) && !aIID.equals(Components.interfaces.nsIClassInfo))
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
