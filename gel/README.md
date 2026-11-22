# Gel

A Windows app that themes **Spotify**, **Roblox** and **YouTube**.

**Download:** [Gel-Setup.exe](https://github.com/moongames0101-cmyk/jukebox-releases/releases/download/gel/Gel-Setup.exe)

Install it once. Gel checks for new versions when it opens (and every few hours),
downloads them in the background and installs them when you restart it.

Windows may say "Windows protected your PC" the first time, because Gel isn't code-signed.
Choose **More info**, then **Run anyway**.

## Spotify

Gel writes a Spicetify theme (`color.ini`, `user.css` and, for animations, `theme.js`) into
`%APPDATA%\spicetify\Themes\Gel` and runs Spicetify to apply it.

1. Open Gel and go to **Setup**. Install Spicetify if Gel asks for it.
2. Pick a theme in **Themes**, or build your own in **Colours** and **Style**.
3. Press **Apply to Spotify**. Spotify closes and reopens with the new look.
4. **Back to normal Spotify** removes all changes (`spicetify restore`).

If Spotify updates itself and the theme disappears, press **Apply to Spotify** again.

Spicetify only partly supports the Microsoft Store version of Spotify. Either switch to
Spotify's own installer (Setup walks you through it) or keep the Store version and open
Spotify with the **Spotify (Gel)** desktop shortcut that Setup can create.

- 13 built-in themes, laid out as a swatch book
- Build a full 18-colour palette from 3 colours, or from a picture
- Fine-tune every Spicetify colour, with a live preview and a contrast check
- Fonts (Google Fonts or any font on your PC), roundness, glow on play buttons
- Background picture with dimming, see-through panels and frosted glass
- Animated backgrounds: falling petals, snow, fireflies (in front of or behind the panels)
- Your own logo, DJ artwork and layout options, your own CSS
- Save themes, export and import them as `.gel.json`

## Roblox

Switch to **Roblox** at the top of Gel. Gel changes the files the Roblox Player loads
when it starts, the same way launcher mods do:

- **Font** for menus, chat and the player list (6 built in, or your own `.ttf`/`.otf`)
- **Cursor** (5 built in, or your own picture)
- **Death sound** (5 built in, or your own Ogg Vorbis file)
- **Animated avatar background** behind your character on the Avatar page (6 to pick from)

Gel keeps a copy of every file it replaces, and **Back to normal Roblox** puts them back.
Roblox updates itself about once a week, which wipes changes from its folder: while Gel
is open it puts your theme back within a minute. If you use a launcher with a
`Modifications` folder (Bloxstrap and the like), Gel puts the theme there too.
Menu colours are built into Roblox itself, so those stay as they are.

## YouTube

Switch to **YouTube** at the top of Gel. Pick one of 19 animated themes, change its
colours, fonts, moving background, layout and logo, then press **Apply to YouTube**.

Gel themes youtube.com through a small browser extension that it writes to
`Documents\Gel\YouTube extension` (under OneDrive if your Documents folder is there).
Add it to your browser once:

1. Go to `opera://extensions` (or `chrome://extensions`, `edge://extensions`, `brave://extensions`)
2. Turn on **Developer mode**
3. Click **Load unpacked** and pick the **YouTube extension** folder itself, the one with
   `manifest.json` inside, not the `Gel` folder above it

After that, every theme you apply shows up on YouTube within a couple of seconds, with no
reload. The extension only runs on youtube.com and only reads files from its own folder.

**Ad blocking** (on by default, switch in **YouTube → Layout**): the extension takes ads out of
YouTube's video data before the player reads it, so video ads don't load, and it hides sponsored
videos, banners and overlays. If an ad still gets through, it is muted, covered and skipped.
Ads inside Shorts and sponsor segments that creators record into their videos aren't touched.
Now and then YouTube makes a video wait a few seconds before starting, which is how it treats
ad blockers. After a Gel update that changes the extension, press the reload arrow on
**Gel for YouTube** in `opera://extensions` once.

## Developing

```
npm install
npm start            # run the app
npm test             # tests
npm run dist:win     # build the Windows installer
```

Pushing a change to `gel/` on `main` builds Gel on Windows (`.github/workflows/gel.yml`)
and publishes `Gel-Setup.exe` and `latest.yml` to the `gel` release as version
`1.3.<run number>`.

Some Roblox avatar-background tests need Roblox's own avatar scene file, which isn't kept
in this repository, so they only run on a developer's computer.
