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

const CLASS_ID    = Components.ID("{363b503c-a2f6-11dc-8314-0800200c9a66}");
const CLASS_NAME  = "S3 Protocol Handler";
const CONTRACT_ID = "@mozilla.org/network/protocol;1?name=s3";

const CC = Components.classes;
const CI = Components.interfaces;
const CR = Components.results;
const CU = Components.utils;

CU.import("resource://gre/modules/XPCOMUtils.jsm");

const PREFS = CC['@mozilla.org/preferences-service;1']
              .getService(CI.nsIPrefService)
              .getBranch('extension.s3.');

function S3Handler() {
}

S3Handler.prototype = {
  // nsIProtocolHandler
  scheme: "s3",
  defaultPort: -1,
  protocolFlags: CI.nsIProtocolHandler.URI_NOAUTH,

  allowPort: function S3H_allowPort(port, scheme) false,

  newChannel: function S3H_newChannel(aURI) {
    var ios = CC["@mozilla.org/network/io-service;1"]
              .getService(CI.nsIIOService);

    var real = aURI.spec.split('#')[0].split('?')[0];
    var bucket = real.split('/')[2];

    var channel;
    if (bucket == '') {
      channel = ios.newChannel("chrome://s3/content/accounts.html", null, null);
    } else {
      var key = real.slice(6 + bucket.length);

      if (key == '' || key[key.length-1] == '/') {
        channel = ios.newChannel("chrome://s3/content/browse-xslt.html", null, null);
      } else {
        channel = new s3Channel(aURI);
      }
    }
    return channel;
  },

  newURI: function S3H_newURI(aSpec, aOriginCharset, aBaseURI) {
    return new S3URL(aSpec, aOriginCharset, aBaseURI);
  },

  // nsIClassInfo
  getInterfaces: function S3H_getInterfaces(aCount) {
    var interfaces = [CI.nsIProtocolHandler, CI.nsIClassInfo];
    aCount.value = interfaces.length;
    return interfaces;
  },
  getHelperForLanguage: function S3H_getHelperForLanguage(aLanguage) null,
  contractID: CONTRACT_ID,
  classDescription: CLASS_NAME,
  classID: CLASS_ID,
  implementationLanguage: CI.nsIProgrammingLanguage.JAVASCRIPT,
  flags: 0,

  QueryInterface: XPCOMUtils.generateQI([CI.nsIProtocolHandler,
                                         CI.nsIClassInfo])
};

