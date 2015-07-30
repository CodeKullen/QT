var EXPORTED_SYMBOLS = ['Dictionary', 'DictionaryResult'];

Components.utils.import("resource://qlk-modules/qlk-detector.jsm");
Components.utils.import("resource://qlk-modules/qlk-helpers.jsm");
Components.utils.import("resource://qlk-modules/qlk-utils.jsm");
Components.utils.import("resource://qlk-modules/qlk-debug.jsm");


/**
 * Dictionary
 */
var Dictionary = $ = {
	STATUS_DONE: 1,
	STATUS_NOT_DETECTED: 2,
	STATUS_NOT_FOUND: 3,
	STATUS_IN_PROGRESS: 4,
	STATUS_CANCELLED: 5,

	_lastResult: null,
	_lastText: null,
	_lastSourceLanguage: null,
	_lastTargetLanguage: null,

	find: function(text, sourceLanguage, targetLanguage, callback, ajax)
	{
		if(text.length == 0) return;

		if(this._lastText === text && this._lastSourceLanguage === sourceLanguage && this._lastTargetLanguage === targetLanguage) {
			callback(this._lastResult.status, this._lastResult);
			return;
		}

		// create new result object
		var result = new DictionaryResult();
		result.sourceLanguage = sourceLanguage;
		result.targetLanguage = targetLanguage;
		result.text = text;

		// make dictionary request
		let request = new DictionaryRequest(result, callback, ajax);
		request.execute();

		// save parameters for future usage
		this._lastResult = result;
		this._lastText = text;
		this._lastSourceLanguage = sourceLanguage;
		this._lastTargetLanguage = targetLanguage;
	}
};


/**
 * Dictionary Result
 */
var DictionaryResult = function() {};
DictionaryResult.prototype = {
	sourceLanguage: null,
	targetLanguage: null,
	text: null,
	searchResult: null,
	status: null
};


/**
 * Dictionary Request
 * 
 * DO NOT EXPORT THIS CLASS
 */
var DictionaryRequest = function(result, callback, ajax)
{
	this._result = result;
	this._callback = callback;
	this._ajax = ajax;
};

DictionaryRequest.prototype = {
	_ajax: null,
	_result: null,
	_callback: null,

	execute: function()
	{
		if(this._result.text.length == 0) return;

		// start detect-translate sequence
		if(this._result.sourceLanguage) {
			this._dictionaryRequest();
		}
		else {
			Detector.detect(this._result.text, bindMethod(this._detectorCallback, this), this._ajax);
		}
	},

	_detectorCallback: function(status, detectedLanguage)
	{
		if(status == Detector.STATUS_DETECTING) return;

		// set detected language
		this._result.sourceLanguage = detectedLanguage;

		if(this._result.sourceLanguage) {
			this._dictionaryRequest();
		}
		else {
			this._updateStatus($.STATUS_NOT_DETECTED);
		}
	},

	_dictionaryRequest: function()
	{
		let t = this._result;

		// update status
		this._updateStatus($.STATUS_IN_PROGRESS);

		if(t.sourceLanguage == t.targetLanguage) {
			t.searchResult = t.text;
			this._updateStatus($.STATUS_DONE);

			return;
		}

		// request params
		var params = {
			aq: 'f',
			hl: 'en',
			q: t.text,
			langpair: t.sourceLanguage + '|' + t.targetLanguage
		};

		this._ajax.get({
			url: 'http://www.google.com/dictionary',
			parameters: params,
			onSuccess: bindMethod(function(xhr) {
				// callback
				this._dictionaryRequestCallback(xhr.responseText);
			}, this)
		});
	},

	_dictionaryRequestCallback: function(data)
	{
		// retrieve result
		this._result.searchResult = this._retrieveSearchResult(data);

		// check if search result empty
		let isSearchResultEmpty = true;
		for(let i in this._result.searchResult) {
			isSearchResultEmpty = false;
			break;
		}

		// update status
		this._updateStatus(isSearchResultEmpty ?	$.STATUS_NOT_FOUND : $.STATUS_DONE);
	},

	_retrieveSearchResult: function(data)
	{
		let groups = {};
		let currentGroup = null;

		let startIndex = data.search(/<ul.*?id="pr-root".*?>/);
		let endIndex = startIndex;

		if(startIndex != -1) {
			for(let i = startIndex, level = 0; i < data.length; i++) {
				if(data.substr(i, 3) == '<ul') {
					level++;
				}
				else if(data.substr(i, 5) == '</ul>') {
					endIndex = i + 5;

					if(--level == 0) break;
				}
			}

			let resultData = data.substring(startIndex, endIndex);

			let matches = resultData.match(/class="dct-(em|ec)"[^]+?class="dct-(tt|elb)"[^]*?>[^]*?<\/div>/gim);

			if(matches) {
				for(let i = 0; i < matches.length; i++) {
					// remove grammar parts
					let match = matches[i].replace(/<span\s+class="dct-tlb"[^<]*?<\/span>/gim, '');

					// remove all HTML tags and trim
					match = match.replace(/(^|<)[^]*?>/gim, '').replace(/^\s+|\s+$/g, '');

					if(matches[i].search(/Part-of-speech/gim) != -1) {
						currentGroup = match;
						continue;
					}

					if(!groups[currentGroup]) {
						groups[currentGroup] = [];
					}

					groups[currentGroup].push(match);
				}
			}
		}

		return groups;
	},

	_updateStatus: function(status)
	{
		// update status
		this._result.status = status;

		// send update status callback
		this._callback(this._result.status, this._result);
	}
};

Debug.register(Dictionary, this);
Debug.register(DictionaryRequest, this);