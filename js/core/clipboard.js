/* =========================================================
 * neptuneOS — Clipboard
 * Ctrl+C/V/X support across textareas and inputs.
 * Also stores clipboard in localStorage for persistence.
 * ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "neptuneos.clipboard";
  let clipboardData = "";

  function getSelectedText() {
    const el = document.activeElement;
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) return el.value.substring(start, end);
    }
    if (el.contentEditable === "true") {
      const sel = window.getSelection();
      if (sel && sel.toString()) return sel.toString();
    }
    return "";
  }

  function replaceSelection(text) {
    const el = document.activeElement;
    if (!el) return;
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      el.value = val.substring(0, start) + text + val.substring(end);
      el.selectionStart = el.selectionEnd = start + text.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (el.contentEditable === "true") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(el);
        newRange.collapse(false);
        sel.addRange(newRange);
      }
    }
  }

  function copy() {
    const text = getSelectedText();
    if (text) {
      clipboardData = text;
      try { localStorage.setItem(STORAGE_KEY, text); } catch (e) {}
      try { navigator.clipboard.writeText(text); } catch (e) {}
    }
  }

  function cut() {
    copy();
    replaceSelection("");
  }

  function paste() {
    /* Try system clipboard first */
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        if (text) {
          clipboardData = text;
          replaceSelection(text);
        } else if (clipboardData) {
          replaceSelection(clipboardData);
        }
      }).catch(function () {
        if (clipboardData) replaceSelection(clipboardData);
      });
    } else if (clipboardData) {
      replaceSelection(clipboardData);
    }
  }

  function getClipboard() {
    return clipboardData;
  }

  function setClipboard(text) {
    clipboardData = text || "";
    try { localStorage.setItem(STORAGE_KEY, clipboardData); } catch (e) {}
  }

  /* Restore clipboard from storage */
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) clipboardData = saved;
  } catch (e) {}

  /* Global keyboard shortcuts */
  window.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.key === "c" || e.key === "C") {
        /* Only intercept if not in a context where browser default works */
        const el = document.activeElement;
        if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.contentEditable === "true")) {
          e.preventDefault();
          copy();
        }
      } else if (e.key === "x" || e.key === "X") {
        const el = document.activeElement;
        if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.contentEditable === "true")) {
          e.preventDefault();
          cut();
        }
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        paste();
      } else if (e.key === "a" || e.key === "A") {
        /* Ctrl+A: select all in textarea/input */
        const el = document.activeElement;
        if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
          e.preventDefault();
          el.select();
        }
      }
    }
  });

  window.OS = window.OS || {};
  window.OS.clipboard = {
    copy: copy,
    cut: cut,
    paste: paste,
    get: getClipboard,
    set: setClipboard,
  };
})();
