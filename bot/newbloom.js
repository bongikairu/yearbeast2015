/*

This file is supposed to be in node-dota2 handlers folder

*/

var Dota2 = require("../index"),
    fs = require("fs"),
    util = require("util"),
    Schema = require('protobuf').Schema,
    base_gcmessages = new Schema(fs.readFileSync(__dirname + "/../generated/base_gcmessages.desc")),
    gcsdk_gcmessages = new Schema(fs.readFileSync(__dirname + "/../generated/gcsdk_gcmessages.desc")),
    dota_gcmessages_client = new Schema(fs.readFileSync(__dirname + "/../generated/dota_gcmessages_client.desc")),
    protoMask = 0x80000000;

// Methods

Dota2.Dota2Client.prototype.newbloom = function(callback) {
  callback = callback || null;

  /* Sends a message to the Game Coordinator requesting the data on the given month's leagues.
     Listen for `leaguesInMonthResponse` event for the Game Coordinator's response. */

  if (!this._gcReady) {
    if (this.debug) util.log("GC not ready, please listen for the 'ready' event.");
    return null;
  }

  if (this.debug) util.log("Sending CMsgGCNewBloomModeState");
  var payload = dota_gcmessages_client.CMsgGCNewBloomModeState.serialize({});

  this._client.toGC(this._appid, (Dota2.EDOTAGCMsg.k_EMsgGCNewBloomModeState | protoMask), payload, callback);
};


// Handlers

var handlers = Dota2.Dota2Client.prototype._handlers;

handlers[Dota2.EDOTAGCMsg.k_EMsgGCNewBloomModeStateResponse] = function newBloomResponse(message, callback) {
  callback = callback || null;
  var response = dota_gcmessages_client.CMsgGCNewBloomModeStateResponse.parse(message);

  //if (response.eresult === 1) {
    if (this.debug) util.log("Received newbloom response " + response.active);
    this.emit("newbloom", response);
    if (callback) callback(null, response);
  //}
  //else {
  //    if (this.debug) util.log("Received a bad newbloom response");
  //    if (callback) callback(response.eresult, response);
  //}
};

handlers[Dota2.EDOTAGCMsg.k_EMsgGCToClientNewBloomTimingUpdated] = function newBloomResponse(message, callback) {
  callback = callback || null;
  var response = dota_gcmessages_client.CMsgGCToClientNewBloomTimingUpdated.parse(message);

  //if (response.eresult === 1) {
    if (this.debug) {
      util.log("Received newbloom response");
      util.log(response);
    }
    this.emit("newbloom", response);
    if (callback) callback(null, response);
  //}
  //else {
  //    if (this.debug) util.log("Received a bad newbloom response");
  //    if (callback) callback(response.eresult, response);
  //}
};