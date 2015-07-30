var EXPORTED_SYMBOLS = ['Detector'];

Components.utils.import("resource://qlk-modules/qlk-debug.jsm");
Components.utils.import("resource://qlk-modules/qlk-helpers.jsm");
Components.utils.import("resource://qlk-modules/qlk-utils.jsm");


/**
 * Language Detector
 */
var Detector = $ = {
	STATUS_DETECTED: 1,
	STATUS_NOT_DETECTED: 2,
	STATUS_DETECTING: 3,
	
	detect: function(text, callback, ajax)
	{
		let request = new DetectorRequest(text, callback, ajax);
		request.execute();
	}
};


/**
 * Page Translation Request
 *
 * DO NOT EXPORT THIS CLASS
 */
var DetectorRequest = function(text, callback, ajax)
{
	this._text = text;
	this._callback = callback;
	this._ajax = ajax;
};

DetectorRequest.prototype = {
	_status: null,
	_text: null,
	_detectedLanguage: null,
	_callback: null,
	_ajax: null,

	execute: function()
	{
		this._request();
	},

	_request: function()
	{
		this._updateStatus($.STATUS_DETECTING);

		// request params
		let params = {
			v: '1.0',
			// limit text to 500 characters since
			// it's should be enough to detect the language
			q: this._text.substr(0, 500)
		};

		// make request
		this._ajax.get({
			url: 'http://ajax.googleapis.com/ajax/services/language/detect',
			parameters: params,
			onSuccess: bindMethod(function(xhr) {
				// parse response
				let data = Utils.parseJSON(xhr.responseText);

				// callback
				this._requestCallback(data);
			}, this)
		});
	},

	_requestCallback: function(data)
	{
		if(!data || !data.responseData || !data.responseData.language) {
			this._updateStatus($.STATUS_NOT_DETECTED);
			return;
		}
		
		// set detected language
		this._detectedLanguage = data.responseData.language;

		this._updateStatus($.STATUS_DETECTED);
	},

	_updateStatus: function(status)
	{
		// update status
		this._status = status;

		// send update status callback
		this._callback(this._status, this._detectedLanguage);
	}
};

Debug.register(Detector, this);
Debug.register(DetectorRequest, this);