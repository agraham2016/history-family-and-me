/* ===========================================================
   Admin Portal — subscriber list manager
   Data lives in this browser's localStorage under "hfm-subscribers".
   =========================================================== */
(function () {
  "use strict";

  var PASSCODE = "family2026"; // shared with Anna — change here anytime
  var STORAGE_KEY = "hfm-subscribers";
  var SESSION_KEY = "hfm-admin-unlocked";

  /* ---------- State ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  var subs = load();

  /* ---------- Gate ---------- */
  var gate = document.getElementById("gate");
  var dash = document.getElementById("dash");
  var gateForm = document.getElementById("gateForm");
  var gateErr = document.getElementById("gateErr");

  function unlock() {
    gate.hidden = true;
    dash.hidden = false;
    render();
  }

  if (sessionStorage.getItem(SESSION_KEY) === "1") unlock();

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var code = document.getElementById("gateCode").value;
    if (code === PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      gateErr.textContent = "";
      unlock();
    } else {
      gateErr.textContent = "That passcode isn't right — try again.";
    }
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

    // stats
    document.getElementById("statTotal").textContent = subs.length;
    var now = new Date();
    var monthPrefix = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    document.getElementById("statMonth").textContent = subs.filter(function (s) {
      return (s.date || "").indexOf(monthPrefix) === 0;
    }).length;

    // table
    if (subs.length === 0) {
      emptyEl.hidden = false;
      tableEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    tableEl.hidden = false;

    rowsEl.innerHTML = view
      .map(function (s, i) {
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
    subs = subs.filter(function (s) { return s.email !== email; });
    save(subs);
    render();
  });

  /* ---------- Add ---------- */
  function addSubscriber(name, email, source) {
    email = (email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (subs.some(function (s) { return s.email.toLowerCase() === email.toLowerCase(); })) return false;
    subs.push({
      name: (name || "").trim(),
      email: email,
      date: new Date().toISOString().slice(0, 10),
      source: source || "manual"
    });
    return true;
  }

  document.getElementById("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var nameEl = document.getElementById("addName");
    var emailEl = document.getElementById("addEmail");
    if (addSubscriber(nameEl.value, emailEl.value, "manual")) {
      save(subs);
      nameEl.value = "";
      emailEl.value = "";
      render();
    } else {
      alert("Please enter a valid email address that isn't already on the list.");
    }
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
    var added = 0, skipped = 0;
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var name = "", email = "";
      // formats: "email" | "name, email" | "email, name" | CSV row
      var parts = line.split(",").map(function (p) { return p.trim().replace(/^"|"$/g, ""); });
      var emailPart = parts.find(function (p) { return p.indexOf("@") !== -1; });
      if (!emailPart) { skipped++; return; }
      email = emailPart;
      name = parts.filter(function (p) { return p !== emailPart; }).join(" ").trim();
      if (addSubscriber(name, email, "manual")) added++;
      else skipped++;
    });
    save(subs);
    render();
    document.getElementById("importResult").textContent =
      "Added " + added + (skipped ? " \u00b7 skipped " + skipped + " (invalid or duplicate)" : "");
    if (added > 0) document.getElementById("importText").value = "";
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
