var EXPORTED_SYMBOLS = ['Services'];

/**
 * Lazy getters for services
 */
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

// Firefox < 3.6 does not have service lazy getter function
if(typeof XPCOMUtils.defineLazyServiceGetter !== "function") {
	XPCOMUtils.defineLazyServiceGetter = function(obj, name, contract, iface) {
		obj.__defineGetter__(name, function XPCU_serviceGetter() {
			delete obj[name];
			return obj[name] = Components.classes[contract].getService(Components.interfaces[iface]);
		});
	};
}

var Services = $ = {};

XPCOMUtils.defineLazyServiceGetter($, 'prefService', '@mozilla.org/preferences-service;1', 'nsIPrefService');
XPCOMUtils.defineLazyServiceGetter($, 'extensionManager', '@mozilla.org/extensions/manager;1', 'nsIExtensionManager');
XPCOMUtils.defineLazyServiceGetter($, 'jsSubScriptLoader', '@mozilla.org/moz/jssubscript-loader;1', 'mozIJSSubScriptLoader');
XPCOMUtils.defineLazyServiceGetter($, 'clipboardHelper', '@mozilla.org/widget/clipboardhelper;1', 'nsIClipboardHelper');
XPCOMUtils.defineLazyServiceGetter($, 'json', '@mozilla.org/dom/json;1', 'nsIJSON');
XPCOMUtils.defineLazyServiceGetter($, 'xulRuntime', '@mozilla.org/xre/app-info;1', 'nsIXULRuntime');
XPCOMUtils.defineLazyServiceGetter($, 'windowMediator', '@mozilla.org/appshell/window-mediator;1', 'nsIWindowMediator');
XPCOMUtils.defineLazyServiceGetter($, 'messenger', '@mozilla.org/messenger;1', 'nsIMessenger');
XPCOMUtils.defineLazyServiceGetter($, 'console', '@mozilla.org/consoleservice;1', 'nsIConsoleService');
XPCOMUtils.defineLazyServiceGetter($, 'versionComparator', '@mozilla.org/xpcom/version-comparator;1', 'nsIVersionComparator');
