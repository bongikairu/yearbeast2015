var port = 7081;
var express = require("express");
var appexpress = express();
appexpress.get("/", function(request, response){ //root dir
    response.send("OK-HEROBOT");
});
appexpress.listen(port);

var fs = require('fs');
var request = require('request');
var moment = require('moment');

var herokuapitoken = "heroku-api-token-here";

var herokuclass = require('heroku-client'),
    heroku = new herokuclass({ token: herokuapitoken });

var later = require('later');

var startAt = 0;
var endAt = 0;
var now = 0;

var padBfStart = 1;
var padAfStart = 80;

var padBfEnd = 15;
var padAfEnd = 180;

var nextbeastid = 0;
var nbtimer = null;
var ev = null;

var endTimerB = null;
var endTimerA = null;

//var scaleTo = 2;

var scaleNormal = 2;
var scaleLoadStart = 16;
var scaleLoadEnd = 8;
var scaleHere = 2;

console.log("scaleNormal = " + scaleNormal);
console.log("scaleLoadStart = " + scaleLoadStart);
console.log("scaleLoadEnd = " + scaleLoadEnd);
console.log("scaleHere = " + scaleHere); 

later.date.localTime();

var updateDB = function() {
	/* console.log(moment().format("LTS ") + "[Upd] --> Request db update");
	request('http://2015.yearbeast.com/x7wtfixi_updatedb',function (error, response, body) {
		//console.log(moment().format("LTS ") + "[Upd] --# Bot data sent");
		if (!error && response.statusCode == 200) {
			console.log(moment().format("LTS ") + "[Upd] <-- " + body)
		} else {
			if(response) {
				console.log(moment().format("LTS ") + "[Upd] <-- " + response.statusCode);
			} else {
				console.log(moment().format("LTS ") + "[Upd] <-- " + error);
			}
		}
	}); */
	// auto scaling
	// 3 minutes before and 1 minutes after
	console.log(moment().format("LTS ") + "[Scl] --> Checking beast timer");
	request('http://2015.yearbeast.com/history.json',function (error, response, body) {
		//console.log(moment().format("LTS ") + "--# Bot data sent");
		if (!error && response.statusCode == 200) {
			//console.log(moment().format("LTS ") + "[Scl] <-- Recieve response back");
			var data = JSON.parse(body);
			if(data.length!=0) {

				ev = data[0];

				if(nextbeastid!=ev.id) {

					console.log(moment().format("LTS ") + "[Scl] #-- Beast #"+ev.id+" arrived");

					nextbeastid = ev.id;
					startAt = ev.timestamp;
					endAt = 0;
					now = moment().unix();

					//nbtimer = setTimeout(updateScaleStartBefore,(startAt-padBfStart-now)*1000)

					console.log(moment().format("LTS ") + "[Scl] #-- Schedule a start event");

					//console.log(moment.unix(startAt).add(padAfStart,'s').format("HH:mm:ss"));

					var tBefore = moment.unix(startAt).subtract(padBfEnd,'s');
					var tAfter = moment.unix(startAt).add(padAfStart,'s');
					var tRecheck = moment.unix(startAt).add(180,'s');

					if(tBefore.unix()>=now) {
						var sBefore = later.parse.recur().on(tBefore.format("HH:mm:ss")).time();
						console.log(moment().format("LTS ") + "[Scl] #-- sBefore: " + later.schedule(sBefore).next(1));
						later.setTimeout(scaleBeforeStart,sBefore);
					}

					if(tAfter.unix()>=now) {
						var sAfter = later.parse.recur().on(tAfter.format("HH:mm:ss")).time();
						console.log(moment().format("LTS ") + "[Scl] #-- sAfter: " + later.schedule(sAfter).next(1));
						later.setTimeout(scaleAfterStart,sAfter);
					}

					if(tRecheck.unix()>=now) {
						var sRecheck = later.parse.recur().on(tRecheck.format("HH:mm:ss")).time();
						console.log(moment().format("LTS ") + "[Scl] #-- sRecheck: " + later.schedule(sRecheck).next(1));
						later.setTimeout(recheckDuration,sRecheck);
					}

				} else {
					console.log(moment().format("LTS ") + "[Scl] <-- Nothing change");
				}

			}
		} else {
			if(response) {
				console.log(moment().format("LTS ") + "[Scl] <-- " + response.statusCode);
			} else {
				console.log(moment().format("LTS ") + "[Scl] <-- " + error);
			}
		} 
	});
};

function scaleBeforeStart() {
	updateScale(scaleLoadStart);
}

function scaleAfterStart() {
	updateScale(scaleHere);
}

