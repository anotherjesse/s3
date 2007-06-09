//
// BEGIN FLOCK GPL
// 
// Copyright Flock Inc. 2005-2006
// http://flock.com
// 
// This file may be used under the terms of of the
// GNU General Public License Version 2 or later (the "GPL"),
// http://www.gnu.org/licenses/gpl.html
// 
// Software distributed under the License is distributed on an "AS IS" basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
// for the specific language governing rights and limitations under the
// License.
// 
// END FLOCK GPL
//

const DEBUG = false;                // set to false to suppress debug messages
const FLOCK_S3_CID              = Components.ID('{18440fbe-2f8c-4354-b4fb-dee7a009124b}');
const FLOCK_S3_CONTRACTID       = '@mozilla.org/rdf/datasource;1?name=flock-s3';
const RDFSERVICE_CONTRACTID     = '@mozilla.org/rdf/rdf-service;1';
const RDFCONTUTILS_CONTRACTID   = '@mozilla.org/rdf/container-utils;1';
const CONTAINER_CONTRACTID      = '@mozilla.org/rdf/container;1';
const PREFERENCE_CONTRACTID     = '@mozilla.org/preferences-service;1';

const nsISupports                   = Components.interfaces.nsISupports;
const nsIClassInfo                  = Components.interfaces.nsIClassInfo;
const nsIFactory                    = Components.interfaces.nsIFactory;
const nsIProperties                 = Components.interfaces.nsIProperties;
const nsILocalFile                  = Components.interfaces.nsILocalFile;
const nsIFile                       = Components.interfaces.nsIFile;
const nsIIOService                  = Components.interfaces.nsIIOService;
const nsIFileProtocolHandler        = Components.interfaces.nsIFileProtocolHandler;
const nsIRDFRemoteDataSource        = Components.interfaces.nsIRDFRemoteDataSource;
const nsIRDFDataSource              = Components.interfaces.nsIRDFDataSource;
const nsIRDFContainer               = Components.interfaces.nsIRDFContainer;
const flockIS3Service               = Components.interfaces.flockIS3Service;
const flockIError                   = Components.interfaces.flockIError;
const nsIXMLHttpRequest             = Components.interfaces.nsIXMLHttpRequest;
const nsIRDFService                 = Components.interfaces.nsIRDFService;
const nsIRDFContainerUtils          = Components.interfaces.nsIRDFContainerUtils;
const nsIPrefService                = Components.interfaces.nsIPrefService;

const XMLHTTPREQUEST_CONTRACTID     = '@mozilla.org/xmlextras/xmlhttprequest;1';
const DIRECTORY_SERVICE_CONTRACTID  = '@mozilla.org/file/directory_service;1';
const LOCAL_FILE_CONTRACTID         = '@mozilla.org/file/local;1';
const PREFERENCES_CONTRACTID        = '@mozilla.org/preferences-service;1';
const IO_SERVICE_CONTRACTID         = '@mozilla.org/network/io-service;1';
const FLOCK_ERROR_CONTRACTID        = '@flock.com/error;1'

const FLOCK_NS                      = 'http://flock.com/rdf#';
const FLOCK_RDF_S3_ROOT             = 'urn:flock:s3';

const FLOCK_S3_KEY_PREF             = 'flock.s3.key';
const FLOCK_S3_SECRET_KEY_PREF      = 'flock.s3.secret_key';

const RDFS = Components.classes[RDFSERVICE_CONTRACTID].getService (nsIRDFService);
const RDFCU = Components.classes[RDFCONTUTILS_CONTRACTID].getService (nsIRDFContainerUtils);

