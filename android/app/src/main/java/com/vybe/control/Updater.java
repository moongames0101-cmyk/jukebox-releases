package com.vybe.control;

import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.os.Build;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Keeps VYBE Control up to date from its GitHub release (UpdatePlan says when).
 *
 * On Android 12 and newer, once "Install unknown apps" is allowed, a new version is downloaded in the
 * background and installed quietly: when you leave the app (installing closes it), or by the
 * twice-a-day check (UpdateJob) while it's closed. Whenever Android wants a tap after all, the app
 * goes back to asking "Update VYBE Control?" the next time it's open.
 */
final class Updater {
    private Updater() {}

    static final String RELEASE = "https://github.com/moongames0101-cmyk/jukebox-releases/releases/download/phone-app/";
    private static final int JOB_ID = 4711;
    private static final long JOB_EVERY_MS = 12L * 60 * 60 * 1000;
    /** The app is on screen (MainActivity's onStart/onStop) */
    static volatile boolean onScreen = false;

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("vybe", Context.MODE_PRIVATE);
    }

    static long versionOf(PackageInfo info) {
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    static long installed(Context c) {
        try {
            return versionOf(c.getPackageManager().getPackageInfo(c.getPackageName(), 0));
        } catch (Exception e) {
            return Long.MAX_VALUE;
        }
    }

    static boolean mayInstall(Context c) {
        return Build.VERSION.SDK_INT >= 26 && c.getPackageManager().canRequestPackageInstalls();
    }

    /** The newest version on GitHub */
    static long latest() throws Exception {
        JSONObject info = new JSONObject(new String(download(RELEASE + "version.json", 64 * 1024), "UTF-8"));
        return info.optLong("versionCode", 0);
    }

    static UpdatePlan.Step plan(Context c, long latest, boolean inApp) {
        boolean wantedTap = prefs(c).getLong("updateWantedTap", 0) == latest;
        return UpdatePlan.next(Build.VERSION.SDK_INT, mayInstall(c), latest, installed(c), inApp, wantedTap);
    }

    /** Android wanted a tap for this version: ask next time the app is open */
    static void askNextTime(Context c, long version) {
        prefs(c).edit().putLong("updateWantedTap", version).putLong("updateChecked", 0).apply();
    }

    /** Downloads `version` (once) and checks it really is VYBE Control, that version or newer; null if not */
    static File fetch(Context c, long version) {
        File dir = new File(c.getCacheDir(), "updates");
        File file = new File(dir, "VYBE-Control-" + version + ".apk");
        if (isUpdate(c, file, version)) return file;
        try {
            if (!dir.exists() && !dir.mkdirs()) return null;
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) f.delete(); // earlier downloads aren't needed any more
            byte[] apk = download(RELEASE + "VYBE-Control.apk", 60 * 1024 * 1024);
            File part = new File(dir, file.getName() + ".part");
            try (OutputStream out = new FileOutputStream(part)) {
                out.write(apk);
            }
            if (!part.renameTo(file)) return null;
            return isUpdate(c, file, version) ? file : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean isUpdate(Context c, File file, long version) {
        if (!file.isFile()) return false;
        PackageInfo a = c.getPackageManager().getPackageArchiveInfo(file.getPath(), 0);
        return a != null && c.getPackageName().equals(a.packageName) && versionOf(a) >= version;
    }

    /**
     * Hands the update to Android's installer without asking (Android checks it's signed like this
     * app). Android closes the app to install it. The outcome arrives at UpdateDone.
     */
    static boolean install(Context c, File apk, long version) {
        PackageInstaller pi = c.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(c.getPackageName());
        params.setSize(apk.length());
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        int id = -1;
        try {
            id = pi.createSession(params);
            try (PackageInstaller.Session s = pi.openSession(id)) {
                try (OutputStream out = s.openWrite("VYBE-Control.apk", 0, apk.length()); InputStream in = new FileInputStream(apk)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    s.fsync(out);
                }
                Intent done = new Intent(c, UpdateDone.class).putExtra("version", version);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                s.commit(PendingIntent.getBroadcast(c, id, done, flags).getIntentSender());
            }
            return true;
        } catch (Exception e) {
            if (id >= 0) {
                try {
                    pi.abandonSession(id);
                } catch (Exception ignored) {
                }
            }
            askNextTime(c, version);
            return false;
        }
    }

    /** The twice-a-day check while the app is closed (UpdateJob) */
    static void backgroundCheck(Context c) {
        try {
            long latest = latest();
            if (plan(c, latest, onScreen) != UpdatePlan.Step.INSTALL_NOW) return;
            File apk = fetch(c, latest);
            if (apk != null && !onScreen) install(c, apk, latest);
        } catch (Exception ignored) {
            // No internet: the next check tries again
        }
    }

    /** Twice a day, also after the phone restarts (only where Android allows quiet updates) */
    static void schedule(Context c) {
        if (Build.VERSION.SDK_INT < UpdatePlan.QUIET_FROM || Build.VERSION.SDK_INT > UpdatePlan.QUIET_UP_TO) return;
        try {
            JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (js == null || js.getPendingJob(JOB_ID) != null) return;
            js.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(c, UpdateJob.class))
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPeriodic(JOB_EVERY_MS)
                    .setPersisted(true)
                    .build());
        } catch (Exception ignored) {
        }
    }

    static byte[] download(String address, int limit) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(address).openConnection();
        c.setInstanceFollowRedirects(true);
        c.setUseCaches(false);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                if (out.size() > limit) throw new Exception("too big");
            }
            return out.toByteArray();
        } finally {
            c.disconnect();
        }
    }
}
