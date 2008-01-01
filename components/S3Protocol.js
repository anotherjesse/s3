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

const CLASS_ID    = Components.ID("{363b503c-a2f6-11dc-8314-0800200c9a66}");
const CLASS_NAME  = "S3 Protocol Handler";
const CONTRACT_ID = "@mozilla.org/network/protocol;1?name=s3";

const PREFS = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService)
                .getBranch('extension.s3.');

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

  if (bucket == '') {
    var channel = ios.newChannel("chrome://s3/content/accounts.html", null, null);
  }
  else {
    var key = real.slice(6+bucket.length);

    if (key == '') {
      var channel = ios.newChannel("chrome://s3/content/browse-xslt.html", null, null);
    }
    else {
      var channel = new s3Channel(URI);
    }
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

  var bucket = aURI.spec.split('/')[2];
  var resource = '/' + bucket + '/' + aURI.spec.slice(6+bucket.length).split('?')[0];
  var url = 'http://s3.amazonaws.com' + resource;

  var ios = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
  this._subChannel = ios.newChannel(url, null, null);
  this._subChannel.QueryInterface(Components.interfaces.nsIHttpChannel);

  s3_auth(this._subChannel, resource);
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

s3Channel.prototype.__defineGetter__("URI",
function s3Channel_getter_URI() {
  return this._uri;
});

s3Channel.prototype.__defineGetter__("owner",
function s3Channel_getter_owner() {
  return this._subChannel.owner;
});

s3Channel.prototype.__defineSetter__("owner",
function s3Channel_setter_owner(aValue) {
  this._subChannel.owner = aValue;
});

s3Channel.prototype.__defineGetter__("notificationCallbacks",
function s3Channel_getter_notificationCallbacks() {
  return this._subChannel.notificationCallbacks;
});

s3Channel.prototype.__defineSetter__("notificationCallbacks",
function s3Channel_setter_notificationCallbacks(aValue) {
  this._subChannel.notificationCallbacks = aValue;
});

s3Channel.prototype.__defineGetter__("securityInfo",
function s3Channel_getter_securityInfo() {
  return this._subChannel.securityInfo;
});

s3Channel.prototype.__defineGetter__("contentType",
function s3Channel_getter_contentType() {
  return this._subChannel.contentType;
});

s3Channel.prototype.__defineSetter__("contentType",
function s3Channel_setter_contentType(aValue) {
  this._subChannel.contentType = aValue;
});

s3Channel.prototype.__defineGetter__("contentCharset",
function s3Channel_getter_contentCharset() {
  return this._subChannel.contentCharset;
});

s3Channel.prototype.__defineSetter__("contentCharset",
function s3Channel_setter_contentCharset(aValue) {
  this._subChannel.contentCharset = aValue;
});

s3Channel.prototype.__defineGetter__("contentLength",
function s3Channel_getter_contentLength() {
  return this._subChannel.contentLength;
});

s3Channel.prototype.__defineSetter__("contentLength",
function s3Channel_setter_contentLength(aValue) {
  this._subChannel.contentLength = aValue;
});

s3Channel.prototype.asyncOpen =
function s3Channel_asyncOpen(aListener, aContext) {
  this._listener = aListener;
  this._context = aContext;

  this._subChannel.asyncOpen(this, null);
  this._subChannel.originalURI = this._uri;
}

function s3_auth(channel, resource) {
  try {
    var KEY = PREFS.getCharPref('key');
    var SECRET_KEY = PREFS.getCharPref('secret_key');

    var http_date = (new Date()).toUTCString();

    var s = "GET\n\n\n" + http_date + "\n" + resource;
    var signature = hmacSHA1(s, SECRET_KEY);
    channel.setRequestHeader("Date", http_date, false);
    channel.setRequestHeader("Authorization", "AWS "+KEY+":"+signature, false);
  } catch (ex) {
    // if the key or secret key isn't set, we don't need
    // to set any headers, make the call anonymously
  }
}

s3Channel.prototype.open =
function s3Channel_open() {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
}

/******************************************************************************
 * nsIHttpChannel
 ******************************************************************************/

s3Channel.prototype.__defineGetter__("requestMethod",
function s3Channel_getter_requestMethod() {
  return this._subChannel.requestMethod;
});

s3Channel.prototype.__defineSetter__("requestMethod",
function s3Channel_setter_requestMethod(aValue) {
  if (aValue == "GET" || aValue == "HEAD") {
    this._subChannel.requestMethod = aValue;
  } else {
    throw Components.results.NS_ERROR_INVALID_ARG;
  }
});

s3Channel.prototype.__defineGetter__("referrer",
function s3Channel_getter_referrer() {
  return this._subChannel.referrer;
});

s3Channel.prototype.__defineSetter__("referrer",
function s3Channel_setter_referrer(aValue) {
  this._subChannel.referrer = aValue;
});

s3Channel.prototype.__defineGetter__("allowPipelining",
function s3Channel_getter_allowPipelining() {
  return this._subChannel.allowPipelining;
});

s3Channel.prototype.__defineSetter__("allowPipelining",
function s3Channel_setter_allowPipelining(aValue) {
  this._subChannel.allowPipelining = aValue;
});

s3Channel.prototype.__defineGetter__("redirectionLimit",
function s3Channel_getter_redirectionLimit() {
  return this._subChannel.redirectionLimit;
});

s3Channel.prototype.__defineSetter__("redirectionLimit",
function s3Channel_setter_redirectionLimit(aValue) {
  this._subChannel.redirectionLimit = aValue;
});

s3Channel.prototype.__defineGetter__("responseStatus",
function s3Channel_getter_responseStatus() {
  return this._subChannel.responseStatus;
});

s3Channel.prototype.__defineGetter__("responseStatusText",
function s3Channel_getter_responseStatusText() {
  return this._subChannel.responseStatusText;
});

s3Channel.prototype.__defineGetter__("requestSucceeded",
function s3Channel_getter_requestSucceeded() {
  return this._subChannel.requestSucceeded;
});

s3Channel.prototype.getRequestHeader =
function s3Channel_getRequestHeader(aHeader) {
  return this._subChannel.getRequestHeader(aHeader);
}

s3Channel.prototype.setRequestHeader =
function s3Channel_setRequestHeader(aHeader, aValue, aMerge) {
  this._subChannel.setRequestHeader(aHeader, aValue, aMerge);
}

s3Channel.prototype.visitRequestHeaders =
function s3Channel_visitRequestHeaders(aVisitor) {
  this._subChannel.visitRequestHeaders(aVisitor);
}

s3Channel.prototype.getResponseHeader =
function s3Channel_getResponseHeader(aHeader) {
  return this._subChannel.getResponseHeader(aHeader);
}

s3Channel.prototype.setResponseHeader =
function s3Channel_setResponseHeader(aHeader, aValue, aMerge) {
  this._subChannel.setResponseHeader(aHeader, aValue, aMerge);
}

s3Channel.prototype.visitResponseHeaders =
function s3Channel_visitResponseHeaders(aVisitor) {
  this._subChannel.visitResponseHeaders(aVisitor);
}

s3Channel.prototype.isNoStoreResponse =
function s3Channel_isNoStoreResponse() {
  return this._subChannel.isNoStoreResponse();
}

s3Channel.prototype.isNoCacheResponse =
function s3Channel_isNoCacheResponse() {
  return this._subChannel.isNoCacheResponse();
}

/******************************************************************************
 * nsIRequest
 ******************************************************************************/

s3Channel.prototype.__defineGetter__("loadGroup",
function s3Channel_getter_loadGroup() {
  return this._subChannel.loadGroup;
});

s3Channel.prototype.__defineSetter__("loadGroup",
function s3Channel_setter_loadGroup(aValue) {
  this._subChannel.loadGroup = aValue;
});

s3Channel.prototype.__defineGetter__("loadFlags",
function s3Channel_getter_loadFlags() {
  return this._subChannel.loadFlags;
});

s3Channel.prototype.__defineSetter__("loadFlags",
function s3Channel_setter_loadFlags(aValue) {
  this._subChannel.loadFlags = aValue;
});

s3Channel.prototype.__defineGetter__("name",
function s3Channel_getter_name() {
  return this._uri.spec;
});

s3Channel.prototype.__defineGetter__("status",
function s3Channel_getter_status() {
  return this._subChannel.status;
});

s3Channel.prototype.cancel =
function s3Channel_cancel(status) {
  this._subChannel.cancel(status);
}

s3Channel.prototype.isPending =
function s3Channel_isPending() {
  return this._subChannel.isPending();
}

s3Channel.prototype.resume =
function s3Channel_resume() {
  this._subChannel.resume();
}

s3Channel.prototype.suspend =
function s3Channel_suspend() {
  this._subChannel.suspend();
}

/******************************************************************************
 * nsIStreamListener
 ******************************************************************************/

s3Channel.prototype.onDataAvailable =
function s3Channel_onDataAvailable(aRequest, aContext, aInputStream, aOffset, aCount) {
  this._listener.onDataAvailable(aRequest, this._context, aInputStream, aOffset, aCount);
}

/******************************************************************************
 * nsIRequestObserver
 ******************************************************************************/

s3Channel.prototype.onStartRequest =
function s3Channel_onStartRequest(aRequest, aContext) {
  if (this._subChannel.responseStatus == 200) {
    this._listener.onStartRequest(aRequest, this._context);
    return;
  }

  this._redirectChannel("chrome://s3/content/browse-xslt.html");
}

s3Channel.prototype.onStopRequest =
function s3Channel_onStopRequest(aRequest, aContext, aStatusCode) {
  if (this._listener) {
    this._listener.onStopRequest(aRequest, this._context, aStatusCode);
  }
}

/******************************************************************************
 * nsIClassInfo
 ******************************************************************************/

s3Channel.prototype.getInterfaces =
function (aCount) {
  var interfaces = [Components.interfaces.nsIRequest,
                    Components.interfaces.nsIChannel,
                    Components.interfaces.nsIHttpChannel,
                    Components.interfaces.nsIStreamListener,
                    Components.interfaces.nsIRequestObserver,
                    Components.interfaces.nsIClassInfo];
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
  if (!aIID.equals(Components.interfaces.nsISupports) &&
      !aIID.equals(Components.interfaces.nsIRequest) &&
      !aIID.equals(Components.interfaces.nsIChannel) &&
      !aIID.equals(Components.interfaces.nsIHttpChannel) &&
      !aIID.equals(Components.interfaces.nsIStreamListener) &&
      !aIID.equals(Components.interfaces.nsIRequestObserver) &&
      !aIID.equals(Components.interfaces.nsIClassInfo))
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


// *****************************************************************************************************
// *****************************************************************************************************
// *****************************************************************************************************
//  PROBABLY/HOPEFULLY ALL OF THIS CAN BE REMOVED
// *****************************************************************************************************
// *****************************************************************************************************
// *****************************************************************************************************

function hmacSHA1(data, secret) {
    // TODO: use builtin crypto stuff
    return b64_hmac_sha1(secret, data)+'=';
}

// FIXME: use firefox's built in crypto stuff


/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * chrsz));}
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * chrsz));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * chrsz));}
function hex_hmac_sha1(key, data){ return binb2hex(core_hmac_sha1(key, data));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  var bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i%32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (32 - chrsz - i%32)) & mask);
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}