// rdf namespaces/*{{{*/
function Namespace (ns) { return function (arg) { return RDFS.GetResource (ns+arg); } }
const W3RDF                     = Namespace ('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const NSRDF                     = Namespace ('http://home.netscape.com/NC-rdf#');
const WBRDF                     = Namespace ('http://home.netscape.com/WEB-rdf#');
const FLRDF                     = Namespace ('http://flock.com/rdf#');
const COLRDF                    = Namespace ('urn:flock:collection:');
/*}}}*/

dump("+++++ Loading flockS3Service.js\n");

loadLibraryFromSpec('chrome://browser/content/flock/contrib/rdfds.js');
loadLibraryFromSpec('chrome://s3/content/sha1.js');
loadLibraryFromSpec('chrome://s3/content/S3Ajax.js');

function loadLibraryFromSpec(aSpec) {
    var loader = Components.classes['@mozilla.org/moz/jssubscript-loader;1']
        .getService(Components.interfaces.mozIJSSubScriptLoader);

    loader.loadSubScript(aSpec);
}

flockS3Service.prototype.isBag = function (node) {
    // is the node a sequence
    return RDFCU.IsBag (this.dataSource, node);
}

flockS3Service.prototype.Bag = function (node) {
    // make the resource a sequence if its not and return a container object
    if (!this.isBag (node)) {
        return RDFCU.MakeBag (this.dataSource, node);
    }
    var container = Components.classes[CONTAINER_CONTRACTID].createInstance (nsIRDFContainer);
    container.Init (this.dataSource, node);
    return container;
}

// a S3 object
function flockS3Object(aType) {
    var date=new Date();

    this.s3ID = "obj_" + date.getTime();
    this.uploadState = 2;
    this.isEmpty = true;
    this.size = 0;
    this.fileName = "";
    this.type = aType;
}

flockS3Object.prototype = {
    getInterfaces: function (count) {
        var interfaceList = [Components.interfaces['flockIS3Object'], nsIClassInfo];
        count.value = interfaceList.length;
        return interfaceList;
    },
    QueryInterface: function (iid) {
      if (!iid.equals(Components.interfaces.flockIS3Object))
          throw Components.results.NS_ERROR_NO_INTERFACE;
      return this;
    }
}


function flockS3Service() {
    // Just use an in-memory datasource for now
    this.dataSource = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"].createInstance(Components.interfaces.nsIRDFDataSource);
    this.init();
}

//////////////////////////////////////////////////////////////////////////////
// Implementation
//////////////////////////////////////////////////////////////////////////////

flockS3Service.prototype.mListeners = new Array();
flockS3Service.prototype.mPrefService = null;
flockS3Service.prototype.mKey = null;
flockS3Service.prototype.mSecretKey = null;

flockS3Service.prototype.init = function() {
    this.mPrefService = Components.classes[PREFERENCE_CONTRACTID]
        .getService(nsIPrefService).getBranch(null); 
    try {
        S3.KEY_ID     = this.mPrefService.getCharPref(FLOCK_S3_KEY_PREF);
        S3.SECRET_KEY = this.mPrefService.getCharPref(FLOCK_S3_SECRET_KEY_PREF); 
    } catch (ex) {
        dump( '\n\n\nyour key and secret key is NOT set\n\n\n' );
    }
}

flockS3Service.prototype.create = function(aFile) {
    var result = new flockS3Object(0);
    result.fileName = aFile.path;
    return result;
}

flockS3Service.prototype.addListener = function(aListener) {
    this.mListeners.push(aListener);
}

flockS3Service.prototype.removeListener = function(aListener) {
    for(var i=0;i<this.mListeners.length;++i) {
        if(aListener==this.mListeners[i]) {
            this.mListeners.splice(i,1);
            break;
        }
    }
}

flockS3Service.prototype.notifyListeners = function(aMode, aFriend) {
    for(var i=0;i<this.mListeners.length;++i) {
        if(aMode=="view") {
            this.mListeners[i].onViewChanged(aFriend);
        }
        else {
            this.mListeners[i].onMeChanged();
        }
    }
}

flockS3Service.prototype.remove = function(aUrl) {
  var key = aUrl.match(/^http:\/\/[^\/]*s3\.amazonaws\.com\/(.*)$/)[1];
  var inst=this;
  S3.deleteKey('flock', key, function() {
      inst.refresh();
    }, function(a,b) { dump('error deleting - ' + a.responseText + '\n\n' +  b + '\n\n');}    );

}

// adds a file to the rdf
flockS3Service.prototype.add = function(aS3Object) {
    
    var file = Components.classes["@mozilla.org/file/local;1"]
                                 .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath( aS3Object.fileName );
    
    var tmpInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Components.interfaces.nsIFileInputStream);
    tmpInputStream.init(file, 1, 0644, 0);
        
    var tmpInputBufferStream = Components.classes["@mozilla.org/network/buffered-input-stream;1"]
                .createInstance(Components.interfaces.nsIBufferedInputStream);
        
    tmpInputBufferStream.init(tmpInputStream, 65536 * 4);
    var inst=this;
    S3.put('flock', escape(file.leafName), tmpInputBufferStream, function() {
      inst.refresh();
    }, function(a,b) { dump(a.responseText + '\n\n' +  b + '\n\n');}    );
}

flockS3Service.prototype.addToRdf = function(aS3Object){
    var resource = RDFS.GetResource (aS3Object.s3ID);
    // set the attributes
    this.dataSource.Assert (resource, FLRDF('s3ID'), RDFS.GetLiteral(aS3Object.s3ID), true);
    this.dataSource.Assert (resource, FLRDF('uploadState'), RDFS.GetLiteral(aS3Object.uploadState), true);
    this.dataSource.Assert (resource, FLRDF('isEmpty'), RDFS.GetLiteral(aS3Object.isEmpty), true);
    this.dataSource.Assert (resource, FLRDF('fileName'), RDFS.GetLiteral(aS3Object.fileName), true);
    this.dataSource.Assert (resource, FLRDF('type'), RDFS.GetLiteral(aS3Object.type), true);
    this.dataSource.Assert (resource, FLRDF('size'), RDFS.GetLiteral(aS3Object.size), true);
    // Add to the collection
    var bag = this.Bag (RDFS.GetResource ("urn:flock:s3:root"));
    bag.AppendElement(resource);
}