function S3URL(spec, originCharset, baseURI) {
  var prePath = spec.match(/^s3:\/\/[^\/]+/);

  var basePrePath = null;
  if (baseURI) {
    basePrePath = baseURI.spec.match(/^s3:\/\/[^\/]+/);
  }

  this._sURL = CC["@mozilla.org/network/standard-url;1"]
               .createInstance(CI.nsIStandardURL);
  this._sURL.init(CI.nsIStandardURL.URLTYPE_STANDARD, 80,
                  spec, originCharset, baseURI);
  this._sURL.QueryInterface(CI.nsIURL);

  var newPrePath = this._sURL.prePath;

  if (prePath) {
    var re = new RegExp("^" + prePath, "i");
    this._prePath = newPrePath.replace(re, prePath);
  } else if (basePrePath) {
    var re = new RegExp("^" + basePrePath, "i");
    this._prePath = newPrePath.replace(re, basePrePath);
  } else {
    this._prePath = newPrePath;
  }

  this._host = this._prePath.replace(/^s3:\/\//, "");

  this._spec = this._prePath + this._sURL.path;
}

S3URL.prototype = {
  set spec(spec) {
    var prePath = spec.match(/^s3:\/\/[^\/]+/);

    if (!prePath) {
      throw CR.NS_ERROR_INVALID_ARG;
    }

    this._spec = spec;
    this._prePath = prePath;
    this._host = this._prePath.replace(/^s3:\/\//, "");
    this._sURL.spec = spec;
  },

  get spec() { return this._spec; },
  get prePath() { return this._prePath; },
  get scheme() { return "s3"; },
  get userPass() { return ""; },
  get username() { return ""; },
  get password() { return ""; },
  get hostPort() { return this._host; },
  get host() { return this._host; },
  get port() { return -1; },
  get path() { return this._sURL.path; },

  set scheme(scheme) {
    if (scheme != "s3") {
      throw CR.NS_ERROR_ABORT;
    }
  },

  set userPass(userPass) { throw CR.NS_ERROR_NOT_IMPLEMENTED; },
  set username(username) { throw CR.NS_ERROR_NOT_IMPLEMENTED; },
  set password(password) { throw CR.NS_ERROR_NOT_IMPLEMENTED; },
  set hostPort(hostPort) { throw CR.NS_ERROR_NOT_IMPLEMENTED; },

  set host(host) { this._host = host; },

  set port(port) {
    if (port != -1) {
      throw CR.NS_ERROR_ABORT;
    }
  },

  set path(path) { this._sURL.path = path; },

  equals: function(other) {
    return this.spec == other.spec;
  },

  schemeIs: function(scheme) {
    return scheme == "s3";
  },

  clone: function() {
    return new S3URL(this._spec, this._sURL.originCharset, null);
  },

  resolve: function(relativePath) {
    var res = this._sURL.resolve(relativePath);
    var re = new RegExp("^" + this._prePath, "i");
    return res.replace(re, this._prePath);
  },

  get asciiSpec() {
    var path = this._sURL.asciiSpec.replace(/^s3:\/\/[^\/]+/, "");
    return "s3://" + this.asciiHost + path;
  },

  get asciiHost() {
    var host = "";
    for (i = 0; i < this._host.length; i++) {
      var c = this._host.charCodeAt(i);
      if (c > 0x7f) {
        host += "%" + c.toString(16);
      } else {
        host += this._host[i];
      }
    }

    return host;
  },

  get originCharset() { return this._sURL.originCharset; },

  get filePath() { return this._sURL.filePath; },
  get param() { return this._sURL.param; },
  get query() { return this._sURL.query; },
  get ref() { return this._sURL.ref; },
  get directory() { return this._sURL.directory; },
  get fileName() { return this._sURL.fileName; },
  get fileBaseName() { return this._sURL.fileBaseName; },
  get fileExtension() { return this._sURL.fileExtension; },

  set filePath(filePath) { this._sURL.filePath = filePath; },
  set param(param) { this._sURL.param = param; },
  set ref(ref) { this._sURL.ref = ref; },
  set directory(directory) { this._sURL.directory = directory; },
  set fileName(fileName) { this._sURL.fileName = fileName; },
  set fileBaseName(fileBaseName) { this._sURL.fileBaseName = fileBaseName; },
  set fileExtension(fileExtension) { this._sURL.fileExtension = fileExtension; },

  getCommonBaseSpec: function(aURIToCompare) {
    // XXX: this is not correct, host part is case sensitive
    return this._sURL.getCommonBaseSpec(aURIToCompare);
  },
  getRelativeSpec: function(aURIToCompare) {
    // XXX: this is not correct, host part is case sensitive
    return this._sURL.getRelativeBaseSpec(aURIToCompare);
  },

  getInterfaces: function(aCount) {
    var interfaces = [CI.nsIURL, CI.nsIURI, CI.nsIClassInfo];
    aCount.value = interfaces.length;
    return interfaces;
  },

  getHelperForLanguage: function(aLanguage) null,

  get contractID() { return ""; },
  get classDescription() { return "S3 URL"; },
  get classID() { return ""; },
  get implementationLanguage() { return CI.nsIProgrammingLanguage.JAVASCRIPT; },
  get flags() { return 0; },

  QueryInterface: XPCOMUtils.generateQI([CI.nsIURL, CI.nsIURI, CI.nsIClassInfo])
};

/******************************************************************************
 * Channel implementation
 ******************************************************************************/

var subdomainable = new RegExp("^[a-z0-9]+(\.[a-z0-9]+)*$");

function s3Channel(aURI) {
  this._uri = aURI;
  this.originalURI = aURI;

  var bucket = aURI.spec.split('/')[2];
  var key = aURI.spec.slice(6+bucket.length).split('?')[0];

  if (bucket.match(subdomainable)) {
    var url = 'http://'+bucket+'.s3.amazonaws.com/' + key;
  }
  else {
    var url = 'http://s3.amazonaws.com/' + bucket + '/' + key;
  }

  var ios = CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService);
  this._subChannel = ios.newChannel(url, null, null);

  this._subChannel.QueryInterface(CI.nsIHttpChannel);
  this._subChannel.QueryInterface(CI.nsIHttpChannelInternal);
  this._subChannel.QueryInterface(CI.nsICachingChannel);

  s3_auth(this._subChannel, '/'+bucket+'/'+key);
}

s3Channel.prototype._redirectChannel =
function s3Channel__redirectChannel(aSpec) {
  const NS_BINDING_REDIRECTED = 0x804b0003;
  var ios = CC["@mozilla.org/network/io-service;1"]
                      .getService(CI.nsIIOService);
  var channel = ios.newChannel(aSpec, null, null);

  channel.asyncOpen(this._listener, this._context);
  this.cancel(NS_BINDING_REDIRECTED);

  channel.originalURI = this._uri;

  this._listener = null;
  this._context = null;
};

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

    if ((KEY != '') && (SECRET_KEY != '')) {
      var http_date = (new Date()).toUTCString();

      var s = "GET\n\n\n" + http_date + "\n" + resource;
      var signature = hmacSHA1(s, SECRET_KEY);
      channel.setRequestHeader("Date", http_date, false);
      channel.setRequestHeader("Authorization", "AWS "+KEY+":"+signature, false);
    }
  } catch (ex) {
    // if the key or secret key isn't set, we don't need
    // to set any headers, make the call anonymously
  }
}

