var herokuapitoken = "heroku-api-token-here";

var herokuclass = require('heroku-client'),
    heroku = new herokuclass({ token: herokuapitoken });

var moment = require('moment');

var port = 7082;
var express = require("express");
var appexpress = express();
appexpress.get("/", function(request, response){ //root dir
	console.log(moment().format("LLL : ") + "Fetching heroku ps data");
	var app = heroku.apps('yearbeast');
	app.formation("web").info(function(err,fdata) {
		//fdata.quantity
		console.log("Data fetched : "+fdata.quantity);
		response.send(JSON.stringify([{id:moment().unix(),data:fdata}]));
	});
});
appexpress.listen(port);

console.log(moment().format("lll : ") + "Heroku PS bot started on " + port);