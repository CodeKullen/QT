var EXPORTED_SYMBOLS = ['PageTranslator'];

Components.utils.import("resource://qlk-modules/qlk-helpers.jsm");
Components.utils.import("resource://qlk-modules/qlk-debug.jsm");


/**
 * Page Translator
 */
var PageTranslator = $ = {
	translate: function(doc, targetLanguage, ajax)
	{
		let request = new PageTranslationRequest(doc, targetLanguage, ajax);
		request.execute();
	}
};


/**
 * Page Translation Request
 *
 * DO NOT EXPORT THIS CLASS
 */
var PageTranslationRequest = function(doc, targetLanguage, ajax)
{
	this._doc = doc;
	this._targetLanguage = targetLanguage;
	this._originalUrl = doc.defaultView.location;

	this.ajax = ajax;
};

PageTranslationRequest.prototype = {
	_doc: null,
	_originalUrl: null,
	_translationUrl: null,
	_targetLanguage: null,
	ajax: null,

	execute: function()
	{
		this._request();
	},

	_request: function()
	{
		// request params
		let params = {
			hl: 'en',
			sl: '', //'auto', looks like a bug in Google
			tl: this._targetLanguage,
			u: this._originalUrl
		};

		// make request
		this.ajax.get({
			url: 'http://translate.google.com/translate',
			parameters: params,
			onSuccess: bindMethod(function(xhr) {
				// callback
				this._requestCallback(xhr.responseText);
			}, this)
		});
	},

	_requestCallback: function(data)
	{
		let matches = data.match(/(?:src|href)="\/translate_p?[^"]+/im);

		if(matches) {
			// create URL and decode special characters
			var url = matches[0].replace(/(src|href)="/im, 'http://translate.google.com').replace(/&amp;/g, '&');

			// load translated page
			this._doc.defaultView.location = url;
		}
	}
};

Debug.register(PageTranslator, this);