s3Channel.prototype.open =
function s3Channel_open() {
  throw CR.NS_ERROR_NOT_IMPLEMENTED;
};

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
    throw CR.NS_ERROR_INVALID_ARG;
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
};

s3Channel.prototype.setRequestHeader =
function s3Channel_setRequestHeader(aHeader, aValue, aMerge) {
  this._subChannel.setRequestHeader(aHeader, aValue, aMerge);
};

s3Channel.prototype.visitRequestHeaders =
function s3Channel_visitRequestHeaders(aVisitor) {
  this._subChannel.visitRequestHeaders(aVisitor);
};

s3Channel.prototype.getResponseHeader =
function s3Channel_getResponseHeader(aHeader) {
  return this._subChannel.getResponseHeader(aHeader);
};

s3Channel.prototype.setResponseHeader =
function s3Channel_setResponseHeader(aHeader, aValue, aMerge) {
  this._subChannel.setResponseHeader(aHeader, aValue, aMerge);
};

s3Channel.prototype.visitResponseHeaders =
function s3Channel_visitResponseHeaders(aVisitor) {
  this._subChannel.visitResponseHeaders(aVisitor);
};

s3Channel.prototype.isNoStoreResponse =
function s3Channel_isNoStoreResponse() {
  return this._subChannel.isNoStoreResponse();
};

s3Channel.prototype.isNoCacheResponse =
function s3Channel_isNoCacheResponse() {
  return this._subChannel.isNoCacheResponse();
};

/******************************************************************************
 * nsIHttpChannelInternal
 ******************************************************************************/

s3Channel.prototype.__defineGetter__("documentURI",
function s3Channel_getter_documentURI() {
  return this._subChannel.documentURI;
});

s3Channel.prototype.__defineSetter__("documentURI",
function s3Channel_setter_documentURI(aValue) {
  this._subChannel.documentURI = aValue;
});

s3Channel.prototype.__defineGetter__("proxyInfo",
function s3Channel_getter_proxyInfo() {
  return this._subChannel.proxyInfo;
});

s3Channel.prototype.getRequestVersion =
function s3Channel_getRequestVersion(aMajor, aMinor) {
  this._subChannel.getRequestVersion(aMajor, aMinor);
};

s3Channel.prototype.getResponseVersion =
function s3Channel_getResponseVersion(aMajor, aMinor) {
  this._subChannel.getResponseVersion(aMajor, aMinor);
};

s3Channel.prototype.setCookie =
function s3Channel_setCookie(aCookieHeader) {
  this._subChannel.setCookie(aCookieHeader);
};

/******************************************************************************
 * nsICachingChannel
 ******************************************************************************/

s3Channel.prototype.__defineGetter__("cacheToken",
function s3Channel_getter_cacheToken() {
  return this._subChannel.cacheToken;
});

s3Channel.prototype.__defineSetter__("cacheToken",
function s3Channel_setter_cacheToken(aValue) {
  this._subChannel.cacheToken = aValue;
});

s3Channel.prototype.__defineGetter__("cacheKey",
function s3Channel_getter_cacheKey() {
  return this._subChannel.cacheKey;
});

