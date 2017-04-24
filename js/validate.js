var $ = require('jquery');
var fs = require('fs');
var electron = require('electron');
var dialog = electron.remote.dialog;

exports.validate = function() {
    $('#label-div').hide();
    $('#validate-div').show();
}