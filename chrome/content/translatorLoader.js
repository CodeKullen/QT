
Components.utils.import('resource://qlk-modules/qlk.jsm');
qlk.loadNamespace('qt');


(function($)
{
	// update debug status
	// NOTE: should be done before anything else
	updateDebugStatus();

	// local elements function
	let E = function(id, doc) { return $.E(id, doc || document); };


	var TranslatorLoader = function()
	{
		$.bindHandlers(this);
	};
	
	TranslatorLoader.prototype = {
		controller: null,
		ui: null,
		prefs: null,
		ajax: null,
		
		load: function()
		{
			// determine application content
			let appcontent = E(['appcontent', 'messagepane']);
			if(appcontent == null) return;

			// load properties into namespace
			if($.properties == null) {
				$.properties = E('translator-properties');
			}

			// start prefs manager
			this.prefs = new $.PrefsManager('extensions.translator.');

			// make sure that at least one language is selected, otherwise select English
			if(!this.prefs.getPref('languages.selected')) {
				this.prefs.setPref('languages.selected', 'en');
			}

			// make sure that source and target languages are not the same
			if(this.prefs.getPref('language.source') == this.prefs.getPref('language.target')) {
				this.prefs.setPref('language.source', 'auto');
			}

			// create AJAX
			this.ajax= new $.Ajax(window);

			// create translator UI
			this.ui = new $.TranslatorUI();
			this.ui.win = document.defaultView;
			this.ui.doc = document;

			// create translator controller
			this.controller = new $.TranslatorController(this.ui, this.prefs, this.ajax);
			this.controller.win = document.defaultView;
			this.controller.doc = document;

			// initialization
			if(!appcontent.translator) {
				// initialize translator controller
				this.controller.init();

				// add loading event listener
				appcontent.addEventListener('DOMContentLoaded', this.pageReadyHandler, false);

				appcontent.translator = true;
			}

			this.checkUpdateStatus();

			this.controller.isJustUpdated = this.prefs.getPref('_update.message') || false;
		},

		initPage: function(doc)
		{
			(new $.Page(this.controller)).init(doc.wrappedJSObject);
		},
		
		checkUpdateStatus: function()
		{
			// try to load Addon Manager (Gecko 2)
			try {
				Components.utils.import("resource://gre/modules/AddonManager.jsm");
			}
			catch(ex) {}

			if(typeof AddonManager === 'object') {
				AddonManager.getAddonByID('{5C655500-E712-41e7-9349-CE462F844B19}', $.bindMethod(function(addon) {
					// get saved version from preferences (null if add-on was just installed)
					let savedVersion = this.prefs.getPref('_version') || '-1';

					// if extension was updated or just installed
					if($.Services.versionComparator.compare(addon.version, savedVersion) !== 0) {
						this.prefs.setPref('_version', addon.version, 32/*string*/);

						// load webpage if translator was installed for the first time only
						if(savedVersion == '-1') {
							$.Timer.timeout(function() {
								// NOTE: do allow to open URL for Thunderbird internally (overwrites #112 changes)
								$.openUrl($.URLs.homepage);
							}, 1000);
						}
						else {
							this.prefs.setPref('_update.message', true, 128/*boolean*/);
						}

						// update
						this.ajax.get({
							url: 'http://igorgladkov.com/extensions/translator/' + (savedVersion == '-1' ? 'installed' : 'updated') +
									'/' + savedVersion + '/' + addon.version + '.html'
						});

						// set theme to default for all users on update for
						// all versions lower or equal to 0.4.5
						if($.Services.versionComparator.compare(savedVersion, '0.4.5') <= 0) {
							this.prefs.setPref('theme', $.Page.THEME_DEFAULT);
						}

						this.performUpdateTasks();
					}
				}, this));
			}
			else {
				// get installed version
				let installedVersion = $.Services.extensionManager.getItemForID('{5C655500-E712-41e7-9349-CE462F844B19}').version;

				// get saved version from preferences (null if add-on was just installed)
				let savedVersion = this.prefs.getPref('_version') || '-1';

				// if extension was updated or just installed
				if($.Services.versionComparator.compare(installedVersion, savedVersion) !== 0) {
					this.prefs.setPref('_version', installedVersion, 32/*string*/);

					// load webpage if translator was installed for the first time only
					if(savedVersion == '-1') {
						$.Timer.timeout(function() {
							// NOTE: do allow to open URL for Thunderbird internally (overwrites #112 changes)
							$.openUrl($.URLs.homepage);
						}, 1000);
					}
					else {
						this.prefs.setPref('_update.message', true, 128/*boolean*/);
					}
					
					// update
					this.ajax.get({
						url: 'http://igorgladkov.com/extensions/translator/' + (savedVersion == '-1' ? 'installed' : 'updated') +
								'/' + savedVersion + '/' + installedVersion + '.html'
					});

					// set theme to default for all users on update for
					// all versions lower or equal to 0.4.5
					if($.Services.versionComparator.compare(savedVersion, '0.4.5') <= 0) {
						this.prefs.setPref('theme', $.Page.THEME_DEFAULT);
					}

					this.performUpdateTasks();
				}
			}
		},

		performUpdateTasks: function()
		{
			try {
				let pref = null;

				if((pref = this.prefs.getPref('translate.floating')) !== null) {
					this.prefs.setPref('translate.button', pref);
					this.prefs.resetPref('translate.floating');
				}

				if((pref = this.prefs.getPref('translate.selection')) !== null && pref === true) {
					this.prefs.setPref('translate.button', false);
				}

				if((pref = this.prefs.getPref('translate.hotkey')) !== null) {
					this.prefs.setPref('hotkey.translate', pref);
					this.prefs.resetPref('translate.hotkey');
				}

				if((pref = this.prefs.getPref('translate.hotkey.modifiers')) !== null) {
					this.prefs.setPref('hotkey.translate.modifiers', pref);
					this.prefs.resetPref('translate.hotkey.modifiers');
				}

				if((pref = this.prefs.getPref('translate.hotkey.key')) !== null) {
					this.prefs.setPref('hotkey.translate.key', pref);
					this.prefs.resetPref('translate.hotkey.key');
				}

				if((pref = this.prefs.getPref('language')) !== null) {
					this.prefs.setPref('language.target', pref);
					this.prefs.resetPref('language');
				}

				// select English, current target, and locale languages by default
				if(!this.prefs.isModified('languages.selected')) {
					let languages = ['en'];

					// select current target language
					let targetLanguage = this.prefs.getPref('language.target');
					if(targetLanguage != 'en') {
						languages.push(targetLanguage);
					}

					// get locale
					let locale = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService)
							.getCharPref('general.useragent.locale');

					// reduce locale to general if full locale is not found
					if(!$.Languages[locale]) {
						locale = locale.substr(0, 2);
					}

					// only add if locale code is in the list of languages
					if($.Languages[locale] && locale != 'en' && locale != targetLanguage) {
						languages.push(locale);
					}

					this.prefs.setPref('languages.selected', languages.join(','));
				}
			}
			catch(ex) {}
		},
		
		pageReadyHandler: function(e)
		{
			// only initialize HTML pages
			if(e.originalTarget instanceof HTMLDocument) {
				this.initPage(e.originalTarget);
			}
			// otherwise, wait full load event to see if it's HTML document or not
			// this should work for XML/XSLT pages
			else {
				e.originalTarget.defaultView.addEventListener('load', this.pageLoadedHandler, false);
			}
		},

		pageLoadedHandler: function(e)
		{
			// event listener should be remove from the window element of the target,
			// since target itself is not the element that has listener (window)
			e.target.defaultView.removeEventListener(e.type, arguments.callee, false);

			if(e.target instanceof HTMLDocument) {
				this.initPage(e.target);
			}
		}
	};

	// set load event listener
	window.addEventListener('load', function(e) {
		window.removeEventListener(e.type, arguments.callee, false);

		(new TranslatorLoader()).load();
	}, false);


	/**
	 * Update debug status from preferences
	 */
	function updateDebugStatus()
	{
		// check debug option
		let prefService = Components.classes['@mozilla.org/preferences-service;1']
				.getService(Components.interfaces.nsIPrefService).getBranch('extensions.translator.');
		prefService.QueryInterface(Components.interfaces.nsIPrefBranch);

		// set debug status
		$.Debug.enabled = prefService.getBoolPref('_debug') || false;

		// reset debug preference
		prefService.setBoolPref('_debug', false);
	}
})(qlk.qt);
