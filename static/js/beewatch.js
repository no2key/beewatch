var wsUri = "ws://" + window.location.hostname + ":" + window.location.port + "/beewatch";
var output;
var connected = false;
var suspended = false;
var websocket = new WebSocket(wsUri);

function init() {
    output = document.getElementById("output");
    setupWebSocket();
}

function setupWebSocket() {
    websocket.onopen = function (evt) {
        onOpen(evt)
    };
    websocket.onclose = function (evt) {
        onClose(evt)
    };
    websocket.onmessage = function (evt) {
        onMessage(evt)
    };
    websocket.onerror = function (evt) {
        onError(evt)
    };
}

function onOpen(evt) {
    connected = true;
    //document.getElementById("disconnect").className = "buttonEnabled";
    writeToScreen("Connection has established.", "label label-funky", "INFO", "");
    sendConnected();
}

function onClose(evt) {
    //handleDisconnected();
}

function handleDisconnected() {
    //connected = false;
    //document.getElementById("resume").className = "buttonDisabled";
    //document.getElementById("disconnect").className = "buttonDisabled";
    //writeToScreen("Disconnected.", "label label-funky", "INFO", "");
}

function onMessage(evt) {
    try {
        var cmd = JSON.parse(evt.data);
    } catch (e) {
        writeToScreen("Failed to read valid JSON", "label label-funky", "ERRO", e.message.data);
        return;
    }

    switch (cmd.Action) {
        case "PRINT":
        case "DISPLAY":
            writeToScreen(getTitle(cmd), getLevelCls(cmd.Level), cmd.Level, watchParametersToHtml(cmd.Parameters));
            sendResume();
            return;
        case "DONE":
            actionDisconnect(true);
            return;
        case "BREAK":
            suspended = true;
            var logdiv = writeToScreen("program suspended -->", getLevelCls(cmd.Level), cmd.Level, "");
            addStack(logdiv, cmd);
//            handleSourceUpdate(cmd);
            return;
    }
}

function getTitle(cmd) {
    var filePath = cmd.Parameters["go.file"];
    var i = filePath.lastIndexOf("/") + 1;
    return filePath.substring(i, filePath.length) + ":" + cmd.Parameters["go.line"];
}

function onError(evt) {
    writeToScreen("WebScoket error", "label label-funky", "ERRO", evt.data);
}

function writeToScreen(title, cls, level, msg) {
    var logdiv = document.createElement("div");
    addTime(logdiv, cls, level);
    addTitle(logdiv, title);
    addMessage(logdiv, msg, level);
    output.appendChild(logdiv);
    logdiv.scrollIntoView();
    return logdiv;
}

function addTime(logdiv, cls, level) {
    var stamp = document.createElement("span");
    stamp.innerHTML = timeHHMMSS() + " " + level;
    stamp.className = cls;
    logdiv.appendChild(stamp);
}

function timeHHMMSS() {
    return new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
}

function addTitle(logdiv, title) {
    var name = document.createElement("span");
    name.innerHTML = " " + title;
    logdiv.appendChild(name);
}

function addMessage(logdiv, msg, level) {
    var txt = document.createElement("span");

    if (msg.substr(0, 1) == "[") {
        // Debugger messages.
        txt.className = getMsgClass(msg.substr(1, 4));
    } else {
        // App messages.
        txt.className = getMsgClass(level);
    }

    txt.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + msg;
    logdiv.appendChild(txt);
}

function addStack(logdiv, cmd) {
    var stack = cmd.Parameters["go.stack"];
    if (stack != null && stack.length > 0) {
        addNonEmptyStackTo(stack, logdiv);
    }
}

function addNonEmptyStackTo(stack, logdiv) {
    var toggle = document.createElement("a");
    toggle.href = "#";
    toggle.className = "label label-primary";
    toggle.onclick = function () {
        toggleStack(toggle);
    };
    toggle.innerHTML = "Stack &#x25B6;";
    logdiv.appendChild(toggle);

    var stk = document.createElement("div");
    stk.style.display = "none";
    var lines = document.createElement("pre");
    lines.innerHTML = stack
    stk.appendChild(lines)
    logdiv.appendChild(stk)
}

function toggleStack(link) {
    var stack = link.nextSibling;
    if (stack.style.display == "none") {
        link.innerHTML = "Stack &#x25BC;";
        stack.style.display = "block"
        stack.scrollIntoView();
    } else {
        link.innerHTML = "Stack &#x25B6;";
        stack.style.display = "none";
    }
}

function getMsgClass(level) {
    switch (level) {
        case "INIT", "INFO":
            return "text-success";
    }
}

function getLevelCls(level) {
    switch (level) {
        case "TRACE":
            return "label";
        case "INFO":
            return "label label-info";
        case "CRITICAL":
            return "label label-danger";
        default:
            return "lable";
    }
}

function watchParametersToHtml(parameters) {
    var line = "";
    var multiline = false;
    for (var prop in parameters) {
        if (prop.slice(0, 3) != "go.") {
            if (multiline) {
                line = line + ", ";
            }
            line = line + prop + " => " + parameters[prop];
            multiline = true;
        }
    }
    return line
}

function actionResume() {
    if (!connected) return;
    if (!suspended) return;
    suspended = false;
    //document.getElementById("resume").className = "buttonDisabled";
    writeToScreen("<-- resume program.", "label label-info", "INFO", "");
    sendResume();
}

function actionDisconnect(passive) {
    if (!connected) return;
    connected = false;
    //document.getElementById("disconnect").className = "buttonDisabled";
    sendQuit(passive);
    writeToScreen("Disconnected.", "label label-funky", "INFO", "");
    websocket.close();  // seems not to trigger close on Go-side ; so handleDisconnected cannot be used here.
}

function sendConnected() {
    doSend('{"Action":"CONNECTED"}');
}

function sendResume() {
    doSend('{"Action":"RESUME"}');
}

function sendQuit(passive) {
    if (passive) {
        doSend('{"Action":"QUIT","Parameters":{"PASSIVE":"1"}}');
    } else {
        doSend('{"Action":"QUIT","Parameters":{"PASSIVE":"0"}}');
    }
}

function doSend(message) {
    // console.log("[hopwatch] send: " + message);
    websocket.send(message);
}

function handleKeyDown(event) {
    switch (event.keyCode) {
        case 119: // F8.
            actionResume();
        case 120: // F9.
    }
}

window.addEventListener("load", init, false);
window.addEventListener("keydown", handleKeyDown, true);