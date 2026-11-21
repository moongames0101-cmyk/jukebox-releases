package com.vybe.control;

/**
 * What VYBE Control does when a newer version is on GitHub. Plain Java, so it can be tested off the phone.
 *
 * Android 12 and newer let an app update itself without asking, once "Install unknown apps" is allowed
 * for it and the app targets a recent enough Android (see PackageInstaller.SessionParams
 * #setRequireUserAction). Older Android always asks, so there the app asks too.
 */
final class UpdatePlan {
    private UpdatePlan() {}

    enum Step {
        /** Nothing new, or nothing to do right now */
        NOTHING,
        /** "Update VYBE Control?" (only while the app is on screen) */
        ASK,
        /** Install quietly now: the app isn't open */
        INSTALL_NOW,
        /** Fetch it now, install quietly when the app is left (installing closes the app) */
        INSTALL_WHEN_LEFT,
    }

    /** First Android that updates apps quietly */
    static final int QUIET_FROM = 31;
    /**
     * Last Android this app's target (API 34) is recent enough for: Android 17 (API 37) wants API 35.
     * Raise this along with targetSdk in build.gradle.
     */
    static final int QUIET_UP_TO = 36;

    /**
     * @param sdk        Build.VERSION.SDK_INT
     * @param mayInstall "Install unknown apps" is allowed for VYBE Control
     * @param inApp      the app is on screen
     * @param wantedTap  last time, Android asked for a tap after all
     */
    static Step next(int sdk, boolean mayInstall, long latest, long installed, boolean inApp, boolean wantedTap) {
        if (latest <= installed) return Step.NOTHING;
        boolean quiet = sdk >= QUIET_FROM && sdk <= QUIET_UP_TO && mayInstall && !wantedTap;
        if (!quiet) return inApp ? Step.ASK : Step.NOTHING;
        return inApp ? Step.INSTALL_WHEN_LEFT : Step.INSTALL_NOW;
    }
}
