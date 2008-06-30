var EXPORTED_SYMBOLS = ['s3_auth'];

var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                     .getService(Components.interfaces.nsILoginManager);

var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo,
					     "init");

function getLogins() {
  return loginManager.findLogins({}, 'chrome://s3', 'S3 Credentials', null);
}


var s3_auth = {
  clear: function s3_auth_clear() {
    var logins = getLogins();

    for (var i = 0; i < logins.length; i++) {
      loginManager.removeLogin(logins[i]);
    }
  },

  get: function s3_auth_get() {
    var logins = getLogins();

    // return just the first entry until we deal with multiple accounts
    if (logins.length > 0) {
      return {key: logins[0].username, secret: logins[0].password};
    }
  },

  set: function s3_auth_set(key, secret) {
    var logins = getLogins();

    var newLogin = new nsLoginInfo('chrome://s3',
                                   'S3 Credentials', null,
                                   key, secret, "", "");

    if (logins.length > 0) {
      loginManager.modifyLogin(logins[0], newLogin);
    } else {
      loginManager.addLogin(newLogin);
    }
  }
};

(function s3_upgrade_credentials() {
   const PREFS = Components.classes['@mozilla.org/preferences-service;1']
                   .getService(Components.interfaces.nsIPrefService)
                   .getBranch('extension.s3.');

   try {
     var key = PREFS.getCharPref('key');
     var secret = PREFS.getCharPref('secret_key');
     s3_auth.set(key, secret);
   } catch(e) {}

   // always delete prefs with key/secret_key

   try {
     PREFS.clearUserPref('key');
   } catch(e) {}

   try {
     PREFS.clearUserPref('secret_key');
   } catch(e) {}
 })();