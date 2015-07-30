var EXPORTED_SYMBOLS = ['PrefsManager'];

Components.utils.import("resource://qlk-modules/qlk-services.jsm");
Components.utils.import("resource://qlk-modules/qlk-debug.jsm");


/**
 * Preferences manager
 */
var PrefsManager = $ = function(branch)
{
	this.service = Services.prefService.getBranch(branch);
	this.service.QueryInterface(Components.interfaces.nsIPrefBranch);
};

$.prototype = {
	service: null,

	getPref: function(pref)
	{
		if(this.service == null) {
			throw 'Service not initialized';
		}

		var prefType = this.getPrefType(pref);

		switch(prefType) {
			case this.service.PREF_BOOL:
				return this.service.getBoolPref(pref);

			case this.service.PREF_INT:
				return this.service.getIntPref(pref);

			case this.service.PREF_STRING:
				return this.service.getCharPref(pref);
		}

		return null;
	},

	getAllPrefs: function()
	{
		var prefs = {};
		var prefKeys = this.service.getChildList('', {});

		for(var i = 0; i < prefKeys.length; i++) {
			prefs[prefKeys[i]] = this.getPref(prefKeys[i]);
		}

		return prefs;
	},

	setPref: function(pref, value, type)
	{
		if(this.service == null) {
			throw 'Service not initialized';
		}

		var prefType = type || this.getPrefType(pref);

		switch(prefType) {
			case this.service.PREF_BOOL:
				this.service.setBoolPref(pref, value);
				break;

			case this.service.PREF_INT:
				this.service.setIntPref(pref, value);
				break;

			case this.service.PREF_STRING:
				this.service.setCharPref(pref, value);
				break;
		}
	},

	getPrefType: function(pref)
	{
		return this.service.getPrefType(pref);
	},

	resetPref: function(pref)
	{
		if(this.service.prefHasUserValue(pref)) {
			this.service.clearUserPref(pref);
		}
	},

	resetAllPrefs: function()
	{
		var preferences = this.getAllPrefs();

		for(var prefKey in preferences) {
			// continue if preference key starts from '_' which
			// means that it's internal preference and should not be defaulted
			if(prefKey.charAt(0) === '_') continue;

			if(this.service.prefHasUserValue(prefKey)) {
				this.service.clearUserPref(prefKey);
			}
		}
	},

	isModified: function(pref)
	{
		return this.service.prefHasUserValue(pref);
	},

	addChangeListener: function(listener)
	{
		this.service.addObserver('', listener, false);
	},

	removeChangeListener: function(listener)
	{
		this.service.removeObserver('', listener);
	}
};

Debug.register(PrefsManager, this);
