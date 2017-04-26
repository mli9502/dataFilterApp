var $ = require('jquery');
var fs = require('fs');
var electron = require('electron');
var dialog = electron.remote.dialog;
var validList = [];

exports.validate = function() {
    // TODO: Report error if .mat file is not present or discardFrameList is empty.
    $('#label-div').hide();
    $('#validate-div').show();
    loadFiles(true);
    $('#validate-frame-counter').text(currFrameNum.toString());
    $('#validate-frame-start').text(startFrameNum.toString());
    $('#validate-frame-end').text(endFrameNum.toString());
    addNewTrashTableRow();
    updateSteeringAngle(true);
    updateSpeed(true);
    validList = [];
    getValidList();
};
exports.trash_displayNextFrame = function() {
    currFrameNum ++;
    if(currFrameNum > endFrameNum) {
        currFrameNum = startFrameNum;
    }
    currFrameNum = getNextDiscardFrame();
    console.log(currFrameNum);
    currFramePath = currImgFolder.concat('\\', imageFiles[currFrameNum - startFrameNum]);
    $('#validate-frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    updateSteeringAngle(true);
    updateSpeed(true);
    resetFocus();
};
function getValidList() {
    var discardArr = [];
    for(var i = 0; i < discardFrameList.length; i ++) {
        var range = discardFrameList[i];
        discardArr.push(range[0]);
        discardArr.push(range[1]);
    }
    discardArr.unshift(startFrameNum - 1);
    discardArr.push(endFrameNum + 1);
    for(var i = 0; i < discardArr.length - 1; i += 2) {
        var left = discardArr[i] + 1;
        var right = discardArr[i + 1] - 1;
        if(left <= right) {
            validList.push([left, right]);
        }
    }
}
// Get the next discard frame based on current frame.
function getNextDiscardFrame() {
    // TODO: report error if trash list is empty.
    if(discardFrameList.length == 0) {
        alert("Trash list should not be empty.");
        if(currFrameNum - 1 < startFrameNum) {
            return startFrameNum;
        }
        return currFrameNum - 1;
    }
    for(var i = 0; i < discardFrameList.length; i ++) {
        var range = discardFrameList[i];
        if(currFrameNum >= range[0] && currFrameNum <= range[1]) {
            return currFrameNum;
        }
    }
    for(var i = 0; i < validList.length; i ++) {
        if(currFrameNum >= validList[i][0] && currFrameNum <= validList[i][1]) {
            currFrameNum = validList[i][1] + 1;
            if(currFrameNum > endFrameNum) {
                currFrameNum = startFrameNum;
            }
            return getNextDiscardFrame(currFrameNum);
        }
    }
    return -1;
}