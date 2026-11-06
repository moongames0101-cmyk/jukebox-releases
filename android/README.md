# VYBE Control

The jukebox owner's remote for Android. It opens the control page that every VYBE jukebox serves on its Wi-Fi (`/control`), so the controls update whenever the jukebox does. The app itself only remembers which jukebox to open, scans the "Connect it to this jukebox" QR code from the jukebox admin, and shows a start screen when the jukebox can't be reached.

Built and published by GitHub Actions (`.github/workflows/phone-app.yml`) to the `phone-app` release; the download QR code in the jukebox admin links to it. When the app opens it checks that release's `version.json` and offers to install a newer build.

## Signing

Android only installs a new version over the old one when both are signed with the same key. No key is stored anywhere: `android/signing/make_key.py` works the same key out from the `VYBE_SIGNING_SEED` repository secret on every build. Keep that phrase the same; changing it means removing the app once and installing it again. Without the secret, builds are checked but not published.
