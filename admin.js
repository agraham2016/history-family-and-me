/* ===========================================================
   Admin Portal — subscriber list manager (Railway API backed)
   The passcode entered at the gate is the API admin token.
   =========================================================== */
(function () {
  "use strict";

  var HFM_API = "https://api-production-89e0.up.railway.app";
  var SESSION_KEY = "hfm-admin-token";

  var subs = []; // current list, loaded from the API
  var token = sessionStorage.getItem(SESSION_KEY) || "";

  /* ---------- API helpers ---------- */
  function api(path, options) {
    options = options || {};
    options.headers = Object.assign(
      { "Content-Type": "application/json", Authorization: "Bearer " + token },
      options.headers || {}
    );
    return fetch(HFM_API + path, options).then(function (res) {
      if (res.status === 401) throw new Error("unauthorized");
      return res.json();
    });
  }

  function loadSubscribers() {
    return api("/api/subscribers").then(function (data) {
      subs = data.subscribers || [];
    });
  }

  /* ---------- Gate ---------- */
  var gate = document.getElementById("gate");
  var dash = document.getElementById("dash");
  var gateForm = document.getElementById("gateForm");
  var gateErr = document.getElementById("gateErr");
  var gateBtn = gateForm.querySelector('button[type="submit"]');

  function unlock() {
    gate.hidden = true;
    dash.hidden = false;
    render();
  }

  function tryUnlock(code, silent) {
    token = code;
    gateErr.style.color = "";
    if (!silent) {
      gateErr.style.color = "var(--ink-soft, #667)";
      gateErr.textContent = "Checking\u2026";
      if (gateBtn) gateBtn.disabled = true;
    } else {
      gateErr.textContent = "";
    }
    return loadSubscribers()
      .then(function () {
        sessionStorage.setItem(SESSION_KEY, token);
        if (gateBtn) gateBtn.disabled = false;
        unlock();
      })
      .catch(function (err) {
        token = "";
        sessionStorage.removeItem(SESSION_KEY);
        if (gateBtn) gateBtn.disabled = false;
        gateErr.style.color = "";
        if (silent) {
          gateErr.textContent = ""; // stale saved login — just show a clean gate
          return;
        }
        gateErr.textContent =
          err.message === "unauthorized"
            ? "That passcode isn't right — try again."
            : "Couldn't reach the server — check your connection and try again.";
      });
  }

  // Try any saved login silently; if it's stale/wrong, clear it without a scary error.
  if (token) tryUnlock(token, true);

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    tryUnlock(document.getElementById("gateCode").value.trim());
  });

  document.getElementById("lockBtn").addEventListener("click", function () {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  /* ---------- Rendering ---------- */
  var rowsEl = document.getElementById("subRows");
  var tableEl = document.getElementById("subTable");
  var emptyEl = document.getElementById("emptyState");
  var searchBox = document.getElementById("searchBox");

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var q = (searchBox.value || "").toLowerCase().trim();
    var view = subs.filter(function (s) {
      return !q || (s.name || "").toLowerCase().indexOf(q) !== -1 || s.email.toLowerCase().indexOf(q) !== -1;
    });

    document.getElementById("statTotal").textContent = subs.length;
    var now = new Date();
    var monthPrefix = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    document.getElementById("statMonth").textContent = subs.filter(function (s) {
      return (s.date || "").indexOf(monthPrefix) === 0;
    }).length;

    if (subs.length === 0) {
      emptyEl.hidden = false;
      tableEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    tableEl.hidden = false;

    rowsEl.innerHTML = view
      .map(function (s) {
        var srcClass = s.source === "website" ? "" : " manual";
        return (
          "<tr>" +
          "<td>" + escapeHtml(s.name || "\u2014") + "</td>" +
          "<td>" + escapeHtml(s.email) + "</td>" +
          "<td>" + escapeHtml(s.date || "\u2014") + "</td>" +
          '<td><span class="src-chip' + srcClass + '">' + escapeHtml(s.source || "manual") + "</span></td>" +
          '<td><button class="del-btn" data-email="' + escapeHtml(s.email) + '" title="Remove">&#10005;</button></td>' +
          "</tr>"
        );
      })
      .join("");
    if (view.length === 0) {
      rowsEl.innerHTML = '<tr><td colspan="5" style="color:var(--ink-soft)">No matches for that search.</td></tr>';
    }
  }

  searchBox.addEventListener("input", render);

  rowsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".del-btn");
    if (!btn) return;
    var email = btn.getAttribute("data-email");
    if (!confirm("Remove " + email + " from the list?")) return;
    api("/api/subscribers/" + encodeURIComponent(email), { method: "DELETE" })
      .then(loadSubscribers)
      .then(render)
      .catch(function () { alert("Couldn't remove that subscriber — please try again."); });
  });

  /* ---------- Add ---------- */
  function addSubscriber(name, email) {
    return api("/api/subscribers", {
      method: "POST",
      body: JSON.stringify({ name: name, email: email })
    });
  }

  document.getElementById("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var nameEl = document.getElementById("addName");
    var emailEl = document.getElementById("addEmail");
    var email = emailEl.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    addSubscriber(nameEl.value.trim(), email)
      .then(function (data) {
        if (data.duplicate) alert(email + " is already on the list.");
        nameEl.value = "";
        emailEl.value = "";
        return loadSubscribers();
      })
      .then(render)
      .catch(function () { alert("Couldn't add that subscriber — please try again."); });
  });

  /* ---------- Import ---------- */
  var importPanel = document.getElementById("importPanel");
  document.getElementById("importBtn").addEventListener("click", function () {
    importPanel.hidden = !importPanel.hidden;
  });
  document.getElementById("importCancel").addEventListener("click", function () {
    importPanel.hidden = true;
    document.getElementById("importText").value = "";
    document.getElementById("importResult").textContent = "";
  });
  document.getElementById("importGo").addEventListener("click", function () {
    var lines = document.getElementById("importText").value.split(/\r?\n/);
    var entries = [];
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split(",").map(function (p) { return p.trim().replace(/^"|"$/g, ""); });
      var emailPart = parts.find(function (p) { return p.indexOf("@") !== -1; });
      if (!emailPart) return;
      entries.push({
        email: emailPart,
        name: parts.filter(function (p) { return p !== emailPart; }).join(" ").trim()
      });
    });

    var added = 0, skipped = lines.filter(function (l) { return l.trim(); }).length - entries.length;
    var chain = Promise.resolve();
    entries.forEach(function (entry) {
      chain = chain.then(function () {
        return addSubscriber(entry.name, entry.email)
          .then(function (data) { if (data.duplicate) skipped++; else added++; })
          .catch(function () { skipped++; });
      });
    });
    chain
      .then(loadSubscribers)
      .then(function () {
        render();
        document.getElementById("importResult").textContent =
          "Added " + added + (skipped ? " \u00b7 skipped " + skipped + " (invalid or duplicate)" : "");
        if (added > 0) document.getElementById("importText").value = "";
      });
  });

  /* ---------- Export CSV ---------- */
  document.getElementById("exportBtn").addEventListener("click", function () {
    if (subs.length === 0) { alert("The list is empty — nothing to export yet."); return; }
    var rows = [["Name", "Email", "Date Added", "Source"]].concat(
      subs.map(function (s) { return [s.name || "", s.email, s.date || "", s.source || ""]; })
    );
    var csv = rows
      .map(function (r) {
        return r.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(",");
      })
      .join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hfm-email-list-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- Copy all emails ---------- */
  document.getElementById("copyBtn").addEventListener("click", function () {
    if (subs.length === 0) { alert("The list is empty — nothing to copy yet."); return; }
    var all = subs.map(function (s) { return s.email; }).join("; ");
    navigator.clipboard.writeText(all).then(
      function () { alert("Copied " + subs.length + " email address(es) to the clipboard."); },
      function () { prompt("Copy the addresses below:", all); }
    );
  });

  /* ---------- Email everyone ---------- */
  document.getElementById("emailAllBtn").addEventListener("click", function () {
    if (subs.length === 0) { alert("The list is empty — no one to email yet."); return; }
    var bcc = subs.map(function (s) { return s.email; }).join(";");
    // BCC keeps subscribers' addresses private from each other
    var href = "mailto:historyfamilyandme@outlook.com?bcc=" + encodeURIComponent(bcc) +
      "&subject=" + encodeURIComponent("News from History, Family, and Me");
    if (href.length > 1800) {
      alert("The list is getting long for a mail link — use Copy All Emails and paste into the BCC field instead.");
      return;
    }
    window.location.href = href;
  });
})();
