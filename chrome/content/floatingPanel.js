
(function($)
{
	if($.FloatingPanel) return;

	$.FloatingPanel = function(doc)
	{
		this.doc = doc;
		this.css = {};
		this.offset = {x: 0, y: 0};
	};
	
	$.FloatingPanel.prototype = {
		initialized: false,
		doc: null,
		panel: null,
		callback: null,
		theme: null,
		css: null,
		offset: null,
		visible: false,
		
		init: function()
		{
			if(this.initialized) return;

			// default theme is 'system'
			if(this.theme === null) {
				this.theme = $.Page.THEME_DEFAULT;
			}
			
			// create panel
			this.createPanel();
			
			this.initialized = true;
		},
		
		uninit: function()
		{
			this.panel.parentNode.removeChild(this.panel);
			this.panel = null;
			this.theme = null;
			this.css = {};
			this.visible = false;
			this.initialized = false;
		},
		
		createPanel: function()
		{
			// load css style
			let css = this.doc.createElement('link');
			css.rel = 'stylesheet';
			css.type = 'text/css';
			css.href = 'chrome://translator/skin/floatingPanel.css';
			this.doc.getElementsByTagName('head')[0].appendChild(css);

			// create panel
			let panel = this.panel = this.doc.createElement('div');
			panel.id = 'translator-floating-panel';
			panel.className = 'translator-theme-' + this.theme;
			panel.style.display = 'none'; // hide panel by default (do not use css for this)
			this.doc.getElementsByTagName('body')[0].appendChild(panel);
			
			// create button
			let button = this.doc.createElement('div');
			button.id = 'translator-floating-panel-button';
			button.title = $.properties.getString('clickToTranslate');
			panel.appendChild(button);

			// set click for floating panel
			panel.addEventListener('click', $.bindMethod(function(e) {
				if(typeof this.callback == 'function') {
					this.callback();

					// remove callback (should be used one time only)
					this.callback = null;
				}

				this.hide();

				e.stopPropagation();
			}, this), false);
		},
		
		show: function(posX, posY, callback)
		{
			if(!this.initialized) {
				this.init();
			}
			
			if(!this.panel) return;
			
			if(posX != undefined && posY != undefined) {
				this.setPosition(posX, posY);
			}

			if(callback != undefined) {
				this.setCallback(callback);
			}
			
			this.updatePosition(this.panel);
			
			$.FX.animate(this.panel, [{property: 'opacity', start: 0, end: 0.4}], 250, $.bindMethod(function() {
				this.visible = true;
			}, this));
		},
		
		hide: function()
		{
			if(!this.panel || !this.visible) return;
			
			$.FX.animate(this.panel, ['fadeOut'], 150, $.bindMethod(function() {
				this.visible = false;
			}, this));
		},

		setOffset: function(x, y)
		{
			this.offset.x = x;
			this.offset.y = y;
		},
		
		setPosition: function(x, y)
		{
			this.css.x = x + 10;
			this.css.y = y + 10;

			// check that panel does not go beyond screen
			if(this.css.x + 40 > this.doc.defaultView.innerWidth) {
				this.css.x = this.doc.defaultView.innerWidth - 40;
			}
			if(this.css.y + 40 > this.doc.defaultView.innerHeight) {
				this.css.y = this.doc.defaultView.innerHeight - 40;
			}
		},

		updatePosition: function(el)
		{
			el.style.bottom = this.css.x != undefined ? 'auto' : 0;
			el.style.left = this.css.x != undefined ? Math.max(this.css.x - this.offset.x, 0) + 'px' : 'auto';
			el.style.right = this.css.y != undefined ? 'auto' : 0;
			el.style.top = this.css.y != undefined ? Math.max(this.css.y - this.offset.y, 0) + 'px' : 'auto';
		},
		
		setCallback: function(callback)
		{
			this.callback = callback;
		},
		
		resetPosition: function()
		{
			this.css = {};
		}
	};

	$.Debug.register($.FloatingPanel, $);
})(qlk.qt);