var $ = require('jquery');
var fs = require('fs');
var electron = require('electron');
var dialog = electron.remote.dialog;

var timer = null, interval = 50;

var currFrameNum = 0;
var currDir = '';
var currImgFolder = '';
var speedFile = '';
var swFile = '';
var imageFiles = [];
var startFrameNum = 0;
var endFrameNum = 0;
var currRowCnt = 0;

var swAngleMap = new Map();
var speedMap = new Map();

$(function() {
    // Add keyboard event listener.
    document.addEventListener('keydown', (event) => {
        const keyName = event.key;
        if(event.ctrlKey) {
            if(keyName === 'ArrowLeft' || keyName === 'ArrowDown' || keyName === 'a' || keyName === 's') {
                displayPrevKFrames();
            } else if(keyName === 'ArrowRight' || keyName === 'ArrowUp' || keyName === 'd' || keyName === 'w') {
                displayNextKFrames();
            } else if(keyName === ' ') {
                rewind();
            }
        } else {
            if(keyName === 'ArrowLeft' || keyName === 'ArrowDown' || keyName === 'a' || keyName === 's') {
                displayPrevFrame();
            } else if(keyName === 'ArrowRight' || keyName === 'ArrowUp' || keyName === 'd' || keyName === 'w') {
                displayNextFrame();
            } else if(keyName === ' ') {
                if(timer !== null) {
                    stop();
                } else {
                    playback();
                }
            }
        }
    }, false);
    $('#frame-counter').text(currFrameNum.toString());
    $('#next-btn').on('click', displayNextFrame);
    $('#prev-btn').on('click', displayPrevFrame);
    $('#jump-forward-btn').on('click', displayNextKFrames);
    $('#jump-backward-btn').on('click', displayPrevKFrames);
    $('#select-dir').on('click', selectDirectory);
    $('#initialize').on('click', initialize);
    $('#play').on('click', playback);
    $('#rewind').on('click', rewind);
    $('#stop').on('click', stop);
    $('#trash-types-list li').click(function(evt) {
        resetFocus();
        $('#trash-types').text($(evt.target).text());
        $('#trash-table tr:last > .trash-type').html($('#trash-types').text());
    });
    $('#trash-start').click(updateTrashStart);
    $('#trash-end').click(updateTrashEnd);
    $('#trash-confirm').click(addNewTrashTableRow);
    $('#trash-export').click(exportTrashTable);
});

function selectDirectory() {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }, function(dirName) {
        currDir = dirName[0];
        console.log(currDir);
        $('#curr-dir').val(currDir);
    });
    resetFocus();
}

function initialize() {
    currImgFolder = currDir + '\\cam1';
    speedFile = currDir + '\\speedFile.txt';
    swFile = currDir + '\\swFile.txt';
    imageFiles = [];
    swAngleMap = new Map();
    speedMap = new Map();
    console.log(swFile);
    var swFileLines = fs.readFileSync(swFile, 'utf-8');
    swFileLines = swFileLines.split('\n');
    console.log(swFileLines.length);
    loadSwAngle(swFileLines);
    console.log(swAngleMap);
    var speedFileLines = fs.readFileSync(speedFile, 'utf-8');
    speedFileLines = speedFileLines.split('\n');
    loadSpeed(speedFileLines);
    console.log(speedMap);
    fs.readdir(currImgFolder, (err, files) => {
        files.forEach(file => {
            if(file.includes('jpg')) {
                imageFiles.push(file);
            }
        });
        imageFiles.sort(compare);
        // Display the first image and current frame number.
        currFrameNum = getFrameNum(imageFiles[0]);
        startFrameNum = currFrameNum;
        endFrameNum = currFrameNum + imageFiles.length - 1;
        currFramePath = currImgFolder.concat('\\', imageFiles[0]);
        $('#frame-counter').text(currFrameNum.toString());
        $('#frame-start').text(startFrameNum.toString());
        $('#frame-end').text(endFrameNum.toString());
        $('#frame-img').attr('src', currFramePath);
        $('#trash-types').text('Trash Types');
        $('#trash-table > tbody').html("");
        addNewTrashTableRow();
        updateSteeringAngle();
        updateSpeed();
    });
    resetFocus();
}
// Starts playback from current frame.
function playback() {
    interval = parseInt($('#interval').val());
    stop();
    if(timer !== null) {
        return;
    }
    timer = setInterval(displayNextFrame, interval);
    resetFocus();
}
function rewind() {
    interval = parseInt($('#interval').val());
    stop();
    if(timer !== null) {
        return;
    }
    timer = setInterval(displayPrevFrame, interval);
    resetFocus();
}
function stop() {
    clearInterval(timer);
    timer = null;
    resetFocus();
}

