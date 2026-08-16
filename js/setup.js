/* =========================================================
 * NeptuneOS — Setup (OOBE) and Logon
 * First-boot experience: a Windows-style setup wizard that
 * walks through license, personalization, date/time and an
 * install step, then presents an XP-style logon screen on
 * subsequent boots.
 * ========================================================= */
(function () {
  "use strict";

  const K_DONE = "neptuneos.setup.done";
  const K_NAME = "neptuneos.setup.name";
  const K_COMPUTER = "neptuneos.setup.computer";
  const K_PASS = "neptuneos.setup.password";
  const K_TZ = "neptuneos.setup.tz";
  const K_LOGON = "neptuneos.setup.logon";

  const TIMEZONES = [
    { id: "pacific", label: "(GMT-08:00) Pacific Time", off: -480 },
    { id: "mountain", label: "(GMT-07:00) Mountain Time", off: -420 },
    { id: "central", label: "(GMT-06:00) Central Time", off: -360 },
    { id: "eastern", label: "(GMT-05:00) Eastern Time", off: -300 },
    { id: "atlantic", label: "(GMT-04:00) Atlantic Time", off: -240 },
    { id: "utc", label: "(GMT+00:00) Greenwich Mean Time", off: 0 },
    { id: "cet", label: "(GMT+01:00) Central European Time", off: 60 },
    { id: "eet", label: "(GMT+02:00) Eastern European Time", off: 120 },
    { id: "msk", label: "(GMT+03:00) Moscow Time", off: 180 },
    { id: "ist", label: "(GMT+05:30) India Standard Time", off: 330 },
    { id: "cst", label: "(GMT+08:00) China Standard Time", off: 480 },
    { id: "jst", label: "(GMT+09:00) Japan Standard Time", off: 540 },
    { id: "aest", label: "(GMT+10:00) Australian Eastern Time", off: 600 },
    { id: "nzst", label: "(GMT+12:00) New Zealand Standard Time", off: 720 },
  ];

  let overlay = null;
  let wizard = null;
  let logonEl = null;
  let step = 0;
  let cancelledThisSession = false;

  const setup = {
    launch() { startWizard(); },
    done() { return localStorage.getItem(K_DONE) === "1"; },
    userName() { return localStorage.getItem(K_NAME) || "Guest"; },
    computerName() { return localStorage.getItem(K_COMPUTER) || "NEPTUNE-1"; },
    hasPassword() { return !!localStorage.getItem(K_PASS); },
    verifyPassword(p) { return localStorage.getItem(K_PASS) === hash(p); },
    timeZoneOffset() {
      const id = localStorage.getItem(K_TZ);
      const tz = TIMEZONES.find((t) => t.id === id);
      return tz ? tz.off : 0;
    },
    logonEnabled() { return localStorage.getItem(K_LOGON) !== "0"; },
    setLogonEnabled(on) { localStorage.setItem(K_LOGON, on ? "1" : "0"); },
    resetSetup() {
      [K_DONE, K_NAME, K_COMPUTER, K_PASS, K_TZ].forEach((k) => localStorage.removeItem(k));
      cancelledThisSession = false;
    },
  };

  /* ---------------- helpers ---------------- */

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "h" + h;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------------- setup wizard ---------------- */

  const STEPS = ["welcome", "license", "personal", "datetime", "install", "complete"];
  const STEP_LABELS = {
    welcome: "Welcome",
    license: "License Agreement",
    personal: "Personalize",
    datetime: "Date and Time",
    install: "Setup Progress",
    complete: "Setup Complete",
  };

  function startWizard() {
    cancelledThisSession = false;
    if (overlay) overlay.remove();
    if (logonEl) logonEl.remove();
    logonEl = null;

    overlay = document.createElement("div");
    overlay.id = "setup-overlay";
    overlay.innerHTML =
      '<div class="setup-shell">' +
      '  <div class="setup-side">' +
      '    <div class="setup-side-brand"><img src="assets/icons/neptuneos.svg" alt="">' +
      "      <div><b>NeptuneOS</b><br>Setup Wizard</div></div>" +
      '    <div class="setup-steps"></div>' +
      "  </div>" +
      '  <div class="setup-main">' +
      '    <div class="setup-heading"></div>' +
      '    <div class="setup-content"></div>' +
      '    <div class="setup-actions">' +
      '      <button class="btn" id="setup-back">Back</button>' +
      '      <button class="btn" id="setup-next">Next &gt;</button>' +
      '      <button class="btn" id="setup-cancel">Cancel</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);

    wizard = overlay.querySelector(".setup-shell");
    renderSteps();
    step = 0;
    showStep();

    overlay.querySelector("#setup-back").addEventListener("click", () => {
      if (step > 0) { step--; showStep(); }
    });
    overlay.querySelector("#setup-next").addEventListener("click", () => {
      if (!validateStep()) return;
      if (step < STEPS.length - 1) { step++; showStep(); }
    });
    overlay.querySelector("#setup-cancel").addEventListener("click", cancelSetup);
  }

  function renderSteps() {
    const list = overlay.querySelector(".setup-steps");
    list.innerHTML = STEPS.map((s, i) =>
      '<div class="setup-step" data-step="' + i + '"><span>' + (i + 1) + "</span>" + esc(STEP_LABELS[s]) + "</div>"
    ).join("");
  }

  function markSteps() {
    overlay.querySelectorAll(".setup-step").forEach((el) => {
      const i = Number(el.dataset.step);
      el.classList.toggle("done", i < step);
      el.classList.toggle("current", i === step);
    });
  }

  function showStep() {
    markSteps();
    const content = overlay.querySelector(".setup-content");
    const heading = overlay.querySelector(".setup-heading");
    const back = overlay.querySelector("#setup-back");
    const next = overlay.querySelector("#setup-next");
    const cancel = overlay.querySelector("#setup-cancel");

    const id = STEPS[step];
    const label = STEP_LABELS[id];

    if (id === "install") {
      cancel.hidden = true;
      back.hidden = true;
      next.hidden = true;
      heading.innerHTML = "<h2>Welcome to NeptuneOS</h2><p>Setting up NeptuneOS on your computer&hellip;</p>";
      content.innerHTML =
        '<div class="setup-progress"><div class="setup-progress-bar"><div class="setup-progress-fill"></div></div>' +
        '<div class="setup-status">Preparing setup&hellip;</div></div>' +
        '<div class="setup-install-logo"><img src="assets/icons/neptuneos.svg" alt=""></div>';
      runInstall();
      return;
    }

    if (id === "complete") {
      cancel.hidden = true;
      back.hidden = true;
      next.hidden = true;
      heading.innerHTML = "<h2>Setup Complete</h2><p>Thank you for choosing NeptuneOS.</p>";
      content.innerHTML =
        '<div class="setup-done"><img src="assets/icons/neptuneos.svg" alt="">' +
        "<p><b>NeptuneOS is now installed.</b><br>Click Finish to log on and begin using your computer.</p></div>" +
        '<div class="setup-actions-fixed"><button class="btn btn-power" id="setup-finish">Finish</button></div>';
      content.querySelector("#setup-finish").addEventListener("click", finishSetup);
      return;
    }

    cancel.hidden = false;
    back.hidden = step === 0;
    next.hidden = false;
    next.textContent = step === STEPS.length - 2 ? "Install" : "Next &gt;";

    if (id === "welcome") {
      heading.innerHTML = "<h2>Welcome to NeptuneOS Setup</h2>";
      content.innerHTML =
        "<p>This program guides you through the installation of NeptuneOS on your computer.</p>" +
        "<p>During setup you will:</p>" +
        "<ul class=\"setup-list\">" +
        "<li>Review the NeptuneOS license agreement</li>" +
        "<li>Create your user account</li>" +
        "<li>Set your date and time zone</li>" +
        "</ul>" +
        '<p class="setup-note">To continue, click <b>Next</b>.</p>';
    } else if (id === "license") {
      heading.innerHTML = "<h2>License Agreement</h2>";
      content.innerHTML =
        '<div class="setup-eula">' +
        "NEPTUNEOS END USER LICENSE AGREEMENT\n\n" +
        "IMPORTANT — READ CAREFULLY. This End User License Agreement (\"Agreement\") is a legal agreement between you and Neptune Productions for the NeptuneOS desktop operating system software, which includes computer software and associated media (\"the Software\").\n\n" +
        "1. GRANT OF LICENSE. Neptune Productions grants you a non-exclusive, non-transferable license to use the Software on a single device.\n\n" +
        "2. RESERVATION OF RIGHTS. All rights not expressly granted are reserved by Neptune Productions. The Software is protected by copyright laws.\n\n" +
        "3. LIMITATIONS. You may not reverse engineer, decompile or disassemble the Software, except to the extent such activity is expressly permitted by applicable law.\n\n" +
        "4. NO WARRANTY. The Software is provided \"as is\" without warranty of any kind, either express or implied, including but not limited to the implied warranties of merchantability and fitness for a particular purpose.\n\n" +
        "5. TERMINATION. This Agreement is effective until terminated. Your rights under this Agreement terminate automatically if you fail to comply with any of its terms.\n\n" +
        "By accepting this agreement, you agree that your use of the Software is subject to these terms." +
        "</div>" +
        '<div class="setup-radio"><label><input type="radio" name="eula" value="accept"> I accept the agreement</label>' +
        '<label><input type="radio" name="eula" value="decline"> I decline the agreement</label></div>';
    } else if (id === "personal") {
      heading.innerHTML = "<h2>Personalize your software</h2>";
      content.innerHTML =
        '<div class="setup-form">' +
        '<label>Your name: <input id="setup-name" type="text" maxlength="32" placeholder="Guest"></label>' +
        '<label>Computer name: <input id="setup-computer" type="text" maxlength="15" value="NEPTUNE-1"></label>' +
        '<label>Password: <input id="setup-pass" type="password" autocomplete="new-password"></label>' +
        '<label>Confirm password: <input id="setup-pass2" type="password" autocomplete="new-password"></label>' +
        '<p class="setup-note">You will use this information to log on to NeptuneOS. A password is optional.</p>' +
        "</div>";
      const saved = localStorage.getItem(K_NAME);
      if (saved) overlay.querySelector("#setup-name").value = saved;
      const savedComp = localStorage.getItem(K_COMPUTER);
      if (savedComp) overlay.querySelector("#setup-computer").value = savedComp;
    } else if (id === "datetime") {
      const savedTz = localStorage.getItem(K_TZ);
      heading.innerHTML = "<h2>Date and Time</h2>";
      content.innerHTML =
        '<div class="setup-form">' +
        '<label>Time zone: <select id="setup-tz">' +
        TIMEZONES.map((t) => '<option value="' + t.id + '"' + (t.id === (savedTz || "eastern") ? " selected" : "") + ">" + esc(t.label) + "</option>").join("") +
        "</select></label>" +
        '<p class="setup-note">The system clock uses the time zone you choose. Current time in this zone:</p>' +
        '<div class="setup-clock" id="setup-clock">--:--</div>' +
        "</div>";
      const refreshClock = () => {
        const tz = TIMEZONES.find((t) => t.id === overlay.querySelector("#setup-tz").value);
        const t = new Date(Date.now() + (tz.off + new Date().getTimezoneOffset()) * 60000);
        overlay.querySelector("#setup-clock").textContent =
          String(t.getUTCHours()).padStart(2, "0") + ":" + String(t.getUTCMinutes()).padStart(2, "0") + ":" + String(t.getUTCSeconds()).padStart(2, "0");
      };
      refreshClock();
      setInterval(refreshClock, 1000);
    }

    overlay.querySelector("#setup-next").focus();
  }

  function validateStep() {
    const id = STEPS[step];
    if (id === "license") {
      const choice = overlay.querySelector('input[name="eula"]:checked');
      if (!choice) { OS.message("NeptuneOS Setup", "Please accept the license agreement to continue.", "error"); return false; }
      if (choice.value !== "accept") { OS.message("NeptuneOS Setup", "You must accept the license agreement to install NeptuneOS.", "error"); return false; }
    } else if (id === "personal") {
      const name = overlay.querySelector("#setup-name").value.trim();
      const computer = overlay.querySelector("#setup-computer").value.trim();
      const pass = overlay.querySelector("#setup-pass").value;
      const pass2 = overlay.querySelector("#setup-pass2").value;
      if (!name) { OS.message("NeptuneOS Setup", "Please enter your name.", "error"); return false; }
      if (!computer) { OS.message("NeptuneOS Setup", "Please enter a computer name.", "error"); return false; }
      if (pass !== pass2) { OS.message("NeptuneOS Setup", "The passwords you entered do not match.", "error"); return false; }
      localStorage.setItem(K_NAME, name);
      localStorage.setItem(K_COMPUTER, computer);
      localStorage.setItem(K_PASS, pass ? hash(pass) : "");
    } else if (id === "datetime") {
      localStorage.setItem(K_TZ, overlay.querySelector("#setup-tz").value);
    }
    return true;
  }

  const INSTALL_STEPS = [
    "Preparing installation&hellip;",
    "Copying system files&hellip;",
    "Registering components&hellip;",
    "Installing programs&hellip;",
    "Configuring your desktop&hellip;",
    "Starting NeptuneOS&hellip;",
  ];

  function runInstall() {
    let i = 0;
    const fill = overlay.querySelector(".setup-progress-fill");
    const status = overlay.querySelector(".setup-status");
    const iv = setInterval(() => {
      i++;
      if (i >= INSTALL_STEPS.length) {
        clearInterval(iv);
        status.innerHTML = "Complete.";
        fill.style.width = "100%";
        step = STEPS.indexOf("complete");
        setTimeout(() => showStep(), 450);
        return;
      }
      fill.style.width = Math.round((i / INSTALL_STEPS.length) * 100) + "%";
      status.innerHTML = INSTALL_STEPS[i];
    }, 550);
  }

  function cancelSetup() {
    OS.confirm("NeptuneOS Setup", "Setup is not complete. If you quit now, NeptuneOS will not be fully configured.\n\nDo you want to quit Setup?").then((ok) => {
      if (!ok) return;
      cancelledThisSession = true;
      closeOverlay();
    });
  }

  function finishSetup() {
    localStorage.setItem(K_DONE, "1");
    closeOverlay();
    if (OS.startmenu && OS.startmenu.render) OS.startmenu.render();
    if (OS.taskbar) OS.taskbar.updateClock();
    showLogon();
  }

  function closeOverlay() {
    if (overlay) { overlay.remove(); overlay = null; wizard = null; }
  }

  /* ---------------- logon screen ---------------- */

  function showLogon() {
    closeOverlay();
    if (logonEl) logonEl.remove();

    logonEl = document.createElement("div");
    logonEl.id = "logon-screen";
    const user = setup.userName();
    logonEl.innerHTML =
      '<div class="logon-top"><img src="assets/icons/neptuneos.svg" alt=""><span>NeptuneOS</span></div>' +
      '<div class="logon-hint">To begin, click your user name</div>' +
      '<div class="logon-users">' +
      '  <button id="logon-user">' +
      '    <img src="assets/icons/user.svg" alt="">' +
      "    <span>" + esc(user) + "</span>" +
      "  </button>" +
      "</div>" +
      '<div class="logon-password" hidden>' +
      '  <label>Password: <input id="logon-pass" type="password"></label>' +
      '  <button class="btn" id="logon-ok">Log On</button>' +
      '  <div class="logon-err" id="logon-err" hidden>Wrong password. Try again.</div>' +
      "</div>" +
      '<button class="logon-off" id="logon-off">Turn Off Computer</button>';

    document.body.appendChild(logonEl);

    logonEl.querySelector("#logon-user").addEventListener("click", () => {
      if (setup.hasPassword()) {
        logonEl.querySelector(".logon-password").hidden = false;
        logonEl.querySelector("#logon-pass").focus();
      } else {
        logOn();
      }
    });
    logonEl.querySelector("#logon-ok").addEventListener("click", tryLogon);
    logonEl.querySelector("#logon-pass").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryLogon();
    });
    logonEl.querySelector("#logon-off").addEventListener("click", () => {
      if (logonEl) { logonEl.remove(); logonEl = null; }
      OS.desktop.shutdown();
    });
  }

  function tryLogon() {
    const pass = logonEl.querySelector("#logon-pass").value;
    if (!setup.verifyPassword(pass)) {
      logonEl.querySelector("#logon-err").hidden = false;
      logonEl.querySelector("#logon-pass").value = "";
      logonEl.querySelector("#logon-pass").focus();
      return;
    }
    logOn();
  }

  function logOn() {
    if (logonEl) logonEl.remove();
    logonEl = null;
    if (OS.sfx && OS.sfx.context && OS.sfx.blip) OS.sfx.blip();
  }

  /* ---------------- boot integration ---------------- */

  function bootSequence() {
    if (window.__skipSetup) return;

    const pollBoot = setInterval(() => {
      if (document.getElementById("boot-screen")) return;
      clearInterval(pollBoot);

      if (OS.setup.done()) {
        if (OS.setup.logonEnabled()) showLogon();
      } else if (!cancelledThisSession) {
        startWizard();
      }
    }, 200);
    setTimeout(() => clearInterval(pollBoot), 12000);
  }

  window.OS = window.OS || {};
  OS.setup = setup;

  /* test hook */
  OS.setup._showLogon = showLogon;

  window.addEventListener("load", bootSequence);
})();
