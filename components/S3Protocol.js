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

    if (bucket == '') {
      return ios.newChannel("chrome://s3/content/accounts.html", null, null);
    } else {
      return ios.newChannel("chrome://s3/content/list.html", null, null);
    }
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

function S3StreamListener(aListener, aContext) {
  this._listener = aListener;
  this._context = aContext;
}

S3StreamListener.prototype = {
  // nsIRequestObserver
  onStartRequest: function S3SL_onStartRequest(aRequest, aContext) {
    var httpChannel = aRequest.QueryInterface(CI.nsIHttpChannel);
    if (httpChannel.responseStatus == 200) {
      this._listener.onStartRequest(aRequest, this._context);
      this.__proto__ = this._listener;
    } else {
      this._redirectChannel(httpChannel,
                            "chrome://s3/content/browse-xslt.html");
    }
  },

  onStopRequest: function S3SL_onStopRequest(aRequest, aContext, aStatusCode) {
    this._listener.onStopRequest(aRequest, aContext, aStatusCode);
  },

  // nsIStreamListener
  onDataAvailable: function S3SL_onDataAvailable(aRequest, aContext,
                                                 aInputStream,
                                                 aOffset, aCount)
  {
    this._listener.onDataAvailable(aRequest, aContext, aInputStream,
                                   aOffset, aCount);
  },

  _redirectChannel: function S3SL__redirectChannel(aOldChannel, aSpec) {
    var ios = CC["@mozilla.org/network/io-service;1"]
              .getService(CI.nsIIOService);
    var channel = ios.newChannel(aSpec, null, null);

    channel.asyncOpen(this._listener, this._context);
    aOldChannel.cancel(CR.NS_BINDING_REDIRECTED);

    channel.originalURI = aOldChannel.originalURI;
  },

  QueryInterface: XPCOMUtils.generateQI([CI.nsIStreamListener,
                                         CI.nsIRequestObserver])
};

function S3Channel(aURI) {
  this._uri = aURI;
  this.originalURI = aURI;

  var bucket = aURI.spec.split('/')[2];
  var key = aURI.spec.slice(6 + bucket.length).split('?')[0];

  var url;
  if (bucket.match(subdomainable)) {
    url = 'http://' + bucket + '.s3.amazonaws.com/' + key;
  } else {
    url = 'http://s3.amazonaws.com/' + bucket + '/' + key;
  }

  var ios = CC["@mozilla.org/network/io-service;1"]
            .getService(CI.nsIIOService);
  this._subChannel = ios.newChannel(url, null, null);

  this._subChannel.QueryInterface(CI.nsIHttpChannel);
  this._subChannel.QueryInterface(CI.nsIHttpChannelInternal);
  this._subChannel.QueryInterface(CI.nsICachingChannel);

  authS3(this._subChannel, '/' + bucket + '/' + key);
}

