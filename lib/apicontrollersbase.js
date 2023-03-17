'use strict';

const fetch = require('node-fetch');
// var request = require('request');
var logger = require('./logger.js').logger;
var config = require('./config').config;
var constants = require('./constants').constants;

class APIOperationBase {
	constructor(apiRequest) {
		logger.debug('Enter APIOperationBase constructor');

		this._request = null;
		this._response = null;
		this._endpoint = constants.endpoint.sandbox;

		if(null == apiRequest)
			logger.error('Input request cannot be null');

		this._request = apiRequest;

		logger.debug('Exit APIOperationBase constructor');
	}

	//abstract
	validateRequest(){
		return;
	}

	validate(){
		return;
	}

	getResponse(){
		return this._response;
	}

	getResultcode(){
		var resultcode = null;

		if(this._response)
			resultcode = this._response.resultCode;

		return resultcode;
	}

	getMessagetype(){
		var message = null;

		if(this._response){
			message = this._response.message;
		}
		
		return message;
	}

	beforeExecute() {
	}

	setClientId() {
		for(var obj in this._request){
			this._request[obj]['clientId'] = config.clientId; 
			break;
		}
	}

	setEnvironment(env){
		this._endpoint = env;
	}

	execute(callback) {
		logger.debug('Enter APIOperationBase execute');

		logger.debug('Endpoint : ' + this._endpoint);

		this.beforeExecute();

		this.setClientId();

		var obj = this;

		logger.debug(JSON.stringify(this._request, null, 2));

		/* Vendor (MMP) added 2023-03-17 in response to
		   https://github.com/advisories/GHSA-p8p7-x288-28g6 and the fact that
		   this Visa-owned commercial service does not maintain their code.
		   TODO: so far, this is completely untested. */
		this.fetcher(this._request, config, this._endpoint, logger, obj)
			.then(() => callback())
			.catch(err => logger.error(err))

		/*
		var reqOpts = {
			url: this._endpoint,
			method: 'POST',
			json: true,
			timeout: config.timeout,
			body: this._request
		};

		if(config.proxy.setProxy){
			reqOpts['proxy'] = config.proxy.proxyUrl;
		}

		request(reqOpts, function(error, response, body){
			if(error) {
				logger.error(error);
			} else 
			{
				//TODO: slice added due to BOM character. remove once BOM
				// character is removed.
				if(typeof body!=='undefined'){
					var responseObj = JSON.parse(body.slice(1));
					logger.debug(JSON.stringify(responseObj, null, 2));
					obj._response = responseObj;
				// var jsonResponse = JSON.stringify(body);
				// console.log("escaped body : '" + escape(jsonResponse) + "'");
				// console.log("body : '" + jsonResponse + "'");
				// logger.debug("Response: " + JSON.stringify(body, null, 2));
				// obj._response = body;
				callback();
			}
				else
				{
					logger.error("Undefined Response");
				}
			}
		});
		*/

		logger.debug('Exit APIOperationBase execute');
	}

	/**
	 * Vendor (MMP) added 2023-03-17 in response to
	 * https://github.com/advisories/GHSA-p8p7-x288-28g6 and the fact that this
	 * Visa-owned, commercial service does not maintain their code.
	 * @param {unknown} apiRequest
	 * @param {object} config
	 * @param {string} endpoint
	 * @param {winston.Logger} logger
	 * @param {APIOperationBase} obj
	 * @todo This is completely untested!
	 */
	async fetcher (apiRequest, config, endpoint, logger, obj) {
		const c = new AbortController()
		let t

		t = setTimeout(() => {
			if (t) {
				clearTimeout(t)
				t = null
			}

			c.abort()
		}, config.timeout)

		const r = await fetch(endpoint, {
			// agent: (config.proxy.proxyUrl)
			// 	? new HttpsProxyAgent(config.proxy.proxyUrl)
			// 	: undefined,
			body: JSON.stringify(apiRequest),
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			method: 'POST',
			signal: c.signal
		})

		if (r.ok) {
			let body = Buffer.from(await r.arrayBuffer())

			// TODO: slice added due to BOM character. remove once BOM character
			// is removed.
			if (typeof body !== 'undefined'){
				const [a, b, c] = body

				if (
					(a === 239) &&
					(b === 187) &&
					(c === 191)
				) {
					body = body.subarray(3)
				}

				const responseObj = JSON.parse(body.toString('utf-8'))
				console.debug(JSON.stringify(responseObj, null, 2))

				logger.debug(JSON.stringify(responseObj, null, 2))
				obj._response = body
				return
			} else {
				logger.error("Undefined Response")
			}
		}

		logger.error(new Error(`${r.status} ${r.statusText}`))
	}
}

module.exports.APIOperationBase = APIOperationBase;
