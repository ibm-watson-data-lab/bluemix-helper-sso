# Introduction
bluemix-helper-sso is a nodejs module library that makes it very easy to add authentication to your Bluemix application using the IBM Single Sign-On service. You can find more information on SSO Service [here](https://www.ng.bluemix.net/docs/#services/SingleSignOn/index.html#sso_gettingstarted).  
Note: Before using this library, please make sure that your application is written in nodejs and is using [expressjs](http://expressjs.com/) and [passportjs](http://passportjs.org/) framework.   

# Configuring SSO service for your Bluemix application  
Please follow the following steps to add and configure an SSO service to work with your Bluemix application:  
* From your space Dashboard, click on the "USE SERVICES OR APIS" tile (Note: it is important to do it from there as opposed to the dashboard of your application so that the service is created without being bound to an application, otherwise you won't be able to complete the service creation).  
* In the catalog search box, type "Single Sign On" and select the service
![Select SSO Service](images/SelectSSO.png)
* Complete the configuration steps and click on the "Use" button.  
* You should see a Welcome screen asking your to provide a name ![Select SSO service name](images/configureSSO1.png)  
* In the next page, you will need to add new Identity Source. SSO supports multiple providers like SAML Enterprise, LinkedIn, etc... As an example, we'll add a Cloud Directory provider and manually add users. Click on the "Cloud Directory" icon.  
* Click on the + button to add as many users as you'd like: ![add users](images/addUser.png)  
* Click Save to complete the user creation  
* The next steps is to bind the SSO to your application and complete the Integration steps. From the Bluemix dashboard, click on your application to open its configuration page  
* Stop the application by clicking on the Stop button on the top right. (Note: it is required that the application is stopped before binding it to the SSO service)  
* Select "BIND A SERVICE OR API" tile  
* Select the SSO service and click on the ADD button. This will add the SSO service tile to the app dashboard.  
* Click on the SSO service tile and notice that there is now an extra tab on the top right called "Integrate". Click on this tab for further configuration.  
* In the Return-to URL box, enter the following url: `https://<your_app_route>/auth/sso/callback` where <your_app_route> is the bluemix route used by your application e.g. `https://myapp.mybluemix.net/auth/sso/callback`  
* You can leave the other values as is. Click Save to complete configuration of the SSO service  
* Go back to the application dashboard and click on the Start button to restart it.

This SSO Service configuration step is now complete. The next section will cover how to add authentication to the application code.

# Add authentication to your Bluemix node application
As mentioned before, [expressjs](http://expressjs.com/) and [passportjs](http://passportjs.org/) framework are expected to be used in your node application.  
The following example code shows how to use the bluemix-helper-sso library:  

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
  bluemixHelperSSO(app, ssoService);
}
...  
```  