// update the local rdf from service
flockS3Service.prototype.refresh = function(){
 // start a batch update

  // delete all entries (that are uploaded)
  var bag = this.Bag( RDFS.GetResource( "urn:flock:s3:root" ) );
  var elements = bag.GetElements();
  while (elements.hasMoreElements()) {
     var element = elements.getNext();
     bag.RemoveElement( element, false );
  }

  // add all entries from S3
   var inst = this;
   S3.listKeys( 'flock', '', function(a,b) {
   /*
    <Contents>
      <Key>test</Key>
      <LastModified>2006-06-16T21:36:42.000Z</LastModified>
      <ETag>&quot;c38c53267465d7c77eebb4c036838ecd&quot;</ETag>
      <Size>7</Size>
      <Owner>
        <ID>1952c7b2d8a7b560236f6e3d4b3f9361dfdeb278146fc130878c2c29fc9b91f8</ID>
        <DisplayName>book_burro</DisplayName>
      </Owner>
      <StorageClass>STANDARD</StorageClass>
    </Contents>
  */

     for (var i=0; i<b.ListBucketResult.Contents.length; i++) {
       var obj = new flockS3Object(0);
       obj.s3ID = 'http://flock.s3.amazonaws.com/' + b.ListBucketResult.Contents[i].Key;
       obj.type = 0; // file
       obj.size= Math.round(b.ListBucketResult.Contents[i].Size / 1024);
       obj.fileName = b.ListBucketResult.Contents[i].Key;
       inst.addToRdf(obj);
       // ' last moded ' + b.ListBucketResult.Contents[i].LastModified;
     }
   }, function() { alert('failure'); } );

  // finish batch update
}

flockS3Service.prototype.upload = function(aListener){
    var bag = this.Bag (RDFS.GetResource ("urn:flock:s3:root"));
    var elements = bag.GetElements ();
    while (elements.hasMoreElements ()) {
        var element = elements.getNext ();
        var uploadState = this.dataSource.GetTarget (element, FLRDF('uploadState'), true).QueryInterface (nsIRDFLiteral).Value;
        if (uploadState == "2") {
            
        }
        // S3.put( 'flock', element.fileName );
    }
}

flockS3Service.prototype.login = function(aListener){
}

flockS3Service.prototype.logout = function(){
}


flockS3Service.prototype.state = this.LOGGED_OUT;

//////////////////////////////////////////////////////////////////////////////

