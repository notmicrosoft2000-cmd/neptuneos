/* =========================================================
 * NeptuneOS — Weather Dashboard
 * Shows current conditions, 5-day forecast, temperature
 * graph canvas. Uses simulated weather data.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var styleEl = null;
  var graphCanvas = null;
  var graphCtx = null;
  var animFrame = null;

  var CONDITIONS = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Rain", "Thunderstorm", "Snow", "Foggy", "Windy", "Clear"];
  var CONDITION_ICONS = { "Sunny": "S", "Partly Cloudy": "P", "Cloudy": "C", "Light Rain": "R", "Rain": "R", "Thunderstorm": "T", "Snow": "S", "Foggy": "F", "Windy": "W", "Clear": "C" };

  function generateWeather() {
    var baseTemp = 18 + Math.floor(Math.random() * 12);
    var days = [];
    for (var i = 0; i < 5; i++) {
      var high = baseTemp + Math.floor(Math.random() * 6) - 2;
      var low = high - Math.floor(Math.random() * 8) - 4;
      var cond = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
      days.push({
        label: ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5"][i],
        high: high,
        low: low,
        condition: cond,
        humidity: 40 + Math.floor(Math.random() * 50),
        wind: Math.floor(Math.random() * 25) + 5,
      });
    }
    return { current: days[0], days: days, temp: baseTemp, feelsLike: baseTemp + Math.floor(Math.random() * 4) - 2 };
  }

  function condEmoji(cond) {
    var map = { "Sunny": "☀", "Partly Cloudy": "⛅", "Cloudy": "☁", "Light Rain": "🌦", "Rain": "🌧", "Thunderstorm": "⛈", "Snow": "❄", "Foggy": "🌫", "Windy": "💨", "Clear": "🌙" };
    return map[cond] || "☀";
  }

  function drawGraph(weather) {
    if (!graphCanvas || !graphCtx) return;
    var ctx = graphCtx;
    var w = graphCanvas.width;
    var h = graphCanvas.height;
    var dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    var days = weather.days;
    var allTemps = [];
    days.forEach(function (d) { allTemps.push(d.high, d.low); });
    var minT = Math.min.apply(null, allTemps) - 3;
    var maxT = Math.max.apply(null, allTemps) + 3;
    var range = maxT - minT || 1;

    var padL = 36, padR = 16, padT = 16, padB = 28;
    var gw = w - padL - padR;
    var gh = h - padT - padB;

    /* Grid lines */
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = padT + (gh / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      var tempLabel = Math.round(maxT - (range / 4) * i);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "10px Consolas, monospace";
      ctx.textAlign = "right";
      ctx.fillText(tempLabel + "°", padL - 6, y + 4);
    }

    var stepX = gw / (days.length - 1 || 1);

    function tempToY(t) { return padT + gh - ((t - minT) / range) * gh; }

    /* High line */
    ctx.beginPath();
    ctx.strokeStyle = "#f38ba8";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    days.forEach(function (d, idx) {
      var x = padL + stepX * idx;
      var y = tempToY(d.high);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    /* Low line */
    ctx.beginPath();
    ctx.strokeStyle = "#89b4fa";
    ctx.lineWidth = 2.5;
    days.forEach(function (d, idx) {
      var x = padL + stepX * idx;
      var y = tempToY(d.low);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    /* Dots + labels */
    days.forEach(function (d, idx) {
      var x = padL + stepX * idx;

      ctx.fillStyle = "#f38ba8";
      ctx.beginPath();
      ctx.arc(x, tempToY(d.high), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f38ba8";
      ctx.font = "bold 11px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(d.high + "°", x, tempToY(d.high) - 8);

      ctx.fillStyle = "#89b4fa";
      ctx.beginPath();
      ctx.arc(x, tempToY(d.low), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#89b4fa";
      ctx.font = "bold 11px Consolas, monospace";
      ctx.fillText(d.low + "°", x, tempToY(d.low) + 16);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "11px sans-serif";
      ctx.fillText(d.label, x, h - 6);
    });
  }

  function render() {
    var weather = generateWeather();
    var c = win.content.querySelector("#wd-content");
    if (!c) return;

    var cur = weather.current;
    var html = '<div class="wd-hero">' +
      '<div class="wd-hero-left">' +
      '<div class="wd-hero-emoji">' + condEmoji(cur.condition) + '</div>' +
      '<div class="wd-hero-temp">' + weather.temp + '°C</div>' +
      '<div class="wd-hero-cond">' + cur.condition + '</div>' +
      '<div class="wd-hero-detail">Feels like ' + weather.feelsLike + '°C · Humidity ' + cur.humidity + '% · Wind ' + cur.wind + ' km/h</div>' +
      '</div></div>';

    html += '<div class="wd-section-title">5-Day Forecast</div>';
    html += '<div class="wd-forecast-grid">';
    weather.days.forEach(function (d) {
      html += '<div class="wd-forecast-card">' +
        '<div class="wd-fc-day">' + d.label + '</div>' +
        '<div class="wd-fc-icon">' + condEmoji(d.condition) + '</div>' +
        '<div class="wd-fc-cond">' + d.condition + '</div>' +
        '<div class="wd-fc-temps"><span class="wd-fc-high">' + d.high + '°</span> / <span class="wd-fc-low">' + d.low + '°</span></div>' +
        '<div class="wd-fc-detail">' + d.humidity + '% · ' + d.wind + 'km/h</div>' +
        '</div>';
    });
    html += '</div>';

    html += '<div class="wd-section-title">Temperature Trend</div>';
    html += '<div class="wd-graph-wrap"><canvas id="wd-graph" width="440" height="160"></canvas></div>';

    c.innerHTML = html;

    graphCanvas = c.querySelector("#wd-graph");
    if (graphCanvas) {
      var dpr = window.devicePixelRatio || 1;
      graphCanvas.width = 440 * dpr;
      graphCanvas.height = 160 * dpr;
      graphCanvas.style.width = "440px";
      graphCanvas.style.height = "160px";
      graphCtx = graphCanvas.getContext("2d");
      graphCtx.scale(dpr, dpr);
      drawGraph(weather);
    }
  }

  var app = {
    id: "weatherdash",
    name: "Weather",
    icon: "assets/icons/weatherdash.svg",
    group: "apps",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.textContent =
          "#wd-content{padding:16px;overflow:auto;height:100%;}" +
          ".wd-hero{padding:20px;background:linear-gradient(135deg,rgba(137,180,250,0.12),rgba(203,166,247,0.1));border-radius:12px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px;text-align:center;}" +
          ".wd-hero-emoji{font-size:48px;margin-bottom:4px;}" +
          ".wd-hero-temp{font-size:42px;font-weight:700;letter-spacing:-1px;}" +
          ".wd-hero-cond{font-size:16px;opacity:0.7;margin:2px 0;}" +
          ".wd-hero-detail{font-size:12px;opacity:0.5;margin-top:6px;}" +
          ".wd-section-title{font-size:13px;font-weight:600;margin:12px 0 8px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.06);}" +
          ".wd-forecast-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}" +
          ".wd-forecast-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 8px;text-align:center;transition:border-color 0.15s;}" +
          ".wd-forecast-card:hover{border-color:rgba(100,180,255,0.3);}" +
          ".wd-fc-day{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px;}" +
          ".wd-fc-icon{font-size:24px;margin:4px 0;}" +
          ".wd-fc-cond{font-size:10px;opacity:0.6;margin-bottom:4px;}" +
          ".wd-fc-temps{font-size:14px;font-weight:600;}" +
          ".wd-fc-high{color:#f38ba8;}" +
          ".wd-fc-low{color:#89b4fa;}" +
          ".wd-fc-detail{font-size:10px;opacity:0.4;margin-top:4px;}" +
          ".wd-graph-wrap{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;overflow:hidden;}" +
          ".wd-graph-wrap canvas{width:100%;height:auto;}";
        document.head.appendChild(styleEl);
      }

      win = OS.wm.createWindow({
        title: "Weather",
        icon: this.icon,
        width: 460,
        height: 480,
        resizable: true,
        app: "weatherdash",
        onClose: function () { win = null; graphCanvas = null; graphCtx = null; },
      });

      win.content.innerHTML = '<div id="wd-content" style="height:100%;overflow:auto;"></div>';
      render();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.weatherdash = app;
})();
