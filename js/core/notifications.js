/* =========================================================
 * neptuneOS — Notification Center
 * Click clock to see calendar + notifications panel.
 * ========================================================= */
(function () {
  "use strict";

  let panel = null;
  let notifications = [];
  const MAX_NOTIFS = 20;

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "notification-center";
    panel.style.cssText =
      "position:fixed;bottom:32px;right:4px;z-index:985;width:320px;" +
      "background:#fff;border:1px solid #aca899;border-radius:6px;" +
      "box-shadow:3px 3px 12px rgba(0,0,0,0.35);display:none;" +
      "font-size:12px;max-height:80vh;overflow:hidden;animation:nc-pop 0.15s ease-out;";
    document.body.appendChild(panel);
    return panel;
  }

  function toggle() {
    if (panel && panel.style.display !== "none") {
      hide();
    } else {
      show();
    }
  }

  function show() {
    const p = ensurePanel();
    render();
    p.style.display = "block";
    /* Close on outside click */
    setTimeout(function () {
      document.addEventListener("click", outsideClick, { once: true });
    }, 10);
  }

  function hide() {
    if (panel) panel.style.display = "none";
  }

  function outsideClick(e) {
    if (panel && !panel.contains(e.target) && !e.target.closest("#clock") && !e.target.closest("#tray")) {
      hide();
    } else if (panel && panel.style.display !== "none") {
      /* Re-register if click was inside panel */
      setTimeout(function () {
        document.addEventListener("click", outsideClick, { once: true });
      }, 10);
    }
  }

  function addNotification(title, body, icon) {
    notifications.unshift({
      title: title || "NeptuneOS",
      body: body || "",
      icon: icon || "assets/icons/neptuneos.svg",
      time: new Date(),
      read: false,
    });
    if (notifications.length > MAX_NOTIFS) notifications.pop();
    updateBadge();
  }

  function updateBadge() {
    const clock = document.getElementById("clock");
    if (!clock) return;
    const unread = notifications.filter(function (n) { return !n.read; }).length;
    let badge = clock.parentElement.querySelector(".nc-badge");
    if (unread > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "nc-badge";
        badge.style.cssText =
          "position:absolute;top:-4px;right:-4px;width:14px;height:14px;" +
          "background:#e74c3c;color:#fff;font-size:8px;border-radius:50%;" +
          "display:flex;align-items:center;justify-content:center;font-weight:bold;";
        clock.parentElement.style.position = "relative";
        clock.parentElement.appendChild(badge);
      }
      badge.textContent = unread > 9 ? "9+" : String(unread);
    } else if (badge) {
      badge.remove();
    }
  }

  function render() {
    const p = ensurePanel();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    let calHtml =
      '<div style="padding:12px;background:linear-gradient(180deg,#245edc,#1e62d0);color:#fff;">' +
      '<div style="font-size:15px;font-weight:bold;">' + monthNames[month] + " " + year + "</div>" +
      '<div style="font-size:11px;opacity:0.8;margin-top:2px;">' + dayNames.join("  ") + "</div></div>" +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;padding:8px;">';

    /* Empty cells before first day */
    for (let i = 0; i < firstDay; i++) {
      calHtml += '<div style="height:28px;"></div>';
    }
    /* Day cells */
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today;
      calHtml += '<div style="height:28px;display:flex;align-items:center;justify-content:center;' +
        'cursor:pointer;border-radius:4px;font-size:12px;' +
        (isToday ? "background:#316ac5;color:#fff;font-weight:bold;" : "transition:background 0.1s;") +
        '" class="nc-day" data-day="' + d + '">' + d + "</div>";
    }
    calHtml += "</div>";

    /* Notifications */
    calHtml += '<div style="padding:8px 12px;border-top:1px solid #eee;font-weight:bold;color:#333;">Notifications</div>';
    if (notifications.length === 0) {
      calHtml += '<div style="padding:12px;color:#999;text-align:center;">No notifications</div>';
    } else {
      calHtml += '<div style="max-height:200px;overflow-y:auto;">';
      notifications.forEach(function (n, i) {
        const timeStr = formatTime(n.time);
        calHtml += '<div class="nc-notif" data-idx="' + i + '" style="' +
          "padding:8px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;" +
          "transition:background 0.1s;" + (n.read ? "opacity:0.6;" : "") +
          '"><div style="display:flex;gap:8px;align-items:flex-start;">' +
          '<img src="' + n.icon + '" style="width:20px;height:20px;flex-shrink:0;">' +
          '<div style="flex:1;min-width:0;"><div style="font-weight:bold;font-size:11px;">' + OS.esc(n.title) + "</div>" +
          '<div style="font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + OS.esc(n.body) + "</div>" +
          '<div style="font-size:10px;color:#999;margin-top:2px;">' + timeStr + "</div></div></div></div>";
      });
      calHtml += "</div>";
    }

    /* Clear all button */
    if (notifications.length > 0) {
      calHtml += '<div style="padding:6px 12px;border-top:1px solid #eee;text-align:center;">' +
        '<button class="btn nc-clear-all" style="font-size:11px;">Clear All</button></div>';
    }

    p.innerHTML = calHtml;

    /* Event listeners */
    p.querySelectorAll(".nc-day").forEach(function (el) {
      el.addEventListener("click", function () {
        el.style.background = "#e0e0e0";
        setTimeout(function () { el.style.background = ""; }, 200);
      });
    });
    p.querySelectorAll(".nc-notif").forEach(function (el) {
      el.addEventListener("click", function () {
        const idx = parseInt(el.dataset.idx);
        if (notifications[idx]) {
          notifications[idx].read = true;
          updateBadge();
          render();
        }
      });
    });
    var clearBtn = p.querySelector(".nc-clear-all");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        notifications = [];
        updateBadge();
        render();
      });
    }
  }

  function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return date.toLocaleDateString();
  }

  /* Inject CSS */
  function injectStyles() {
    if (document.getElementById("nc-styles")) return;
    var style = document.createElement("style");
    style.id = "nc-styles";
    style.textContent =
      "@keyframes nc-pop{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}" +
      ".nc-day:hover{background:#e0e8f0 !important;}" +
      ".nc-notif:hover{background:#f5f5f5 !important;}";
    document.head.appendChild(style);
  }

  window.OS = window.OS || {};
  window.OS.notifications = {
    init: function () {
      injectStyles();
      /* Make clock clickable */
      var clockEl = document.getElementById("clock");
      if (clockEl) {
        clockEl.style.cursor = "pointer";
        clockEl.addEventListener("click", function (e) {
          e.stopPropagation();
          toggle();
        });
      }
    },
    add: addNotification,
    hide: hide,
    show: show,
    toggle: toggle,
    getCount: function () { return notifications.filter(function (n) { return !n.read; }).length; },
  };
})();
