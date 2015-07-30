var EXPORTED_SYMBOLS = ['qt'];

Components.utils.import('resource://qlk-modules/qlk.jsm');


/**
 * QT Namespace
 */
var qt = $ = {};


/**
 * List of language aliases
 */
$.Languages = {
	'af': 'Afrikaans',
	'sq': 'Albanian',
	'ar': 'Arabic',
	'be': 'Belarusian',
	'bg': 'Bulgarian',
	'ca': 'Catalan',
	'zh': 'Chinese',
	'zh-CN': 'ChineseSimplified',
	'zh-TW': 'ChineseTraditional',
	'hr': 'Croatian',
	'cs': 'Czech',
	'da': 'Danish',
	'nl': 'Dutch',
	'en': 'English',
	'et': 'Estonian',
	'tl': 'Filipino',
	'fi': 'Finnish',
	'fr': 'French',
	'gl': 'Galician',
	'de': 'German',
	'el': 'Greek',
	'ht': 'Haitian',
	'iw': 'Hebrew',
	'hi': 'Hindi',
	'hu': 'Hungarian',
	'is': 'Icelandic',
	'id': 'Indonesian',
	'ga': 'Irish',
	'it': 'Italian',
	'ja': 'Japanese',
	'ko': 'Korean',
	'lv': 'Latvian',
	'lt': 'Lithuanian',
	'mk': 'Macedonian',
	'ms': 'Malay',
	'mt': 'Maltese',
	'no': 'Norwegian',
	'fa': 'Persian',
	'pl': 'Polish',
	'pt': 'Portuguese',
	'pt-PT': 'PortuguesePortugal',
	'ro': 'Romanian',
	'ru': 'Russian',
	'sr': 'Serbian',
	'sk': 'Slovak',
	'sl': 'Slovenian',
	'es': 'Spanish',
	'sw': 'Swahili',
	'sv': 'Swedish',
	'th': 'Thai',
	'tr': 'Turkish',
	'uk': 'Ukrainian',
	'vi': 'Vietnamese',
	'cy': 'Welsh',
	'yi': 'Yiddish'
};


/**
 * URLs used in this add-on
 */
$.URLs = {
	'homepage': 'http://igorgladkov.com/extensions/translator.html',
	'reviews': 'http://igorgladkov.com/extensions/translator/review.html',
	'donation': 'http://igorgladkov.com/extensions/translator/donate.html',
	'updateDonation': 'http://igorgladkov.com/extensions/translator/updatedonate.html',
	'whatIsNew': 'http://igorgladkov.com/extensions/translator/whatisnew.html',
	'support': 'http://groups.google.com/group/quick-translator',
	'twitter': 'http://twitter.com/quicktranslator',
	'email': 'mailto:qt.addon@gmail.com'
};


/**
 * Define getters
 */
let defineGetter = function(name, moduleName) {
	$.__defineGetter__(name, function() {
		delete $[name];
		return $[name] = qlk.importModule(moduleName)[name];
	});
};


defineGetter('E', 'elements');
defineGetter('bindMethod', 'helpers');
defineGetter('bindHandlers', 'helpers');
defineGetter('openUrl', 'helpers');
defineGetter('Debug', 'debug');
defineGetter('Detector', 'detector');
defineGetter('Dictionary', 'dictionary');
defineGetter('EventManager', 'eventManager');
defineGetter('FileIO', 'io');
defineGetter('DirIO', 'io');
defineGetter('PageTranslator', 'pageTranslator');
defineGetter('PrefsManager', 'prefsManager');
defineGetter('Services', 'services');
defineGetter('Translator', 'translator');
defineGetter('Translation', 'translator');
defineGetter('FX', 'fx');
defineGetter('Timer', 'timer');
defineGetter('Utils', 'utils');