function scaleBeforeEnd() {
	updateScale(scaleLoadEnd);
}

function scaleAfterEnd() {
	updateScale(scaleNormal);
}

function recheckDuration() {
	console.log(moment().format("LTS ") + "[Scl] --> Checking beast duration");
	request('http://2015.yearbeast.com/history.json',function (error, response, body) {
		//console.log(moment().format("LTS ") + "--# Bot data sent");
		if (!error && response.statusCode == 200) {
			console.log(moment().format("LTS ") + "[Scl] <-- Recieve response back");
			var data = JSON.parse(body);
			if(data.length!=0) {

				ev = data[0];

				console.log(moment().format("LTS ") + "[Scl] #-- Beast #"+ev.id+" duration is " + ev.duration);

				if(endAt!=parseInt(ev.timestamp) + parseInt(ev.duration)) {

					// must not clear - in case time increased
					//if(endTimerB!=null) endTimerB.clear();
					if(endTimerA!=null) endTimerA.clear();

					startAt = ev.timestamp;
					endAt = parseInt(ev.timestamp) + parseInt(ev.duration);
					now = moment().unix();

					//console.log(ev.duration);

					//nbtimer = setTimeout(updateScaleStartBefore,(startAt-padBfStart-now)*1000)

					console.log(moment().format("LTS ") + "[Scl] #-- Schedule an end event");

					var tBeforeE = moment.unix(endAt).subtract(padBfEnd,'s');
					var tAfterE = moment.unix(endAt).add(padAfEnd,'s');

					//console.log(tBeforeE);

					if(now>startAt && tBeforeE.unix()>=now) {
						var sBeforeE = later.parse.recur().on(tBeforeE.format("HH:mm:ss")).time();
						console.log(moment().format("LTS ") + "[Scl] #-- sBeforeE: " + later.schedule(sBeforeE).next(1));
						endTimerB = later.setTimeout(scaleBeforeEnd,sBeforeE);
					}

					if(now>startAt && tAfterE.unix()>=now) {
						var sAfterE = later.parse.recur().on(tAfterE.format("HH:mm:ss")).time();
						console.log(moment().format("LTS ") + "[Scl] #-- sAfterE: " + later.schedule(sAfterE).next(1));
						endTimerA = later.setTimeout(scaleAfterEnd,sAfterE);
					}

					//now = moment().unix();
					if(now>startAt && now<endAt) {
						// schedule recheck
						var sRecheck = later.parse.recur().on(moment().add(180,'s').format("HH:mm:ss")).time();
						console.log(moment().format("LTS ") + "[Scl] #-- sRecheck: " + later.schedule(sRecheck).next(1));
						later.setTimeout(recheckDuration,sRecheck);
					}

				}

			}
		} else {
			if(response) {
				console.log(moment().format("LTS ") + "[Scl] <-- " + response.statusCode);
			} else {
				console.log(moment().format("LTS ") + "[Scl] <-- " + error);
			}
		}
	});
}

function updateScale(scaleTo) {

	/* if(startAt-padBfStart<=now && startAt+padAfStart>=now) {
		console.log(moment().format("LTS ") + "[Scl] #-- Event start incoming");
		scaleTo = scaleLoadStart;
	} else if(endAt-padBfEnd<=now && endAt+padBfEnd>=now) {
		console.log(moment().format("LTS ") + "[Scl] #-- Event end incoming");
		scaleTo = scaleLoadEnd;
	} else if(startAt+padAfStart<now && endAt-padBfEnd>now) {
		console.log(moment().format("LTS ") + "[Scl] #-- Event start ended");
		scaleTo = scaleHere;
	} else {
		console.log(moment().format("LTS ") + "[Scl] #-- No event");
		scaleTo = scaleNormal;
	} */

	var app = heroku.apps('yearbeast');

	/* app.dynos().list(function (err, dynos) {
	  // List of the app's `dynos`
	  console.log(dynos);
	}); */

	/*console.log(moment().format("LTS ") + "[Scl] --> Checking current scale");

	app.formation("web").info(function(err,fdata) {
		if(fdata.quantity!=scaleTo) {
			console.log(moment().format("LTS ") + "[Scl] --# Scaling needed");*/
	console.log(moment().format("LTS ") + "[Scl] --> Issue scaling to " + scaleTo);
	app.formation("web").update({quantity: scaleTo},function() {
		console.log(moment().format("LTS ") + "[Scl] <-- System scaled");
	});
	/*	} else {
			console.log(moment().format("LTS ") + "[Scl] --# No need to scale");
		}
	}); */
}

updateDB();
setInterval(updateDB,60000);


recheckDuration();
