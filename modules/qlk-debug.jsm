var EXPORTED_SYMBOLS = ['Debug'];

Components.utils.import("resource://qlk-modules/qlk-services.jsm");


/**
 * Debug
 */
var Debug = $ = {
	LOG_TARGET_FILE: 'file',
	LOG_TARGET_CONSOLE: 'console',

	_logFile: null,
	enabled: false,
	target: 'console',

	log: function()
	{
		if(!$.enabled) return;

		try {
			let messages = Array.prototype.slice.call(arguments),
					logMessage = $._getFormattedTime() + '  ' + (messages.join(' ') || '');

			if($.target == $.LOG_TARGET_FILE) {
				$._setupLogFile();

				// write record
				FileIO.write($._logFile, logMessage + "\n", 'a');
			}
			else if($.target == $.LOG_TARGET_CONSOLE) {
				Services.console.logStringMessage('QLK: ' + logMessage);
			}
		}
		catch(ex) {}
	},

	debug: function()
	{
		if(!$.enabled) return;

		try {
			try {
				// caller
				let caller = $.debug.caller;

				if(caller == null) {
					$.log('Caller is undefined.');
					return;
				}

				// method name
				let methodName = (caller.__className ? caller.__className + '.' : '') + caller.__name;

				// method arguments
				let methodArgs = [];
				for(let i = 0; i < caller.arguments.length; i++) {
					let arg = caller.arguments[i];

					if(arg === null) {
						arg = '[null]';
					}
					else if(typeof arg == 'undefined') {
						arg = '[undefined]';
					}
					else if(typeof arg == 'function') {
						arg = '[function]';
					}
					else if(typeof arg == 'object') {
						try {
							arg = (typeof arg.toSource == 'function') ? arg.toSource() : '[system object]';
						}
						catch(ex) {
							arg = '[system object]';
						}
					}
					else if(typeof arg == 'string') {
						arg = "'" + arg + "'";
					}

					methodArgs.push(arg);
				}

				// write record
				$.log(methodName + '(' + methodArgs.join(', ')	+ ')');
			}
			catch(ex) {
				$.log('Exception: ' + ex);
			}
		}
		catch(ex) {}
	},

	register: function(obj, owner)
	{
		if(!$.enabled) return;

		if(typeof obj == 'function') {
			// NOTE: set class object to profiled object
			// returned from the method call
			obj = $.registerFunction(obj, owner);
		}

		for(let key in obj) {
			if(typeof obj[key] == 'function') {
				$.registerFunction(key, obj);
			}
		}

		for(let key in obj.prototype) {
			if(typeof obj.prototype[key] == 'function') {
				$.registerFunction(key, obj.prototype, obj.__name);
			}
		}
	},

	registerFunction: function(funcVar, owner, className)
	{
		if(!$.enabled) return;
		
		let funcObj = null;
		let funcName = null;

		if(typeof funcVar == 'function') {
			for(let key in owner) {
				if(funcVar === owner[key]) {
					funcName = key;
					funcObj = owner[key];
					break;
				}
			}

			if(!funcObj) {
				throw 'Profile function: unable to relate function to the owner';
			}
		}
		else if(typeof funcVar == 'string') {
			funcName = funcVar;
			funcObj = owner[funcVar];

			if(!funcObj) {
				throw 'Profile function: owner does not have function with a name "' + funcVar + '"';
			}
		}
		else {
			return funcVar;
		}

		// replace function
		owner[funcName] = function() {
			$.debug();
			return funcObj.apply(this, arguments);
		};

		// transfer properties
		for(let key in funcObj) {
			owner[funcName][key] = funcObj[key];
		}

		// transfer prototype
		owner[funcName].prototype = funcObj.prototype;

		// set function and class names
		owner[funcName].__name = funcName;
		owner[funcName].__className = className || owner.__name;

		return owner[funcName];
	},

	_setupLogFile: function()
	{
		if($._logFile == null) {
			Components.utils.import("resource://qlk-modules/qlk-io.jsm");

			// create temporary log file
			$._logFile = DirIO.get('TmpD');
			$._logFile.append('quick-translator.log');
			FileIO.unlink($._logFile);
			FileIO.create($._logFile);
		}
	},

	_getFormattedTime: function()
	{
		let now = new Date();
		
		return now.toLocaleFormat('%Y.%m.%d %T') + '.' + now.getUTCMilliseconds();
	}
};