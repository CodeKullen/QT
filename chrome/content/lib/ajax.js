/* 
 * Asynchronous JavaScript and XML
 *
 * Originally created by Cone Code Development (http://conecode.com/tools/ajax_class)
 * Modified by Igor Gladkov (http://igorgladkov.com) for Firefox extension use
 */

(function($)
{
	if($.Ajax) return;
	
	$.Ajax = function(win)
	{
		this.win = win;
	};

	$.Ajax.prototype = {
		win: null,
		
		get: function(args)
		{
			this.request('GET', args);
		},

		post: function(args)
		{
			this.request('POST', args);
		},

		request: function(method, args)
		{
			let request = new AjaxRequest(this.win, args);
			request.method = method;
			request.run();

			return request;
		}
	};
	/** ------ CLASS CONSTRUCTOR ------------------ */
	
	let AjaxRequest = function(win, args)
	{
		this.win = win;

		// set the class properties
		for (var n in args) {
			if (typeof(this[n]) === "undefined") {
				this.parameters[n] = args[n];
			} else {
				this[n] = args[n];
			}
		}
		
		// get the XmlHttpRequest object
		this.http = this.getHttp();
	}
	
	/** ------ CLASS PROPERTIES ------------------- */
	
	AjaxRequest.prototype = {
			win: null,
			
			// requesting page. defaults to the current page.
			url: null,
			
			// request method "GET" or "POST"
			method: "GET",
			
			// variables and values to send to the url
			parameters: {},
			
			// execute function on success
			onSuccess: null,
			
			// execute function on error
			onError: null,
			
			// result from the http call
			responseText: null,
			
			// error messages
			errorText: null,
			
			// formatted string of parameters [private]
			strParams: ""
	};
	
	/** ------ INSTANCE METHODS ------------------- */
	
	// gets the XmlHttpRequest object
	AjaxRequest.prototype.getHttp = function() {
		
		// never forget who you are (the readystatechange changes the value of 'this')
		var self = this;
		var http = null;
		
		if(typeof this.win.XMLHttpRequest !== 'undefined') {
			http = new this.win.XMLHttpRequest();
		}
		
		if (!http) {
			this.setError('failed to create an XMLHTTP instance');
			return false;
		}
		
		// sets the complete function to run when the http status is ready
		http.onreadystatechange = function() {
			if (self.http.readyState === 4) {
				self.complete();
			}
		};
		
		return http;
	};
	
	// setup and execute the http request
	AjaxRequest.prototype.run = function()
	{
		var params = this.parameters;

		if (this.method.toUpperCase() === "GET") {
			// creates a new 'ajaxId' parameter to prevent caching
			//params.ajaxId = new Date().getTime();
		}
		
		// sets the strParams property
		for (var i in params) {
			if (this.strParams.length > 0) {
				this.strParams += "&";
			}
			this.strParams += encodeURIComponent(i) + "=" +
			encodeURIComponent(params[i]);
		}
		
		// if using GET, combine the url and the string of parameters
		if (this.method.toUpperCase() === "GET") {
			if (this.strParams.length > 0) {
				this.url += ((this.url.indexOf("?")>-1) ? "&" : "?") +
				this.strParams;
			}
			this.strParams = null;
		}
		
		// initialize the http request
		this.http.open(this.method, this.url, true);
		
		// if using POST, set the request header.
		if (this.method.toUpperCase() === "POST") {
			this.http.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		}
		
		// perform the request
		this.http.send(this.strParams);
	};
	
	// sends an output to the user
	AjaxRequest.prototype.complete = function()
	{
		// sets the responseText property
		this.responseText = this.http.responseText;
		
		// check if the http request was a success
		if (this.http.status === 200) {
			
			// if onSuccess property is set, run it!
			if (typeof(this.onSuccess) === "function") {
				this.onSuccess(this);
			}
			
			// the http request has given an error
		} else {
			if (this.http.status === 404) {
				this.setError("URL not found");
			} else {
				this.setError("HTTP status = "+this.http.status);
			}
		}
		
		// clean up
		delete this.http.onreadystatechange;
		this.http = null;
	};
	
	// attempts to handle any errors
	AjaxRequest.prototype.setError = function(msg) {
		// sets the error property
		this.errorText = "AJAX ERROR:\n\n" + msg;
		
		// sends this ajax object to the user specified function
		if (typeof(this.onError) === "function") {
			this.onError(this);
		}
	};

	$.Debug.register($.Ajax, $);

	// create temporary owner object
	let tmp = {AjaxRequest: AjaxRequest};
	$.Debug.register(tmp.AjaxRequest, tmp);
	delete tmp;
})(qlk.qt);