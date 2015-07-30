
Components.utils.import('resource://qlk-modules/qlk.jsm');
qlk.loadNamespace('qt');


(function($)
{
	let E = function(id, doc) { return $.E(id, doc || document); };

	var Preferences = function(prefsManager)
	{
		this.prefs = prefsManager;

		$.bindHandlers(this);
	};
	
	Preferences.prototype = {
		prefs: null,
		
		init: function()
		{
			// setup interface event listeners
			this.setupEventListeners();
			
			// fill ui with data
			this.fillUI();
		},
		
		setupEventListeners: function()
		{
			// translate selection listener
			E('translator-preferences-translate-selection').bindListener('command', this.translateSelectionCommandHandler);
			E('translator-preferences-translate-button').bindListener('command', this.translateButtonCommandHandler);

			// hotkey checkbox listeners
			E('translator-preferences-hotkey-translate').bindListener('command', this.hotkeyCommandHandler);
			E('translator-preferences-hotkey-input').bindListener('command', this.hotkeyCommandHandler);
			E('translator-preferences-hotkey-page').bindListener('command', this.hotkeyCommandHandler);
			
			// hotkey textbox listeners
			E('translator-preferences-hotkey-translate-value').bindListener('keypress', this.hotkeyKeyPressHandler);
			E('translator-preferences-hotkey-input-value').bindListener('keypress', this.hotkeyKeyPressHandler);
			E('translator-preferences-hotkey-page-value').bindListener('keypress', this.hotkeyKeyPressHandler);

			// debug shortcut listener
			E('translator-preferences').bindListener('keypress', this.debugKeyCommandHandler);

			// language buttons listeners
			E('translator-preferences-languages-add').bindListener('command', this.addOrRemoveLanguageHandler);
			E('translator-preferences-languages-remove').bindListener('command', this.addOrRemoveLanguageHandler);
			E('translator-preferences-languages').bindListener('select', this.languageListSelectHandler);
			E('translator-preferences-selected-languages').bindListener('select', this.languageListSelectHandler);
			
			// reset to default button listener
			let resetButton = E('translator-preferences').getButton('extra2');
			if(resetButton) {
				resetButton.addEventListener('command', this.resetButtonCommandHandler, false);
			}
		},
		
		fillUI: function()
		{
			var selectedLanguages = this.prefs.getPref('languages.selected').split(','),
					languagesList = E('translator-preferences-languages'),
					selectedList = E('translator-preferences-selected-languages');
			
			// empty lists
			while (languagesList.childElementCount) {
				languagesList.removeChild(languagesList.firstElementChild);
			}
			while (selectedList.childElementCount) {
				selectedList.removeChild(selectedList.firstElementChild);
			}

			// create languages array for easier sorting
			var languages = [];
			for(let code in $.Languages) {
				languages.push({
					code: code,
					label: $.properties.getString('lang' + $.Languages[code])
				});
			}

			// sort languages
			languages.sort(function(a, b) {
				return a.label > b.label ? 1 : (a.label < b.label ? -1 : 0);
			});

			// fill language list
			var items = {};
			for(let i = 0, l = languages.length; i < l; i++) {
				let el = document.createElement('listitem');
				el.setAttribute('index', i);
				el.setAttribute('code', languages[i].code);
				el.setAttribute('label', languages[i].label);
				el.className = 'translator-language-icon listitem-iconic';
				languagesList.appendChild(el);

				items[languages[i].code] = el;

				el = null;
			}

			// move selected languages to selected list
			for(let i = 0, l = selectedLanguages.length; i < l; i++) {
				selectedList.appendChild(items[selectedLanguages[i]]);
			}
			items = null;

			// enable/disable hotkey textboxes
			E('translator-preferences-hotkey-translate-value').disabled = !this.prefs.getPref('hotkey.translate');
			E('translator-preferences-hotkey-input-value').disabled = !this.prefs.getPref('hotkey.input');
			E('translator-preferences-hotkey-page-value').disabled = !this.prefs.getPref('hotkey.page');
			
			// set hotkeys textbox values
			E('translator-preferences-hotkey-translate-value').value = this.formatHotKey(this.prefs.getPref('hotkey.translate.modifiers'),
					this.prefs.getPref('hotkey.translate.key'));
			E('translator-preferences-hotkey-input-value').value = this.formatHotKey(this.prefs.getPref('hotkey.input.modifiers'),
					this.prefs.getPref('hotkey.input.key'));
			E('translator-preferences-hotkey-page-value').value = this.formatHotKey(this.prefs.getPref('hotkey.page.modifiers'),
					this.prefs.getPref('hotkey.page.key'));

			// set selected theme
			var themeList = E('translator-preferences-theme');
			
			for(let i = 0; i < themeList.itemCount; i++) {
				let item = themeList.getItemAtIndex(i);
				
				if(item.value === this.prefs.getPref('theme')) {
					themeList.selectedItem = item;
				}
			}
		},
		
		formatHotKey: function(modifiersString, keyString)
		{
			var keys = [];
			var modifiers = modifiersString.split(' ');
			let os = $.Utils.getOS();
			
			for(let i = 0; i < modifiers.length; i++) {
				switch(modifiers[i]) {
					case 'control':
						keys.push(os == $.Utils.OS_MAC ? 'control' : 'Ctrl');
						break;
						
					case 'shift':
						keys.push(os == $.Utils.OS_MAC ? 'shift' : 'Shift');
						break;
						
					case 'alt':
						keys.push(os == $.Utils.OS_MAC ? 'option' : 'Alt');
						break;
						
					case 'meta':
						keys.push(os == $.Utils.OS_MAC ? 'command' : 'Win');
						break;
				}
			}
			
			keys.push(keyString);
			
			return keys.join(' + ');
		},

		updateSelectedLanguagesPreference: function()
		{
			let selectedList = E('translator-preferences-selected-languages'),
					selected = [];

			for(let i = 0, l = selectedList.itemCount; i < l; i++) {
				selected.push(selectedList.getItemAtIndex(i).getAttribute('code'));
			}

			// check if current source or target languages were removed
			var sourceLanguage = this.prefs.getPref('language.source'),
					targetLanguage = this.prefs.getPref('language.target'),
					sourceLanguageRemoved = targetLanguageRemoved = true;
			for(let i = 0, l = selected.length; i < l; i++) {
				if(selected[i] == sourceLanguage) {
					sourceLanguageRemoved = false;
				}

				if(selected[i] == targetLanguage) {
					targetLanguageRemoved = false;
				}

				if(!sourceLanguageRemoved && !targetLanguageRemoved) break;
			}
	
			// update preference values
			// NOTE: source and target should be updated after selected languages
			E('translator-preferences-languages-selected-preference').value = selected.join(',');

			// reset source to 'auto' and target to first selected language if removed
			if(sourceLanguageRemoved) {
				this.prefs.setPref('language.source', 'auto');
			}
			if(targetLanguageRemoved) {
				this.prefs.setPref('language.target', selected[0]);
			}
		},

		updateLanguageButtons: function()
		{
			E('translator-preferences-languages-add').disabled = !E('translator-preferences-languages').selectedCount;
			E('translator-preferences-languages-remove').disabled = !E('translator-preferences-selected-languages').selectedCount;
		},
		
		
		/* Event Handlers */

		translateSelectionCommandHandler: function(e)
		{
			if(e.target.checked) {
				E('translator-preferences-translate-button-preference').value = false;
			}
		},

		translateButtonCommandHandler: function(e)
		{
			if(e.target.checked) {
				E('translator-preferences-translate-selection-preference').value = false;
			}
		},

		hotkeyCommandHandler: function(e)
		{
			E(e.target.id + '-value').disabled = !e.target.checked;
		},

		hotkeyKeyPressHandler: function(e)
		{
			var modifiers = [];
			var hotkey = String.fromCharCode(e.which).toUpperCase();

			if(e.metaKey) {
				modifiers.push('meta');
			}
			if(e.ctrlKey) {
				modifiers.push('control');
			}
			if(e.altKey) {
				modifiers.push('alt');
			}
			if(e.shiftKey) {
				modifiers.push('shift');
			}

			modifiers = modifiers.join(' ');

			// set textbox value
			e.target.value = this.formatHotKey(modifiers, hotkey);

			// update preference values
			let prefPrefix = e.target.id.replace(/value$/, '');
			E(prefPrefix + 'modifiers-preference').value = modifiers;
			E(prefPrefix + 'key-preference').value = hotkey;

			e.stopPropagation();
		},

		addOrRemoveLanguageHandler: function(e)
		{
			var languagesList = E('translator-preferences-languages'),
					selectedList = E('translator-preferences-selected-languages'),
					selectedItems = null;

			if(e.target.id == 'translator-preferences-languages-add') {
				selectedItems = languagesList.selectedItems;

				for(let i = selectedItems.length - 1; i >= 0; i--) {
					selectedList.appendChild(selectedItems[i]);
				}
			}
			else if(e.target.id == 'translator-preferences-languages-remove') {
				selectedItems = selectedList.selectedItems;

				for(let i = selectedItems.length - 1; i >= 0; i--) {
					let item = selectedList.selectedItems[i],
							index = parseInt(item.getAttribute('index'));
							code = item.getAttribute('code');

					// insert item on its previous place using index in relation to
					// existing items if list is not empty
					if (languagesList.childElementCount) {
						for(let j = 0, l = languagesList.childElementCount; j < l; j++) {
							let child = languagesList.children[j];

							if(j === 0 && parseInt(child.getAttribute('index')) > index) {
								languagesList.insertBefore(item, child);
								break;
							}
							else if(child.nextSibling && parseInt(child.nextSibling.getAttribute('index')) > index) {
								languagesList.insertBefore(item, child.nextSibling);
								break;
							}
							else if (!child.nextSibling) {
								languagesList.appendChild(item);
								break;
							}
//							if((j === 0 || parseInt(child.getAttribute('index')) < index) &&
//								(!child.nextSibling || parseInt(child.nextSibling.getAttribute('index')) > index)) {
//								languagesList.insertBefore(item, child.nextSibling);
//								break;
//							}
						}
					}
					// otherwise just add to the list
					else {
						languagesList.appendChild(item);
					}

					// last selected language cannot be removed
					if(selectedList.itemCount <= 1) break;
				}
			}

			this.updateSelectedLanguagesPreference();
			this.updateLanguageButtons();
		},
		
		languageListSelectHandler: function(e) {
			this.updateLanguageButtons();
		},

		resetButtonCommandHandler: function(e)
		{
			// reset all preferences
			this.prefs.resetAllPrefs();
			
			// refill UI interface
			this.fillUI();
		},

		debugKeyCommandHandler: function(e) {
			if((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode == KeyEvent.DOM_VK_F10) {
				E('translator-preferences-debug').value = true;

				alert('Debug mode will be enabled after application restart.');
			}
		}
	};
	
	// set load event listener
	window.addEventListener('load', function() {
		window.removeEventListener('load', arguments.callee, false);

		var prefsManager = new $.PrefsManager('extensions.translator.');
		var preferences = new Preferences(prefsManager);
		preferences.init();
	}, false);
})(qlk.qt);