flockS3Service.prototype.URI = 'rdf:flock-s3';
flockS3Service.prototype.GetSource = function (aProperty, aTarget, aTruthValue) { /*{{{*/
    return this.dataSource.GetSource (aProperty, aTarget, aTruthValue); 
}/*}}}*/
flockS3Service.prototype.GetSources = function (aProperty, aTarget, aTruthValue) { /*{{{*/
    return this.dataSource.GetSources (aProperty, aTarget, aTruthValue); 
}/*}}}*/
flockS3Service.prototype.GetTarget = function (aSource, aProperty, aTruthValue) { /*{{{*/
    return this.dataSource.GetTarget (aSource, aProperty, aTruthValue); 
}/*}}}*/
flockS3Service.prototype.GetTargets = function (aSource, aProperty, aTruthValue) { /*{{{*/
    return this.dataSource.GetTargets (aSource, aProperty, aTruthValue); 
}/*}}}*/
flockS3Service.prototype.Assert = function (aSource, aProperty, aTarget, aTruthValue) { /*{{{*/
    this.dataSource.Assert (aSource, aProperty, aTarget, aTruthValue); 
}/*}}}*/
flockS3Service.prototype.Unassert = function (aSource, aProperty, aTarget) { /*{{{*/
    this.dataSource.Unassert (aSource, aProperty, aTarget); 
}/*}}}*/
flockS3Service.prototype.Change = function (aSource, aProperty, aOldTarget, aNewTarget) { /*{{{*/
    this.dataSource.Change (aSource, aProperty, aOldTarget, aNewTarget); 
}/*}}}*/
flockS3Service.prototype.Move = function (aOldSource, aNewSource, aProperty, aTarget) { /*{{{*/
    this.dataSource.Move (aOldSource, aNewSource, aProperty, aTarget); 
}/*}}}*/
flockS3Service.prototype.HasAssertion = function (aSource, aProperty, aTarget, aTruthValue) { /*{{{*/
    return this.dataSource.HasAssertion (aSource, aProperty, aTarget, aTruthValue); 
}/*}}}*/
flockS3Service.prototype.AddObserver = function (aObserver) { /*{{{*/
    this.dataSource.AddObserver (aObserver); 
}/*}}}*/
flockS3Service.prototype.RemoveObserver = function (aObserver) { /*{{{*/
    this.dataSource.RemoveObserver (aObserver); 
}/*}}}*/
flockS3Service.prototype.ArcLabelsIn = function (aNode) { /*{{{*/
    return this.dataSource.ArcLabelsIn (aNode); 
}/*}}}*/
flockS3Service.prototype.ArcLabelsOut = function (aNode) { /*{{{*/
    return this.dataSource.ArcLabelsOut (aNode); 
}/*}}}*/
flockS3Service.prototype.GetAllResources = function () { /*{{{*/
    return this.dataSource.GetAllResources (); 
}/*}}}*/
flockS3Service.prototype.IsCommandEnabled = function (aSources, aCommand, aArguments) { /*{{{*/
    return this.dataSource.IsCommandEnabled (aSources, aCommand, aArguments); 
}/*}}}*/
flockS3Service.prototype.DoCommand = function (aSources, aCommand, aArguments) { /*{{{*/
    this.dataSource.DoCommand (aSources, aCommand, aArguments); 
}/*}}}*/
flockS3Service.prototype.GetAllCmds = function (aSource) { /*{{{*/
    return this.dataSource.GetAllCmds (aSource); 
}/*}}}*/
flockS3Service.prototype.hasArcIn = function (aNode, aArc) { /*{{{*/
    return this.dataSource.hasArcIn (aNode, aArc); 
}/*}}}*/
flockS3Service.prototype.hasArcOut = function (aNode, aArc) { /*{{{*/
    return this.dataSource.hasArcOut (aNode, aArc); 
}/*}}}*/
flockS3Service.prototype.beginUpdateBatch = function () { /*{{{*/
    this.dataSource.beginUpdateBatch (); 
}/*}}}*/
flockS3Service.prototype.endUpdateBatch = function () { /*{{{*/
    this.dataSource.endUpdateBatch (); 
}/*}}}*/
flockS3Service.prototype.Flush = function () { /*{{{*/
    this.dataSource.Flush (); 
}/*}}}*/
flockS3Service.prototype.FlushTo = function (aURI) { /*{{{*/
    this.dataSource.FlushTo (aURI); 
}/*}}}*/
flockS3Service.prototype.Init = function (aURI) { /*{{{*/
    this.dataSource.Init (aURI); 
}/*}}}*/
flockS3Service.prototype.Refresh = function (aBlocking) { /*{{{*/
    this.dataSource.Refresh (aBlocking); 
}/*}}}*/

flockS3Service.prototype.flags = nsIClassInfo.SINGLETON;
flockS3Service.prototype.classDescription = "Flock S3 Service";
flockS3Service.prototype.getInterfaces = function (count) {
    var interfaceList = [flockIS3Service, nsIClassInfo];
    count.value = interfaceList.length;
    return interfaceList;
}

flockS3Service.prototype.getHelperForLanguage = function (count) {return null;}/*}}}*/

flockS3Service.prototype.QueryInterface =
function (iid) {
    if (!iid.equals(flockIS3Service) && 
        !iid.equals(nsIRDFDataSource) &&
        !iid.equals(nsIClassInfo) &&
        !iid.equals(nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    if (iid.equals(nsIRDFDataSource) && !this.dataSourceSetup) {
    }
    return this;
}/*}}}*/

// Module implementation/*{{{*/
var FlockS3Module = new Object();

FlockS3Module.registerSelf =
function (compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

    compMgr.registerFactoryLocation(FLOCK_S3_CID, 
                                    "Flock S3 JS Component",
                                    FLOCK_S3_CONTRACTID, 
                                    fileSpec, 
                                    location,
                                    type);
}

FlockS3Module.getClassObject =
function (compMgr, cid, iid) {
    if (!cid.equals(FLOCK_S3_CID))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    
    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    
    return flockS3ServiceFactory;
}

FlockS3Module.canUnload =
function(compMgr)
{
    debug("Unloading S3 component.\n");
    return true;
}/*}}}*/
    
/* factory object *//*{{{*/
var flockS3ServiceFactory = new Object();

flockS3ServiceFactory.createInstance =
function (outer, iid) {
    debug("CI: " + iid + "\n");
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    return (new flockS3Service()).QueryInterface(iid);
}/*}}}*/

/* entrypoint *//*{{{*/
function NSGetModule(compMgr, fileSpec) {
    return FlockS3Module;
}/*}}}*/

dump("+++++ Loaded flockS3Service.js\n");