s3Channel.prototype.__defineSetter__("cacheKey",
function s3Channel_setter_cacheKey(aValue) {
  this._subChannel.cacheKey = aValue;
});

s3Channel.prototype.__defineGetter__("cacheAsFile",
function s3Channel_getter_cacheAsFile() {
  return this._subChannel.cacheAsFile;
});

s3Channel.prototype.__defineSetter__("cacheAsFile",
function s3Channel_setter_cacheAsFile(aValue) {
  this._subChannel.cacheAsFile = aValue;
});

s3Channel.prototype.__defineGetter__("cacheFile",
function s3Channel_getter_cacheFile() {
  return this._subChannel.cacheFile;
});

s3Channel.prototype.isFromCache =
function s3Channel_isFromCache() {
  return this._subChannel.isFromCache();
};

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
};

s3Channel.prototype.isPending =
function s3Channel_isPending() {
  return this._subChannel.isPending();
};

s3Channel.prototype.resume =
function s3Channel_resume() {
  this._subChannel.resume();
};

s3Channel.prototype.suspend =
function s3Channel_suspend() {
  this._subChannel.suspend();
};

/******************************************************************************
 * nsIStreamListener
 ******************************************************************************/

s3Channel.prototype.onDataAvailable =
function s3Channel_onDataAvailable(aRequest, aContext, aInputStream, aOffset, aCount) {
  this._listener.onDataAvailable(aRequest, this._context, aInputStream, aOffset, aCount);
};

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
};

s3Channel.prototype.onStopRequest =
function s3Channel_onStopRequest(aRequest, aContext, aStatusCode) {
  if (this._listener) {
    this._listener.onStopRequest(aRequest, this._context, aStatusCode);
  }
};

/******************************************************************************
 * nsIClassInfo
 ******************************************************************************/

s3Channel.prototype.getInterfaces =
function (aCount) {
  var interfaces = [CI.nsIRequest,
                    CI.nsIChannel,
                    CI.nsIHttpChannel,
                    CI.nsIHttpChannelInternal,
                    CI.nsICachingChannel,
                    CI.nsIStreamListener,
                    CI.nsIRequestObserver,
                    CI.nsIClassInfo];
  aCount.value = interfaces.length;
  return interfaces;
};

s3Channel.prototype.getHelperForLanguage = function (aLanguage) { return null; };
s3Channel.prototype.contractID = CONTRACT_ID;
s3Channel.prototype.classDescription = CLASS_NAME;
s3Channel.prototype.classID = CLASS_ID;
s3Channel.prototype.implementationLanguage = CI.nsIProgrammingLanguage.JAVASCRIPT;
s3Channel.prototype.flags = null;
s3Channel.prototype.QueryInterface =
function (aIID) {
  if (!aIID.equals(CI.nsISupports) &&
      !aIID.equals(CI.nsIRequest) &&
      !aIID.equals(CI.nsIChannel) &&
      !aIID.equals(CI.nsIHttpChannel) &&
      !aIID.equals(CI.nsIHttpChannelInternal) &&
      !aIID.equals(CI.nsICachingChannel) &&
      !aIID.equals(CI.nsIStreamListener) &&
      !aIID.equals(CI.nsIRequestObserver) &&
      !aIID.equals(CI.nsIClassInfo))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
};


function NSGetModule(aCompMgr, aFileSpec) {
  return XPCOMUtils.generateModule([S3Handler]);
}


function hmacSHA1(data, secret) {
  var uconv = CC["@mozilla.org/intl/scriptableunicodeconverter"]
              .createInstance(CI.nsIScriptableUnicodeConverter);
  uconv.charset = "utf-8";

  var dataarray = uconv.convertToByteArray(data, []);

  var keyObject = CC["@mozilla.org/security/keyobjectfactory;1"]
                  .getService(CI.nsIKeyObjectFactory)
                  .keyFromString(CI.nsIKeyObject.HMAC, key);

  var cryptoHMAC = CC["@mozilla.org/security/hmac;1"]
                   .createInstance(CI.nsICryptoHMAC);
  cryptoHMAC.init(CI.nsICryptoHMAC.SHA1, keyObject);
  cryptoHMAC.update(dataarray, dataarray.length);
  return cryptoHMAC.finish(true);
}
