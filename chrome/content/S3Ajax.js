/**
    S3Ajax v0.1 - An AJAX wrapper package for Amazon S3

    http://decafbad.com/trac/wiki/S3Ajax
    l.m.orchard@pobox.com
    Share and Enjoy.

    Requires:
        http://pajhome.org.uk/crypt/md5/sha1.js
*/

S3Ajax = {

    // Defeat caching with query params on GET requests?
    DEFEAT_CACHE: false,

    // Default ACL to use when uploading keys.
    DEFAULT_ACL: 'public-read',

    // Default content-type to use in uploading keys.
    DEFAULT_CONTENT_TYPE: 'text/plain',

    /**
        DANGER WILL ROBINSON - Do NOT fill in your KEY_ID and SECRET_KEY
        here.  These should be supplied by client-side code, and not
        stored in any server-side files.  Failure to protect your S3
        credentials will result in surly people doing nasty things
        on your tab.

        For example, scoop values up from un-submitted form fields like so:

    */
    URL:        'http://s3.amazonaws.com',
    KEY_ID:     '',
    SECRET_KEY: '',

    // Flip this to true to potentially get lots of wonky logging.
    DEBUG: false,

    /**
        Get contents of a key in a bucket.
    */
    get: function(bucket, key, cb, err_cb) {
        return this.httpClient({
            method:   'GET',
            resource: '/' + bucket + '/' + key,
            load: function(req, obj) {
                if (cb)     return cb(req, req.responseText);
            },
            error: function(req, obj) {
                if (err_cb) return err_cb(req, obj);
                if (cb)     return cb(req, req.responseText);
            }
        })
    },

    /**
        Head the meta of a key in a bucket.
    */
    head: function(bucket, key, cb, err_cb) {
        return this.httpClient({
            method:   'HEAD',
            resource: '/' + bucket + '/' + key,
            load: function(req, obj) {
                if (cb)     return cb(req, req.responseText);
            },
            error: function(req, obj) {
                if (err_cb) return err_cb(req, obj);
                if (cb)     return cb(req, req.responseText);
            }
        })
    },

    /**
        Put data into a key in a bucket.
    */
    put: function(bucket, key, content, params, cb, err_cb) {
        if (!params.content_type)
            params.content_type = this.DEFAULT_CONTENT_TYPE;
        if (!params.acl)
            params.acl = this.DEFAULT_ACL;

        return this.httpClient({
            method:       'PUT',
            resource:     '/' + bucket + '/' + key,
            content:      content,
            content_type: params.content_type,
            meta:         params.meta,
            acl:          params.acl,
            load: function(req, obj) {
                if (cb)     return cb(req);
            },
            error: function(req, obj) {
                if (err_cb) return err_cb(req, obj);
                if (cb)     return cb(req, obj);
            }
        });
    },

    /**
        List buckets belonging to the account.
    */
    listBuckets: function(cb, err_cb) {
        return this.httpClient({
            method:'GET', resource:'/',
            force_lists: [ 'ListAllMyBucketsResult.Buckets.Bucket' ],
            load: cb, error:err_cb
        });
    },

    /**
        Create a new bucket for this account.
    */
    createBucket: function(bucket, cb, err_cb) {
        return this.httpClient({
            method:'PUT', resource:'/'+bucket, load:cb, error:err_cb
        });
    },

    /**
        Delete an empty bucket.
    */
    deleteBucket: function(bucket, cb, err_cb) {
        return this.httpClient({
            method:'DELETE', resource:'/'+bucket, load:cb, error:err_cb
        });
    },

    /**
        Given a bucket name and parameters, list keys in the bucket.
    */
    listKeys: function(bucket, params, cb, err_cb) {
        return this.httpClient({
            method:'GET', resource: '/'+bucket,
            force_lists: [ 'ListBucketResult.Contents' ],
            params:params, load:cb, error:err_cb
        });
    },

    /**
        Delete a single key in a bucket.
    */
    deleteKey: function(bucket, key, cb, err_cb) {
        return this.httpClient({
            method:'DELETE', resource: '/'+bucket+'/'+key, load:cb, error:err_cb
        });
    },

    /**
        Delete a list of keys in a bucket, with optional callbacks
        for each deleted key and when list deletion is complete.
    */
    deleteKeys: function(bucket, list, one_cb, all_cb) {
        var _this = this;

        // If the list is empty, then fire off the callback.
        if (!list.length && all_cb) return all_cb();

        // Fire off key deletion with a callback to delete the
        // next part of list.
        var key = list.shift();
        this.deleteKey(bucket, key, function() {
            if (one_cb) one_cb(key);
            _this.deleteKeys(bucket, list, one_cb, all_cb);
        });
    },

    /**
        Perform an authenticated S3 HTTP query.
    */
    httpClient: function(kwArgs) {
        var _this = this;

        // If need to defeat cache, toss in a date param on GET.
        if (this.DEFEAT_CACHE && ( kwArgs.method == "GET" || kwArgs.method == "HEAD" ) ) {
            if (!kwArgs.params) kwArgs.params = {};
            kwArgs.params["___"] = new Date().getTime();
        }

        // Prepare the query string and URL for this request.
        var qs   = (kwArgs.params) ? '?'+queryString(kwArgs.params) : '';
        var url  = this.URL + kwArgs.resource + qs;
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
            s += kwArgs.resource;

            // Sign the string with our SECRET_KEY.
            var signature = this.hmacSHA1(s, this.SECRET_KEY);
            hdrs['Authorization'] = "AWS "+this.KEY_ID+":"+signature;
        }

        // Perform the HTTP request.
        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
        req.open(kwArgs.method, url, true);
        for (var k in hdrs) req.setRequestHeader(k, hdrs[k]);
        req.onreadystatechange = function() {
            if (req.readyState == 4) {

                // Pre-digest the XML if needed.
                var obj = null;
                if (req.responseXML && kwArgs.parseXML != false)
                    obj = _this.xmlToObj(req.responseXML, kwArgs.force_lists);

                // Stash away the last request details, if DEBUG active.
                if (_this.DEBUG) {
                    window._lastreq = req;
                    window._lastobj = obj;
                }

                // Dispatch to appropriate handler callback
                if ( (req.status >= 400 || (obj && obj.Error) ) && kwArgs.error)
                    return kwArgs.error(req, obj);
                else
                    return kwArgs.load(req, obj);

            }
        }
        req.send(kwArgs.content);
        return req;
    },

    /**
        Turn a simple structure of nested XML elements into a
        JavaScript object.

        TODO: Handle attributes?
    */
    xmlToObj: function(parent, force_lists, path) {
        var obj = {};
        var cdata = '';
        var is_struct = false;

        for(var i=0,node; node=parent.childNodes[i]; i++) {
            if (3 == node.nodeType) {
                cdata += node.nodeValue;
            } else {
                is_struct = true;
                var name  = node.nodeName;
                var cpath = (path) ? path+'.'+name : name;
                var val   = arguments.callee(node, force_lists, cpath);

                if (!obj[name]) {
                    var do_force_list = false;
                    if (force_lists) {
                        for (var j=0,item; item=force_lists[j]; j++) {
                            if (item == cpath) {
                                do_force_list=true; break;
                            }
                        }
                    }
                    obj[name] = (do_force_list) ? [ val ] : val;
                } else if (obj[name].length) {
                    // This is a list of values to append this one to the end.
                    obj[name].push(val);
                } else {
                    // Has been a single value up till now, so convert to list.
                    obj[name] = [ obj[name], val ];
                }
            }
        }

        // If any subnodes were found, return a struct - else return cdata.
        return (is_struct) ? obj : cdata;
    },

    /**
        Abstract HMAC SHA1 signature calculation.
    */
    hmacSHA1: function(data, secret) {
        // TODO: Alternate Dojo implementation?
        return b64_hmac_sha1(secret, data)+'=';
    },
};

// Swiped from MochiKit
function queryString(params) {
    var l = [];
    for (k in params)
        l.push(k+'='+encodeURIComponent(params[k]))
    return l.join("&");
}
