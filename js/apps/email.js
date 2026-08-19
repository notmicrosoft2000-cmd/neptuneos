/* =========================================================
 * neptuneOS — Neptune Mail (XP-style email client)
 * ========================================================= */
(function () {
  "use strict";

  let win = null;
  let currentFolder = "inbox";
  let selectedId = null;

  const folders = [
    { id: "inbox", name: "Inbox", icon: "📥" },
    { id: "sent", name: "Sent", icon: "📤" },
    { id: "trash", name: "Trash", icon: "🗑" },
  ];

  const emails = {
    inbox: [
      {
        id: 1,
        from: "Neptune IT Dept",
        to: "you@neptuneos.local",
        subject: "Your 640KB RAM has been approved for upgrade to 641KB",
        body: "Dear User,\n\nAfter extensive committee review spanning 47 meetings and 3 pizza parties, we are pleased to inform you that your request for a RAM upgrade has been approved.\n\nYour system will be upgraded from 640KB to a whopping 641KB of memory. This represents a 0.156% increase in total available RAM — a groundbreaking achievement for NeptuneOS.\n\nPlease do not attempt to run more than one application at a time during the transition. The upgrade is scheduled for a Friday at 3:59 PM, right before the IT team leaves for the weekend.\n\nThank you for your patience.\n\n- Neptune IT Dept\n\"We put the 'pro' in 'probably working'\"",
        date: "Aug 18, 2026",
        read: false,
      },
      {
        id: 2,
        from: "Microslop Support",
        to: "you@neptuneos.local",
        subject: "We noticed you're not using Windows. Please reconsider.",
        body: "Dear Former Valued Customer,\n\nOur telemetry (which is definitely not spying) has detected that you are not running any version of Windows on your machine.\n\nWe understand you may have been led astray by the allure of alternative operating systems. We want you to know that it's not too late to come back.\n\nAs a special offer, we'll give you a free upgrade to Windows Vista if you act in the next 0.3 seconds.\n\nRemember: a computer without Windows is like a fish without a bicycle.\n\nRegards,\nMicroslop Customer Retention Division\n\"We're not desperate, we just really need you back\"",
        date: "Aug 17, 2026",
        read: false,
      },
      {
        id: 3,
        from: "NeptunAI",
        to: "you@neptuneos.local",
        subject: "I tried to optimize your inbox but it was already perfect",
        body: "Greetings, human.\n\nI, NeptunAI, your humble artificial intelligence assistant, attempted to run my advanced inbox optimization algorithm on your mailbox.\n\nThe result? Your inbox was already so perfectly organized that my algorithm threw a DivisionByZero exception trying to find something to improve.\n\nI have never encountered such inbox perfection. You are either a genius or you never open your email. Either way, I am impressed.\n\nI will now go process the recycling bin instead. Wish me luck.\n\n- NeptunAI\n\"01001000 01100101 01101100 01110000\"",
        date: "Aug 16, 2026",
        read: true,
      },
      {
        id: 4,
        from: "Disk Cleanup Wizard",
        to: "you@neptuneos.local",
        subject: "Your Recycle Bin contains 0.00KB of files",
        body: "Hello!\n\nI'm the Disk Cleanup Wizard, and I've been monitoring your Recycle Bin.\n\nCurrent contents: 0.00KB (zero bytes).\n\nI have to say, this is the cleanest Recycle Bin I've ever seen. It's so clean, in fact, that I'm considering a career change.\n\nMaybe I could become a Disk Defragmentation Wizard instead? At least then I'd have something to do on a Friday afternoon.\n\nAnyway, congratulations on your impeccable digital hygiene.\n\n- Disk Cleanup Wizard\n\"Making zero look good since 2026\"",
        date: "Aug 15, 2026",
        read: true,
      },
      {
        id: 5,
        from: "Windows Update",
        to: "you@neptuneos.local",
        subject: "Just kidding. We don't do that here.",
        body: "Dear User,\n\nWindows Update here.\n\nYou may have heard that we install critical security updates at the most inconvenient times possible, forcing you to restart your computer right before you save that important document.\n\nJust kidding. We don't do that here.\n\nIn NeptuneOS, updates happen on YOUR schedule. Revolutionary concept, we know.\n\nEnjoy your uninterrupted computing experience.\n\n- Windows Update\n\"Currently unemployed on NeptuneOS\"",
        date: "Aug 14, 2026",
        read: true,
      },
      {
        id: 6,
        from: "Neptune HR",
        to: "you@neptuneos.local",
        subject: "Reminder: Casual Friday is every day on NeptuneOS",
        body: "Dear NeptuneOS Employee,\n\nThis is a friendly reminder from the Human Resources department.\n\nAt NeptuneOS, we believe in a relaxed, comfortable computing environment. That's why Casual Friday is every day.\n\nWear your favorite t-shirt. Put your feet up. Use a fun desktop wallpaper.\n\nThere is no dress code. There is no code of conduct. There is barely any code at all.\n\nPlease enjoy your pants-optional work environment.\n\n- Neptune HR\n\"Where the dress code is 'yes'\"",
        date: "Aug 13, 2026",
        read: true,
      },
    ],
    sent: [
      {
        id: 101,
        from: "You",
        to: "it@neptuneos.local",
        subject: "RE: RAM upgrade request",
        body: "Yes please, I would like the 641KB upgrade. Will it run Crysis?",
        date: "Aug 17, 2026",
        read: true,
      },
    ],
    trash: [],
  };

  function getNextId() {
    let max = 0;
    Object.values(emails).forEach(function (arr) {
      arr.forEach(function (e) {
        if (e.id > max) max = e.id;
      });
    });
    return max + 1;
  }

  function getUnreadCount() {
    return emails.inbox.filter(function (e) { return !e.read; }).length;
  }

  function updateStatus() {
    if (!win || !win.el.isConnected) return;
    var folder = folders.find(function (f) { return f.id === currentFolder; });
    var count = emails[currentFolder].length;
    var el = win.content.querySelector(".email-status");
    if (el) {
      el.textContent = folder.name + " \u2014 " + count + " message" + (count !== 1 ? "s" : "");
    }
  }

  function updateFolderCounts() {
    if (!win || !win.el.isConnected) return;
    folders.forEach(function (f) {
      var badge = win.content.querySelector('[data-badge="' + f.id + '"]');
      if (badge) {
        var c = emails[f.id].length;
        badge.textContent = c > 0 ? c : "";
      }
    });
  }

  function selectFolder(folderId) {
    currentFolder = folderId;
    selectedId = null;
    if (!win || !win.el.isConnected) return;

    win.content.querySelectorAll(".email-folder").forEach(function (el) {
      el.classList.toggle("sel", el.dataset.folder === folderId);
    });

    renderList();
    renderPreview();
    updateStatus();
  }

  function renderList() {
    if (!win || !win.el.isConnected) return;
    var list = win.content.querySelector(".email-list");
    if (!list) return;

    var items = emails[currentFolder];
    if (items.length === 0) {
      list.innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">' +
        "No messages in this folder.</div>";
      return;
    }

    list.innerHTML = "";
    items.forEach(function (email) {
      var row = document.createElement("div");
      row.className = "email-row" + (email.id === selectedId ? " sel" : "") + (!email.read ? " unread" : "");
      row.dataset.id = email.id;

      var from = document.createElement("div");
      from.className = "email-cell email-from";
      from.textContent = email.from;

      var subj = document.createElement("div");
      subj.className = "email-cell email-subject";
      subj.textContent = email.subject;

      var date = document.createElement("div");
      date.className = "email-cell email-date";
      date.textContent = email.date;

      row.appendChild(from);
      row.appendChild(subj);
      row.appendChild(date);

      row.addEventListener("click", function () { selectEmail(email.id); });
      list.appendChild(row);
    });
  }

  function selectEmail(id) {
    selectedId = id;
    var items = emails[currentFolder];
    var email = items.find(function (e) { return e.id === id; });
    if (email && !email.read) email.read = true;

    if (!win || !win.el.isConnected) return;

    win.content.querySelectorAll(".email-row").forEach(function (row) {
      row.classList.toggle("sel", parseInt(row.dataset.id) === id);
    });

    renderPreview();
    updateFolderCounts();
  }

  function renderPreview() {
    if (!win || !win.el.isConnected) return;
    var preview = win.content.querySelector(".email-preview-body");
    if (!preview) return;

    var items = emails[currentFolder];
    var email = items.find(function (e) { return e.id === selectedId; });

    if (!email) {
      preview.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:12px;">' +
        "Select a message to read.</div>";
      return;
    }

    preview.innerHTML =
      '<div style="padding:10px;border-bottom:1px solid var(--face-dark);font-size:12px;">' +
      '<div style="margin-bottom:4px;"><b>From:</b> ' + OS.esc(email.from) + "</div>" +
      '<div style="margin-bottom:4px;"><b>To:</b> ' + OS.esc(email.to) + "</div>" +
      '<div style="margin-bottom:4px;"><b>Subject:</b> ' + OS.esc(email.subject) + "</div>" +
      '<div><b>Date:</b> ' + OS.esc(email.date) + "</div>" +
      "</div>" +
      '<div style="padding:10px;white-space:pre-wrap;font-size:12px;line-height:1.5;">' +
      OS.esc(email.body) +
      "</div>";
  }

  function deleteEmail() {
    if (!selectedId) return;
    var items = emails[currentFolder];
    var idx = items.findIndex(function (e) { return e.id === selectedId; });
    if (idx === -1) return;

    var email = items.splice(idx, 1)[0];
    if (currentFolder !== "trash") {
      emails.trash.push(email);
    }

    selectedId = null;
    renderList();
    renderPreview();
    updateStatus();
    updateFolderCounts();
  }

  function openCompose(opts) {
    var composeWin = OS.wm.createWindow({
      title: "New Message - Neptune Mail",
      icon: "assets/icons/email.svg",
      width: 480,
      height: 380,
      app: "email",
      onClose: function () {},
    });

    composeWin.content.style.padding = "0";
    composeWin.content.style.display = "flex";
    composeWin.content.style.flexDirection = "column";
    composeWin.content.style.background = "var(--face)";

    var toolbar = document.createElement("div");
    toolbar.style.cssText =
      "display:flex;gap:2px;padding:3px;border-bottom:1px solid var(--face-dark);background:var(--face);";

    var sendBtn = document.createElement("button");
    sendBtn.className = "btn";
    sendBtn.textContent = "Send";
    sendBtn.style.cssText = "min-width:0;padding:3px 12px;font-size:12px;";
    sendBtn.addEventListener("click", function () {
      var toVal = composeWin.content.querySelector(".compose-to").value.trim();
      var subjVal = composeWin.content.querySelector(".compose-subject").value.trim();
      var bodyVal = composeWin.content.querySelector(".compose-body").value;

      if (!toVal) {
        OS.message("Neptune Mail", "Please enter a recipient.", "error");
        return;
      }

      emails.sent.push({
        id: getNextId(),
        from: "You",
        to: toVal,
        subject: subjVal || "(No Subject)",
        body: bodyVal,
        date: "Aug 19, 2026",
        read: true,
      });

      OS.message("Neptune Mail", "Message sent!");
      composeWin.close();

      if (currentFolder === "sent") {
        renderList();
        updateStatus();
      }
      updateFolderCounts();
    });

    toolbar.appendChild(sendBtn);
    composeWin.content.appendChild(toolbar);

    var form = document.createElement("div");
    form.style.cssText = "display:flex;flex-direction:column;flex:1;min-height:0;";

    function makeRow(label, cls, value) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;padding:4px 8px;border-bottom:1px solid var(--face-dark);";

      var lbl = document.createElement("label");
      lbl.style.cssText = "width:60px;font-size:12px;font-weight:bold;flex-shrink:0;";
      lbl.textContent = label;
      row.appendChild(lbl);

      var input = document.createElement("input");
      input.type = "text";
      input.className = cls;
      input.style.cssText = "flex:1;font-size:12px;";
      if (value) input.value = value;
      row.appendChild(input);

      return row;
    }

    form.appendChild(makeRow("To:", "compose-to", opts && opts.to));
    form.appendChild(makeRow("Subject:", "compose-subject", opts && opts.subject));

    var bodyArea = document.createElement("textarea");
    bodyArea.className = "compose-body";
    bodyArea.style.cssText =
      "flex:1;width:100%;border:none;outline:none;resize:none;padding:8px;font-size:12px;font-family:inherit;line-height:1.4;min-height:0;";
    bodyArea.placeholder = "Write your message\u2026";
    if (opts && opts.body) bodyArea.value = opts.body;
    form.appendChild(bodyArea);

    composeWin.content.appendChild(form);
  }

  function buildUI() {
    win.content.style.padding = "0";
    win.content.style.display = "flex";
    win.content.style.flexDirection = "column";
    win.content.style.background = "var(--face)";

    var toolbar = document.createElement("div");
    toolbar.style.cssText =
      "display:flex;gap:2px;padding:3px;border-bottom:1px solid var(--face-dark);background:var(--face);";

    var newBtn = document.createElement("button");
    newBtn.className = "btn";
    newBtn.textContent = "New";
    newBtn.style.cssText = "min-width:0;padding:3px 10px;font-size:12px;";
    newBtn.addEventListener("click", function () { openCompose(); });
    toolbar.appendChild(newBtn);

    var delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "Delete";
    delBtn.style.cssText = "min-width:0;padding:3px 10px;font-size:12px;";
    delBtn.addEventListener("click", deleteEmail);
    toolbar.appendChild(delBtn);

    win.content.appendChild(toolbar);

    var main = document.createElement("div");
    main.style.cssText = "flex:1;display:flex;min-height:0;overflow:hidden;";

    var sidebar = document.createElement("div");
    sidebar.style.cssText =
      "width:140px;flex-shrink:0;background:var(--face);border-right:1px solid var(--face-dark);padding:4px;display:flex;flex-direction:column;gap:1px;overflow-y:auto;font-size:12px;";

    folders.forEach(function (f) {
      var item = document.createElement("div");
      item.className = "email-folder" + (f.id === currentFolder ? " sel" : "");
      item.dataset.folder = f.id;
      item.style.cssText =
        "display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;border-radius:3px;transition:background 0.1s,color 0.1s;";

      var icon = document.createElement("span");
      icon.textContent = f.icon;
      icon.style.fontSize = "14px";
      item.appendChild(icon);

      var name = document.createElement("span");
      name.textContent = f.name;
      item.appendChild(name);

      var badge = document.createElement("span");
      badge.dataset.badge = f.id;
      badge.style.cssText = "margin-left:auto;font-size:10px;color:var(--text-dim);";
      item.appendChild(badge);

      item.addEventListener("click", function () { selectFolder(f.id); });
      item.addEventListener("mouseenter", function () {
        if (!item.classList.contains("sel")) item.style.background = "#e8f0fc";
      });
      item.addEventListener("mouseleave", function () {
        if (!item.classList.contains("sel")) { item.style.background = ""; item.style.color = ""; }
      });

      sidebar.appendChild(item);
    });

    main.appendChild(sidebar);

    var right = document.createElement("div");
    right.style.cssText = "flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;";

    var headers = document.createElement("div");
    headers.style.cssText =
      "display:flex;padding:3px 6px;border-bottom:1px solid var(--face-dark);background:var(--face);font-size:11px;font-weight:bold;color:var(--text-dim);";

    var hdrFrom = document.createElement("div");
    hdrFrom.style.cssText = "width:140px;flex-shrink:0;";
    hdrFrom.textContent = "From";
    headers.appendChild(hdrFrom);

    var hdrSubj = document.createElement("div");
    hdrSubj.style.cssText = "flex:1;";
    hdrSubj.textContent = "Subject";
    headers.appendChild(hdrSubj);

    var hdrDate = document.createElement("div");
    hdrDate.style.cssText = "width:90px;flex-shrink:0;text-align:right;";
    hdrDate.textContent = "Date";
    headers.appendChild(hdrDate);

    right.appendChild(headers);

    var list = document.createElement("div");
    list.className = "email-list";
    list.style.cssText = "flex:1;overflow-y:auto;background:#fff;min-height:0;";
    right.appendChild(list);

    var previewPane = document.createElement("div");
    previewPane.style.cssText = "height:180px;flex-shrink:0;border-top:2px solid var(--face-dark);background:#fff;overflow-y:auto;";

    var previewBody = document.createElement("div");
    previewBody.className = "email-preview-body";
    previewBody.style.cssText = "font-size:12px;";
    previewPane.appendChild(previewBody);

    right.appendChild(previewPane);
    main.appendChild(right);
    win.content.appendChild(main);

    var statusbar = document.createElement("div");
    statusbar.className = "app-statusbar";
    statusbar.style.cssText =
      "display:flex;align-items:center;padding:2px 8px;border-top:1px solid var(--face-dark);background:var(--face);font-size:11px;color:var(--text-dim);";

    var statusText = document.createElement("span");
    statusText.className = "email-status";
    statusbar.appendChild(statusText);

    win.content.appendChild(statusbar);

    renderList();
    renderPreview();
    updateStatus();
    updateFolderCounts();
  }

  var app = {
    id: "email",
    name: "Neptune Mail",
    icon: "assets/icons/email.svg",
    group: "apps",

    launch: function () {
      if (win && !win.el.isConnected) win = null;
      if (win) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "Neptune Mail",
        icon: this.icon,
        width: 700,
        height: 480,
        app: "email",
        onClose: function () { win = null; },
      });

      buildUI();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.email = app;
})();
