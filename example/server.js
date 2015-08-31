//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------

'use strict';

var express = require('express');
var bluemixHelperConfig = require('bluemix-helper-config');
var global = bluemixHelperConfig.global;

var app = global.app = express();

var port = process.env.VCAP_APP_PORT || 8082;
if (!process.env.VCAP_APP_HOST){
	//Need to set the host and port for this app
	global.appHost = "http://127.0.0.1";
	global.appPort = port;
}

//Configure security if we are bound to an SSO service
var ssoService = bluemixHelperConfig.vcapServices.getService( "sso" );
if ( ssoService ){
	console.log("INFO: Security is enabled");
	require('../lib/sso')(app, {
		ssoService: ssoService,
		relaxedUrls:[
		    "/img"
		],
		createSessionStore: function( session ){
			//Create a session store based on redis if available, if not, use the default in-memory store
			var redisService = bluemixHelperConfig.vcapServices.getService("redis");
			if ( redisService ){
				var redisStore = require('connect-redis')(session);
				return new redisStore({
					host: redisService.credentials.hostname,
					port: redisService.credentials.port,
					pass: redisService.credentials.password
				});
			}
			return null;
		}
	});
}

app.get("/", function(req, res, next ){
	if ( !req.user ){
		res.send("Not Authenticated");
	}else{
		res.send("Successful authentication: " + req.user.id);
	}
});

var server = null;
if (process.env.VCAP_APP_HOST){
	server = require('http').createServer(app);
	server.listen(port,
                 process.env.VCAP_APP_HOST);
}else{
	server = require('http').createServer(app);
	server.listen(port);
}
