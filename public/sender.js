(function () {
  function readMeta(name) {
    var tags = document.getElementsByTagName("meta");
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].getAttribute("name") === name) {
        return tags[i].getAttribute("content") || "";
      }
    }
    return "";
  }

  var API = (readMeta("sendo-api-base") || "").replace(/\/+$/, "");
  if (!API) API = "";

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, t) {
    var el = $(id);
    if (el) el.textContent = t || "";
  }

  function show(id) {
    var el = $(id);
    if (!el) return;
    if (el.classList) {
      el.classList.remove("hide");
    } else {
      el.className = (el.className || "").replace(/\bhide\b/g, "");
    }
  }

  function hide(id) {
    var el = $(id);
    if (!el) return;
    if (el.classList) {
      el.classList.add("hide");
    } else if ((" " + el.className + " ").indexOf(" hide ") === -1) {
      el.className = (el.className ? el.className + " " : "") + "hide";
    }
  }

  function messageForClosedBy(by) {
    if (by === "downloaded") return "File downloaded on receiver. Session ended.";
    if (by === "receiver" || by === "receiver_gone") {
      return "Other device disconnected. Session ended.";
    }
    if (by === "ttl") return "Session expired.";
    return "Session ended.";
  }

  function showNoticeFromQuery() {
    try {
      var msg = "";
      var s = window.location.search || "";
      var m = /(?:\?|&)notice=([^&]+)/.exec(s);
      if (m && m[1]) msg = decodeURIComponent(m[1]);
      if (!msg) return;
      var el = $("notice");
      if (!el) return;
      el.textContent = msg;
      el.style.display = "block";
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      setTimeout(function () {
        el.style.display = "none";
      }, 5000);
    } catch (e) {}
  }

  function xhr(method, url, body, cb) {
    try {
      var x = new XMLHttpRequest();
      x.open(method, API + url, true);
      if (body) x.setRequestHeader("Content-Type", "application/json");
      x.onreadystatechange = function () {
        if (x.readyState === 4) cb(null, x);
      };
      x.onerror = function () {
        cb(new Error("net"), null);
      };
      x.send(body ? JSON.stringify(body) : null);
    } catch (e) {
      cb(e, null);
    }
  }

  var state = {
    sessionId: null,
    senderToken: null,
    hbTimer: null,
    pollTimer: null,
    beaconSent: false,
    endNotified: false,
  };

  function parseParams() {
    var sid = null;
    var tok = null;

    var s = window.location.search || "";
    var m1 = /[?&]sessionId=([^&]+)/.exec(s);
    var m2 = /[?&]t=([^&]+)/.exec(s);
    if (m1) sid = decodeURIComponent(m1[1] || "");
    if (m2) tok = decodeURIComponent(m2[1] || "");

    return { sid: sid, tok: tok };
  }

  function startHeartbeat() {
    stopHeartbeat();
    state.hbTimer = setInterval(function () {
      if (!state.sessionId) return;
      xhr("POST", "/api/heartbeat", {
        sessionId: state.sessionId,
        role: "sender",
      }, function () {});
    }, 10000);
  }

  function stopHeartbeat() {
    if (state.hbTimer) clearInterval(state.hbTimer);
    state.hbTimer = null;
  }

  function startPoll() {
    stopPoll();
    state.pollTimer = setInterval(function () {
      if (!state.sessionId) return;
      xhr("GET", "/api/session/" + encodeURIComponent(state.sessionId) + "/status", null, function (err, r) {
        if (err || !r || r.status !== 200) return;
        var json = null;
        try {
          json = JSON.parse(r.responseText);
        } catch (e) {
          return;
        }
        if (json && json.closed) {
          var by = json.closedBy || "";
          var msg = messageForClosedBy(by);
          teardownToLanding(msg);
        }
      });
    }, 1500);
  }

  function stopPoll() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  function sendBeaconDisconnect() {
    try {
      if (state.beaconSent || !state.sessionId || !navigator.sendBeacon) return;
      state.beaconSent = true;
      var data = JSON.stringify({ sessionId: state.sessionId, by: "sender" });
      navigator.sendBeacon(
        (API || "") + "/api/disconnect",
        new Blob([data], { type: "application/json" })
      );
    } catch (e) {}
  }

  function manualDisconnect() {
    if (!state.sessionId) return teardownToLanding();
    xhr("POST", "/api/disconnect", {
      sessionId: state.sessionId,
      by: "sender",
    }, function () {
      teardownToLanding();
    });
  }

  function teardownToLanding(reason) {
    stopHeartbeat();
    stopPoll();
    state.sessionId = null;
    state.senderToken = null;
    if (reason && !state.endNotified) state.endNotified = true;
    var target = reason
      ? "/index.html?notice=" + encodeURIComponent(reason)
      : "/index.html";
    setTimeout(function () {
      window.location.replace(target);
    }, 120);
  }

  function connect() {
    var codeEl = $("codeInput");
    var code = (codeEl && codeEl.value ? codeEl.value : "").replace(/^\s+|\s+$/g, "").toUpperCase();

    if (code.length !== 4) {
      setText("connectStatus", "Please enter a 4-character key.");
      return;
    }

    var connectBtn = $("connectBtn");
    if (connectBtn) connectBtn.disabled = true;
    setText("connectStatus", "Connecting…");

    xhr("POST", "/api/connect", { code: code }, function (err, r) {
      if (connectBtn) connectBtn.disabled = false;

      if (err || !r) {
        setText("connectStatus", "Network error.");
        return;
      }
      if (r.status !== 200) {
        setText("connectStatus", "Could not connect. Check the key.");
        return;
      }

      var json = null;
      try {
        json = JSON.parse(r.responseText);
      } catch (e) {
        setText("connectStatus", "Bad response.");
        return;
      }

      if (!json || !json.ok) {
        setText("connectStatus", (json && json.error) || "Failed.");
        return;
      }

      state.sessionId = json.sessionId;
      state.senderToken = json.senderToken;

      setText("connectedTo", "Connected to key: " + code);
      hide("connectCard");
      show("uploadCard");
      setText("connectStatus", "");

      var fileInput = $("fileInput");
      if (fileInput) fileInput.value = "";
      var uploadBtn = $("uploadBtn");
      if (uploadBtn) uploadBtn.disabled = true;

      startHeartbeat();
      startPoll();
    });
  }

  function onFileChange() {
    var fileInput = $("fileInput");
    var uploadBtn = $("uploadBtn");
    if (!uploadBtn) return;
    uploadBtn.disabled = !(fileInput && fileInput.files && fileInput.files[0]);
  }

  function upload() {
    if (!state.sessionId || !state.senderToken) {
      setText("uploadStatus", "Not connected.");
      return;
    }

    var fileInput = $("fileInput");
    var f = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!f) {
      setText("uploadStatus", "Choose a file first (.epub .mobi .azw .azw3 .pdf .txt).");
      return;
    }

    setText("uploadStatus", "Uploading…");
    var uploadBtn = $("uploadBtn");
    if (uploadBtn) uploadBtn.disabled = true;

    var fd = new FormData();
    fd.append("file", f);

    var url = "/api/upload?sessionId=" + encodeURIComponent(state.sessionId) +
      "&senderToken=" + encodeURIComponent(state.senderToken);

    var req = new XMLHttpRequest();
    req.open("POST", (API || "") + url, true);

    req.onreadystatechange = function () {
      if (req.readyState !== 4) return;

      if (req.status !== 200) {
        var details = "";
        try {
          var errJson = JSON.parse(req.responseText || "{}");
          if (errJson && errJson.error) details = ": " + errJson.error;
        } catch (e) {
          if (req.responseText) details = ": " + req.responseText;
        }
        setText("uploadStatus", "Upload failed (" + req.status + ")" + details);
        if (uploadBtn) uploadBtn.disabled = !(fileInput && fileInput.files && fileInput.files[0]);
        return;
      }

      var json = null;
      try {
        json = JSON.parse(req.responseText);
      } catch (e) {
        setText("uploadStatus", "Bad response.");
        if (uploadBtn) uploadBtn.disabled = !(fileInput && fileInput.files && fileInput.files[0]);
        return;
      }

      if (!json || !json.ok) {
        setText("uploadStatus", (json && json.error) || "Upload failed.");
        if (uploadBtn) uploadBtn.disabled = !(fileInput && fileInput.files && fileInput.files[0]);
        return;
      }

      var name = (json.file && json.file.name) ? json.file.name : "file";
      setText("uploadStatus", "Uploaded: " + name);
      if (fileInput) fileInput.value = "";
      if (uploadBtn) uploadBtn.disabled = true;
    };

    req.onerror = function () {
      setText("uploadStatus", "Network error during upload.");
      if (uploadBtn) uploadBtn.disabled = !(fileInput && fileInput.files && fileInput.files[0]);
    };

    req.send(fd);
  }

  function flipToUpload() {
    hide("connectCard");
    show("uploadCard");
    setText("connectedTo", "Connected by QR — ready to upload.");
    var fileInput = $("fileInput");
    if (fileInput) fileInput.value = "";
    var uploadBtn = $("uploadBtn");
    if (uploadBtn) uploadBtn.disabled = true;
  }

  function autoJoinIfParams() {
    var p = parseParams();
    if (!p.sid || !p.tok) return;

    state.sessionId = p.sid;
    state.senderToken = p.tok;

    var tries = 0;
    function tryFlip() {
      tries++;
      if ($("uploadCard") && $("connectCard")) {
        flipToUpload();
      } else if (tries < 10) {
        setTimeout(tryFlip, 30);
      }
    }
    tryFlip();

    xhr("POST", "/api/connect", { sessionId: state.sessionId }, function () {});
    startHeartbeat();
    startPoll();
  }

  function wireHandlers() {
    var connectBtn = $("connectBtn");
    if (connectBtn) connectBtn.onclick = connect;

    var uploadBtn = $("uploadBtn");
    if (uploadBtn) uploadBtn.onclick = upload;

    var disconnectBtn = $("disconnectBtn");
    if (disconnectBtn) disconnectBtn.onclick = manualDisconnect;

    var fileInput = $("fileInput");
    if (fileInput) fileInput.addEventListener("change", onFileChange);

    window.addEventListener("pagehide", function () {
      sendBeaconDisconnect();
    }, true);
    window.addEventListener("beforeunload", function () {
      sendBeaconDisconnect();
    }, true);
    window.addEventListener("offline", function () {
      sendBeaconDisconnect();
    });
  }

  function boot() {
    showNoticeFromQuery();
    wireHandlers();
    autoJoinIfParams();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
