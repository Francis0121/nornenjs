/**
 * Created by pi on 15. 1. 31.
 */
var winston = require('winston');
var logger = new (winston.Logger)({
    
    transports : [
        new (winston.transports.Console)({
            level : 'emerg',
            colorize : true
        })
    ]
});
logger.setLevels(winston.config.syslog.levels);
module.exports = logger;