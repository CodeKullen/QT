var EXPORTED_SYMBOLS = ['Translator', 'Translation'];

Components.utils.import("resource://qlk-modules/qlk-debug.jsm");
Components.utils.import("resource://qlk-modules/qlk-helpers.jsm");
Components.utils.import("resource://qlk-modules/qlk-utils.jsm");



/**
 * Translator
 */
var Translator = $ = {
	STATUS_TRANSLATED: 1,
	STATUS_NOT_DETECTED: 2,
	STATUS_NOT_TRANSLATED: 3,
	STATUS_TRANSLATING: 4,
	STATUS_CANCELLED: 5,

	_lastTranslation: null,
	_lastText: null,
	_lastSourceLanguage: null,
	_lastTargetLanguage: null,

	translate: function(text, sourceLanguage, targetLanguage, callback, ajax)
	{
		if(text.length == 0) return;

		if(this._lastText === text && this._lastSourceLanguage === sourceLanguage && this._lastTargetLanguage === targetLanguage) {
			callback(this.STATUS_TRANSLATED, this._lastTranslation);
			return;
		}

		// create translation object
		let translation = new Translation();
		translation.sourceLanguage = sourceLanguage;
		translation.targetLanguage = targetLanguage;
		translation.sourceText = text;

		// make translation request
		let request = new TranslatorRequest(translation, callback, ajax);
		request.execute();

		// save parameters for future usage
		this._lastTranslation = translation;
		this._lastText = text;
		this._lastSourceLanguage = sourceLanguage;
		this._lastTargetLanguage = targetLanguage;
	}
};


/**
 * Translation
 */
var Translation = function() {};
Translation.prototype = {
	sourceLanguage: null,
	targetLanguage: null,
	sourceText: null,
	translatedText: null,
	dictionary: null,
	isTruncated: false
};


/**
 * Translator Request
 * 
 * DO NOT EXPORT THIS CLASS
 */
var TranslatorRequest = function(translation, callback, ajax)
{
	this._translation = translation;
	this._callback = callback;
	this._ajax = ajax;
};

TranslatorRequest.prototype = {
	_ajax: null,
	_status: null,
	_translation: null,
	_callback: null,

	execute: function()
	{
		if(this._translation.sourceText.length == 0) return;

		this._request();
	},

	_request: function()
	{
		let t = this._translation;

		// update status
		this._updateStatus($.STATUS_TRANSLATING);

		if(t.sourceLanguage == t.targetLanguage) {
			t.translatedText = t.sourceText;
			this._updateStatus($.STATUS_TRANSLATED);

			return;
		}
		
		// request params
		var params = {
			client: 'qlt',
			sl: t.sourceLanguage || 'auto',
			tl: t.targetLanguage,
			text: t.sourceText
		};
		
		// make request
		this._ajax.post({
			url: 'http://translate.google.com/translate_a/t',
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
		let status = $.STATUS_TRANSLATED;

		if(data && !data.src) {
			status = $.STATUS_NOT_DETECTED;
		}
		else if(!data || !data.sentences) {
			status = $.STATUS_NOT_TRANSLATED;
		}

		// set detected language and translated text
		if(status == $.STATUS_TRANSLATED) {
			var translatedText = '';
			for(let i in data.sentences) {
				translatedText += data.sentences[i].trans;
			}
			
			this._translation.sourceLanguage = this._translation.sourceLanguage || data.src;
			this._translation.translatedText = translatedText;
			
			if(data.dict) {
				this._translation.dictionary = {};
				
				for(let i in data.dict) {
					this._translation.dictionary[data.dict[i].pos] = data.dict[i].terms;
				}
			}
		}

		this._updateStatus(status);
	},

	_updateStatus: function(status)
	{
		// update status
		this._status = status;

		// send update status callback
		this._callback(this._status, this._translation);
	}
};

Debug.register(Translator, this);
Debug.register(TranslatorRequest, this);