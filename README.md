# neptuneOS

> A Neptune Productions product. It boots. It beeps.

A Windows XP–style **desktop operating system shell** that runs entirely in your browser. Written in plain HTML, CSS and JavaScript — no frameworks, no build step, no backend. Open `index.html` and it boots like a real OS.

![stack](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS-blue)
![zero-deps](https://img.shields.io/badge/dependencies-none-brightgreen)
![product](https://img.shields.io/badge/by-Neptune%20Productions-245edb)

## What you can do

- **Windows XP "Luna" theme** — blue-glass titlebars, green start button, Bliss wallpaper, XP taskbar, menus and dialogs
- **Full window manager** — drag, resize (8 directions), minimize, maximize, Alt+F4 to close, z-order focus, taskbar buttons
- **Virtual file system** — real folders/files persisted in `localStorage`, with a Recycle Bin that restores items to their original location
- **Media Player** — a jukebox of 5 chiptune tracks synthesized at runtime (no audio files shipped), plus import your own songs. Playlist, seek, volume, and a live visualizer
- **MS-DOS Prompt terminal** — `dir`, `cd`, `mkdir`, `del`, `type`, `echo`, `copy`, `move`, `ren`, `tree`, `color`, `start`, `play`, `music`, `beep`, `fullscreen`, `emptybin`, `shutdown` and more
- **My Computer (Explorer)** — back/forward/up navigation, address bar, sidebar, new folder/file, rename, delete-to-Recycle-Bin
- **Notepad** — File & Edit menus, open/save, line/column + char count
- **Paint** — pencil, eraser, line, rectangle, ellipse, flood fill, 16-color palette + custom picker
- **Calculator** — classic immediate-execution four-function
- **Control Panel** — wallpaper gallery (7 styles including "Bliss" and "Neptune"), accent color, system info, file system reset
- **Fullscreen** — the tray button (or the `fullscreen` command) goes fullscreen
- **Custom cursor** — XP arrow pointer everywhere
- **Touchscreen support** — a virtual mouse follows your finger: one tap = left click, double-tap or press-and-hold = right click, dragging works too
- **Sound effects** — a startup chime on first click (autoplay policies mean it can't play sooner) and soft UI blips. Type `beep` in the terminal
- **Start menu** with program list, pinned places, shutdown & restart
- **Desktop** — draggable icons, rubber-band selection, right-click context menus, boot & shutdown screens

## Run it locally

Easiest: double-click `index.html` (everything is plain scripts — works straight from disk).

Or serve it:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Live on GitHub Pages

neptuneOS is hosted at **https://notmicrosoft2000-cmd.github.io/neptuneos/** — the latest push is auto-published.

To redeploy manually (Pages is enabled on the `main` branch, root folder):

```bash
git init
git add .
git commit -m "neptuneOS"
git branch -M main
git remote add origin https://github.com/notmicrosoft2000-cmd/neptuneos.git
git push -u origin main
```

No Actions workflow needed because the site is 100% static.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Alt+F4` | Close the focused window |
| `Ctrl+L` | Clear the terminal |
| `Ctrl+C` | Cancel the current terminal command |
| `↑` / `↓` | Command history in the terminal |

## Touchscreen

On a touch device the OS keeps a virtual mouse instead of relying on fat-finger taps:

- touch anywhere to move the cursor under your finger
- **one tap** = left click
- **double-tap** (or press-and-hold without moving) = right click
- drag by holding your finger down and moving

## Terminal cheat sheet

```
help                      list all commands
dir                       list files in the current folder
cd Documents              change folder
echo hello > hi.txt       write text to a file
type hi.txt               view a file
tree                      show the whole folder tree
copy hi.txt C:\Users\Guest\Documents
move hi.txt C:\Users\Guest\Music
ren hi.txt notes.txt
del notes.txt             permanently delete
start readme.txt          open a file with its app
play pixel-dreams.wav     play a song in Media Player
music                     open Media Player
beep                      it boots. it beeps.
fullscreen                toggle fullscreen mode
calc / notepad / paint    launch programs
color 0a                  black background, light green text
emptybin                  empty the Recycle Bin
shutdown / restart        power options
```

## Project structure

```
neptuneos/
├── index.html            boot screen, desktop, taskbar, start menu
├── css/
│   ├── theme.css         98-style palette & base widgets
│   ├── desktop.css       desktop, taskbar, start menu, dialogs
│   ├── windows.css       window chrome & resize handles
│   └── apps.css          per-app styles
├── js/
│   ├── core/             fs, wav (chiptune synth), sfx, wm, fullscreen, touch mouse, taskbar, start menu, desktop
│   ├── apps/             notepad, terminal, explorer, paint, calculator, settings, recycle bin, media player
│   └── main.js           bootstrap
├── assets/icons/         hand-drawn SVG icons
├── assets/cursors/       custom cursor artwork
└── test.html             headless test harness
```

## Notes

- The 5 built-in songs (Pixel Dreams, Dial-Up Lullaby, The Startup Chime, Floppy Disc Fandango, Screensaver Sunset) are synthesized on first boot — check `tracklist.txt` in `C:\Users\Guest\Music`. They live in `localStorage` just like every other file, so imports are capped at ~2.5 MB each to keep the whole system under browser storage limits.
- Sound plays only after your first click or keypress (browser autoplay rules) — that's also when the startup chime rings.
- Your files and settings live in the browser's `localStorage`. Clearing site data restores the default system (or use *Control Panel → System → Reset file system*).
- Works on desktop and touch-capable browsers; best on desktop with a mouse.
