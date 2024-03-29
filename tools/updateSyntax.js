"use strict";

var processFiles = require("./processFiles");

switch (process.argv[2]) {
    case "-defaultAppearance":
        processFiles(updateDefaultAppearance, process.argv.slice(3));
        break;
    case "-evokeCS":
        processFiles(updateEvokeCS, process.argv.slice(3));
        break;
    case "-sx":
        processFiles(updateSx, process.argv.slice(3));
        break;
    case "-div":
        processFiles(updateToDiv, process.argv.slice(3));
        break;
    default:
        console.error("No such mode: " + process.argv[2]);
        process.exit(2);
}

function noop() {}

function jsQueryDummy() {
    return {
        ready: function (cb) {
            cb();
        },
        attr: noop,
        css: noop,
    };
}

//                   1         123    3 4   45     526   6
var reCreateCindy = /(CindyJS\()((.*\n)?(\s*)([^;]*))(\);)/;

function updateDefaultAppearance(path, str) {
    var match = reCreateCindy.exec(str);
    if (!match) {
        if (str.indexOf("CindyJS") === -1) return;
        throw new Error("No CindyJS found");
    }
    if (match[2].indexOf("defaultAppearance") >= 0) return;
    var end = str.indexOf("</script>", match.index);
    var start = str.lastIndexOf("<script", match.index);
    start = str.indexOf(">", start) + 1;
    var defaultAppearance = {};
    var f = new Function("CindyJS", "csplay", "defaultAppearance", "document", "$", str.substring(start, end));
    f(noop, noop, defaultAppearance, "document", jsQueryDummy);
    var keys = Object.keys(defaultAppearance);
    if (keys.length === 0) return;
    keys.sort;
    defaultAppearance = keys
        .map(function (key) {
            return key + ": " + JSON.stringify(defaultAppearance[key]);
        })
        .join(", ");
    var insertPos = match.index + match[1].length + match[3].length;
    str =
        str.substr(0, insertPos) +
        match[4] +
        "defaultAppearance: {" +
        defaultAppearance +
        "},\n" +
        str.substr(insertPos);
    str = str.replace(/^[ \t]*defaultAppearance\.[^;]*;[ \t]*\n/gm, "");
    return str;
}

var reMethods = /([^.])(?:(evokeCS)|cs(play|pause|stop))/g;

function updateEvokeCS(path, str) {
    var orig = str;
    if (!reMethods.test(str)) return;
    var match = /(?:var\s+([A-Za-z0-9_]+)\s*=\s*)?CindyJS\s*\(/.exec(str);
    if (!match) throw error("No CindyJS found");
    var v = match[1];
    if (!v) {
        str = str.substr(0, match.index) + "var cdy = " + str.substr(match.index);
        v = "cdy";
    }
    str = str.replace(reMethods, "$1" + v + ".$2$3");
    if (str !== orig) return str;
}

var reSxyz = /sx: *([^:};]+), *sy: *([^:};]+), *sz: *([^:};]+)/g;
var reSxy = /sx: *([^:};]+), *sy: *([^:};]+)/g;

function updateSx(path, str) {
    var res = str.replace(reSxyz, "pos:[$1,$2,$3]");
    res = res.replace(reSxy, "pos:[$1,$2]");
    if (res !== str) return res;
}

function updateToDiv(path, str) {
    var res = str.replace(/<canvas[^>]*>\s*<\/canvas>/gi, function (canvas) {
        if (canvas.indexOf('id="Cindy3D"') >= 0) return canvas;
        var div = canvas
            .replace(/width="?(\d+)"?\s+height="?(\d+)"?\s+style="/, 'style="width:$1px; height:$2px; ')
            .replace(/width="?(\d+)"?\s+height="?(\d+)"?/, 'style="width:$1px; height:$2px;"')
            .replace(/(<\/?)canvas/gi, "$1div");
        if (/(width|height)\s*(=|:[^]*\1:)/.test(div)) throw error("Could not convert dimensions for " + canvas);
        return div;
    });
    if (res !== str) return res;
}
