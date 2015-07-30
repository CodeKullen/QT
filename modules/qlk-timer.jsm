var EXPORTED_SYMBOLS = ['Timer'];

Components.utils.import("resource://qlk-modules/qlk-debug.jsm");


/**
 * Timer
 */
var Timer = $ = function(callback, delay, type)
{
	let timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
	timer.initWithCallback({notify: callback}, delay, type);

	return timer;
};

Timer.timeout = function(callback, delay)
{
	return new $(callback, delay, $.TYPE_ONE_SHOT);
};

Timer.interval = function(callback, interval, isPrecise)
{
	return new $(callback, interval, isPrecise ? $.TYPE_REPEATING_PRECISE : $.TYPE_REPEATING_SLACK);
};

$.TYPE_ONE_SHOT = 0;
$.TYPE_REPEATING_SLACK = 1;
$.TYPE_REPEATING_PRECISE = 2;

Debug.register(Timer, this);