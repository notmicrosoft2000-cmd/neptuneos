/* =========================================================
 * neptuneOS — Corporate Bloatware & Microslop Parody
 * Random nag screens, notifications, bloatware, and MS-style annoyances.
 * ========================================================= */
(function () {
  "use strict";

  const NAG_INTERVAL = 45000; /* 45 seconds between possible nags */
  const WATERMARK_KEY = "neptuneos.watermark";
  const BLOAT_INSTALLED_KEY = "neptuneos.bloat.installed";

  const BLOATWARE = [
    { name: "Microslop Teams", desc: "Stay connected with your team (you have no team)", icon: "🖥️" },
    { name: "OneDrive (Not Enough Space)", desc: "5GB free — 4.9GB already used by system files", icon: "☁️" },
    { name: "Bing Bar", desc: "Search the web slower than before!", icon: "🔍" },
    { name: "Microslop Copilot", desc: "AI that summarizes your error messages", icon: "🤖" },
    { name: "Candy Crush Saga", desc: "Pre-installed for your productivity", icon: "🍬" },
    { name: "Microslop Edge (Again)", desc: "Your default browser for your default browser", icon: "🌐" },
    { name: "LinkedIn Desktop", desc: "Professional networking, now on your desktop", icon: "💼" },
    { name: "3D Viewer", desc: "View 3D models you'll never create", icon: "🧊" },
    { name: "Microslop Solitaire Collection", desc: "Pay $9.99/month for premium card backs", icon: "🃏" },
    { name: "News Bar", desc: "Breaking: Your computer is fine. Click here anyway.", icon: "📰" },
  ];

  const NAG_MESSAGES = [
    { title: "Microslop Update", body: "Your computer needs to restart to install updates. Restart now? (Your 47 open tabs will be lost)", icon: "info" },
    { title: "Microslop Update", body: "Update available: Microslop Cumulative Update KB2600897 (Size: 2.4GB, Time remaining: 47 years)", icon: "info" },
    { title: "Activate NeptuneOS", body: "Your copy of NeptuneOS is not activated. Some features may be limited. Or not. We don't actually check.", icon: "warn" },
    { title: "OneDrive", body: "Your OneDrive is almost full! You have 0.3MB of 5GB remaining. Delete some memories to continue.", icon: "warn" },
    { title: "NeptunAI", body: "Hi! I'm NeptunAI, your intelligent assistant! I can help you... actually I can't do anything. But I'm here!", icon: "info" },
    { title: "Microslop Edge", body: "Did you know? Microslop Edge is the best browser for browsing... other browsers to download.", icon: "info" },
    { title: "Security Alert", body: "Windows Defender has blocked 0 threats today. You're welcome.", icon: "info" },
    { title: "Microslop Teams", body: "You have 0 unread messages. Nobody wants to talk to you. Want to schedule a meeting about it?", icon: "info" },
    { title: "Cortana... er, NeptunAI", body: "I noticed you haven't used me in a while. Actually, nobody has ever used me.", icon: "info" },
    { title: "System Update Required", body: "Microslop will now configure your desktop background to advertise our products. Just kidding... unless?", icon: "info" },
    { title: "Your PC health", body: "Your PC health is at 47%. This number was made up by our marketing team.", icon: "warn" },
    { title: "Recommended for you", body: "Based on your usage patterns, we recommend: Microslop 365, Microslop Edge, Microslop Teams, Microslop OneDrive, and a new computer.", icon: "info" },
  ];

  function installBloat() {
    if (localStorage.getItem(BLOAT_INSTALLED_KEY)) return;
    localStorage.setItem(BLOAT_INSTALLED_KEY, "true");

    /* Create fake files in the VFS */
    const bloatDir = "/C:/Program Files/Microslop Bloatware";
    OS.fs.mkdir(bloatDir);
    BLOATWARE.forEach((app) => {
      OS.fs.write(bloatDir + "/" + app.name.replace(/[^\w\s]/g, "") + ".exe", "This is definitely a real program. Trust us.");
    });
    OS.fs.write("/C:/Program Files/Microslop Bloatware/README.txt",
      "Thank you for choosing NeptuneOS!\n\n" +
      "The following bloatware has been pre-installed for your inconvenience:\n\n" +
      BLOATWARE.map((a) => "  - " + a.name + ": " + a.desc).join("\n") +
      "\n\nTo remove these programs, simply cry.\n" +
      "(Just kidding, there is no uninstaller.)"
    );
    OS.fs.write("/C:/Users/Guest/Desktop/Get Microslop Edge.lnk", "C:\\Program Files\\Microslop Bloatware\\Microslop Edge (Again).exe");
    OS.fs.write("/C:/Users/Guest/Desktop/Play Candy Crush.lnk", "C:\\Program Files\\Microslop Bloatware\\Candy Crush Saga.exe");
  }

  function showNag() {
    const msg = NAG_MESSAGES[Math.floor(Math.random() * NAG_MESSAGES.length)];
    OS.message(msg.title, msg.body, msg.icon);
  }

  function showActivateWatermark() {
    if (localStorage.getItem(WATERMARK_KEY) === "off") return;
    if (document.getElementById("activate-watermark")) return;
    const wm = document.createElement("div");
    wm.id = "activate-watermark";
    wm.style.cssText =
      "position:fixed;bottom:36px;right:12px;z-index:970;pointer-events:none;" +
      "color:rgba(255,255,255,0.55);font-size:11px;text-shadow:1px 1px 2px rgba(0,0,0,0.7);" +
      "font-family:Tahoma,sans-serif;line-height:1.4;text-align:right;";
    wm.innerHTML = "NeptuneOS<br>Build 2600<br>Activate NeptuneOS";
    document.body.appendChild(wm);
  }

  function showTeamsNotification() {
    if (Math.random() > 0.3) return; /* 30% chance */
    const notif = document.createElement("div");
    notif.style.cssText =
      "position:fixed;top:12px;right:12px;z-index:9999;background:#fff;border:1px solid #ccc;" +
      "border-radius:4px;box-shadow:2px 2px 8px rgba(0,0,0,0.3);padding:12px 16px;" +
      "font-family:Tahoma,sans-serif;font-size:12px;max-width:280px;animation:notif-slide 0.3s ease-out;";
    notif.innerHTML =
      '<div style="font-weight:bold;margin-bottom:4px;">🖥️ Microslop Teams</div>' +
      '<div style="color:#444;">No new messages. Want to start a meeting with yourself?</div>' +
      '<div style="margin-top:8px;text-align:right;">' +
      '<button class="btn" style="font-size:11px;padding:2px 8px;" onclick="this.closest(\'div[style]\').remove()">Dismiss</button>' +
      "</div>";
    document.body.appendChild(notif);
    setTimeout(() => { if (notif.isConnected) notif.remove(); }, 8000);
  }

  const bloat = {
    init() {
      installBloat();
      showActivateWatermark();

      /* Random nags */
      setTimeout(() => showNag(), 15000); /* first nag after 15s */
      setInterval(() => {
        if (Math.random() < 0.4) showNag(); /* 40% chance each interval */
      }, NAG_INTERVAL);

      /* Teams notification after 30s */
      setTimeout(() => showTeamsNotification(), 30000);
      setInterval(() => showTeamsNotification(), 120000); /* every 2 min */

      /* Add CSS for notif animation */
      const style = document.createElement("style");
      style.textContent = '@keyframes notif-slide{from{opacity:0;transform:translateY(-20px);}to{opacity:1;transform:translateY(0);}}';
      document.head.appendChild(style);
    },

    showNag,
    showTeamsNotification,

    uninstall() {
      localStorage.removeItem(BLOAT_INSTALLED_KEY);
      OS.message("Microslop Bloatware", "Just kidding! You can never get rid of us. ❤️ Microslop", "info");
    },
  };

  window.OS = window.OS || {};
  window.OS.bloat = bloat;
})();
