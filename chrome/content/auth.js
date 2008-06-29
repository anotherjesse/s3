var s3 = s3 || {};

s3.auth = new (function() {
  var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                       .getService(Components.interfaces.nsILoginManager), 

  var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
					       Components.interfaces.nsILoginInfo,
					       "init");
  function getLogins() {
    return loginManager.findLogins({}, 'chrome://s3', null, 'chrome://s3');
  }
  
  this.clear = function() {
    var logins = getLogins();
      
    for (var i = 0; i < logins.length; i++) {
      loginManager.removeLogin(logins[i]);
    }
  }

  this.get = function() {
    var logins = getLogins();

    // return just the first entry until we deal with multiple accounts
    for (var i = 0; i < logins.length; i++) {
      return {key: logins[0].username, secret: logins[0].password};
    }
  }

  this.set = function(key, secret) {
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
})();
