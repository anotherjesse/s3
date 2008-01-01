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

const CI = Components.interfaces;
const CC = Components.classes;
const CR = Components.results;

const S3_CID        = Components.ID('{062723c0-1871-11dc-8314-0800200c9a66}');
const S3_CONTRACTID = '@mozilla.org/rdf/datasource;1?name=s3';

function S3Service() {
    this.dataSource = CC["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"].createInstance(CI.nsIRDFDataSource);
}

//////////////////////////////////////////////////////////////////////////////
// Time to Wrap
//////////////////////////////////////////////////////////////////////////////

S3Service.prototype.URI = 'rdf:s3';
S3Service.prototype.GetSource = function(aProperty, aTarget, aTruthValue) {
    return this.dataSource.GetSource(aProperty, aTarget, aTruthValue); 
}
S3Service.prototype.GetSources = function(aProperty, aTarget, aTruthValue) {
    return this.dataSource.GetSources(aProperty, aTarget, aTruthValue); 
}
S3Service.prototype.GetTarget = function(aSource, aProperty, aTruthValue) {
    return this.dataSource.GetTarget(aSource, aProperty, aTruthValue); 
}
S3Service.prototype.GetTargets = function(aSource, aProperty, aTruthValue) {
    return this.dataSource.GetTargets(aSource, aProperty, aTruthValue); 
}
S3Service.prototype.Assert = function(aSource, aProperty, aTarget, aTruthValue) {
    this.dataSource.Assert(aSource, aProperty, aTarget, aTruthValue); 
}
S3Service.prototype.Unassert = function(aSource, aProperty, aTarget) {
    this.dataSource.Unassert(aSource, aProperty, aTarget); 
}
S3Service.prototype.Change = function(aSource, aProperty, aOldTarget, aNewTarget) {
    this.dataSource.Change(aSource, aProperty, aOldTarget, aNewTarget); 
}
S3Service.prototype.Move = function(aOldSource, aNewSource, aProperty, aTarget) {
    this.dataSource.Move(aOldSource, aNewSource, aProperty, aTarget); 
}
S3Service.prototype.HasAssertion = function(aSource, aProperty, aTarget, aTruthValue) {
    return this.dataSource.HasAssertion(aSource, aProperty, aTarget, aTruthValue); 
}
S3Service.prototype.AddObserver = function(aObserver) {
    this.dataSource.AddObserver(aObserver); 
}
S3Service.prototype.RemoveObserver = function(aObserver) {
    this.dataSource.RemoveObserver(aObserver); 
}
S3Service.prototype.ArcLabelsIn = function(aNode) {
    return this.dataSource.ArcLabelsIn(aNode); 
}
S3Service.prototype.ArcLabelsOut = function(aNode) {
    return this.dataSource.ArcLabelsOut(aNode); 
}
S3Service.prototype.GetAllResources = function() {
    return this.dataSource.GetAllResources(); 
}
S3Service.prototype.IsCommandEnabled = function(aSources, aCommand, aArguments) {
    return this.dataSource.IsCommandEnabled(aSources, aCommand, aArguments); 
}
S3Service.prototype.DoCommand = function(aSources, aCommand, aArguments) {
    this.dataSource.DoCommand(aSources, aCommand, aArguments); 
}
S3Service.prototype.GetAllCmds = function(aSource) {
    return this.dataSource.GetAllCmds(aSource); 
}
S3Service.prototype.hasArcIn = function(aNode, aArc) {
    return this.dataSource.hasArcIn(aNode, aArc); 
}
S3Service.prototype.hasArcOut = function(aNode, aArc) {
    return this.dataSource.hasArcOut(aNode, aArc); 
}
S3Service.prototype.beginUpdateBatch = function() {
    this.dataSource.beginUpdateBatch(); 
}
S3Service.prototype.endUpdateBatch = function() {
    this.dataSource.endUpdateBatch(); 
}
S3Service.prototype.Flush = function() {
    this.dataSource.Flush(); 
}
S3Service.prototype.FlushTo = function(aURI) {
    this.dataSource.FlushTo(aURI); 
}
S3Service.prototype.Init = function(aURI) {
    this.dataSource.Init(aURI); 
}
S3Service.prototype.Refresh = function(aBlocking) {
    this.dataSource.Refresh(aBlocking); 
}

// CRAPPY REPEATED STUFF

S3Service.prototype.flags = CI.nsIClassInfo.SINGLETON;
S3Service.prototype.classDescription = "S3 Service";
S3Service.prototype.getInterfaces = function(count) {
    var interfaceList = [CI.nsIRDFDataSource, CI.nsIClassInfo];
    count.value = interfaceList.length;
    return interfaceList;
}

S3Service.prototype.getHelperForLanguage = function(count) {return null;}

S3Service.prototype.QueryInterface = function(iid) {
    if (!iid.equals(CI.nsIRDFDataSource) &&
        !iid.equals(CI.nsIClassInfo) &&
        !iid.equals(CI.nsISupports))
        throw CR.NS_ERROR_NO_INTERFACE;
    if (iid.equals(CI.nsIRDFDataSource) && !this.dataSourceSetup) { }
    return this;
}

// Module implementation
var S3Module = new Object();

S3Module.registerSelf = function(compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface(CI.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(S3_CID, "S3 JS Component", S3_CONTRACTID, fileSpec, location, type);
}

S3Module.getClassObject = function(compMgr, cid, iid) {
    if (!cid.equals(S3_CID))
        throw CR.NS_ERROR_NO_INTERFACE;
    
    if (!iid.equals(CI.nsIFactory))
        throw CR.NS_ERROR_NOT_IMPLEMENTED;
    
    return S3ServiceFactory;
}

S3Module.canUnload = function(compMgr) {
    return true;
}
    
// factory object
var S3ServiceFactory = new Object();

S3ServiceFactory.createInstance = function(outer, iid) {
    if (outer != null)
        throw CR.NS_ERROR_NO_AGGREGATION;

    return (new S3Service()).QueryInterface(iid);
}

// entrypoint
function NSGetModule(compMgr, fileSpec) {
    return S3Module;
}
