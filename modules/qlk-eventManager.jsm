var EXPORTED_SYMBOLS = ['EventManager'];

Components.utils.import("resource://qlk-modules/qlk-debug.jsm");


// local listeners variable
var listeners = {};

/**
 * Event manager
 */
var EventManager = $ = {
	bind: function(type, handler)
	{
		if(!listeners[type]) {
			listeners[type] = [];
		}

		listeners[type].push(handler);
	},

	unbind: function(type)
	{
		if(type.charAt(0) === '.') {
			for(let listenerType in listeners) {
				if(listenerType.substr(listenerType.length - type.length) === type) {
					delete listeners[listenerType];
				}
			}
		}
		else {
			if(listeners[type]) {
				delete listeners[type];
			}
		}
	},

	trigger: function(type, data)
	{
		for(let listenerType in listeners) {
			if(listenerType === type || listenerType.substring(0, type.length + 1) === type + '.') {
				let listenersCount = listeners[listenerType].length;

				for(let i = 0; i < listenersCount; i++) {
					if(listeners[listenerType] && typeof listeners[listenerType][i] === 'function') {
						listeners[listenerType][i].call(this, type, data);
					}
				}
			}
		}
	}
};

Debug.register(EventManager, this);