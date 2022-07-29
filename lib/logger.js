var winston = require('winston');
var config = require('./config').config;

var format = winston.format;
var logger;

var sensitiveFields = ['cardCode', 'cardNumber', 'expirationDate', 'accountNumber', 'nameOnAccount', 'transactionKey', 'email', 'phoneNumber', 'faxNumber', 'dateOfBirth'];

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

if(config.logger.enabled === true) {
	logger = winston.createLogger({
		//Adding filter for sensitive fields that should not be logged.
		format: format.combine(
			format(function(info){
				var msg = info.message

				if(isJson(msg))
				{
					try{
						info.message = maskSensitiveFields(JSON.parse(msg));
					}
					catch (e)
					{
						info.message = 'Error while logging the message.';
					}
				}

				return info
			})
		),
		transports: [
			new (winston.transports.File)({filename: config.logger.location + '/sdk-node.log', level: config.logger.level})
		]
	});
}
else {
	logger = winston.createLogger({
		format: format.combine(
			function(info){
				var msg = info.message

				if(isJson(msg))
				{
					try{
						info.message = maskSensitiveFields(JSON.parse(msg));
					}
					catch (e)
					{
						info.message = 'Error while logging the message.';
					}
				}

				return info
			},
			format.json(),
			format.timestamp()
		),
		transports: [
			new (winston.transports.Console)({ level: 'error' })
		]
	});
}

function maskSensitiveFields(jsonMsg){

	if (jsonMsg instanceof Object) {

		var prop;

		for (prop in jsonMsg){
			var isFieldSensitive = (sensitiveFields.indexOf(prop) > -1);

			if(isFieldSensitive === true)
			{
				jsonMsg[prop] = new Array(jsonMsg[prop].length + 1).join('X');
			}
			else if (jsonMsg.hasOwnProperty(prop)){
				maskSensitiveFields(jsonMsg[prop]);  
			}
		}
	}
	
    return JSON.stringify(jsonMsg);
}

module.exports.logger = logger;
