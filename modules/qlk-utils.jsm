var EXPORTED_SYMBOLS = ['Utils'];

Components.utils.import("resource://qlk-modules/qlk-services.jsm");
Components.utils.import("resource://qlk-modules/qlk-debug.jsm");


/**
 * Utilities
 */
var Utils = $ = {
	OS_LINUX: 'linux',
	OS_WINDOWS: 'winnt',
	OS_MAC: 'darwin',
	
	copyStringToClipboard: function(string)
	{
		Services.clipboardHelper.copyString(string);
	},

	parseJSON: function(jsonString)
	{
		var jsonObject = null;

		// parse to JSON
		if(typeof(JSON) != 'undefined' && JSON.parse) {
			jsonObject = JSON.parse(jsonString);
		}
		else {
			// get JSON object for Firefox < 3.5
			jsonObject = Services.json.decode(jsonString);
		}

		return jsonObject;
	},

	getOS: function()
	{
		return Services.xulRuntime.OS.toLowerCase();
	}
};

Debug.register(Utils, this);