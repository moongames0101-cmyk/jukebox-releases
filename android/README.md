# VYBE Control

The jukebox owner's remote for Android. It opens the control page that every VYBE jukebox serves on its Wi-Fi (`/control`), so the controls update whenever the jukebox does. The app itself only remembers which jukebox to open, scans the "Connect it to this jukebox" QR code from the jukebox admin, and shows a start screen when the jukebox can't be reached.

Built by GitHub Actions (`.github/workflows/phone-app.yml`). Run the workflow by hand to publish `VYBE-Control.apk` to the `phone-app` release; the download QR code in the jukebox admin links to it.

## Signing

Each build signs the app with a fresh key, made during the build and thrown away afterwards, so no key is kept anywhere. To install a newer build, remove the old app first. That's rarely needed: the controls come from the jukebox itself, so jukebox updates change them without a new app.
