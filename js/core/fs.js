/* =========================================================
 * neptuneOS — Virtual Filesystem
 * A simple in-memory tree persisted to localStorage.
 * Paths use "/" internally, e.g. "/C:/Users/guest".
 * ========================================================= */
(function () {
  "use strict";

  const STORE_KEY = "retroos.fs.v1";

  function Node(type, name) {
    this.type = type;            // "dir" | "file"
    this.name = name;
    this.children = {};          // dir only: name -> Node
    this.content = "";           // file only
    this.deletedAt = null;       // for recycle bin
  }

  function createDefaultTree() {
    const root = new Node("dir", "");
    const C = new Node("dir", "C:");
    root.children["C:"] = C;
    const D = new Node("dir", "D:");
    root.children["D:"] = D;

    const mk = (parent, name, type) => {
      const n = new Node(type, name);
      parent.children[name] = n;
      return n;
    };

    mk(C, "Windows", "dir");
    mk(C, "Program Files", "dir");
    mk(C, "Recycle Bin", "dir");

    const users = mk(C, "Users", "dir");
    const guest = mk(users, "Guest", "dir");
    const docs = mk(guest, "Documents", "dir");
    const pics = mk(guest, "Pictures", "dir");
    const music = mk(guest, "Music", "dir");
    mk(guest, "Desktop", "dir");

    const readme = mk(docs, "readme.txt", "file");
    readme.content =
      "Welcome to NeptuneOS\n" +
      "====================\n" +
      "\n" +
      "A Neptune Productions product.\n" +
      "\n" +
      "This is a working desktop operating system shell written in plain\n" +
      "HTML, CSS and JavaScript. Everything runs in your browser.\n" +
      "\n" +
      "Things to try:\n" +
      "  * Open the Terminal and type `help`\n" +
      "  * Play some music in Media Player\n" +
      "  * Browse files with My Computer\n" +
      "  * Play Snake or Pacman from the Start menu\n" +
      "  * Write a note and save it from the File menu\n" +
      "  * Change your wallpaper in Settings\n" +
      "\n" +
      "Your files are saved automatically to your browser's local storage.\n" +
      "Right-click the desktop for quick actions.\n";

    const poem = mk(docs, "poem.txt", "file");
    poem.content =
      "The sun is setting over the desktop,\n" +
      "the taskbar glows in silver and gray.\n" +
      "Drag me, resize me, click my little buttons -\n" +
      "this nostalgic dream will never fade away.\n";

    const tune = mk(music, "tracklist.txt", "file");
    tune.content =
      "neptuneOS jukebox tracklist\n" +
      "--------------------------\n" +
      "01. Pixel Dreams\n" +
      "02. Dial-Up Lullaby\n" +
      "03. The Startup Chime\n" +
      "04. Floppy Disc Fandango\n" +
      "05. Screensaver Sunset\n";

    return root;
  }

  /* ---- path helpers ---- */
  function normalize(path) {
    if (!path) path = "/";
    let parts = String(path).split("/").filter((p) => p && p !== ".");
    const out = [];
    for (const part of parts) {
      if (part === "..") {
        if (out.length) out.pop();
      } else {
        out.push(part);
      }
    }
    return "/" + out.join("/");
  }

  function parse(path) {
    return String(path).split("/").filter((p) => p && p !== ".");
  }

  function joinDir(filePath) {
    const parts = parse(filePath);
    parts.pop();
    return "/" + parts.join("/");
  }

  /* ---- lookup ---- */
  function getNode(root, path) {
    const parts = parse(path);
    let node = root;
    for (const part of parts) {
      if (node.type !== "dir" || !(part in node.children)) return null;
      node = node.children[part];
    }
    return node;
  }

  function getParent(root, path) {
    const parts = parse(path);
    if (!parts.length) return { parent: null, name: null };
    const name = parts.pop();
    let node = root;
    for (const part of parts) {
      if (node.type !== "dir" || !(part in node.children)) return null;
      node = node.children[part];
    }
    if (node.type !== "dir") return null;
    return { parent: node, name };
  }

  function nodeSize(node) {
    if (!node) return 0;
    if (node.type === "file") return node.content.length;
    let total = 0;
    for (const key in node.children) total += nodeSize(node.children[key]);
    return total;
  }

  function forEachNode(node, fn, path) {
    path = path || "";
    fn(node, path);
    if (node.type === "dir") {
      for (const key in node.children) {
        forEachNode(node.children[key], fn, path + "/" + key);
      }
    }
  }

  /* ---- main object ---- */
  const fs = {
    root: null,
    cwd: "/C:/Users/Guest",

    init() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { saved = null; }
      if (saved && saved.root) {
        this.root = deserialize(saved.root);
      } else {
        this.root = createDefaultTree();
        this.save();
      }
    },

    reset() {
      this.root = createDefaultTree();
      this.save();
    },

    save() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ root: this.root }));
      } catch (e) {
        /* storage full or unavailable — keep working in-memory */
      }
    },

    normalize,
    parse,
    joinDir,

    exists(path) {
      return getNode(this.root, this.normalize(path)) !== null;
    },

    getNode(path) {
      return getNode(this.root, this.normalize(path));
    },

    ls(path) {
      const node = getNode(this.root, this.normalize(path));
      if (!node || node.type !== "dir") return null;
      return Object.keys(node.children);
    },

    isDir(path) {
      const n = getNode(this.root, this.normalize(path));
      return !!n && n.type === "dir";
    },

    read(path) {
      const n = getNode(this.root, this.normalize(path));
      return n && n.type === "file" ? n.content : null;
    },

    mkdir(path) {
      const p = this.normalize(path);
      const res = getParent(this.root, p);
      if (!res || res.parent.type !== "dir") return { ok: false, error: "Path not found: " + p };
      if (res.name in res.parent.children) return { ok: false, error: "A folder named '" + res.name + "' already exists." };
      res.parent.children[res.name] = new Node("dir", res.name);
      this.save();
      return { ok: true };
    },

    write(path, content) {
      const p = this.normalize(path);
      const res = getParent(this.root, p);
      if (!res) return { ok: false, error: "Path not found: " + p };
      let node = res.parent.children[res.name];
      if (!node) {
        node = new Node("file", res.name);
        res.parent.children[res.name] = node;
      }
      if (node.type !== "file") return { ok: false, error: res.name + " is a folder." };
      node.content = String(content);
      this.save();
      return { ok: true };
    },

    rm(path) {
      const p = this.normalize(path);
      const res = getParent(this.root, p);
      if (!res || !(res.name in res.parent.children)) return { ok: false, error: "Path not found: " + p };
      delete res.parent.children[res.name];
      this.save();
      return { ok: true };
    },

    move(src, destDir) {
      const sp = this.normalize(src);
      const dp = this.normalize(destDir);
      const s = getParent(this.root, sp);
      const d = getParent(this.root, dp);
      if (!s || !(s.name in s.parent.children)) return { ok: false, error: "Source not found: " + src };
      if (!d) return { ok: false, error: "Destination not found: " + destDir };
      const destNode = d.parent.children[d.name];
      if (destNode.type !== "dir") return { ok: false, error: "Destination is not a folder: " + destDir };
      let name = s.name;
      if (name in destNode.children) {
        const dot = name.lastIndexOf(".");
        name = (dot > 0 ? name.slice(0, dot) : name) + " (copy)" + (dot > 0 ? name.slice(dot) : "");
      }
      const node = s.parent.children[s.name];
      delete s.parent.children[s.name];
      node.name = name;
      destNode.children[name] = node;
      this.save();
      return { ok: true };
    },

    copy(src, destDir) {
      const sp = this.normalize(src);
      const dp = this.normalize(destDir);
      const srcNode = getNode(this.root, sp);
      const d = getParent(this.root, dp);
      if (!srcNode) return { ok: false, error: "Source not found: " + src };
      if (!d) return { ok: false, error: "Destination not found: " + destDir };
      const destNode = d.parent.children[d.name];
      if (destNode.type !== "dir") return { ok: false, error: "Destination is not a folder: " + destDir };
      let name = srcNode.name;
      if (name in destNode.children) {
        const dot = name.lastIndexOf(".");
        name = (dot > 0 ? name.slice(0, dot) : name) + " (copy)" + (dot > 0 ? name.slice(dot) : "");
      }
      destNode.children[name] = cloneNode(srcNode, name);
      this.save();
      return { ok: true };
    },

    trash(path) {
      const bin = "/C:/Recycle Bin";
      const p = this.normalize(path);
      const res = getParent(this.root, p);
      if (!res || !(res.name in res.parent.children)) return { ok: false, error: "Path not found: " + path };
      const node = res.parent.children[res.name];
      node.origPath = p;
      node.deletedAt = Date.now();
      const moved = this.move(p, bin);
      if (moved.ok) this.save();
      return moved;
    },

    sizeOf(path) {
      const n = getNode(this.root, this.normalize(path));
      return n ? nodeSize(n) : 0;
    },

    listRecursive(path) {
      const n = getNode(this.root, this.normalize(path));
      if (!n || n.type !== "dir") return [];
      const out = [];
      forEachNode(n, (node, p) => {
        if (p) out.push({ path: normalize(path + p), name: node.name, type: node.type });
      });
      return out;
    },
  };

  function cloneNode(node, newName) {
    const copy = JSON.parse(JSON.stringify(node));
    copy.name = newName;
    return copy;
  }

  function deserialize(data) {
    const node = new Node(data.type, data.name);
    node.content = data.content || "";
    node.deletedAt = data.deletedAt || null;
    node.origPath = data.origPath || null;
    if (data.type === "dir" && data.children) {
      for (const key in data.children) {
        node.children[key] = deserialize(data.children[key]);
      }
    }
    return node;
  }

  window.OS = window.OS || {};
  window.OS.fs = fs;
})();
