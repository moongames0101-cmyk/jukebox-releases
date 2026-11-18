# Gel

A desktop app for designing Spotify themes and applying them to the Spotify desktop app.
Gel writes a Spicetify theme (`color.ini`, `user.css` and, for animations, `theme.js`) into
`%APPDATA%\spicetify\Themes\Gel` and runs Spicetify to apply it.

## Using it

1. Open Gel and go to **Setup**. Install Spicetify if Gel asks for it.
2. Pick a theme in **Themes**, or build your own in **Colours** and **Style**.
3. Press **Apply to Spotify**. Spotify closes and reopens with the new look.
4. **Back to normal Spotify** removes all changes (`spicetify restore`).

If Spotify updates itself and the theme disappears, press **Apply to Spotify** again.

### Microsoft Store version of Spotify

Spicetify only partly supports it. Either switch to Spotify's own installer
(Setup walks you through it) or keep the Store version and open Spotify with the
**Spotify (Gel)** desktop shortcut that Setup can create.

## Features

- 13 built-in themes, laid out as a swatch book
- Build a full 18-colour palette from 3 colours, or from a picture
- Fine-tune every Spicetify colour, with a live preview and a contrast check
- Fonts (Google Fonts or any font on your PC), roundness, glow on play buttons
- Background picture with dimming, see-through panels and frosted glass
- Animated backgrounds: falling petals, snow, fireflies (in front of or behind the panels)
- Layout: replace the Spotify logo with a theme emblem (27 to pick from), your own picture, or hide it; floating player bar; square, rounded, circle or spinning-record album covers; hide clutter; accent scrollbars; cards that lift on hover
- Colours that follow the song: Spotify recolours itself from each album cover (accent only or the whole theme), keeping text readable
- Spotify add-ons from Spicetify, switched on from Gel: full-screen now playing, lyrics page, pop-up lyrics, trash bin, better shuffle, loop part of a song, keyboard shortcuts, bookmarks, new releases page
- Your own CSS
- Save themes, export and import them as `.gel.json`

## Developing

```
npm install
npm start            # run the app
npm test             # theme file tests
npm run dist:win     # build for Windows (portable: add "portable" target)
```
