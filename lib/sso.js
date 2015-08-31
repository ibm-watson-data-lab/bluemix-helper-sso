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

/**
 * CDS sso module
 * 
 * @author David Taieb
 */

var express = require('express');
var passport = require('passport');
var session = require('express-session');
var openIDConnectStrategy = require('./idaas/strategy');
var bluemixHelperConfig = require('bluemix-helper-config');
var global = bluemixHelperConfig.global;
var _ = require('lodash');

/**
 * Configure the app to add security based on the ssoService
 */
module.exports = function( app, options ){
	options = options || {};
	
	var ssoService = options.ssoService;
	if ( !ssoService ){
		//Look for default sso service that contains the word sso
		ssoService = bluemixHelperConfig.vcapServices.getService( "sso" );
		if ( ssoService ){
			console.log("bluemix-helper-sso is using sso service %s", ssoService.name);
		}else{
			console.log("No sso service was found. Security will be disabled");
			return;
		}		
	}
	
	//white list of urls that should not be auth'ed (relaxed)
	var authWhiteList = [ "/login", "/auth", "/favicon.ico"];
	
	if ( options.relaxedUrls ){
		if ( !_.isArray( options.relaxedUrls ) ){
			options.relaxedUrls = [ options.relaxedUrls ];
		}
		_.forEach( options.relaxedUrls, function( relaxedUrl ){
			authWhiteList.push( relaxedUrl );
		});
	}
	
	//If sessionConfig is not passed by the user, then use in-memory store by default
	var sessionConfig = options.sessionConfig || {};
			
	sessionConfig.secret = sessionConfig.secret || 'keyboard cat';
	sessionConfig.resave = true;
	sessionConfig.saveUninitialized = true;
	if ( options.createSessionStore ){
		sessionConfig.store = options.createSessionStore( session );
	}
		
	app.use(session(sessionConfig));
	app.use(passport.initialize());
	app.use(passport.session()); 
	
	passport.serializeUser(function(user, done) {
		done(null, user);
	}); 

	passport.deserializeUser(function(obj, done) {
		done(null, obj);
	});

	var strategy = new openIDConnectStrategy({
		authorizationURL : ssoService.credentials.authorizationEndpointUrl,
		tokenURL : ssoService.credentials.tokenEndpointUrl,
		clientID : ssoService.credentials.clientId,
		scope: 'openid',
		response_type: 'code',
		clientSecret : ssoService.credentials.secret,
		callbackURL : global.getHostUrl() + "/auth/sso/callback",
		skipUserProfile: true,
		issuer: ssoService.credentials.issuerIdentifier
		}, function(accessToken, refreshToken, profile, done) {
			process.nextTick(function() {
				profile.accessToken = accessToken;
				profile.refreshToken = refreshToken;
				done(null, profile);
			})
		}
	);

	passport.use(strategy); 
	app.get('/login', passport.authenticate('openidconnect', {})); 
	
	app.get('/logout', function( req, res, next ){
		req.session.destroy(function (err) {
			//Clear the cookies too
			_.forEach( req.cookies, function( value, key ){
				console.log("cookie name :" + key + " Cookie value: " + value); 
				res.clearCookie( key );
			});
			res.redirect('https://idaas.ng.bluemix.net/idaas/protected/logout.jsp');
		});
	});
	
	app.get("/userid", function( req, res,next){
		res.send( (req.user && req.user.id) || "");
	});
	
	app.get('/auth/sso/callback',function(req,res,next) {
		passport.authenticate('openidconnect',{
			successRedirect: '/',                            
			failureRedirect: '/loginfailure',                        
		})(req,res,next);
	});

	function ensureAuthenticated(req, res, next) {
		if ( _.any( authWhiteList, function( relaxedUrl ){
			if ( req.url === relaxedUrl ){
				return true;
			}
			if ( relaxedUrl !== '/' ){
				//Note, / is a special case, since it's usually used as the app landing page, we don't want to use wildcard
				
				if ( req.url.indexOf(relaxedUrl) == 0 ){
					if ( _.endsWith( relaxedUrl, '/' )){
						return true;
					}
					//Make sure we end on a segment
					return req.url[ relaxedUrl.length ] === '/';
				}
			}
			return false;
		})){
			//url is in the white list, let it go through
			return next();
		}

		if(!req.isAuthenticated()) {
			req.session.originalUrl = req.originalUrl;
			res.redirect('/login');
		} else {
			return next();
		}
	}
	
	//Authenticate all requests
	app.use(ensureAuthenticated);
	
}