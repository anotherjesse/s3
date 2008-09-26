/**
    S3Ajax v0.2 - An AJAX wrapper package for Amazon S3

    http://decafbad.com/trac/wiki/S3Ajax
    l.m.orchard@pobox.com
    Share and Enjoy.

    0.1 original version
    0.2 use FF3's built-in crypto

*/

Components.utils.import("resource://s3/auth.js");

S3Ajax = {

    // Defeat caching with query params on GET requests?
    DEFEAT_CACHE: false,

    // Default ACL to use when uploading keys.
    DEFAULT_ACL: 'public-read',

    // Default content-type to use in uploading keys.
    DEFAULT_CONTENT_TYPE: 'text/plain',

    // Flip this to true to potentially get lots of wonky logging.
    DEBUG: false,

    // Test if a bucket can use the subdomain s3 url (required for EU)
    SUBDOMAINABLE: new RegExp("^[a-z0-9]+(\.[a-z0-9]+)*$"),

    /**
        Get contents of a key in a bucket.
    */
    get: function(bucket, key, cb, err_cb) {
        return this.httpClient({
				 method: 'GET',
				 bucket: bucket,
				 key:    key,
				 load:   cb,
				 error:  err_cb
			       });
    },

    /**
        Head the meta of a key in a bucket.
    */
    head: function(bucket, key, cb, err_cb) {
        return this.httpClient({
				 method: 'HEAD',
				 bucket: bucket,
				 key:    key,
				 load:   cb,
				 error:  err_cb
			       });
    },

    /**
        Put data into a key in a bucket.
    */
    put: function(bucket, key, file, params, cb, err_cb) {
        if (!params.content_type)
            params.content_type = this.DEFAULT_CONTENT_TYPE;
        if (!params.acl)
            params.acl = this.DEFAULT_ACL;

        return this.httpClient({
				 method:       'PUT',
				 bucket:       bucket,
				 key:          key,
				 file:         file,
				 content_type: params.content_type,
				 meta:         params.meta,
				 acl:          params.acl,
				 load:         cb,
				 error:        err_cb
			       });
    },

    /**
        List buckets belonging to the account.
    */
    listBuckets: function(cb, err_cb) {
        return this.httpClient({
				 method:      'GET',
				 resource:    '/',
				 force_lists: [ 'ListAllMyBucketsResult.Buckets.Bucket' ],
				 load:        cb,
				 error:       err_cb
			       });
    },

    /**
        Create a new bucket for this account.
    */
    createBucket: function(bucket, cb, err_cb, acl, location) {
        var content;
        if (location && location != 'US') {
          content = "<CreateBucketConfiguration>\n"
            + "<LocationConstraint>" + location +"</LocationConstraint>\n"
            + "</CreateBucketConfiguration>\n";
        }
        return this.httpClient({
                                 acl: acl,
				 method: 'PUT',
				 bucket: bucket,
                                 content: content,
                                 content_type: 'text/xml; charset=UTF-8',
				 load:   cb,
				 error:  err_cb
			       });
    },

    /**
        Delete an empty bucket.
    */
    deleteBucket: function(bucket, cb, err_cb) {
        return this.httpClient({
				 method: 'DELETE',
				 bucket: bucket,
				 load:   cb,
				 error:  err_cb
			       });
    },

    /**
        Given a bucket name and parameters, list keys in the bucket.
    */
    listKeys: function(bucket, params, cb, err_cb) {
        return this.httpClient({
				 method:      'GET',
				 bucket:      bucket,
				 force_lists: [ 'ListBucketResult.Contents' ],
				 params:      params,
				 load:        cb,
				 error:       err_cb
			       });
    },

    /**
        Delete a single key in a bucket.
    */
    deleteKey: function(bucket, key, cb, err_cb) {
        return this.httpClient({
				 method: 'DELETE',
				 bucket: bucket,
				 key:    key,
				 load:   cb,
				 error:  err_cb
			       });
    },

    /**
        Delete a list of keys in a bucket, with optional callbacks
        for each deleted key and when list deletion is complete.
    */
    deleteKeys: function(bucket, list, one_cb, all_cb) {
        var inst = this;

        // If the list is empty, then fire off the callback.
        if (!list.length && all_cb) return all_cb();

        // Fire off key deletion with a callback to delete the
        // next part of list.
        var key = list.shift();
        this.deleteKey(bucket, key, function() {
            if (one_cb) one_cb(key);
            inst.deleteKeys(bucket, list, one_cb, all_cb);
        });
    },

    /**
        Perform an authenticated S3 HTTP query.
    */
    httpClient: function(kwArgs) {

        if (kwArgs.resource) {
	  var domain = "s3.amazonaws.com";
	  var path = kwArgs.resource;
	  var resource = kwArgs.resource;
	}
	else {
	  if (kwArgs.bucket.match(this.SUBDOMAINABLE)) {
	    var domain = kwArgs.bucket+'.s3.amazonaws.com';
	    var path = '/' + (kwArgs.key || '');
	  }
	  else {
	    var domain = 's3.amazonaws.com';
	    var path = '/' + kwArgs.bucket + '/' + (kwArgs.key || '');
	  }
	  var resource = '/' + kwArgs.bucket + '/' + (kwArgs.key || '');
	}

        var inst = this;

        // If need to defeat cache, toss in a date param on GET.
        if (this.DEFEAT_CACHE && ( kwArgs.method == "GET" || kwArgs.method == "HEAD" ) ) {
            if (!kwArgs.params) kwArgs.params = {};
            kwArgs.params["___"] = new Date().getTime();
        }

        // Prepare the query string and URL for this request.
        var qs   = (kwArgs.params) ? '?'+queryString(kwArgs.params) : '';
        var url  = 'http://' + domain + path + qs;
        var hdrs = {};

        // Handle Content-Type header
        if (!kwArgs.content_type && kwArgs.method == 'PUT')
            kwArgs.content_type = 'text/plain';
        if (kwArgs.content_type)
            hdrs['Content-Type'] = kwArgs.content_type;
        else
            kwArgs.content_type = '';

        // Set the timestamp for this request.
        var http_date = (new Date()).toUTCString();
        hdrs['Date']  = http_date;

        var content_MD5 = '';
        var content = kwArgs.content;

        if (kwArgs.file) {
          var tmpInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
          tmpInputStream.init(kwArgs.file, 1, 0644, 0);
          var tmpInputBufferStream = Cc["@mozilla.org/network/buffered-input-stream;1"].createInstance(Ci.nsIBufferedInputStream);
          tmpInputBufferStream.init(tmpInputStream, 65536 * 4);
          var ch = Components.classes["@mozilla.org/security/hash;1"]
                     .createInstance(Components.interfaces.nsICryptoHash);

          ch.init(ch.MD5);
          // this tells updateFromStream to read the entire ch
          ch.updateFromStream(tmpInputBufferStream, PR_UINT32_MAX);
          // pass true here to get base64 digest
          content_MD5 = ch.finish(true);

          tmpInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
          tmpInputStream.init(kwArgs.content, 1, 0644, 0);
          tmpInputBufferStream = Cc["@mozilla.org/network/buffered-input-stream;1"].createInstance(Ci.nsIBufferedInputStream);
          tmpInputBufferStream.init(tmpInputStream, 65536 * 4);
          content = tmpInputBufferStream;
        }

        // Handle the ACL parameter
        var acl_header_to_sign = '';
        if (kwArgs.acl) {
            hdrs['x-amz-acl'] = kwArgs.acl;
            acl_header_to_sign = "x-amz-acl:"+kwArgs.acl+"\n";
        }

        // Handle the metadata headers
        var meta_to_sign = '';
        if (kwArgs.meta) {
            for (var k in kwArgs.meta) {
                hdrs['x-amz-meta-'+k] = kwArgs.meta[k];
                meta_to_sign += "x-amz-meta-"+k+":"+kwArgs.meta[k]+"\n";
            }
        }

        // Only perform authentication if non-anonymous and credentials available
        if (kwArgs['anonymous'] != true && this.KEY_ID && this.SECRET_KEY) {

            // Build the string to sign for authentication.
            var s;
            s  = kwArgs.method + "\n";
            s += content_MD5 + "\n";
            s += kwArgs.content_type + "\n";
            s += http_date + "\n";
            s += acl_header_to_sign;
            s += meta_to_sign;
            s += resource;

            // Sign the string with our SECRET_KEY.
            var signature = hmacSHA1(s, this.SECRET_KEY);
            hdrs['Authorization'] = "AWS "+this.KEY_ID+":"+signature;
        }

        // Perform the HTTP request.
        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1']
		    .createInstance(Components.interfaces.nsIXMLHttpRequest);
        req.open(kwArgs.method, url, true);
        for (var k in hdrs) req.setRequestHeader(k, hdrs[k]);
        req.onreadystatechange = function() {
            if (req.readyState == 4) {

                // Stash away the last request details, if DEBUG active.
                if (inst.DEBUG) {
                    window._lastreq = req;
                }

                // Dispatch to appropriate handler callback
                // FIXME: also check if responseXML contains an error
                if ( (req.status >= 400) && kwArgs.error)
                    return kwArgs.error(req);
                else if (kwArgs.load)
                    return kwArgs.load(req);
            }
        };
        req.send(content);
        return req;
    }
};

// Swiped from MochiKit
function queryString(params) {
    var l = [];
    for (k in params)
      l.push(k+'='+encodeURIComponent(params[k]));
    return l.join("&");
}
