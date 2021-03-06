var $ = require('jquery');
var fs = require('fs');
var electron = require('electron');
var dialog = electron.remote.dialog;
var validate = require('./js/validate');

var timer = null, interval = 50;

var currFrameNum = 0;
var currDir = '';
var currImgFolder = '';
var leftImgFolder = '';
var rightImgFolder = '';
var speedFile = '';
var swFile = '';
var matFile = '';
var imageFiles = [];
var leftImageFiles = [];
var rightImageFiles = [];
var startFrameNum = 0;
var endFrameNum = 0;
var currRowCnt = 0;
var discardFrameList = [];

var swAngleMap = new Map();
var speedMap = new Map();

$(function() {
    // Add keyboard event listener.
    document.addEventListener('keydown', (event) => {
        if(matFile.length != 0) {
            console.log('in event listener');
            return;
        }
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
    $('#trash-next-btn').on('click', validate.trash_displayNextFrame);
    $('#trash-prev-btn').on('click', validate.trash_displayPrevFrame);
    $('#valid-next-btn').on('click', validate.valid_displayNextFrame);
    $('#valid-prev-btn').on('click', validate.valid_displayPrevFrame);
    $('#jump-forward-btn').on('click', displayNextKFrames);
    $('#jump-backward-btn').on('click', displayPrevKFrames);
    $('#select-dir').on('click', selectDirectory);
    $('#initialize').on('click', initialize);
    $('#validate').on('click', validate.validate);
    $('#play').on('click', playback);
    $('#rewind').on('click', rewind);
    $('#stop').on('click', stop);
    $('#trash-play').on('click', validate.trash_playback);
    $('#trash-stop').on('click', validate.validate_stop);
    $('#trash-rewind').on('click', validate.trash_rewind);
    $('#valid-play').on('click', validate.valid_playback);
    $('#valid-stop').on('click', validate.validate_stop);
    $('#valid-rewind').on('click', validate.valid_rewind);
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
// TODO: Add support for left and right images.
function loadFiles(loadMatFile) {
    var tokens = currDir.split('\\');
    var currDirName = tokens[tokens.length - 1];
    currImgFolder = currDir + '\\cam1';
    leftImgFolder = currDir + '\\cam2';
    rightImgFolder = currDir + '\\cam0';
    speedFile = currDir + '\\speedFile.txt';
    swFile = currDir + '\\swFile.txt';
    if(loadMatFile) {
        matFile = currDir + '\\' + currDirName + '_discard_frames.m';
    } else {
        matFile = '';
    }
    imageFiles = [];
    discardFrameList = [];
    swAngleMap = new Map();
    speedMap = new Map();
    // Load matlab file here.
    if(loadMatFile) {
        console.log(matFile);
        var matFileLines = fs.readFileSync(matFile, 'utf-8');
        matFileLines = matFileLines.split('\n');
        loadDiscardFrames(matFileLines);
        console.log(discardFrameList);
    }
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
    loadImgFiles(currImgFolder, imageFiles);
    loadImgFiles(leftImgFolder, leftImageFiles);
    loadImgFiles(rightImgFolder, rightImageFiles);
    currFrameNum = getFrameNum(imageFiles[0]);
    startFrameNum = currFrameNum;
    endFrameNum = currFrameNum + imageFiles.length - 1;
    currFramePath = currImgFolder.concat('\\', imageFiles[0]);
    leftFramePath = leftImgFolder.concat('\\', leftImageFiles[0]);
    rightFramePath = rightImgFolder.concat('\\', rightImageFiles[0]);
    $('#frame-img').attr('src', currFramePath);
    $('#left-frame-img').attr('src', leftFramePath);
    $('#right-frame-img').attr('src', rightFramePath);
}

function loadImgFiles(folder, arr) {
    var files = fs.readdirSync(folder);
    files.forEach(file => {
        if(file.includes('jpg')) {
            arr.push(file);
        }
    });
    arr.sort(compare);
}

function loadDiscardFrames(matFileLines) {
    console.log(matFileLines);
    for(var i = 0; i < matFileLines.length; i ++) {
        var line = matFileLines[i];
        if(i == 0 || i >= matFileLines.length - 2) {
            continue;
        }
        console.log(line);
        var tokens = line.split(',');
        console.log(tokens);
        discardFrameList.push([parseInt(tokens[0]), parseInt(tokens[1]), parseInt(tokens[2].substring(0, tokens[2].length - 1))]);        
    }
}

function initialize() {
    // Show label buttons, hide validation buttons.
    $('#label-div').show();
    $('#validate-div').hide();
    loadFiles(false);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-start').text(startFrameNum.toString());
    $('#frame-end').text(endFrameNum.toString());
    $('#trash-types').text('Trash Types');
    $('#trash-table > tbody').html("");
    addNewTrashTableRow();
    updateSteeringAngle(false);
    updateSpeed(false);
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
    leftFramePath = leftImgFolder.concat('\\', leftImageFiles[currFrameNum - startFrameNum]);
    rightFramePath = rightImgFolder.concat('\\', rightImageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    $('#left-frame-img').attr('src', leftFramePath);
    $('#right-frame-img').attr('src', rightFramePath);
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
    leftFramePath = leftImgFolder.concat('\\', leftImageFiles[currFrameNum - startFrameNum]);
    rightFramePath = rightImgFolder.concat('\\', rightImageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    $('#left-frame-img').attr('src', leftFramePath);
    $('#right-frame-img').attr('src', rightFramePath);
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
    leftFramePath = leftImgFolder.concat('\\', leftImageFiles[currFrameNum - startFrameNum]);
    rightFramePath = rightImgFolder.concat('\\', rightImageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    $('#left-frame-img').attr('src', leftFramePath);
    $('#right-frame-img').attr('src', rightFramePath);
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
    leftFramePath = leftImgFolder.concat('\\', leftImageFiles[currFrameNum - startFrameNum]);
    rightFramePath = rightImgFolder.concat('\\', rightImageFiles[currFrameNum - startFrameNum]);
    $('#frame-counter').text(currFrameNum.toString());
    $('#frame-img').attr('src', currFramePath);
    $('#left-frame-img').attr('src', leftFramePath);
    $('#right-frame-img').attr('src', rightFramePath);
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
    var content = 'trash_' + currDirName + '=[\n';
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

function updateSpeed(loadMatFile) {
    var speed = speedMap.get(currFrameNum);
    var id = '#speed';
    if(loadMatFile) {
        id = '#validate-speed';
    }
    if(speed === undefined) {
        $(id).text('No data');
    }
    $(id).text(speed);
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

function updateSteeringAngle(loadMatFile) {
    var angle = swAngleMap.get(currFrameNum);
    var id = '#steering-angle';
    if(loadMatFile) {
        id = '#validate-steering-angle';
    }
    if(angle === undefined) {
        $(id).text('No data');
    }
    $(id).text(angle);
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
