var EXPORTED_SYMBOLS = ['bindMethod', 'bindHandlers', 'openUrl'];

Components.utils.import("resource://qlk-modules/qlk-services.jsm");


/**
 * Bind method to the scope
 */
var bindMethod = function(fn, scope)
{
	return function() {
		return fn.apply(scope, arguments);
	};
};


/**
 * Bind all handler functions for the object
 */
var bindHandlers = function(object)
{
	for(var methodName in object) {
		if(methodName.substr(-7) === 'Handler' && typeof object[methodName] == 'function') {
			object[methodName] = bindMethod(object[methodName], object);
		}
	}
};


/**
 * Open URL
 *
 * Different logic used depending on the application
 */
var openUrl = function(url, openExternally)
{
	if(openExternally === true) {
		Services.messenger.launchExternalURL(url);
	}
	else {
		let window = null;

		// Firefox
		window = Services.windowMediator.getMostRecentWindow('navigator:browser');
		if(window != null) {
			if(window.gBrowser != null) {
				window.gBrowser.selectedTab = window.gBrowser.addTab(url);
			}
		}
		else {
			// Thunderbird
			window = Services.windowMediator.getMostRecentWindow('mail:3pane');

			if(window != null) {
				let tabmail = window.document.getElementById('tabmail');
				window.focus();
				
				if(tabmail) {
					tabmail.openTab('contentTab', {contentPage: url});
				}
				else {
					window.openDialog('chrome://messenger/content/', '_blank', 'chrome,dialog=no,all', null,
							{tabType: 'contentTab', tabParams: {contentPage: url}});
				}
			}
		}
	}
};