S3Channel.prototype = {
  // nsIChannel
  get URI() this._uri,
  get owner() this._subChannel.owner,
  set owner(aValue) this._subChannel.owner = aValue,
  get notificationCallbacks() this._subChannel.notificationCallbacks,
  set notificationCallbacks(aValue) this._subChannel.notificationCallbacks = aValue,
  get securityInfo() this._subChannel.securityInfo,
  get contentType() this._subChannel.contentType,
  set contentType(aValue) this._subChannel.contentType = aValue,
  get contentCharset() this._subChannel.contentCharset,
  set contentCharset(aValue) this._subChannel.contentCharset = aValue,
  get contentLength() this._subChannel.contentLength,
  set contentLength(aValue) this._subChannel.contentLength = aValue,

  asyncOpen: function S3C_asyncOpen(aListener, aContext) {
    var listener = aListener ? new S3StreamListener(aListener, aContext) : null;
    this._subChannel.asyncOpen(listener, aContext);
    this._subChannel.originalURI = this._uri;
  },

  open: function S3C_open() { throw CR.NS_ERROR_NOT_IMPLEMENTED; },

  // nsIHttpChannel
  get requestMethod() this._subChannel.requestMethod,
  set requestMethod(aValue) {
    if (aValue == "GET" || aValue == "HEAD") {
      this._subChannel.requestMethod = aValue;
    } else {
      throw CR.NS_ERROR_INVALID_ARG;
    }
  },

  get referrer() this._subChannel.referrer,
  set referrer(aValue) this._subChannel.referrer = aValue,
  get allowPipelining() this._subChannel.allowPipelining,
  set allowPipelining(aValue) this._subChannel.allowPipelining = aValue,
  get redirectionLimit() this._subChannel.redirectionLimit,
  set redirectionLimit(aValue) this._subChannel.redirectionLimit = aValue,
  get responseStatus() this._subChannel.responseStatus,
  get responseStatusText() this._subChannel.responseStatusText,
  get requestSucceeded() this._subChannel.requestSucceeded,

  getRequestHeader: function S3C_getRequestHeader(aHeader) {
    return this._subChannel.getRequestHeader(aHeader);
  },
  setRequestHeader: function S3C_setRequestHeader(aHeader, aValue, aMerge) {
    this._subChannel.setRequestHeader(aHeader, aValue, aMerge);
  },
  visitRequestHeaders: function S3C_visitRequestHeaders(aVisitor) {
    this._subChannel.visitRequestHeaders(aVisitor);
  },

  getResponseHeader: function S3C_getResponseHeader(aHeader) {
    return this._subChannel.getResponseHeader(aHeader);
  },
  setResponseHeader: function S3C_setResponseHeader(aHeader, aValue, aMerge) {
    this._subChannel.setResponseHeader(aHeader, aValue, aMerge);
  },
  visitResponseHeaders: function S3C_visitResponseHeaders(aVisitor) {
    this._subChannel.visitResponseHeaders(aVisitor);
  },

  isNoStoreResponse: function S3C_isNoStoreResponse() this._subChannel.isNoStoreResponse(),
  isNoCacheResponse: function S3C_isNoCacheResponse() this._subChannel.isNoCacheResponse(),

  // nsIHttpChannelInternal
  get documentURI() this._subChannel.documentURI,
  set documentURI(aValue) this._subChannel.documentURI = aValue,

  getRequestVersion: function S3C_getRequestVersion(aMajor, aMinor) {
    return this._subChannel.getRequestVersion(aMajor, aMinor);
  },
  getResponseVersion: function S3C_getResponseVersion(aMajor, aMinor) {
    return this._subChannel.getResponseVersion(aMajor, aMinor);
  },

  setCookie: function S3C_setCookie(aCookieHeader) {
    this._subChannel.setCookie(aCookieHeader);
  },

  // nsICachingChannel
  get cacheToken() this._subChannel.cacheToken,
  set cacheToken(aValue) this._subChannel.cacheToken = aValue,
  get offlineCacheToken() this._subChannel.offlineCacheToken,
  set offlineCacheToken(aValue) this._subChannel.offlineCacheToken = aValue,
  get cacheKey() this._subChannel.cacheKey,
  set cacheKey(aValue) this._subChannel.cacheKey = aValue,
  get cacheAsFile() this._subChannel.cacheAsFile,
  set cacheAsFile(aValue) this._subChannel.cacheAsFile = aValue,
  get cacheForOfflineUse() this._subChannel.cacheForOfflineUse,
  set cacheForOfflineUse(aValue) this._subChannel.cacheForOfflineUse = aValue,
  get offlineCacheClientID() this._subChannel.offlineCacheClientID,
  set offlineCacheClientID(aValue) this._subChannel.offlineCacheClientID = aValue,
  get cacheFile() this._subChannel.cacheFile,

  isFromCache: function S3C_isFromCache() this._subChannel.isFromCache(),

  // nsIRequest
  get name() this._uri.spec,
  get status() this._subChannel.status,

  get loadGroup() this._subChannel.loadGroup,
  set loadGroup(aValue) this._subChannel.loadGroup = aValue,
  get loadFlags() this._subChannel.loadFlags,
  set loadFlags(aValue) this._subChannel.loadFlags = aValue,

  isPending: function S3C_isPending() this._subChannel.isPending(),
  cancel: function S3C_cancel(aStatus) this._subChannel.cancel(aStatus),
  suspend: function S3C_suspend() this._subChannel.suspend(),
  resume: function S3C_resume() this._subChannel.resume(),

  // nsIClassInfo
  getInterfaces: function S3C_getInterfaces(aCount) {
    var interfaces = [CI.nsIRequest, CI.nsIChannel, CI.nsIHttpChannel,
                      CI.nsIHttpChannelInternal, CI.nsICachingChannel,
                      CI.nsIClassInfo];
    aCount.value = interfaces.length;
    return interfaces;
  },
  getHelperForLanguage: function S3C_getHelperForLanguage(aLanguage) null,
  contractID: "",
  classDescription: "S3 Channel",
  classID: "",
  implementationLanguage: CI.nsIProgrammingLanguage.JAVASCRIPT,
  flags: 0,

  QueryInterface: XPCOMUtils.generateQI([CI.nsIRequest, CI.nsIChannel,
                                         CI.nsIHttpChannel,
                                         CI.nsIHttpChannelInternal,
                                         CI.nsICachingChannel,
                                         CI.nsIClassInfo])
};


function NSGetModule(aCompMgr, aFileSpec) {
  return XPCOMUtils.generateModule([S3Handler]);
}

function authS3(channel, resource) {
  CU.import("resource://s3/auth.js");

  var creds = s3_auth.get();
  if (creds) {
    var http_date = (new Date()).toUTCString();

    var s = "GET\n\n\n" + http_date + "\n" + resource;
    var signature = hmacSHA1(s, creds.secret);
    var authString = "AWS " + creds.key + ":" + signature;

    channel.setRequestHeader("Date", http_date, false);
    channel.setRequestHeader("Authorization", authString, false);
  }
}
