var $ = require('jquery');
var fs = require('fs');
var electron = require('electron');
var dialog = electron.remote.dialog;
var validList = [];
var validate_timer = null, validate_interval = 50;
var discardMap = {1:'Windshield wiper', 
                    2:'Lane Change', 
                    3: 'Non highway',
                    4: 'Strong sun light',
                    5: 'Strange Lanes',
                    6: 'Distort Light'};
var _this = this;
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
    var tmpArr = getNextDiscardFrame();
    currFrameNum = tmpArr[0];
    discardKey = tmpArr[1];
    console.log(currFrameNum);
    currFramePath = currImgFolder.concat('\\', imageFiles[currFrameNum - startFrameNum]);
    $('#validate-frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    updateSteeringAngle(true);
    updateSpeed(true);
    updateTrashReason(discardKey);
    resetFocus();
};
exports.trash_displayPrevFrame = function() {
    currFrameNum --;
    if(currFrameNum < startFrameNum) {
        currFrameNum = endFrameNum;
    }
    var tmpArr = getPrevDiscardFrame();
    currFrameNum = tmpArr[0];
    discardKey = tmpArr[1];
    console.log(currFrameNum);
    console.log(discardKey);
    currFramePath = currImgFolder.concat('\\', imageFiles[currFrameNum - startFrameNum]);
    $('#validate-frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    updateSteeringAngle(true);
    updateSpeed(true);
    updateTrashReason(discardKey);
    resetFocus();
}

exports.trash_playback = function() {
    validate_interval = parseInt($('#trash-interval').val());
    stop();
    if(validate_timer !== null) {
        return;
    }
    validate_timer = setInterval(_this.trash_displayNextFrame, validate_interval);
    resetFocus();
}
exports.trash_stop = function() {
    clearInterval(validate_timer);
    validate_timer = null;
    resetFocus();
}
exports.trash_rewind = function() {
    validate_interval = parseInt($('#trash-interval').val());
    stop();
    if(validate_timer !== null) {
        return;
    }
    validate_timer = setInterval(_this.trash_displayPrevFrame, validate_interval);
    resetFocus();
}

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
    if(discardFrameList.length == 0) {
        alert('Trash list should not be empty.');
        if(currFrameNum - 1 < startFrameNum) {
            return [startFrameNum, -1];
        }
        return [currFrameNum - 1, -1];
    }
    for(var i = 0; i < discardFrameList.length; i ++) {
        var range = discardFrameList[i];
        if(currFrameNum >= range[0] && currFrameNum <= range[1]) {
            return [currFrameNum, range[2]];
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
    return [-1, -1];
}

function getPrevDiscardFrame() {
    if(validList.length == 0) {
        alert('Valid list should not be empty.');
        if(currFrameNum + 1 > endFrameNum) {
            return [endFrameNum, -1];
        }
        return [currFrameNum + 1, -1];
    }
    for(var i = 0; i < discardFrameList.length; i ++) {
        var range = discardFrameList[i];
        if(currFrameNum >= range[0] && currFrameNum <= range[1]) {
            return [currFrameNum, range[2]];
        }
    }
    for(var i = 0; i < validList.length; i ++) {
        if(currFrameNum >= validList[i][0] && currFrameNum <= validList[i][1]) {
            currFrameNum = validList[i][0] - 1;
            if(currFrameNum < startFrameNum) {
                currFrameNum = endFrameNum;
            }
            return getNextDiscardFrame(currFrameNum);
        }
    }
    return [-1, -1];
}

function updateTrashReason(discardKey) {
    var discardReason = 'Empty';
    if(discardKey != -1) {
        discardReason = discardMap[discardKey];
    }
    console.log(discardReason);
    $('#trash-reason').text(discardKey + ' - ' + discardReason);
}