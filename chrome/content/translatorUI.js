
(function($)
{
	if($.TranslatorUI) return;

	$.TranslatorUI = function()
	{
		$.bindHandlers(this);
	};
	
	$.TranslatorUI.prototype = {
		win: null,
		doc: null,
		_preferencesWindow: null,

		E: function(id, doc) {
			return $.E(id, doc || this.doc);
		},
		
		init: function()
		{
			// set context menu listeners
			this.E('translator-context-menu').bindListener('popupshowing', this.contextMenuShowingHandler);
			
			// set context area menu listeners
			this.E('contentAreaContextMenu').bindListener('popupshowing', this.contextAreaMenuShowingHandler);
			this.E('contentAreaContextMenu').bindListener('popuphidden', this.contextAreaMenuHiddenHandler);
			this.E('mailContext').bindListener('popupshowing', this.contextAreaMenuShowingHandler);
			this.E('mailContext').bindListener('popuphidden', this.contextAreaMenuHiddenHandler);
			this.E('msgComposeContext').bindListener('popupshowing', this.contextAreaMenuShowingHandler);
			this.E('msgComposeContext').bindListener('popuphidden', this.contextAreaMenuHiddenHandler);

			// set toolbar button menu listeners
			this.addToolbarButtonMenuListeners();
		},

		addToolbarButtonMenuListeners: function()
		{
			this.E('translator-toolbarbutton-menu').rebindListener('popupshowing', this.toolbarButtonMenuShowingHandler);
			this.E('translator-toolbarbutton-menu').rebindListener('popuphidden', this.toolbarButtonMenuHiddenHandler);
		},

		removeToolbarButtonMenuListeners: function()
		{
			this.E('translator-toolbarbutton-menu').unbindListener('popupshowing', this.toolbarButtonMenuShowingHandler);
			this.E('translator-toolbarbutton-menu').unbindListener('popuphidden', this.toolbarButtonMenuHiddenHandler);
		},
		
		showDefaultState: function()
		{
			var toolbarButton = this.E('translator-toolbarbutton');
			if(toolbarButton) {
				toolbarButton.setAttribute('state', 'enabled');
			}
			
			this.E('translator-status-bar').setAttribute('state', 'enabled');
			this.E('translator-context-menuitem-enable').hidden = true;
			this.E('translator-context-menuitem-disable').hidden = false;
		},
		
		showErrorState: function()
		{
			var toolbarButton = this.E('translator-toolbarbutton');
			if(toolbarButton) {
				toolbarButton.setAttribute('state', 'error');
			}
			
			this.E('translator-status-bar').setAttribute('state', 'error');
			this.E('translator-context-menuitem-enable').hidden = true;
			this.E('translator-context-menuitem-disable').hidden = false;
		},
		
		showDisabledState: function()
		{
			var toolbarButton = this.E('translator-toolbarbutton');
			if(toolbarButton) {
				toolbarButton.setAttribute('state', 'disabled');
			}
			
			this.E('translator-status-bar').setAttribute('state', 'disabled');
			this.E('translator-context-menuitem-enable').hidden = false;
			this.E('translator-context-menuitem-disable').hidden = true;
		},
		
		showContextMenu: function(state)
		{
			if(state) {
				this.E('translator-content-area-menuitem-translate').removeAttribute('disabledState');
			}
			else {
				this.E('translator-content-area-menuitem-translate').setAttribute('disabledState', 'true');
			}

			let translatePageMenuitem = this.E('translator-content-area-menuitem-translate-page');
			if(translatePageMenuitem) {
				translatePageMenuitem.setAttribute('hidden', state ? 'false' : 'true');
			}
		},
		
		showToolbar: function(state)
		{
			try {
				// determine toolbox
				var toolbox = this.E(['navigator-toolbox', 'mail-toolbox', 'compose-toolbox']);
				if(toolbox == null) return;

				// determine default toolbar
				var toolbar = this.E(['nav-bar', 'mail-bar3', 'msgToolbar', 'composeToolbar', 'composeToolbar2']);
				if(toolbar == null) return;

				// determine toolbar to work with
				// by searching toolbar button in any of
				// toolbar available, otherwise default will be used
				if(toolbox.hasChildNodes()) {
					var toolbars = toolbox.childNodes;

					for(var i = 0; i < toolbars.length; i++) {
						if(toolbars[i].currentSet && toolbars[i].currentSet.search(/translator-toolbarbutton/ig) != -1) {
							toolbar = toolbars[i];
						}
					}
				}

				// check for present toolbar
				if(toolbar == null) return;

				// set toolbar button
				var currentSet = toolbar.currentSet;

				if(state) {
					// add toolbar item only if it is not there yet
					if(currentSet.search(/translator-toolbarbutton/ig) == -1) {
						if(toolbar.id == 'composeToolbar2') {
							currentSet = currentSet + ',separator,translator-toolbarbutton';
						}
						else {
							currentSet = currentSet.replace(/(urlbar-container|nav-bar-inner|spring,throbber-box|spring,gloda-search)/i,
								'translator-toolbarbutton,$1');
						}
					}
				}
				else {
					// remove toolbar item only if it is there
					if(currentSet.search(/translator-toolbarbutton/ig) != -1) {
						if(toolbar.id == 'composeToolbar2') {
							currentSet = currentSet.replace(/,?separator,translator-toolbarbutton/i, '');
						}
						else {
							currentSet = currentSet.replace(/,?translator-toolbarbutton/i, '');
						}
					}
				}

				// save in case of any changes
				if(currentSet != toolbar.currentSet) {
					// set navigation bar attribute
					toolbar.setAttribute('currentset', currentSet);

					// overwrite current set
					toolbar.currentSet = currentSet;

					// persist navigation bar
					this.doc.persist(toolbar.id, 'currentset');

					// if you don't do the following call, funny things happen
					try {
						BrowserToolboxCustomizeDone(true);
					}
					catch(e) {}

					// bind toolbar button listeners
					if(state) {
						this.addToolbarButtonMenuListeners();
					}
					else {
						this.removeToolbarButtonMenuListeners();
					}
				}
			}
			catch(e) {}
		},
		
		showStatusBarIcon: function(state)
		{
			this.E('translator-status-bar').setAttribute('hidden', !state ? 'true' : 'false');
		},

		showInputPanel: function()
		{
			// get input panel
			var inputPanel = this.E('translator-input-panel');

			// determine position
			var left = (this.win.outerWidth - 300) / 2;
			var top = (this.win.outerHeight - 150) / 2;

			// show panel
			inputPanel.openPopup(null, null, left, top, false, false);

			// select all in text box (will just focus if empty)
			// NOTE: small timeout necessary for input panel to open
			$.Timer.timeout($.bindMethod(function() {
				this.E('translator-input-textbox').select();
			}, this), 200);
			
			$.EventManager.trigger('inputPanelOpened');
		},

		openPreferences: function()
		{
			if(this._preferencesWindow === null || this._preferencesWindow.closed) {
				let instantApply = $.Services.prefService.getBranch('browser.preferences.')
						.QueryInterface(Components.interfaces.nsIPrefBranch2).getBoolPref('instantApply');
				
				let features = 'chrome,titlebar,toolbar,centerscreen,' + (instantApply ? 'dialog=no' : 'modal');
				
				this._preferencesWindow = this.win.openDialog('chrome://translator/content/preferences.xul',
						'translator-preferences', features);
			}

			this._preferencesWindow.focus();
		},
		
		_moveContextMenuToToolbar: function()
		{
			var contextMenu = this.E('translator-context-menu');
			var toolbarMenu = this.E('translator-toolbarbutton-menu');
			
			while(contextMenu.hasChildNodes()) {
				toolbarMenu.appendChild(contextMenu.firstChild);
			}
		},
		
		_moveContextMenuFromToolbar: function()
		{
			var contextMenu = this.E('translator-context-menu');
			var toolbarMenu = this.E('translator-toolbarbutton-menu');
			
			while(toolbarMenu.hasChildNodes()) {
				contextMenu.appendChild(toolbarMenu.firstChild);
			}
		},

		_isTextSelected: function()
		{
			var isTextSelected = false

			// NOTE: window.gContextMenu should be used to avoid 'not defined' JS error
			if(typeof this.win.gContextMenu != 'undefined' && this.win.gContextMenu) {
				if(this.win.gContextMenu.isContentSelected) {
					if(this.win.gContextMenu.isTextSelected !== undefined) {
						isTextSelected = this.win.gContextMenu.isTextSelected;
					}
					else { // thunderbird
						isTextSelected = ($.Page.getSelectedText(this.doc.commandDispatcher.focusedWindow.document).length > 0);
					}
				}
				else if(this.win.gContextMenu.onTextInput) {
					isTextSelected = ($.Page.getSelectedText(this.doc.commandDispatcher.focusedWindow.document).length > 0);
				}
			}
			else {
				isTextSelected = ($.Page.getSelectedText(this.doc.commandDispatcher.focusedWindow.document).length > 0);
			}

			return isTextSelected;
		},

		
		/* Event listeners */

		contextMenuShowingHandler: function(e)
		{
			if(e.eventPhase == Event.AT_TARGET) {
				this.E('translator-context-menuitem-translate').disabled = !this._isTextSelected();
			}
		},

		contextAreaMenuShowingHandler: function(e)
		{
			if(e.eventPhase == Event.AT_TARGET) {
				// if context menuitem is in disabled state, do NOT try to show it
				if(this.E('translator-content-area-menuitem-translate').hasAttribute('disabledState')) return;

				this.E('translator-content-area-menuitem-translate').setAttribute('hidden', this._isTextSelected() ? 'false' : 'true');
			}
		},

		contextAreaMenuHiddenHandler: function(e)
		{
			if(e.eventPhase == Event.AT_TARGET) {
				// if context menuitem is hidden, do NOT do anything with it
				if(this.E('translator-content-area-menuitem-translate').hasAttribute('disabledState')) return;

				this.E('translator-content-area-menuitem-translate').setAttribute('hidden', 'true');
			}
		},
		
		toolbarButtonMenuShowingHandler: function(e)
		{
			if(e.eventPhase == Event.AT_TARGET) {
				this.E('translator-context-menuitem-translate').disabled = !this._isTextSelected();

				this._moveContextMenuToToolbar();
			}
		},
		
		toolbarButtonMenuHiddenHandler: function(e)
		{
			if(e.eventPhase == Event.AT_TARGET) {
				this._moveContextMenuFromToolbar();
			}
		}
	};

	$.Debug.register($.TranslatorUI, $);
})(qlk.qt);