function getFrameNum(fileName) {
    var tmp = fileName.split('.');
    var tokens = tmp[0].split('_');
    return parseInt(tokens[tokens.length - 1]);
}

function compare(fileNameA, fileNameB) {
    var aFrame = getFrameNum(fileNameA);
    var bFrame = getFrameNum(fileNameB);
    return aFrame - bFrame;
}

function displayNextFrame() {
    currFrameNum ++;
    if(currFrameNum > endFrameNum) {
        currFrameNum = startFrameNum;
    }
    currFramePath = currImgFolder.concat('\\', imageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    updateSteeringAngle();
    updateSpeed();
    resetFocus();
}

function displayPrevFrame() {
    currFrameNum --;
    if(currFrameNum < startFrameNum) {
        currFrameNum = endFrameNum;
    }
    currFramePath = currImgFolder.concat('\\', imageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    updateSteeringAngle();
    updateSpeed();
    resetFocus();
}

function displayNextKFrames() {
    var k = parseInt($('#jump-frame').val());
    currFrameNum += k;
    if(currFrameNum > endFrameNum) {
        currFrameNum -= endFrameNum;
    }
    currFramePath = currImgFolder.concat('\\', imageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    updateSteeringAngle();
    updateSpeed();
    resetFocus();
}

function displayPrevKFrames() {
    var k = parseInt($('#jump-frame').val());
    currFrameNum -= k;
    if(currFrameNum < startFrameNum) {
        currFrameNum += endFrameNum;
    }
    currFramePath = currImgFolder.concat('\\', imageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    updateSteeringAngle();
    updateSpeed();
    resetFocus();
}

function resetFocus() {
    window.focus();
    if (document.activeElement) {
        document.activeElement.blur();
    }
}

function addNewTrashTableRow() {
    var trashType = 'Trash Type';
    var trashStart = -1;
    var trashEnd = -1;
    var newRow = '<tr><td class="trash-type">' + trashType + '</td>' + 
                        '<td class="trash-start">' + trashStart + '</td>' + 
                        '<td class="trash-end">' + trashEnd + '</td>' + 
                        '<td class="trash-delete"><button class="btn btn-default trash-delete-btn" type="button">Delete</button></td></tr>';
    $('#trash-table tbody').append(newRow);
    $('.trash-delete-btn').unbind();
    $('.trash-delete-btn').click(function(event) {
        var currObj = $(this);
        dialog.showMessageBox({
            type: 'warning',
            message: 'Do you want to remove this entry?',
            buttons: ['Yes', 'No']
        }, function(response) {
            console.log(response);
            if(response == 0) {
                currObj.parent().parent().remove();
            }
            resetFocus();
        });
    });
    resetFocus();
}

function updateTrashStart() {
    $('#trash-table tbody tr:last > .trash-start').html(currFrameNum);
    resetFocus();
}

function updateTrashEnd() {
    $('#trash-table tbody tr:last > .trash-end').html(currFrameNum);
    resetFocus();
}

function exportTrashTable() {
    var tokens = currDir.split('\\');
    var currDirName = tokens[tokens.length - 1];
    var content = 'trash_' + currDirName + '=[';
    $('#trash-table tbody tr').each(function(i, tr) {
        var type = $('.trash-type', tr).text();
        var tokens = type.split('.');
        type = parseInt(tokens[0]);
        var start = parseInt($('.trash-start', tr).text());
        var end = parseInt($('.trash-end', tr).text());
        content += start + ',' + end + ',' + type + ';\n';
    });
    content += '];\n';
    console.log(content);
    fileName = currDir.concat('\\', currDirName + '_discard_frames.m');
    console.log(fileName);
    fs.writeFile(fileName, content, function(err) {
        if(err) {
            console.log(err);
        }
        console.log('Finished...');
        dialog.showMessageBox({
            type: 'info',
            message: 'Successfully Exported'
        });
    });
    resetFocus();
}

function updateSpeed() {
    var speed = speedMap.get(currFrameNum);
    if(speed === undefined) {
        $('#speed').text('No data');
    }
    $('#speed').text(speed);
}

function loadSpeed(fileLines) {
    for(var i = 0; i < fileLines.length; i ++) {
        if(fileLines[i].charAt(0) == '4' && fileLines[i].charAt(1) == '1') {
            var frameId = getFrameId(fileLines[i]);
            var speedStr = fileLines[i].substring(6, 8);
            var speed = parseInt(speedStr, 16);
            speedMap.set(frameId, speed);
        }
    }
}

function updateSteeringAngle() {
    var angle = swAngleMap.get(currFrameNum);
    if(angle === undefined) {
        $('#steering-angle').text('No data');
    }
    $('#steering-angle').text(angle);
}

function loadSwAngle(fileLines) {
    var start = false;
    for(var i = 0; i < fileLines.length; i ++) {
        if(start) {
            var frameId = getFrameId(fileLines[i]);
            var tokens = fileLines[i].split(' ');
            var hexStr = '';
            for(var j = 0; j < tokens.length; j ++) {
                if(tokens[j].length == 2) {
                    hexStr += tokens[j];
                }
            }
            var angle = convAngle(hexStr);
            // console.log(angle);
            if(swAngleMap.has(frameId)) {
                var tmp = swAngleMap.get(frameId);
                tmp[0] += angle;
                tmp[1] += 1;
                swAngleMap.set(frameId, tmp);
            } else {
                swAngleMap.set(frameId, [angle, 1]);
            }
        }
        if(fileLines[i].substring(0, 5) === '>ATMA') {
            start = true;
        }
    }
    for(var key of swAngleMap.keys()) {
        var angles = swAngleMap.get(key);
        // console.log(angles);
        swAngleMap.set(key, (angles[0] / angles[1]).toFixed(2));
    }
}

// Get frame id from a line from swFile.txt and speedFile.txt.
function getFrameId(fileStr) {
    var tokens = fileStr.split(' ');
    return parseInt(tokens[tokens.length - 1].split('_')[1]);
}

function convAngle(hexStr) {
    if(hexStr.length == 2) {
        return 255 + parseInt(hexStr, 16);
    }
    firSeg = hexStr.substring(0, 2);
    secSeg = hexStr.substring(2, 4);
    // Calculate the float part.
    floatPart = parseInt(hexStr.substring(8, 9), 16);
    if(floatPart >= 9) {
        floatPart -= 9;
    } else {
        floatPart += 8;
    }
    floatPart = (floatPart * 2.0) / 30.0;
    if(firSeg === '0F') {
        binStr = '11111111' + padZeros(parseInt(secSeg, 16).toString(2), 8);
        return uintToInt(parseInt(binStr, 2), 16) + floatPart;
    } else if(firSeg === '0E') {
        binStr = '11111110' + padZeros(parseInt(secSeg, 16).toString(2), 8);
        return uintToInt(parseInt(binStr, 2), 16) + floatPart;
    } else {
        return parseInt(secSeg, 16) + floatPart;
    }
}
// http://stackoverflow.com/questions/27911677/how-to-convert-a-binary-number-into-a-signed-decimal-number
function uintToInt(uint, nbit) {
    nbit = +nbit || 32;
    if (nbit > 32) throw new RangeError('uintToInt only supports ints up to 32 bits');
    uint <<= 32 - nbit;
    uint >>= 32 - nbit;
    return uint;
}
function padZeros(numStr, length) {
    while (numStr.length < length) {
        numStr = '0' + numStr;
    }
    return numStr;
}
