
(function($)
{
	if($.Page) return;
	
	$.Page = function(controller)
	{
		this.controller = controller;

		$.bindHandlers(this);
	};

	$.Page.THEME_ORIGINAL = 'original';
	$.Page.THEME_DEFAULT = 'default';
	$.Page.THEME_SYSTEM = 'system';

	$.Page.getSelectedText = function(doc)
	{
		let selectedText = '';

		try {
			let activeEl = doc.activeElement;
			
			// when frame, get selected text from frame document
			if(activeEl.tagName.toLowerCase() == 'frame') {
				return $.Page.getSelectedText(activeEl.contentDocument);
			}

			if(activeEl != null && activeEl.tagName.toLowerCase() !== 'body' && activeEl.value != null) {
				// password field text should not be translated
				if(activeEl.type != 'password') {
					selectedText = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd);
				}
			}
			else {
				selectedText = doc.defaultView.getSelection().toString();
			}
			
			// trim and replace new lines
			// NOTE: trim should be done first to trim new line as well when needed
			selectedText = selectedText.replace(/^\s+|\s+$/g, '').replace(/(\r\n|\n)/g, '<br>');
		}
		catch(ex) {
			if($.Debug.enabled) {
				$.Debug.log('Exception: ' + ex);
			}
		}

		return selectedText;
	};
	
	$.Page.prototype = {
		controller: null,
		id: null,
		window: null,
		doc: null,
		_popup: null,
		_floatingPanel: null,
		_lastProcessedSelectedText: null,
		
		init: function(doc)
		{
			this.window = doc.defaultView;
			this.doc = doc;

			// create namespace
			this.window.qlk = {};
			
			// make function references for access to popup and floating panel
			this.window.qlk.getQuickTranslatorPopup = $.bindMethod(this.getPopup, this);
			this.window.qlk.getQuickTranslatorFloatingPanel = $.bindMethod(this.getFloatingPanel, this);
			
			// generate page id
			this.id = ((new Date()).getTime() + '' + Math.floor(Math.random() * 1000000)).substr(0, 18);
			
			// add event listeners
			this.addListeners();
			
			// add page unload listener
			this.window.addEventListener('unload', this.pageUnloadHandler, false);
			
			// add UI listeners if translator is already enabled
			if(this.controller.isTranslatorEnabled()) {
				this.addTranslatorListeners();
			}
		},

		callPopupMethod: function(methodName)
		{
			let popup = this.getPopup();

			if(popup && typeof popup[methodName] == 'function') {
				popup[methodName].apply(popup, Array.prototype.slice.call(arguments, 1));
			}
		},

		callFloatingPanelMethod: function(methodName)
		{
			let panel = this.getFloatingPanel();

			if(panel && typeof panel[methodName] == 'function') {
				panel[methodName].apply(panel, Array.prototype.slice.call(arguments, 1));
			}
		},
		
		getPopup: function()
		{
			// create popup if not exists
			if(this._popup == null) {
				var popupBaseWindow = this.window.top;

				// popup should be created only for top frame (see #73)
				// or largest frame in case of the frameset as body element (see #190, #194, #210)
				if(popupBaseWindow.document.body && popupBaseWindow.document.body.tagName.toLowerCase() == 'frameset') {
					let frames = this.window.top.frames,
							maxArea = 0,
							maxAreaFrameIndex = 0;

					for(let i = 0, l = frames.length; i < l; i++) {
						let frameArea = frames[i].innerHeight * frames[i].innerWidth;
						if(frameArea >= maxArea) {
							maxArea = frameArea;
							maxAreaFrameIndex = i;
						}
					}

					// set base window to largest frame
					popupBaseWindow = this.window.top.frames[maxAreaFrameIndex].document.defaultView;
				}

				// self
				if(popupBaseWindow === this.window.self) {
					this._popup = new $.Popup(this.doc);
					this._popup.theme = this.controller.getTheme();

					// set delegated transate method
					this._popup.translate = $.bindMethod(this.translate, this);

					// set viewport offset
					let offset = this._getViewportPosition(this.window.frameElement);
					this._popup.setOffset(offset.x, offset.y);

					// set languages
					this._popup.setLanguages(this.controller.languages, this.controller.sourceLanguage, this.controller.targetLanguage);
				}
				// another
				else {
					this._popup = popupBaseWindow.qlk.getQuickTranslatorPopup();
				}
			}
			
			return this._popup;
		},
		
		getFloatingPanel: function()
		{
			// create floating panel if not exists
			if(this._floatingPanel == null) {
				// floating pane should be created only for top frame (see #73)
				// and make sure that top frame have body element, unlike framesets (see #190)
				if(this.window.top === this.window.self ||
					(this.window.top.document.body && this.window.top.document.body.tagName.toLowerCase() == 'frameset')) {
					// if current body is a frameset, use first frame window popup (see #194)
					if(this.doc.body && this.doc.body.tagName.toLowerCase() == 'frameset') {
						if(this.window.frames[0]) {
							this._floatingPanel = this.window.frames[0].qlk.getQuickTranslatorFloatingPanel();
						}
					}
					else {
						this._floatingPanel = new $.FloatingPanel(this.doc);
						this._floatingPanel.theme = this.controller.getTheme();

						// set viewport offset
						let offset = this._getViewportPosition(this.window.frameElement);
						this._floatingPanel.setOffset(offset.x, offset.y);
					}
				}
				else {
					// use floating pane from top frame
					this._floatingPanel = this.window.top.qlk.getQuickTranslatorFloatingPanel();
				}
			}
			
			return this._floatingPanel;
		},
		
		addListeners: function()
		{
			$.EventManager.bind('translatorEnabled.' + this.id, this.translatorEnabledHandler);
			$.EventManager.bind('selectionTranslationEnabled.' + this.id, this.selectionTranslationEnabledHandler);
			$.EventManager.bind('floatingTranslationEnabled.' + this.id, this.floatingTranslationEnabledHandler);
			$.EventManager.bind('languagesChanged.' + this.id, this.languagesChangedHandler);
			$.EventManager.bind('inputPanelOpened.' + this.id, this.inputPanelOpenedHandler);
		},
		
		removeListeners: function()
		{
			$.EventManager.unbind('.' + this.id);
		},
		
		addTranslatorListeners: function()
		{
			if(this.controller.isTranslationBySelectionEnabled() || this.controller.isTranslationByFloatingEnabled()) {
				this.addMouseListeners();
			}
			
			// set translation methods to window element
			this.window.qlk.translateText = $.bindMethod(this.translateText, this);
			this.window.qlk.translateSelection = $.bindMethod(this.translateSelection, this);
			
			// mousedown listener always needed if translator is enabled for closing popup
			this.doc.removeEventListener('mousedown', this.mousedownHandler, false);
			this.doc.addEventListener('mousedown', this.mousedownHandler, false);
		},
		
		removeTranslatorListeners: function()
		{
			// remove translation methods from window element
			delete this.window.qlk.translateText;
			delete this.window.qlk.translateSelection;

			this.doc.removeEventListener('mousedown', this.mousedownHandler, false);
		},
		
		addMouseListeners: function()
		{
			this.doc.removeEventListener('mouseup', this.mouseupHandler, false);
			this.doc.addEventListener('mouseup', this.mouseupHandler, false);
		},
		
		removeMouseListeners: function()
		{
			this.doc.removeEventListener('mouseup', this.mouseupHandler, false);
		},

		translate: function(text, sourceLanguage, targetLanguage)
		{
			// do not check for equal source and target languages,
			// since this method called with explicitly set languages
			$.EventManager.trigger('translate', {
				text: text,
				sourceLanguage: sourceLanguage,
				targetLanguage: targetLanguage,
				callback: $.bindMethod(this.translatorCallback, this)
			});
		},
		
		translateSelection: function(autoTriggered, selectedText)
		{
			if(selectedText == null) {
				selectedText = this.getSelectedText();
			}

			if(selectedText.length == 0) return;
			
			if(!autoTriggered) {
				this.translateText(selectedText);
			}
			else {
				this.controller.translate(selectedText, $.bindMethod(function(status, translation, params) {
					// select next target language when it equals to source language
					if(translation.sourceLanguage === translation.targetLanguage && this.controller.languages.length > 1) {
						this.callPopupMethod('selectNextLanguage', 'target', translation.targetLanguage, false);
					}
					// continue otherwise
					else {
						this.translatorCallback(status, translation, params);
					}
				}, this));

				// following code is not needed after multiple languages can be selected
				// however, it should be left here for some time in case of changes
//				this.controller.translate(text, $.bindMethod(function(status, translation, params) {
//					// cancel translation when original language equals translation language
//					if(translation.sourceLanguage === translation.targetLanguage) {
//						status = $.Translator.STATUS_CANCELLED;
//					}
//
//					this.translatorCallback(status, translation, params);
//				}, this));
			}
		},
		
		translateText: function(text)
		{
			// reset popup position (bottom corner)
			this.callPopupMethod('resetPosition');

			// hide floating pane (if it was shown)
			this.callFloatingPanelMethod('hide');

			if(text.length > 0) {
				this.controller.translate(text, $.bindMethod(function(status, translation, params) {
					// select next target language when it equals to source language
					if(translation.sourceLanguage === translation.targetLanguage && this.controller.languages.length > 1) {
						this.callPopupMethod('selectNextLanguage', 'target', translation.targetLanguage, false);
					}
					// continue otherwise
					else {
						this.translatorCallback(status, translation, params);
					}
				}, this));
			}
		},
		
		translatorCallback: function(status, translation, params)
		{
			params = params || {};

			if(status == $.Translator.STATUS_TRANSLATING) {
				this.showLoadingMessage();
			}
			else if(status == $.Translator.STATUS_CANCELLED) {
				this.callPopupMethod('hide');
			}
			else {
				let notice = null;

				if(status == $.Translator.STATUS_NOT_DETECTED) {
					notice = $.properties.getString('languageNotDetected');
				}
				else if(status == $.Translator.STATUS_NOT_TRANSLATED) {
					notice = $.properties.getString('unableToTranslate');
				}
				else if(status == $.Translator.STATUS_TRANSLATED) {
					if(translation.isTruncated) {
						notice = $.properties.getString('truncatedTranslation');
					}
				}

				let detectedLanguage = $.properties.getString('lang' + ($.Languages[translation.sourceLanguage] || 'Unknown'))
				this.callPopupMethod('setDetectedLanguage', detectedLanguage);
				this.showMessage(translation.sourceText, translation.translatedText, notice);
			}

			if(params.autoCopied) {
				this.callPopupMethod('showAutoCopyNotice');
			}
		},
		
		showMessage: function(sourceText, translatedText, notice)
		{
			if(this.controller.isJustUpdated) {
				this.callPopupMethod('showUpdateMessage');
			}
			
			this.callPopupMethod('setText', sourceText, translatedText);
			this.callPopupMethod('setNotice', notice);
			this.callPopupMethod('showMessage');
		},
		
		showLoadingMessage: function()
		{
			this.callPopupMethod('showLoading', $.properties.getString('loading'));
		},
		
		getSelectedText: function()
		{
				$.Debug.log(this.doc);
				$.Debug.log(this.doc.defaultView.location.href);
			return $.Page.getSelectedText(this.doc);
		},
		
		_getEventViewportPosition: function(e)
		{
			var offset = this._getViewportPosition(e.target.ownerDocument.defaultView.frameElement);

			return {
				x: offset.x + e.clientX,
				y: offset.y + e.clientY
			};
		},

		_getViewportPosition: function(el)
		{
			var x = 0,
					y = 0;

			while(el) {
				x += el.offsetLeft;
				y += el.offsetTop;

				// parent element
				if(el.offsetParent) {
					el = el.offsetParent;
				}
				// parent frame
				else if(el.ownerDocument) {
					// count in parent frame scroll
					x -= el.ownerDocument.defaultView.scrollX;
					y -= el.ownerDocument.defaultView.scrollY;

					el = el.ownerDocument.defaultView.frameElement;
				}
				else {
					el = null;
				}
			}

			return {
				x: x,
				y: y
			};
		},
		
		
		/* event handlers */
		
		translatorEnabledHandler: function(e, enabled)
		{
			if(enabled) {
				this.addTranslatorListeners();
			}
			else {
				this.removeTranslatorListeners();

				// hide translation popup
				this.callPopupMethod('hide');
			}
		},
		
		selectionTranslationEnabledHandler: function(e, enabled)
		{
			if(enabled) {
				this.addMouseListeners();
			}
			else {
				if(!this.controller.isTranslationByFloatingEnabled()) {
					this.removeMouseListeners();
				}
				
				// hide translation popup
				this.callPopupMethod('hide');
			}
		},
		
		floatingTranslationEnabledHandler: function(e, enabled)
		{
			if(enabled) {
				this.addMouseListeners();
			}
			else {
				if(!this.controller.isTranslationBySelectionEnabled()) {
					this.removeMouseListeners();
				}
				
				// hide floating panel popup
				this.callFloatingPanelMethod('hide');
			}
		},

		languagesChangedHandler: function(e, data)
		{
			if(this._popup) {
				this.callPopupMethod('setLanguages', data.languages, data.sourceLanguage, data.targetLanguage);
			}
		},

		inputPanelOpenedHandler: function()
		{
			/* NOTE: no need to use access functions here */

			if(this._popup && this._popup.visible) {
				this._popup.hide();
			}

			if(this._floatingPanel && this._floatingPanel.visible) {
				this._floatingPanel.hide();
			}
		},

		mousedownHandler: function(e)
		{
			if(this._popup && this._popup.visible) {
				// hide when target is not popup element
				if(findClosest(e.target, 'translator-popup') == null) {
					this._popup.hide();
				}
			}

			if(this._floatingPanel && this._floatingPanel.visible) {
				// hide when target is not panel element
				if(findClosest(e.target, 'translator-floating-panel') == null) {
					this._floatingPanel.hide();
				}
				else {
					// when mousedown is on the panel stop event from bubbling
					// since it will remove text selection before it's translated
					e.preventDefault();
					e.stopPropagation();
				}
			}
		},

		mouseupHandler: function(e)
		{
			if(e.which !== 1) return;
			if(!this.controller.isTranslatorEnabled()) return;

			// if translation popup itself
			if(this._popup && this._popup.visible && findClosest(e.target, 'translator-popup') != null) return;

			let selectedText = this.getSelectedText();
			if(selectedText.length > 0 && this._lastProcessedSelectedText != selectedText) {
				if(this.controller.isTranslationBySelectionEnabled()) {
					if(!this.getPopup()) return;

					// get absolute position for event (in case event is happened in a frame)
					let eventPosition = this._getEventViewportPosition(e);

					this.callPopupMethod('setPosition', eventPosition.x, eventPosition.y);
					this.translateSelection(true, selectedText);
				}
				else if(this.controller.isTranslationByFloatingEnabled()) {
					if(!this.getFloatingPanel()) return;

					// show floating panel when target is not panel element
					if(findClosest(e.target, 'translator-floating-panel') == null) {
						// get absolute position for event (in case event is happened in a frame)
						let eventPosition = this._getEventViewportPosition(e);

						this.callFloatingPanelMethod('show', eventPosition.x, eventPosition.y, $.bindMethod(function() {
							// reset popup position (bottom corner)
							this.callPopupMethod('resetPosition');

							// translate selected text
							this.translateText(selectedText);
						}, this));
					}
					else {
						// when mouseup is on the panel stop event from bubbling
						// since it will remove text selection before it's translated
						e.preventDefault();
						e.stopPropagation();
					}
				}

				this._lastProcessedSelectedText = selectedText;
			}
			else {
				this._lastProcessedSelectedText = null;
			}
		},
		
		pageUnloadHandler: function()
		{
			this.removeListeners();

			// remove namespace object
			delete this.window.qlk;
		}
	};

	function findClosest(obj, elementID)
	{
		while(obj != null && obj.id != elementID) {
			obj = obj.parentNode;
		}

		return obj;
	}

	$.Debug.register($.Page, $);
})(qlk.qt);