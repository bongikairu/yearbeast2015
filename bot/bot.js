var port = 7080;
var express = require("express");
var appexpress = express();
appexpress.get("/", function(request, response){ //root dir
		response.send("OK-BHBOT");
});
appexpress.listen(port);

var fs = require('fs');
var request = require('request');

var Steam = require('steam');
var bot = new Steam.SteamClient();

var dota2lib = require('dota2');
var dota2 = new dota2lib.Dota2Client(bot, true);

var username = "steamusername";
var password = "steampassword";
var guardpass = "";

var querystring = require('querystring');

// if we've saved a server list, use it
if(fs.existsSync('servers.dat')) {
	steam.servers = JSON.parse(fs.readFileSync('servers.dat'));
}
// if we have login data
var sentry = null;
if(fs.existsSync('login.dat')) {
	sentry = JSON.parse(fs.readFileSync('login.dat'));
}

bot.logOn({
	accountName: username,
	password: password,
	authCode: guardpass,
	shaSentryfile: sentry
});

bot.on('error',function(err) {
	log.info('bot error');
	console(err);
});

function reportData(lasturl,fulldata) {
	console.log("Sending data to server");
	request(lasturl,function (error, response, body) {
		console.log("Request done");
		if (!error && response.statusCode == 200) {
			console.log(body) // Show the HTML for the Google homepage.
		} else {
			if(response) {
				console.log(response.statusCode);
			} else {
				console.log(error);
			}
			console.log("Retry in 3 minutes");
			setTimeout(function() {
				console.log("Retry sending data to server");
				request(lasturl,function (error, response, body) {
					console.log("Request done");
					if (!error && response.statusCode == 200) {
						console.log(body) // Show the HTML for the Google homepage.
					} else {
						if(response) {
							console.log(response.statusCode);
						} else {
							console.log(error);
						}
						console.log("Report error to zapier");
						fulldata['lasturl'] = lasturl;
						request('https://zapier.com/hooks/catch/secrethookid/?'+querystring.stringify({body:JSON.stringify(fulldata)}),function (error, response, body) {
							console.log("Error sent to zapier");
						});
					}
				});
			},180*1000);
		}
	});
}

bot.on('loggedOn', function() {
	console.log('Logged in!');
	bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
	dota2.launch();
	dota2.on("ready",function() {
		//dota2.leavePracticeLobby();
		//dota2.newbloom();
		dota2.on("newbloom",function(response) {
			console.log("get newbloom data");
			console.log(response);
			var nbresponse = response;
			if(response.nextTransitionTime<1451606400) {
				// actual data
				var lasturl = "http://2015.yearbeast.com/";
				if(response.isActive) {
					// update duration
					lasturl = 'http://2015.yearbeast.com/secretupdate_duration/' + (response.nextTransitionTime - response.standbyDuration);
					reportData(lasturl,nbresponse);
				} else {
					// update next event
					lasturl = 'http://2015.yearbeast.com/secretupdate_start/' + response.nextTransitionTime;
					reportData(lasturl,nbresponse);
				}
			}
		});
	});
	
});

bot.on('servers', function(servers) {
	fs.writeFile('servers', JSON.stringify(servers));
});

bot.on('sentry', function(sentry) {
	fs.writeFile('login.dat', JSON.stringify(sentry));
});
