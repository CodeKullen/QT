
(function($)
{
	if($.Popup) return;

	$.Popup = function(doc)
	{
		this.doc = doc;
		this.refs = {};
		this.css = {};
		this.offset = {x: 0, y: 0};
		this.languages = [];
	};
	
	$.Popup.prototype = {
		initialized: false,
		doc: null,
		refs: null,
		theme: null,
		css: null,
		offset: null,
		notice: '',
		languages: null,
		sourceLanguage: null,
		targetLanguage: null,
		sourceText: '',
		translatedText: '',
		visible: false,
		doReset: false,

		/**
		 * This property is placeholder for method that should be
		 * delegated to page class on popup creation
		 */
		translate: null,

		init: function()
		{
			if(this.initialized) return;
			
			// default theme is 'system'
			if(this.theme === null) {
				this.theme = $.Page.THEME_DEFAULT;
			}
			
			// create popup element
			this.createPopupElement();
			
			this.initialized = true;
		},
		
		uninit: function()
		{
			if(this.refs.popup) {
				this.refs.popup.parentNode.removeChild(this.refs.popup);
			}

			if(this.refs.loading) {
				this.refs.loading.parentNode.removeChild(this.refs.loading);
			}
			
			this.refs = {};
			this.theme = null;
			this.css = {};
			this.languages = {};
			this.sourceLanguage = null;
			this.targetLanguage = null;
			this.sourceText = '';
			this.translatedText = '';
			this.notice = '';
			this.visible = false;
			this.initialized = false;
		},
		
		createPopupElement: function()
		{
			// load css style
			let css = this.doc.createElement('link');
			css.rel = 'stylesheet';
			css.type = 'text/css';
			css.href = 'chrome://translator/skin/popup.css';
			this.doc.getElementsByTagName('head')[0].appendChild(css);

			// create main element
			let popup = this.refs.popup = this.doc.createElement('div');
			popup.id = 'translator-popup';
			popup.className = 'translator-theme-' + this.theme;
			popup.style.top = '-9999px'; // move popup off the screen but keep visible for corrent size calculations
			this.doc.getElementsByTagName('body')[0].appendChild(popup);

			let toolbar = this.refs.toolbar = this.doc.createElement('div');
			toolbar.id = 'translator-popup-toolbar';
			popup.appendChild(toolbar);

			let title = this.doc.createElement('div');
			title.id = 'translator-popup-title';
			title.innerHTML = '<div id="translator-popup-source-languages-wrapper">' +
				'<ul id="translator-popup-source-languages"></ul><div id="translator-popup-source-languages-scroller"></div></div>' +
				'<div id="translator-popup-languages-direction"></div>' +
				'<div id="translator-popup-target-languages-wrapper">' +
				'<ul id="translator-popup-target-languages"></ul><div id="translator-popup-target-languages-scroller"></div></div>';
			toolbar.appendChild(title);

			// add spring after title
			toolbar.innerHTML += '<div class="translator-popup-toolbar-spring"></div>';

			this.resetLanguages();
			this.resetSourceLanguage();
			this.resetTargetLanguage();

			let copyButton = this.refs.copyButton = this.doc.createElement('a');
			copyButton.id = 'translator-popup-button-copy';
			copyButton.href = 'javascript:void(0);';
			copyButton.title = $.properties.getString('copyToClipboard');
			toolbar.appendChild(copyButton);

			let message = this.refs.message = this.doc.createElement('div');
			message.id = 'translator-popup-message';
			popup.appendChild(message);

			let notice = this.refs.notice = this.doc.createElement('div');
			notice.id = 'translator-popup-notice';
			popup.appendChild(notice);

			let textarea = this.refs.textarea = this.doc.createElement('textarea');
			textarea.id = 'translator-popup-textarea';
			textarea.style.display = 'none';
			popup.appendChild(textarea);
			
			// hide main element by default (do not use css for this)
			popup.style.display = 'none';

			// set copy button event listener
			toolbar.addEventListener('click', $.bindMethod(this.toolbarClickHandler, this), false);
		},

		resetLanguages: function()
		{
			if(!this.refs.popup) return;

			let sourceLanguages = this.doc.getElementById('translator-popup-source-languages'),
					targetLanguages = this.doc.getElementById('translator-popup-target-languages');

			// empty language lists (set auto detected item for source list)
			sourceLanguages.innerHTML = '<li id="translator-popup-source-language-auto" code="auto"></li>';
			targetLanguages.innerHTML = '';

			for(let i = 0, l = this.languages.length; i < l; i++) {
				let html = '<li code="' + this.languages[i].code + '">' + this.languages[i].name + '</li>';

				sourceLanguages.innerHTML += html;
				targetLanguages.innerHTML += html;
			}
		},

		resetSourceLanguage: function()
		{
			if(this.refs.popup) {
				this.selectLanguage('source', this.sourceLanguage);
			}
		},

		resetTargetLanguage: function()
		{
			if(this.refs.popup) {
				this.selectLanguage('target', this.targetLanguage);
			}
		},

		setLanguages: function(languages, sourceLanguage, targetLanguage)
		{
			if(this.languages.toSource() !== languages.toSource()) {
				this.languages = languages;
				this.resetLanguages();
			}

			if(this.sourceLanguage !== sourceLanguage || this.targetLanguage !== targetLanguage) {
				if(this.sourceLanguage !== sourceLanguage) {
					this.sourceLanguage = sourceLanguage;
					this.resetSourceLanguage();
				}

				if(this.targetLanguage !== targetLanguage) {
					this.targetLanguage = targetLanguage;
					this.resetTargetLanguage();
				}

				// re-translate text if popup is visible
				if(this.visible) {
					this.translate(this.sourceText, this.sourceLanguage, this.targetLanguage);
				}
			}
		},
		
		setDetectedLanguage: function(language)
		{
			if(!this.initialized) {
				this.init();
			}

			let el = this.doc.getElementById('translator-popup-source-language-auto');
			if(el) {
				el.textContent = language + ' - ' + $.properties.getString('detected');
			}
		},
		
		setText: function(sourceText, translatedText)
		{
			if(!this.initialized) {
				this.init();
			}

			this.sourceText = sourceText || '';

			// prepare translated text using textarea to handle all special chars
			this.refs.textarea.value = translatedText || '';
			this.translatedText = this.refs.textarea.value;
			
			// update message element
			this.refs.message.textContent = this.translatedText;
		},
		
		setNotice: function(notice)
		{
			if(!this.initialized) {
				this.init();
			}
			
			// assign notice property and update notice element
			this.refs.notice.textContent = this.notice = notice;

			// show notice immediately if popup is visible and notice is not empty
			if(this.visible && notice != null && notice.length > 0) {
				this.animate(this.refs.notice, ['slideIn'], 300);
			}
		},

		showLoading: function(text)
		{
			if(!this.initialized) {
				this.init();
			}
			
			if(!this.refs.loading) {
				let el = this.refs.loading = this.doc.createElement('div');
				el.id = 'translator-popup-loading';
				el.className = 'translator-theme-' + this.theme;
				el.setAttribute('title', text);
				el.style.display = 'none';

				this.doc.getElementsByTagName('body')[0].appendChild(el);
			}

			this.visible = true;
			this.updatePosition(this.refs.loading, {height: 20, width: 20});
			this.animate(this.refs.loading, ['fadeIn'], 200);
		},

		showUpdateMessage: function()
		{
			if(!this.initialized) {
				this.init();
			}

			if(!this.doc.getElementById('translator-popup-button-update')) {
				let updateButton = this.doc.createElement('a');
				updateButton.id = 'translator-popup-button-update';
				updateButton.href = '#';
				this.refs.toolbar.appendChild(updateButton);
				
				updateButton.addEventListener('click', $.bindMethod(function(e) {
					try {
						let box = this.doc.getElementById('translator-popup-update-message');
						
						if(box == null) {
							function replaceLinkCallback() {
								return '<a href="' + ($.URLs[arguments[1]] || '#') + '" target="_blank">'
							}

							box = this.doc.createElement('div');
							box.id = 'translator-popup-update-message';
							box.style.display = 'none';							
							box.innerHTML = $.properties.getString('updateMessage-0.9').replace(/<a href=#([a-z0-9]+)>/ig, replaceLinkCallback);
							
							// insert message into popup
							this.refs.popup.insertBefore(box, this.refs.message);
						}

						if(box && box.style.display == 'none') {
							this.animate(box, ['slideIn'], 300);
							this.dimMessage();
						}
						else {
							this.animate(box, ['slideOut'], 200);
							this.undimMessage();
						}

						// trigger update message event
						$.EventManager.trigger('updateMessageOpened');
					}
					catch(ex) {}
					
					e.stopPropagation();
					e.preventDefault();
				}, this), false);
			}
		},

		showLanguagePanel: function(type)
		{
			var languagesEl = this.doc.getElementById('translator-popup-' + type + '-languages-wrapper');

			if(!this.refs.languagePanel) {
				let panel = this.refs.languagePanel = this.doc.createElement('div');
				panel.id = 'translator-popup-language-panel';
				panel.className = 'translator-theme-' + this.theme;
				panel.style.display = 'none';

				let tab = this.refs.languagePanelTab = this.doc.createElement('div');
				tab.id = 'translator-popup-language-panel-tab';
				tab.style.display = 'none';

				// insert before translation message box
				this.refs.popup.insertBefore(panel, this.refs.message);

				// insert to the title element
				languagesEl.parentNode.appendChild(tab);

				// click listener
				panel.addEventListener('click', $.bindMethod(this.languagePanelClickHandler, this), false);
			}
			
			// setup and show panel elements
			if(!this.isLanguagePanelOpen() || this.refs.languagePanel.getAttribute('data-type') !== type) {
				// show language list only there is more than one language or it's a list for source languages
				if (this.languages.length > 1 || type == 'source') {
					// save language type
					this.refs.languagePanel.setAttribute('data-type', type);

					// build list of lanuages
					var languageItems = [];

					if(type == 'source') {
						languageItems.push('<li code="auto" ' + (this[type + 'Language'] == 'auto' ? 'data-selected=""' : '') + '>' + $.properties.getString('autoDetect') + '</li>');
					}

					for(let i = 0, l = this.languages.length; i < l; i++) {
						let lang = this.languages[i];

						languageItems.push('<li code="' + lang.code + '" ' + (this[type + 'Language'] == lang.code ? 'data-selected=""' : '') + '>' + lang.name + '</li>');
					}

					// build html
					var ul = document.createElement("ul")
					ul.innerHTML = languageItems.join('')
					this.refs.languagePanel.appendChild(ul)

					// update tab position and size
					let ts = this.refs.languagePanelTab.style;
					ts.left = (languagesEl.offsetLeft - 3) + 'px';
					ts.top = (languagesEl.offsetTop - 2) + 'px';
					ts.height = languagesEl.offsetHeight + 'px';
					ts.width = languagesEl.offsetWidth + 'px';

					if(!this.isLanguagePanelOpen()) {
						this.refs.languagePanelTab.style.display = '';
						this.animate(this.refs.languagePanel, ['slideIn'], 200);

						this.dimMessage();
					}
				}
				// otherwise, show a notice and hide a panel
				else {
					this.setNotice($.properties.getString('languageSelectionNotice'));
					this.hideLanguagePanel();
				}
			}
			// hide panel
			else {
				this.hideLanguagePanel();
			}
		},

		hideLanguagePanel: function()
		{
			if(this.refs.languagePanel) {
				this.refs.languagePanel.removeAttribute('data-type');

				this.animate(this.refs.languagePanel, ['slideOut'], 150, $.bindMethod(function() {
					this.refs.languagePanelTab.style.display = 'none';
				}, this));
				
				this.undimMessage();
			}
		},

		isLanguagePanelOpen: function()
		{
			return (this.refs.languagePanel && this.refs.languagePanel.style.display != 'none');
		},
		
		dimMessage: function()
		{
			this.animate(this.refs.message, [{
				property: 'opacity',
				end: .3
			}], 0);
		},
		
		undimMessage: function()
		{
			this.animate(this.refs.message, [{
				property: 'opacity',
				end: 1
			}], 0);
		},
		
		showMessage: function()
		{
			if(!this.initialized) {
				this.init();
			}
			
			this.refs.message.className = 'translator-message-type-normal';
			
			// call standard show function
			this.show();
		},
		
		showError: function()
		{
			if(!this.initialized) {
				this.init();
			}

			this.refs.message.className = 'translator-message-type-error';
			
			// call standard show function
			this.show();
		},

		showAutoCopyNotice: function()
		{
			let notice = this.doc.getElementById('translator-popup-autocopy-notice');

			if(notice == null) {
				// create notice
				notice = this.doc.createElement('div');
				notice.id = 'translator-popup-autocopy-notice';
				notice.textContent = $.properties.getString('autoCopied');
				this.refs.toolbar.appendChild(notice);
			}
			else {
				notice.style.display = '';
			}

			// hide copy button
			this.refs.copyButton.style.display = 'none';
		},
		
		show: function()
		{
			if(!this.initialized) {
				this.init();
			}
			
			if(!this.refs.popup) return;

			this.doReset = false;
			
			// set max height/width and leave at least some space around for elements and just for space
			this.refs.popup.style.maxWidth = (Math.min(this.doc.defaultView.innerWidth, 450) - 50) + 'px';
			this.refs.popup.style.maxHeight = (Math.min(this.doc.defaultView.innerHeight, 580) - 50) + 'px';
			this.refs.message.style.maxHeight = (Math.min(this.doc.defaultView.innerHeight, 580) - 100) + 'px';

			this.updatePosition(this.refs.popup, {height: 80, width: 280});
			
			// show/hide translation message element
			this.refs.message.style.display = this.translatedText.length ? '' : 'none';
			
			// show/hide notice element
			this.refs.notice.style.display = (this.notice && this.notice.length) ? '' : 'none';

			this.animate(this.refs.popup, ['slideIn', 'fadeIn'], 400, $.bindMethod(function() {
				this.visible = true;
			}, this));

			this.animate(this.refs.loading, ['fadeOut'], 150);
		},
		
		animate: function(el, animations, duration, callback)
		{
			try {
				let style = this.doc.defaultView.getComputedStyle((this.refs.loading || this.refs.popup), null);

				if(style.getPropertyValue('z-index') != '2.14748e+9') {
					let counter = 0;

					var timer = new $.Timer(function() {
						if(style.getPropertyValue('z-index') == '2.14748e+9' || counter > 100) {
							timer.cancel();
							$.FX.animate(el, animations, duration, callback);
						}
						else {
							counter++;
						}
					}, 10, $.Timer.TYPE_REPEATING_SLACK);

					return;
				}
			}
			catch(ex) {}

			$.FX.animate(el, animations, duration, callback);
		},
		
		hide: function()
		{
			if(!this.refs.popup || !this.visible) return;

			this.doReset = true;
			
			this.animate(this.refs.loading, ['fadeOut'], 150);
			this.animate(this.refs.popup, ['slideOut', 'fadeOut'], 250, $.bindMethod(function() {
				this.visible = false;
				this.resetElements();
			}, this));
		},

		updatePosition: function(el, minFootprint)
		{
			minFootprint = minFootprint || {height: 0, width: 0};

			let bottom = this.css.x != undefined ? 'auto' : 0,
					left = this.css.x != undefined ? Math.max(this.css.x - this.offset.x, 0) : 'auto',
					right = this.css.y != undefined ? 'auto' : 0,
					top = this.css.y != undefined ? Math.max(this.css.y - this.offset.y, 0) : 'auto';

			if (left != 'auto' && left + minFootprint.width > this.doc.defaultView.innerWidth) {
				left = 'auto';
				right = 0;
			}

			if (top != 'auto' && top + minFootprint.height  > this.doc.defaultView.innerHeight) {
				top = 'auto';
				bottom = 0;
			}

			el.style.bottom = bottom > 0 ? bottom + 'px' : bottom;
			el.style.left = left > 0 ? left + 'px' : left;
			el.style.right = right > 0 ? right + 'px' : right;
			el.style.top = top > 0 ? top + 'px' : top;
		},

		setOffset: function(x, y)
		{
			this.offset.x = x;
			this.offset.y = y;
		},
		
		setPosition: function(x, y)
		{
			this.css.x = x + 5;
			this.css.y = y + 5;
		},
		
		resetPosition: function()
		{
			this.css = {};
		},
		
		resetElements: function()
		{
			if(!this.doReset) return;
			
			this.refs.message.innerHTML = '';
			this.refs.notice.innerHTML = '';
			this.refs.textarea.value = '';
			
			this.refs.message.style.height = '';
			this.refs.message.style.width = '';
			this.refs.message.style.opacity = 1;
			this.refs.copyButton.style.display = '';

			this.hideLanguagePanel();

			let notice = this.doc.getElementById('translator-popup-autocopy-notice');
			if(notice) {
				notice.style.display = 'none';
			}

			let updateMessage = this.doc.getElementById('translator-popup-update-message');
			if(updateMessage) {
				updateMessage.parentNode.removeChild(updateMessage);
			}
		},

		selectNextLanguage: function(type, currentLanguage, animated)
		{
			currentLanguage = currentLanguage || this[type + 'Language'];
			animated = animated != undefined ? animated : true;

			var language = currentLanguage;

			if(this.languages.length == 0) {
				language = 'auto';
			}
			else if(this.languages.length == 1 && type == 'target') {
				this.setNotice($.properties.getString('languageSelectionNotice'));
			}
			else {
				if(currentLanguage == 'auto') {
					language = this.languages[0].code;
				}
				else {
					for(let i = 0, l = this.languages.length; i < l; i++) {
						if(this.languages[i].code == currentLanguage) {
							language = i + 1 < l ? this.languages[i + 1].code : (type == 'source' ? 'auto' : this.languages[0].code);
							break;
						}
					}
				}
			}

			this.selectLanguage(type, language, animated);
		},

		selectLanguage: function(type, language, animated)
		{
			animated = animated != undefined ? animated : false;

			var currentLanguage = this[type + 'Language'];
			if(currentLanguage != language) {
				this[type + 'Language'] = language;

				this.translate(this.sourceText, this.sourceLanguage, this.targetLanguage);

				$.EventManager.trigger(type + 'LanguageChanged', language);
			}

			this.scrollLanguageList(type, language, animated);
		},

		scrollLanguageList: function(type, language, animated)
		{
			if(!this.refs.popup) return;

			var list = this.doc.getElementById('translator-popup-' + type + '-languages'),
					style = this.doc.defaultView.getComputedStyle(list, null),
					index = -1;

			// get language index in the list
			for(let i = 0, l = this.languages.length; i < l; i++) {
				if(this.languages[i].code == language) {
					index = i;
					break;
				}
			}

			let params = {
				property: 'marginTop',
				start: parseInt(style.marginTop),
				end: index * -18 - (type == 'source' ? 18 : 0), // adjust for source because of auto language listed first
				units: 'px'
			};

			this.animate(list, [params], (animated && this.visible) ? 500 : 0);
		},

		toolbarClickHandler: function(e)
		{
			var el = e.target;

			// go up the tree to find first element that can be handled
			while(el !== e.currentTarget) {
				if(el.id) {
					switch(el.id) {
						case 'translator-popup-button-copy':
							$.Utils.copyStringToClipboard(this.translatedText);
							break;

						case 'translator-popup-source-languages-scroller':
							this.showLanguagePanel('source');
							break;

						case 'translator-popup-target-languages-scroller':
							this.showLanguagePanel('target');
							break;

						case 'translator-popup-source-languages':
							if(this.isLanguagePanelOpen()) {
								this.hideLanguagePanel();
							}
							else {
								this.selectNextLanguage('source');
							}
							break;

						case 'translator-popup-target-languages':
							if(this.isLanguagePanelOpen()) {
								this.hideLanguagePanel();
							}
							else {
								this.selectNextLanguage('target');
							}
							break;
					}
				}

				el = el.parentNode;
			}
		},

		languagePanelClickHandler: function(e)
		{
			var type = e.currentTarget.getAttribute('data-type'),
					language = e.target.getAttribute('code');

			if(type && language) {
				this.selectLanguage(type, language);
				this.hideLanguagePanel();
			}
		}
	};

	$.Debug.register($.Popup, $);
})(qlk.qt);