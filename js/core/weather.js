/* =========================================================
 * neptuneOS — Weather
 * System-tray weather widget with 5-day forecast dropdown.
 * ========================================================= */
(function () {
  "use strict";

  const CONDITIONS = [
    "Sunny",
    "Partly Cloudy",
    "Cloudy",
    "Light Rain",
    "Thunderstorm",
    "Clear Skies",
  ];

  const STORAGE_KEY = "neptuneos.weather";

  function loadWeather() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function saveWeather(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function randomBetween(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateForecast(baseTemp, baseCondition) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return days.map(function (d) {
      return {
        day: d,
        condition: pick(CONDITIONS),
        temp: randomBetween(baseTemp - 10, baseTemp + 10),
      };
    });
  }

  function generateWeather() {
    const temp = randomBetween(55, 85);
    const condition = pick(CONDITIONS);
    return {
      temp: temp,
      condition: condition,
      humidity: randomBetween(20, 90),
      wind: randomBetween(2, 25),
      forecast: generateForecast(temp, condition),
      lastUpdate: Date.now(),
    };
  }

  function getIcon(condition) {
    switch (condition) {
      case "Sunny":
      case "Clear Skies":
        return (
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
          '<circle cx="8" cy="8" r="3.5" fill="#FFD43B"/>' +
          '<g stroke="#FFD43B" stroke-width="1.2" stroke-linecap="round">' +
          '<line x1="8" y1="0.5" x2="8" y2="3"/>' +
          '<line x1="8" y1="13" x2="8" y2="15.5"/>' +
          '<line x1="0.5" y1="8" x2="3" y2="8"/>' +
          '<line x1="13" y1="8" x2="15.5" y2="8"/>' +
          '<line x1="2.7" y1="2.7" x2="4.5" y2="4.5"/>' +
          '<line x1="11.5" y1="11.5" x2="13.3" y2="13.3"/>' +
          '<line x1="2.7" y1="13.3" x2="4.5" y2="11.5"/>' +
          '<line x1="11.5" y1="4.5" x2="13.3" y2="2.7"/>' +
          "</g></svg>"
        );
      case "Partly Cloudy":
        return (
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
          '<circle cx="6" cy="5.5" r="2.5" fill="#FFD43B"/>' +
          '<g stroke="#FFD43B" stroke-width="1" stroke-linecap="round">' +
          '<line x1="6" y1="1" x2="6" y2="2.2"/>' +
          '<line x1="2" y1="5.5" x2="3.2" y2="5.5"/>' +
          '<line x1="3.1" y1="2.6" x2="3.9" y2="3.4"/>' +
          '<line x1="8.9" y1="2.6" x2="8.1" y2="3.4"/>' +
          "</g>" +
          '<path d="M5 10.5a3 3 0 0 1 0-6h.5a4 4 0 0 1 7.5 1.5H14a2.5 2.5 0 0 1 0 5H5z" fill="#c1c1c1" opacity="0.9"/>' +
          "</svg>"
        );
      case "Cloudy":
        return (
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
          '<path d="M4 11a3.5 3.5 0 0 1 0-7h.5a4.5 4.5 0 0 1 8.5 2H14a2.5 2.5 0 0 1 0 5H4z" fill="#c1c1c1"/>' +
          '<path d="M2 12.5a2.5 2.5 0 0 1 0-5h.3a3.5 3.5 0 0 1 6.7 1.2H10a2 2 0 0 1 0 4H2z" fill="#a0a0a0" opacity="0.7"/>' +
          "</svg>"
        );
      case "Light Rain":
        return (
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
          '<path d="M4 8a3 3 0 0 1 0-6h.4a4 4 0 0 1 7.6 1.5H13a2.5 2.5 0 0 1 0 5H4z" fill="#c1c1c1"/>' +
          '<g stroke="#5B9BD5" stroke-width="1.2" stroke-linecap="round">' +
          '<line x1="5" y1="10" x2="4.5" y2="12.5"/>' +
          '<line x1="8" y1="10" x2="7.5" y2="13"/>' +
          '<line x1="11" y1="10" x2="10.5" y2="12.5"/>' +
          "</g></svg>"
        );
      case "Thunderstorm":
        return (
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
          '<path d="M4 7a3 3 0 0 1 0-6h.4a4 4 0 0 1 7.6 1.5H13a2.5 2.5 0 0 1 0 5H4z" fill="#888"/>' +
          '<polygon points="8.5,7.5 6.5,10.5 8,10.5 7,14 10,10 8.5,10" fill="#FFD43B"/>' +
          '<g stroke="#5B9BD5" stroke-width="1" stroke-linecap="round">' +
          '<line x1="4" y1="8.5" x2="3.5" y2="10.5"/>' +
          '<line x1="11.5" y1="8.5" x2="11" y2="10.5"/>' +
          "</g></svg>"
        );
      default:
        return (
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
          '<circle cx="8" cy="8" r="3.5" fill="#FFD43B"/>' +
          "</svg>"
        );
    }
  }

  const weather = {
    btn: null,
    dropdown: null,
    open: false,
    data: null,
    intervalId: null,

    init: function () {
      this.data = loadWeather();
      if (!this.data) {
        this.data = generateWeather();
        saveWeather(this.data);
      }
      this.renderButton();
      this.intervalId = setInterval(
        function () {
          this.data = generateWeather();
          saveWeather(this.data);
          this.updateButton();
        }.bind(this),
        5 * 60 * 1000
      );
      this.updateButton();
    },

    renderButton: function () {
      const tray = document.getElementById("tray");
      if (!tray) return;
      this.btn = document.createElement("button");
      this.btn.className = "tray-btn";
      this.btn.id = "weather-btn";
      this.btn.title = "Weather";
      tray.insertBefore(this.btn, tray.firstChild);
      this.btn.addEventListener("click", function (e) {
        e.stopPropagation();
        weather.toggle();
      });
    },

    updateButton: function () {
      if (!this.btn) return;
      this.btn.innerHTML =
        getIcon(this.data.condition) +
        '<span style="margin-left:3px;font-size:11px">' +
        this.data.temp +
        "&deg;</span>";
    },

    toggle: function () {
      if (this.open) {
        this.close();
      } else {
        this.show();
      }
    },

    show: function () {
      if (this.open) return;
      this.dropdown = document.createElement("div");
      this.dropdown.id = "weather-dropdown";
      this.dropdown.style.cssText =
        "position:fixed;top:38px;right:20px;background:#1e1e2e;border:1px solid #444;border-radius:8px;padding:14px;color:#eee;font-size:12px;width:220px;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,0.5)";

      var d = this.data;
      var html =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
        getIcon(d.condition) +
        '<span style="font-size:22px;font-weight:600">' +
        d.temp +
        "&deg;F</span></div>" +
        '<div style="color:#aaa;margin-bottom:8px">' +
        d.condition +
        "</div>" +
        '<div style="display:flex;gap:14px;color:#bbb;margin-bottom:12px">' +
        "<span>Humidity: " +
        d.humidity +
        "%</span>" +
        "<span>Wind: " +
        d.wind +
        " mph</span></div>" +
        '<div style="border-top:1px solid #333;padding-top:8px;color:#aaa;font-size:11px">' +
        "<b>5-Day Forecast</b></div>";

      d.forecast.forEach(function (f) {
        html +=
          '<div style="display:flex;justify-content:space-between;padding:3px 0;color:#ccc">' +
          "<span>" +
          f.day +
          "</span>" +
          "<span>" +
          f.condition +
          "</span>" +
          "<span>" +
          f.temp +
          "&deg;</span></div>";
      });

      this.dropdown.innerHTML = html;
      document.body.appendChild(this.dropdown);
      this.open = true;

      setTimeout(function () {
        document.addEventListener("click", weather.onOutsideClick);
      }, 0);
    },

    close: function () {
      if (this.dropdown && this.dropdown.parentNode) {
        this.dropdown.parentNode.removeChild(this.dropdown);
      }
      this.dropdown = null;
      this.open = false;
      document.removeEventListener("click", weather.onOutsideClick);
    },

    onOutsideClick: function (e) {
      if (!weather.dropdown) return;
      if (!weather.dropdown.contains(e.target) && e.target !== weather.btn) {
        weather.close();
      }
    },
  };

  window.OS = window.OS || {};
  OS.weather = weather;
})();
