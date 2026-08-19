/* =========================================================
 * NeptuneOS — Disk Cleanup
 * Scans VFS, shows space usage, lets you delete junk.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var styleEl = null;

  var JUNK_DIRS = [
    { path: "/C:/Windows/Temp", label: "Temporary Files", desc: "Leftover temp data from apps" },
    { path: "/C:/Windows/Prefetch", label: "Prefetch Cache", desc: "Application launch cache" },
    { path: "/C:/Users/Guest/AppData/Local/Temp", label: "User Temp Files", desc: "Per-user temporary files" },
    { path: "/C:/Users/Guest/Downloads", label: "Downloads Folder", desc: "Downloaded installers and files" },
    { path: "/C:/Recycle Bin", label: "Recycle Bin", desc: "Deleted files awaiting purge" },
  ];

  function scanVFS() {
    var results = [];
    var totalUsed = 0;
    var totalFiles = 0;
    JUNK_DIRS.forEach(function (d) {
      var size = 0;
      var files = 0;
      if (OS.fs && OS.fs.readdir) {
        var children = OS.fs.readdir(d.path) || [];
        children.forEach(function (c) {
          files++;
          if (OS.fs.stat) {
            var cst = OS.fs.stat(d.path + "/" + c);
            size += (cst && cst.size) || 0;
          }
        });
      }
      if (files === 0) { size = Math.floor(Math.random() * 8192) + 1024; files = Math.floor(Math.random() * 12) + 1; }
      results.push({ path: d.path, label: d.label, desc: d.desc, size: size, files: files });
      totalUsed += size;
      totalFiles += files;
    });
    var totalSize = 524288000;
    return { results: results, totalUsed: totalUsed, totalFiles: totalFiles, totalSize: totalSize };
  }

  function fmtSize(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
    return bytes + " B";
  }

  function renderScan() {
    var data = scanVFS();
    var c = win.content.querySelector("#dc-content");
    if (!c) return;
    var usedPct = Math.round((data.totalUsed / data.totalSize) * 100) || 0;
    var barColor = usedPct > 80 ? "#f38ba8" : usedPct > 50 ? "#f9e2af" : "#a6e3a1";

    var html = '<div class="dc-header">' +
      '<div class="dc-disk-icon">F</div>' +
      '<div class="dc-disk-info">' +
      '<div class="dc-disk-label">Local Disk (C:)</div>' +
      '<div class="dc-bar"><div class="dc-bar-fill" style="width:' + usedPct + '%;background:' + barColor + ';"></div></div>' +
      '<div class="dc-disk-stat">' + fmtSize(data.totalUsed) + ' used of ' + fmtSize(data.totalSize) + ' (' + usedPct + '%)</div>' +
      '</div></div>';

    html += '<div class="dc-section-title">Items to clean up (' + data.totalFiles + ' files found)</div>';

    var totalCleanable = 0;
    data.results.forEach(function (r) { totalCleanable += r.size; });

    data.results.forEach(function (r) {
      var pct = data.totalUsed > 0 ? Math.round((r.size / data.totalUsed) * 100) : 0;
      html += '<div class="dc-item">' +
        '<label class="dc-check"><input type="checkbox" checked data-path="' + r.path + '"> ' + r.label + '</label>' +
        '<div class="dc-item-desc">' + r.desc + '</div>' +
        '<div class="dc-item-info">' + r.files + ' files | ' + fmtSize(r.size) + ' (' + pct + '%)</div>' +
        '</div>';
    });

    html += '<div class="dc-footer">' +
      '<div class="dc-total-clean">Total: ' + fmtSize(totalCleanable) + ' cleanable</div>' +
      '<button class="btn dc-clean-btn" style="padding:8px 28px;font-size:13px;">Clean Selected</button>' +
      '</div>';

    c.innerHTML = html;

    c.querySelector(".dc-clean-btn").addEventListener("click", function () {
      var checkboxes = c.querySelectorAll('input[type="checkbox"]:checked');
      var cleaned = 0;
      var files = 0;
      checkboxes.forEach(function (cb) {
        var p = cb.dataset.path;
        data.results.forEach(function (r) {
          if (r.path === p) { cleaned += r.size; files += r.files; }
        });
      });
      if (cleaned > 0) {
        OS.sfx && OS.sfx.trash && OS.sfx.trash();
        OS.message && OS.message("Disk Cleanup", "Cleaned " + fmtSize(cleaned) + " (" + files + " files)", "info");
      } else {
        OS.message && OS.message("Disk Cleanup", "Nothing selected to clean.", "info");
      }
      renderScan();
    });
  }

  var app = {
    id: "diskcleanup",
    name: "Disk Cleanup",
    icon: "assets/icons/diskcleanup.svg",
    group: "system",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.textContent =
          "#dc-content{padding:16px;overflow:auto;height:100%;}" +
          ".dc-header{display:flex;gap:16px;align-items:center;margin-bottom:20px;padding:16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);}" +
          ".dc-disk-icon{font-size:28px;width:50px;height:50px;display:flex;align-items:center;justify-content:center;background:rgba(100,180,255,0.15);border-radius:8px;font-weight:bold;color:#89b4fa;}" +
          ".dc-disk-info{flex:1;}" +
          ".dc-disk-label{font-size:14px;font-weight:600;margin-bottom:6px;}" +
          ".dc-bar{height:14px;background:rgba(255,255,255,0.06);border-radius:7px;overflow:hidden;margin-bottom:4px;}" +
          ".dc-bar-fill{height:100%;border-radius:7px;transition:width 0.6s ease;}" +
          ".dc-disk-stat{font-size:11px;opacity:0.6;}" +
          ".dc-section-title{font-size:13px;font-weight:600;margin:8px 0 12px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);}" +
          ".dc-item{padding:10px 12px;margin-bottom:6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;transition:border-color 0.15s;}" +
          ".dc-item:hover{border-color:rgba(100,180,255,0.3);}" +
          ".dc-check{font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;}" +
          ".dc-check input{accent-color:#89b4fa;width:15px;height:15px;}" +
          ".dc-item-desc{font-size:11px;opacity:0.5;margin:4px 0 0 23px;}" +
          ".dc-item-info{font-size:11px;opacity:0.6;margin:2px 0 0 23px;font-family:Consolas,monospace;}" +
          ".dc-footer{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);}" +
          ".dc-total-clean{font-size:12px;opacity:0.7;}" +
          ".dc-clean-btn{background:rgba(100,180,255,0.2)!important;border-color:rgba(100,180,255,0.4)!important;color:inherit;cursor:pointer;transition:background 0.15s;}" +
          ".dc-clean-btn:hover{background:rgba(100,180,255,0.35)!important;}";
        document.head.appendChild(styleEl);
      }

      win = OS.wm.createWindow({
        title: "Disk Cleanup",
        icon: this.icon,
        width: 460,
        height: 420,
        resizable: true,
        app: "diskcleanup",
        onClose: function () { win = null; },
      });

      win.content.innerHTML = '<div id="dc-content" style="height:100%;overflow:auto;"></div>';
      renderScan();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.diskcleanup = app;
})();
