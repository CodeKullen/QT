
(function($)
{
	if($.TranslatorController) return;
	
	$.TRANSLATOR_STATE_DISABLED = 0;
	$.TRANSLATOR_STATE_ENABLED = 1;
	$.TRANSLATOR_STATE_ERROR = 2;
	
	$.TranslatorController = function(ui, prefsManager, ajax)
	{
		this.ui = ui;
		this.prefsManager = prefsManager;
		this.ajax = ajax;

		$.bindHandlers(this);
	};
	
	$.TranslatorController.prototype = {
		initialized: false,
		win: null,
		doc: null,
		ui: null,
		prefsManager: null,
		ajax: null,
		state: null,
		languages: null,
		sourceLanguage: null,
		targetLanguage: null,
		isJustUpdated: false,

		E: function(id, doc) {
			return $.E(id, doc || this.doc);
		},
		
		init: function()
		{
			if(!this.initialized) {
				// set event listeners
				this.bindInternalEventListeners();
				this.bindEventListeners();

				// initialize UI
				this.ui.init();

				// set as initialized
				this.initialized = true;

				// initial setup
				this.setup();
			}
		},

		bindEventListeners: function()
		{
			// set status panel listeners
			this.E('translator-status-icon').bindListener('click', this.statusIconClickedHandler);

			// set translator context menu listeners
			this.E('translator-context-menuitem-enable').bindListener('command', this.enableCommandHandler);
			this.E('translator-context-menuitem-disable').bindListener('command', this.disableCommandHandler);
			this.E('translator-context-menuitem-translate').bindListener('command', this.translateCommandHandler);
			this.E('translator-context-menuitem-translate-page').bindListener('command', this.translatePageCommandHandler);
			this.E('translator-context-menuitem-translate-input').bindListener('command', this.translateInputCommandHandler);

			// set translator content area menu listeners
			this.E('translator-content-area-menuitem-translate').bindListener('command', this.translateCommandHandler);
			this.E('translator-content-area-menuitem-translate-page').bindListener('command', this.translatePageCommandHandler);

			// set keyboard shortcut listener
			this.E('translator-hotkey-translate').bindListener('command', this.translateKeyCommandHandler);
			this.E('translator-hotkey-input').bindListener('command', this.translateInputCommandHandler);
			this.E('translator-hotkey-page').bindListener('command', this.translatePageCommandHandler);

			// set translator input form submit listener
			this.E('translator-input-submit').bindListener('command', this.translateInputSubmittedHandler);

			// set context about menu listeners
			this.E('translator-context-menuitem-about-homepage').bindListener('command', this.aboutHomepageCommandHandler);
			this.E('translator-context-menuitem-about-review').bindListener('command', this.aboutReviewCommandHandler);
			this.E('translator-context-menuitem-about-support').bindListener('command', this.aboutSupportCommandHandler);
			this.E('translator-context-menuitem-about-donation').bindListener('command', this.aboutDonationCommandHandler);

			// set preferences menuitem listener
			this.E('translator-context-menuitem-preferences').bindListener('command', this.preferencesCommandHandler);

			$.EventManager.bind('translate', this.translateHandler);
			$.EventManager.bind('updateMessageOpened', this.updateMessageOpenedHandler);
			$.EventManager.bind('sourceLanguageChanged', this.sourceLanguageChangedHandler);
			$.EventManager.bind('targetLanguageChanged', this.targetLanguageChangedHandler);
		},

		bindInternalEventListeners: function()
		{
			this.prefsManager.addChangeListener(this);
		},
		
		bindToolbarButtonListeners: function()
		{
			this.E('translator-toolbarbutton').bindListener('command', this.toolbarButtonCommandHandler);
			this.E('translator-toolbarbutton').bindListener('click', this.toolbarButtonClickedHandler);
		},

		setup: function()
		{
			// determine state of translator
			let translatorEnabled = this.prefsManager.getPref('enabled');
			$.EventManager.trigger('translatorEnabled', translatorEnabled);
			
			if(translatorEnabled) {
				this.state = $.TRANSLATOR_STATE_ENABLED;
				this.ui.showDefaultState();
			}
			else {
				this.state = $.TRANSLATOR_STATE_DISABLED;
				this.ui.showDisabledState();
			}

			// selected languages
			this.updateLanguageData();

			// set appearances
			this.ui.showContextMenu(this.prefsManager.getPref('context.menu') && this.isTranslatorEnabled());
			this.ui.showStatusBarIcon(this.prefsManager.getPref('status.icon'));

			// set toolbar
			if(this.prefsManager.getPref('toolbar')) {
				this.ui.showToolbar(true);
				this.bindToolbarButtonListeners();
			}
			else {
				this.ui.showToolbar(false);
			}

			// set hotkeys
			let hotkeys = ['translate', 'input', 'page'];
			for(let i = 0; i < hotkeys.length; i++) {
				this.E('translator-hotkey-' + hotkeys[i]).setAttribute('modifiers',
						this.prefsManager.getPref('hotkey.' + hotkeys[i] + '.modifiers'));
				this.E('translator-hotkey-' + hotkeys[i]).setAttribute('key',
						this.prefsManager.getPref('hotkey.' + hotkeys[i] + '.key'));

				let enabled = (this.prefsManager.getPref('hotkey.' + hotkeys[i]) && this.state == $.TRANSLATOR_STATE_ENABLED);
				this.E('translator-hotkey-' + hotkeys[i]).setAttribute('disabled', enabled ? 'false' : 'true');
			}

			// translate by selection
			$.EventManager.trigger('selectionTranslationEnabled', (this.prefsManager.getPref('translate.selection') &&
					this.state == $.TRANSLATOR_STATE_ENABLED));

			// translate by floating pane
			$.EventManager.trigger('floatingTranslationEnabled', (this.prefsManager.getPref('translate.button') &&
					this.state == $.TRANSLATOR_STATE_ENABLED));
		},

		switchTranslatorState: function()
		{
			var newState = !(this.state == $.TRANSLATOR_STATE_ENABLED);
			
			this.prefsManager.setPref('enabled', newState);
		},

		translate: function(text, callback, sourceLanguage, targetLanguage)
		{
			sourceLanguage = sourceLanguage || this.prefsManager.getPref('language.source');
			targetLanguage = targetLanguage || this.prefsManager.getPref('language.target');
			
			if(sourceLanguage == 'auto') {
				sourceLanguage = null;
			}
			
			var doAutocopy = this.prefsManager.getPref('autocopy');

			// modify callback function for autocopy and dictionary results
			var translatorCallback = function(status, translation) {
				let autoCopied = false;
				
				if(translation.dictionary) {
					var dictionaryCategories = [];

					for(let category in translation.dictionary) {
						let categoryText = '';

						// check for long definitions
						let makeList = false;
						for(let i in translation.dictionary[category]) {
							if(translation.dictionary[category][i].length > 40) {
								makeList = true;
								break;
							}
						}
						
						if(category) {
							categoryText += '<b>' + category + 's: </b>';
						}

						if(makeList) {
							categoryText += '<ul><li>' + translation.dictionary[category].join('</li><li>') + '</li></ul>';
						}
						else {
							categoryText += translation.dictionary[category].join(', ');
						}

						dictionaryCategories.push(categoryText);
					}

					translation.translatedText = dictionaryCategories.join('<br />');
				}
				
				if (doAutocopy) {
					if(status == $.Translator.STATUS_TRANSLATED) {
						$.Utils.copyStringToClipboard(translation.translatedText);
						autoCopied = true;
					}
				}

				callback(status, translation, {autoCopied: autoCopied});
			}

			$.Translator.translate(text, sourceLanguage, targetLanguage, translatorCallback, this.ajax);
		},

		translateText: function(text)
		{
			this.callCurrentPageMethod('translateText', text);
		},

		translateSelectedText: function()
		{
			this.translateText($.Page.getSelectedText(this.doc.commandDispatcher.focusedWindow.document));
		},

		translatePage: function()
		{
			$.PageTranslator.translate(this.win.content.document, this.prefsManager.getPref('language.target'), this.ajax);
		},

		searchDictionary: function(text, callback, sourceLanguage, targetLanguage)
		{
			sourceLanguage = sourceLanguage || this.prefsManager.getPref('language.source');
			targetLanguage = targetLanguage || this.prefsManager.getPref('language.target');
			
			if(sourceLanguage == 'auto') {
				sourceLanguage = null;
			}

			// wrap callback function for dictionary
			let dictionaryCallback = $.bindMethod(function(status, result) {
				if(status == $.Dictionary.STATUS_NOT_FOUND) {
					$.Translator.translate(result.text, result.sourceLanguage, result.targetLanguage, callback, this.ajax);
					return;
				}

				let translatedText = null;

				// transform result to text
				if(result && result.searchResult) {
					if(typeof result.searchResult == 'object') {
						let groups = [];

						for(let category in result.searchResult) {
							let categoryText = '';

							// check for long definitions
							let makeList = false;
							for(let i in result.searchResult[category]) {
								if(result.searchResult[category][i].length > 40) {
									makeList = true;
									break;
								}
							}

							// category name
							if(category) {
								categoryText += '<b>' + category + 's: </b>';
							}

							if(makeList) {
								categoryText += '<ul><li>' + result.searchResult[category].join('</li><li>') + '</li></ul>';
							}
							else {
								categoryText += result.searchResult[category].join(', ');
							}

							groups.push(categoryText);
						}

						translatedText = groups.join('<br />');
					}
					else {
						translatedText = result.searchResult.toString();
					}
				}

				let translation = new $.Translation();
				translation.sourceLanguage = result.sourceLanguage;
				translation.targetLanguage = result.targetLanguage;
				translation.sourceText = result.text;
				translation.translatedText = translatedText;

				callback(status, translation);
			}, this);

			$.Dictionary.find(text, sourceLanguage, targetLanguage, dictionaryCallback, this.ajax);
		},

		updateLanguageData: function()
		{
			var selectedLanguages = this.prefsManager.getPref('languages.selected').split(',');

			this.languages = [];

			for(let i = 0, l = selectedLanguages.length; i < l; i++) {
				let code = selectedLanguages[i];

				if($.Languages[code]) {
					this.languages.push({
						code: code,
						name: $.properties.getString('lang' + $.Languages[code])
					});
				}
			}

			this.sourceLanguage = this.prefsManager.getPref('language.source');
			this.targetLanguage = this.prefsManager.getPref('language.target');
		},

		getTheme: function()
		{
			return this.prefsManager.getPref('theme');
		},

		isTranslatorEnabled: function()
		{
			return (this.state == $.TRANSLATOR_STATE_ENABLED);
		},

		isTranslationBySelectionEnabled: function()
		{
			return this.prefsManager.getPref('translate.selection');
		},

		isTranslationByFloatingEnabled: function()
		{
			return this.prefsManager.getPref('translate.button');
		},

		isEligibleForDictionary: function(text)
		{
			// trim
			text = text.replace(/^\s+|\s+$/g, '');

			// replace multiple spaces
			text = text.replace(/\s+/g, ' ');
			
			// count words
			let words = text.split(' ');

			return (words.length <= 3);
		},

		callCurrentPageMethod: function(methodName)
		{
			let qlk = this.win.content.document.defaultView.wrappedJSObject.qlk;

			if(qlk && typeof qlk[methodName] == 'function') {
				qlk[methodName].apply(qlk, Array.prototype.slice.call(arguments, 1));
			}
		},
		
		
		/* Event listeners */

		sourceLanguageChangedHandler: function(e, language)
		{
			this.prefsManager.setPref('language.source', language);
		},

		targetLanguageChangedHandler: function(e, language)
		{
			this.prefsManager.setPref('language.target', language);
		},
		
		statusIconClickedHandler: function(e)
		{
			switch(e.button) {
				case 0:
					if(e.shiftKey) {
						this.translatePage();
					}
					else {
						if($.Page.getSelectedText(this.doc.commandDispatcher.focusedWindow.document).length > 0) {
							this.translateSelectedText();
						}
						else {
							this.ui.showInputPanel();
						}
					}
					break;

				case 1:
					this.ui.showInputPanel();
					break;
			}
		},
		
		enableCommandHandler: function(e)
		{
			this.switchTranslatorState();
			
			e.stopPropagation();
		},
		
		disableCommandHandler: function(e)
		{
			this.switchTranslatorState();

			e.stopPropagation();
		},

		toolbarButtonCommandHandler: function()
		{
			if($.Page.getSelectedText(this.doc.commandDispatcher.focusedWindow.document).length > 0) {
				this.translateSelectedText();
			}
			else {
				this.ui.showInputPanel();
			}
		},

		toolbarButtonClickedHandler: function(e)
		{
			if(e.button == 1) {
				this.ui.showInputPanel();
			}
		},

		translateHandler: function(type, data)
		{
			this.translate(data.text, data.callback, data.sourceLanguage, data.targetLanguage);
		},
		
		translateCommandHandler: function(e)
		{
			this.translateSelectedText();
			
			e.stopPropagation();
		},

		translateInputSubmittedHandler: function(e)
		{
			// get entered text
			var enteredText = this.E('translator-input-textbox').value;

			// hide popup
			this.E('translator-input-panel').hidePopup();
			
			this.translateText(enteredText);
		},

		translateKeyCommandHandler: function(e)
		{
			this.callCurrentPageMethod('translateSelection');
			
			e.stopPropagation();
		},

		translatePageCommandHandler: function(e)
		{
			this.translatePage();

			e.stopPropagation();
		},

		
		translateInputCommandHandler: function(e)
		{
			this.ui.showInputPanel();
			
			e.stopPropagation();
		},

		preferencesCommandHandler: function(e)
		{
			this.ui.openPreferences();

			e.stopPropagation();
		},

		aboutHomepageCommandHandler: function(e)
		{
			$.openUrl($.URLs.homepage);
			
			e.stopPropagation();
		},

		aboutReviewCommandHandler: function(e)
		{
			$.openUrl($.URLs.reviews);

			e.stopPropagation();
		},

		aboutSupportCommandHandler: function(e)
		{
			$.openUrl($.URLs.support);

			e.stopPropagation();
		},

		aboutDonationCommandHandler: function(e)
		{
			$.openUrl($.URLs.donation);

			e.stopPropagation();
		},

		updateMessageOpenedHandler: function()
		{
			// update preference
			this.prefsManager.setPref('_update.message', false, 128/*boolean*/);
		},
		
		/**
		 * Observe preferences changes
		 */
		observe: function(subject, topic, data)
		{
			// check if document exists because if prefs window
			// already closed it's throwing js error (see #44)
			if(topic != 'nsPref:changed' || !document) return;

			// don't act when internal preferences update (started with '_')
			if(!data || data[0] == '_') return;

			// update of language preferences do not require reset
			if(data == 'language.source' || data == 'language.target' || data == 'languages.selected') {
				this.updateLanguageData();

				$.EventManager.trigger('languagesChanged', {
					languages: this.languages,
					sourceLanguage: this.sourceLanguage,
					targetLanguage: this.targetLanguage
				});
			}
			// reset otherwise
			else {
				this.setup();
			}
		}
	};

	$.Debug.register($.TranslatorController, $);
})(qlk.qt);