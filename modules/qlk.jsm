var EXPORTED_SYMBOLS = ['qlk'];


/**
 * QLK Namespace
 */
var qlk = $ = {
	_modules: {},

	loadNamespace: function(namespace)
	{
		if($[namespace] == null) {
			Components.utils.import('resource://qlk-modules/qlk.' + namespace + '.jsm', $);
		}
	},

	importModule: function(moduleName, version)
	{
		version = version || 1;

		if($._modules[moduleName] == null) {
			$._modules[moduleName] = {};
		}

		if($._modules[moduleName][version] == null) {
			$._modules[moduleName][version] = {};

			Components.utils.import('resource://qlk-modules/qlk-' + moduleName + '.jsm', $._modules[moduleName][version]);
		}

		return $._modules[moduleName][version];
	}
};