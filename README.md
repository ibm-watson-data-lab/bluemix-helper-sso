# Introduction
bluemix-helper-sso is a nodejs module library that makes it easy to add authentication to your Bluemix application using the IBM Single Sign-On service. You can find more information on the SSO Service [here](https://www.ng.bluemix.net/docs/#services/SingleSignOn/index.html#sso_gettingstarted).  
Note: Before using this library, please make sure that your application is written in Node.js and is using the [Express.js](http://expressjs.com/) and [Passport.js](http://passportjs.org/) frameworks.   

# Configuring the SSO service for your Bluemix app
Please follow these steps to add and configure an SSO service to work with your Bluemix application:  
* From your top-level space in the Bluemix dashboard, click on the "USE SERVICES OR APIS" tile. (Note: it is important to do it from this location, as opposed to the dashboard for your application itself, so that the SSO service is created without being bound to an application — otherwise you won't be able to complete the service creation.)
* In the catalog search box, type "Single Sign On" and select the service
![Select SSO Service](images/SelectSSO.png)
* Complete the configuration steps and click on the "Use" button.  
* You should see a Welcome screen asking you to provide a name ![Select SSO service name](images/configureSSO1.png)  
* In the next page, you will need to add a new Identity Source. SSO supports multiple providers like SAML Enterprise, LinkedIn, etc. As an example, we'll add a Cloud Directory provider and manually add users. Click on the "Cloud Directory" icon.  
* Click on the + button to add as many users as you'd like: ![add users](images/addUser.png)
* Click Save to complete the user creation.
* The next step is to bind the SSO to your application and complete the Integration steps. From the Bluemix dashboard, click on your application to open its configuration page.
* Stop the application by clicking on the Stop button in the upper-right corner. (Note: it is required that the application is stopped before binding it to the SSO service.)  
* Select "BIND A SERVICE OR API" tile  
* Select the SSO service and click on the ADD button. This will add the SSO service tile to the app dashboard.
* Click on the SSO service tile and notice that there is now an extra tab on the top right called "Integrate." Click on this tab for further configuration.
* In the Return-to URL box, enter the following url: `https://<your_app_route>/auth/sso/callback` where `<your_app_route>` is the Bluemix route used by your application, e.g. `https://my-app-name.mybluemix.net/auth/sso/callback`
* You can leave the other values as-is. Click Save to complete configuration of the SSO service.
* Go back to the application dashboard and click on the Start button to restart it.

This SSO Service configuration step is now complete. The next section will cover how to add authentication to the application code.

# Add authentication to your Bluemix node application
As mentioned earlier, the [Express.js](http://expressjs.com/) and [Passport.js](http://passportjs.org/) frameworks are expected to be used in your Node application.

You can check out the sample app in the bluemix-helper-sso
 [/example](https://github.com/ibm-cds-labs/bluemix-helper-sso/tree/master/example) directory.

The following example code shows the steps required to add authentication to your Bluemix application:
1. Create the app express object  
2. Use the [bluemix-helper-config](https://github.com/ibm-cds-labs/bluemix-helper-config) library to easily detect if SSO service is bound to your application   
3. Invoke the bluemix-helper-sso library using the express app object and an option object with the following parameters:  
  * <code>ssoService</code>: a JSON object representing the SSO Service returned by the bluemix-helper-config library  
  * <code>ssoServiceName</code>: (alternative to `ssoService`) pass the name of the SSO service that will be queried by the bluemix-helper-sso library
  * <code>relaxedUrls</code>: (Optional) an array of URLs that will not be authenticated, e.g. "/img" will match any url starting with "/img". Note: "/" is a special case. Because it's the root, it will only match the root URL (as to avoid relaxing the entire app).

```javascript
var express = require('express');		//expressjs  
var bluemixHelperConfig = require('bluemix-helper-config'); //helper config to locate sso service  
var bluemixHelperSSO = require('bluemix-helper-sso'); //Helper SSO  
...
var app = express();  	
//Locate the sso service by using regular expression (The name doesn't have to match exactly)  
var ssoService = bluemixHelperConfig.vcapServices.getService( "sso" );  
if ( ssoService) {  
  //Add SSO authentication to the app
  bluemixHelperSSO(app, {
  	ssoService:ssoService,
  	relaxedUrls:[
		"/js", "/img", "/css", "/bower_components", "templates"
	]
  });
}
...  
```  

Note: when running locally, you will need to tell the bluemix-helper-sso about the host and port numbers so it can properly compute the callback URL. This is done using the global object of the bluemix-helper-config module as follows:  

```javascript  
...
var global = bluemixHelperConfig.global;
...
var port = process.env.VCAP_APP_PORT || 8082;
if (!process.env.VCAP_APP_HOST){
	//Need to set the host and port for this app as we are running locally
	global.appHost = "http://127.0.0.1";
	global.appPort = port;
}
``` 

By default, bluemix-helper-sso is using an in-memory session store to manage to the session IDs. Optionally, you can configure it to use your own session store, by passing a configuration object in the `sessionConfig` field. The following code example shows how to use Redis as the session store:  

```javascript
... 
var ssoService = bluemixHelperConfig.vcapServices.getService( "pipes-sso" );
if ( ssoService ){
	//Add SSO authentication to the app
	bluemixHelperSSO(app, {
		ssoService: ssoService,
		relaxedUrls:[
		    "/js", "/img", "/css", "/bower_components", "templates"
		],
		createSessionStore: function( session ){
		   //Use redis service to create the store if available
			var redisService = bluemixHelperConfig.vcapServices.getService("pipes-redis");
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
...  
```  
