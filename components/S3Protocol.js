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

    var channel;
    if (bucket == '') {
      channel = ios.newChannel("chrome://s3/content/accounts.html", null, null);
    } else {
      var key = real.slice(6 + bucket.length);

      if (key == '' || key[key.length-1] == '/') {
        channel = ios.newChannel("chrome://s3/content/browse-xslt.html", null, null);
      } else {
        channel = new S3Channel(aURI);
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

  this.__proto__.__proto__ = this._sURL;
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

  this.__proto__.__proto__ = aListener;
}

S3StreamListener.prototype = {
  onStartRequest: function S3C_onStartRequest(aRequest, aContext) {
    var httpChannel = aRequest.QueryInterface(CI.nsIHttpChannel);
    if (httpChannel.responseStatus == 200) {
      this._listener.onStartRequest(aRequest, this._context);
    } else {
      this._redirectChannel(httpChannel,
                            "chrome://s3/content/browse-xslt.html");
    }
  },

  _redirectChannel: function S3SL__redirectChannel(aOldChannel, aSpec) {
    var ios = CC["@mozilla.org/network/io-service;1"]
              .getService(CI.nsIIOService);
    var channel = ios.newChannel(aSpec, null, null);

    channel.asyncOpen(this._listener, this._context);
    aOldChannel.cancel(CR.NS_BINDING_REDIRECTED);

    channel.originalURI = aOldChannel.originalURI;
  }
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

  this.__proto__.__proto__ = this._subChannel;

  authS3(this._subChannel, '/' + bucket + '/' + key);
}

S3Channel.prototype = {
  // nsIChannel
  get URI() { return this._uri },

  asyncOpen: function S3C_asyncOpen(aListener, aContext) {
    var listener = new S3StreamListener(aListener, aContext);
    this._subChannel.asyncOpen(listener, aContext);
    this._subChannel.originalURI = this._uri;
  },

  open: function S3C_open() { throw CR.NS_ERROR_NOT_IMPLEMENTED; },

  // nsIHttpChannel
  get requestMethod() { return this._subChannel.requestMethod; },
  set requestMethod(aValue) {
    if (aValue == "GET" || aValue == "HEAD") {
      this._subChannel.requestMethod = aValue;
    } else {
      throw CR.NS_ERROR_INVALID_ARG;
    }
  },

  // nsIRequest
  get name() { return this._uri.spec; },

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

function hmacSHA1(data, secret) {
  var uconv = CC["@mozilla.org/intl/scriptableunicodeconverter"]
              .createInstance(CI.nsIScriptableUnicodeConverter);
  uconv.charset = "utf-8";

  var dataarray = uconv.convertToByteArray(data, []);

  var keyObject = CC["@mozilla.org/security/keyobjectfactory;1"]
                  .getService(CI.nsIKeyObjectFactory)
                  .keyFromString(CI.nsIKeyObject.HMAC, secret);

  var cryptoHMAC = CC["@mozilla.org/security/hmac;1"]
                   .createInstance(CI.nsICryptoHMAC);
  cryptoHMAC.init(CI.nsICryptoHMAC.SHA1, keyObject);
  cryptoHMAC.update(dataarray, dataarray.length);
  return cryptoHMAC.finish(true);
}
