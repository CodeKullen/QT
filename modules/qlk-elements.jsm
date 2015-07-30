var EXPORTED_SYMBOLS = ['E'];

Components.utils.import("resource://qlk-modules/qlk-helpers.jsm");
Components.utils.import("resource://qlk-modules/qlk-services.jsm");


/**
 * Elements shortcut caller
 */
var E = function(id, doc)
{
	if(!doc) {
		throw 'document is undefined';
	}

	let el = null;

	// get element
	try {
		if(typeof id === 'object') {
			let i = 0;
			while(el == null && i < id.length) {
				el = doc.getElementById(id[i]);
				i++;
			}
		}
		else if(typeof id === 'string') {
			el = doc.getElementById(id);
		}

		// extend element
		if(el != null) {
			for(let key in elementHelpers) {
				el[key] = elementHelpers[key];
			}
		}
	}
	catch(ex) {}

	if(el == null) {
		// create dummy element
		el = {
			__dummy: true,
			__noSuchMethod__: function() {}
		};
	}

	return el;
};

let elementHelpers = {
	/**
	 * Add event listener
	 */
	bindListener: function(eventType, callback, scope)
	{
		return this._eventListener('add', eventType, callback, scope);
	},

	/**
	 * Remove event listener
	 */
	unbindListener: function(eventType, callback, scope)
	{
		return this._eventListener('remove', eventType, callback, scope);
	},

	/**
	 * Remove and then add event listener again
	 */
	rebindListener: function(eventType, callback, scope)
	{
		return this.unbindListener(eventType, callback, scope)
			.bindListener(eventType, callback, scope);
	},

	_eventListener: function(action, eventType, callback, scope)
	{
		if(this != null && !this.__dummy) {
			// bind callback
			if(scope) {
				callback = bindMethod(callback, scope);
			}

			// perform action on event listener
			if(action == 'add') {
				this.addEventListener(eventType, callback, false);
			}
			else if(action == 'remove') {
				this.removeEventListener(eventType, callback, false);
			}
		}

		return this;
	}
};