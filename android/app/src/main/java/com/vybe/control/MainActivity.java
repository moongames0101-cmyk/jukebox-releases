package com.vybe.control;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Toast;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * VYBE Control: the jukebox owner's remote.
 *
 * The controls themselves are a page served by the jukebox (http://its-wifi-address:8787/control),
 * so they update whenever the jukebox does. This app remembers which jukebox to open, scans the
 * "Connect it to this jukebox" QR code in the jukebox admin, and shows a start screen when it
 * can't reach it.
 *
 * Opening it never leaves a blank screen: it shows "Connecting…", asks the Wi-Fi address and the
 * internet link at the same time (with short time limits), opens whichever answers, and otherwise
 * says why it can't reach the jukebox.
 *
 * The start screen lists the jukeboxes on the phone's Wi-Fi (Finder asks every address "who are
 * you?"). On the owner's phone it also lists every VYBE jukebox that's switched on, anywhere: each
 * jukebox posts a note sealed with the owner's key (Fleet), and only this phone can open them.
 */
public class MainActivity extends Activity {
    private static final String PREFS = "vybe";
    private static final String START = "file:///android_asset/start.html";
    /** Published with every new build of the app (see .github/workflows/phone-app.yml) */
    private static final String RELEASE = Updater.RELEASE;
    private static final long CHECK_EVERY_MS = 6L * 60 * 60 * 1000;
    /** How long each address gets to answer before the app gives up on it */
    private static final int WIFI_WAIT_MS = 3000;
    private static final int INTERNET_WAIT_MS = 8000;
    /** A jukebox page that hasn't finished loading by now is treated as unreachable */
    private static final long PAGE_WAIT_MS = 20000;

    private WebView web;
    private SharedPreferences prefs;
    /** True while trying the internet link after the Wi-Fi address didn't answer */
    private boolean triedInternet = false;
    private final Handler ui = new Handler(Looper.getMainLooper());
    /** Goes up with every attempt to open the jukebox, so answers to an older attempt are ignored */
    private int attempt = 0;
    private boolean pageLoaded = false;
    /** A search of this Wi-Fi, or a look at the owner's list, is running */
    private volatile boolean searching = false;
    private volatile boolean fleetBusy = false;
    private volatile boolean makingKey = false;
    /** What the last search of this Wi-Fi found: its address → what it said */
    private final Map<String, JSONObject> nearby = Collections.synchronizedMap(new HashMap<>());
    /** Each jukebox gets this long to answer "who are you?" during a search */
    private static final int HELLO_WAIT_MS = 900;
    /** A new version, downloaded and waiting to install quietly once the app is left */
    private File readyUpdate = null;
    private long readyVersion = 0;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        Updater.schedule(this);
        sayIfUpdated();

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0A0716"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setSupportZoom(false);
        s.setUserAgentString(s.getUserAgentString() + " VYBEControl/1");

        web.addJavascriptInterface(new Bridge(), "VybeApp");
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("vybe".equals(url.getScheme())) {
                    connectFrom(url);
                    return true;
                }
                if ("file".equals(url.getScheme())) return false;
                // Pages on the jukebox (its Wi-Fi address or its internet link) stay in the app;
                // anything else opens in the browser
                if (isJukebox(url, "local") || isJukebox(url, "internet")) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (!request.isForMainFrame()) return;
                String failed = request.getUrl().toString();
                if (failed.startsWith("file:")) return;
                // The Wi-Fi address didn't answer: try the internet link, if the jukebox has one
                String internet = prefs.getString("internet", "");
                if (!triedInternet && internet.length() > 0) {
                    triedInternet = true;
                    loadJukebox(controlUrl(internet));
                    return;
                }
                showStart("offline");
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (!request.isForMainFrame()) return;
                if (!isJukebox(request.getUrl(), "internet")) return;
                int code = response.getStatusCode();
                // 403: the jukebox has a new internet link. 5xx: the link isn't running any more.
                if (code == 403) showStart("expired");
                else if (code >= 500) showStart("offline");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (url != null && !url.startsWith("file:")) {
                    triedInternet = false;
                    pageLoaded = true;
                }
            }
        });

        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (data != null && "vybe".equals(data.getScheme())) connectFrom(data);
        else openJukebox();
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkForUpdate(false);
        // Back from Settings (e.g. after joining the pub's Wi-Fi): try again by itself
        String now = web.getUrl();
        if (now != null && now.startsWith(START) && now.contains("reason=offline")) openJukebox();
    }

    // ── Updates: a newer build on GitHub. Android 12 and newer: installed quietly once you leave the
    //    app (Updater). Otherwise, or if Android wants a tap: "Update VYBE Control?" → Android's installer

    /** Installing closes the app, so it waits a moment: the QR scanner or the share screen are only a quick trip away */
    private static final long INSTALL_AFTER_LEAVING_MS = 15000;
    private final Runnable installIfAway = () -> {
        if (!Updater.onScreen) installReadyUpdate();
    };

    @Override
    protected void onStart() {
        super.onStart();
        Updater.onScreen = true;
        ui.removeCallbacks(installIfAway); // back already: not now
    }

    @Override
    protected void onStop() {
        super.onStop();
        Updater.onScreen = false;
        if (!isChangingConfigurations() && readyUpdate != null) ui.postDelayed(installIfAway, INSTALL_AFTER_LEAVING_MS);
    }

    /** Left the app (or the screen went off): install the waiting update now. Android closes the app to do it. */
    private void installReadyUpdate() {
        final File file = readyUpdate;
        final long version = readyVersion;
        if (file == null) return;
        readyUpdate = null;
        final android.content.Context app = getApplicationContext();
        new Thread(() -> Updater.install(app, file, version)).start();
    }

    /** "VYBE Control updated" the first time a new version opens */
    private void sayIfUpdated() {
        long ran = prefs.getLong("ranVersion", 0), mine = myVersion();
        if (mine == Long.MAX_VALUE || mine == ran) return;
        prefs.edit().putLong("ranVersion", mine).apply();
        if (ran > 0 && mine > ran) {
            String name = "";
            try {
                name = " to " + getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception ignored) {
            }
            Toast.makeText(this, "VYBE Control updated" + name, Toast.LENGTH_SHORT).show();
        }
    }

    private long myVersion() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception e) {
            return Long.MAX_VALUE;
        }
    }

    private static byte[] download(String address, int limit) throws Exception {
        return Updater.download(address, limit);
    }

    private void checkForUpdate(boolean now) {
        long last = prefs.getLong("updateChecked", 0);
        if (!now && System.currentTimeMillis() - last < CHECK_EVERY_MS) return;
        prefs.edit().putLong("updateChecked", System.currentTimeMillis()).apply();
        new Thread(() -> {
            try {
                long latest = Updater.latest();
                UpdatePlan.Step step = Updater.plan(this, latest, true);
                if (step == UpdatePlan.Step.ASK) {
                    runOnUiThread(() -> offerUpdate(latest));
                } else if (step == UpdatePlan.Step.INSTALL_WHEN_LEFT) {
                    File file = Updater.fetch(this, latest);
                    if (file == null) {
                        prefs.edit().putLong("updateChecked", 0).apply(); // didn't download: try again next time
                        return;
                    }
                    runOnUiThread(() -> {
                        readyUpdate = file;
                        readyVersion = latest;
                        if (!Updater.onScreen) ui.postDelayed(installIfAway, INSTALL_AFTER_LEAVING_MS); // left while it downloaded
                    });
                }
            } catch (Exception ignored) {
                // No internet or nothing published yet: try again next time
            }
        }).start();
    }

    private void offerUpdate(long version) {
        if (isFinishing() || prefs.getLong("skipped", 0) == version) return;
        new AlertDialog.Builder(this)
                .setTitle("Update VYBE Control?")
                .setMessage("A new version of the app is ready. It only takes a few seconds.")
                .setPositiveButton("Update", (d, w) -> startUpdate(version))
                .setNegativeButton("Later", (d, w) -> prefs.edit().putLong("skipped", version).apply())
                .show();
    }

    private void startUpdate(long version) {
        // The first time, Android asks you to let VYBE Control install updates (after that, on
        // Android 12 and newer, it updates by itself)
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(this, "Allow VYBE Control to install updates, then come back to the app", Toast.LENGTH_LONG).show();
            Updater.askNextTime(this, version); // this one: ask again when they're back, as they're waiting for it
            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            return;
        }
        Toast.makeText(this, "Downloading the update…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                byte[] apk = download(RELEASE + "VYBE-Control.apk", 60 * 1024 * 1024);
                File dir = new File(getCacheDir(), "updates");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("no space");
                File file = new File(dir, "VYBE-Control.apk");
                try (OutputStream out = new FileOutputStream(file)) {
                    out.write(apk);
                }
                Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".updates", file);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                runOnUiThread(() -> startActivity(install));
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "The update didn't download. Try again later.", Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri data = intent.getData();
        if (data != null && "vybe".equals(data.getScheme())) connectFrom(data);
    }

    /** Whether a link points at the jukebox's saved "local" (Wi-Fi) or "internet" address */
    private boolean isJukebox(Uri url, String which) {
        String host = Uri.parse(prefs.getString(which, "")).getHost();
        return host != null && host.equals(url.getHost());
    }

    /** http://192.168.1.20:8787 → http://192.168.1.20:8787/control (keeping the internet link's access key) */
    private static String controlUrl(String base) {
        Uri u = Uri.parse(base);
        Uri.Builder b = u.buildUpon().path("/control");
        return b.build().toString();
    }

    private void openJukebox() {
        final String local = prefs.getString("local", "");
        final String internet = prefs.getString("internet", "");
        if (local.length() == 0 && internet.length() == 0) {
            showStart("");
            return;
        }
        showStart("connecting");
        final int mine = attempt;
        new Thread(() -> {
            // Ask both at once; the Wi-Fi address wins whenever it answers
            final int[] answer = {-1, -1};
            Thread wifi = new Thread(() -> answer[0] = local.length() > 0 ? ask(controlUrl(local), WIFI_WAIT_MS) : -1);
            Thread net = new Thread(() -> answer[1] = internet.length() > 0 ? ask(controlUrl(internet), INTERNET_WAIT_MS) : -1);
            wifi.start();
            net.start();
            try {
                wifi.join();
                if (answer[0] != 200) net.join();
            } catch (InterruptedException ignored) {
            }
            final String reason;
            final String open;
            if (answer[0] == 200) {
                open = controlUrl(local);
                reason = null;
            } else if (answer[1] == 200 || answer[1] == 302) {
                open = controlUrl(internet);
                reason = null;
            } else {
                open = null;
                reason = answer[1] == 403 ? "expired" : "offline";
            }
            ui.post(() -> {
                if (mine != attempt || isFinishing()) return; // something newer happened meanwhile
                if (open != null) {
                    triedInternet = open.equals(controlUrl(internet));
                    loadJukebox(open);
                } else {
                    showStart(reason);
                }
            });
            if (open != null) learnWhichJukebox(local, internet, answer[0] == 200 ? local : baseOf(internet));
        }).start();
    }

    /** Remember which jukebox this is, so the app can find it on the Wi-Fi again if its address changes */
    private void learnWhichJukebox(String local, String internet, String base) {
        String id = idOf(Finder.httpHello(base, 3000));
        if (id.length() == 0) return;
        // Only if it's still the jukebox the app was asked to open
        if (local.equals(prefs.getString("local", "")) && internet.equals(prefs.getString("internet", "")))
            prefs.edit().putString("id", id).apply();
    }

    /** https://x.trycloudflare.com/?k=… → https://x.trycloudflare.com ("" if it isn't a link) */
    private static String baseOf(String link) {
        if (!isWeb(link)) return "";
        Uri u = Uri.parse(link);
        return u.getScheme() + "://" + u.getEncodedAuthority();
    }

    /** The id in a jukebox's "who are you?" answer, or "" */
    private static String idOf(String hello) {
        if (!Finder.isJukebox(hello)) return "";
        try {
            return text(new JSONObject(hello), "id");
        } catch (Exception e) {
            return "";
        }
    }

    /** A string from a note ("" for anything else: org.json turns null into "null") */
    private static String text(JSONObject o, String key) {
        Object v = o == null ? null : o.opt(key);
        return v instanceof String ? (String) v : "";
    }

    /** The HTTP status an address answers with (302 = the internet link let us in), or 0 if it doesn't answer in time */
    private static int ask(String address, int waitMs) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(address).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setUseCaches(false);
            c.setConnectTimeout(waitMs);
            c.setReadTimeout(waitMs);
            c.setRequestProperty("User-Agent", "VYBEControl/1");
            return c.getResponseCode();
        } catch (Exception e) {
            return 0;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    /** Opens a jukebox page, and gives up (with the "can't reach" screen) if it hangs */
    private void loadJukebox(String url) {
        final int mine = ++attempt;
        pageLoaded = false;
        web.loadUrl(url);
        ui.postDelayed(() -> {
            if (mine == attempt && !pageLoaded) {
                web.stopLoading();
                showStart("offline");
            }
        }, PAGE_WAIT_MS);
    }

    private void showStart(String reason) {
        attempt++;
        boolean hasInternet = prefs.getString("internet", "").length() > 0;
        String url = START + "?reason=" + Uri.encode(reason) + "&jukebox=" + Uri.encode(prefs.getString("local", ""))
                + "&net=" + (hasInternet ? "1" : "0");
        web.loadUrl(url);
    }

    /** vybe://connect?l=http://192.168.1.20:8787&i=https://….trycloudflare.com/?k=… */
    private void connectFrom(Uri link) {
        String local = link.getQueryParameter("l");
        String internet = link.getQueryParameter("i");
        if (!isWeb(local) && !isWeb(internet)) {
            showStart("badcode");
            return;
        }
        prefs.edit()
                .putString("local", isWeb(local) ? local : "")
                .putString("internet", isWeb(internet) ? internet : "")
                .remove("id") // learnt once it's open
                .apply();
        openJukebox();
    }

    // ── The start screen's lists. Only the app's own start screen gets answers: never a page served
    //    by a jukebox (or by something on the Wi-Fi pretending to be one).

    private void onStartScreen(Runnable r) {
        runOnUiThread(() -> {
            String now = web.getUrl();
            if (!isFinishing() && now != null && now.startsWith(START)) r.run();
        });
    }

    /** window[fn](json) on the start screen */
    private void tellStart(String fn, String json) {
        final String js = "window." + fn + "&&window." + fn + "(" + JSONObject.quote(json) + ")";
        onStartScreen(() -> web.evaluateJavascript(js, null));
    }

    /** Every jukebox on this phone's Wi-Fi: each one appears as soon as it answers */
    private void findNearby() {
        if (searching) return;
        searching = true;
        new Thread(() -> {
            try {
                Object[] wifi = Finder.wifiAddress();
                if (wifi == null) {
                    tellStart("onNearby", "{\"wifi\":false,\"done\":true,\"found\":[]}");
                    return;
                }
                nearby.clear();
                final List<JSONObject> shown = Collections.synchronizedList(new ArrayList<>());
                tellStart("onNearby", nearbyJson(shown, false));
                List<String> hosts = Finder.hosts((byte[]) wifi[0], (Integer) wifi[1]);
                Finder.sweep(hosts, base -> Finder.httpHello(base, HELLO_WAIT_MS), 96, 9000, f -> {
                    JSONObject j = describe(f);
                    if (j == null) return;
                    synchronized (shown) {
                        for (JSONObject o : shown) if (text(o, "id").equals(text(j, "id"))) return; // the same jukebox twice
                        shown.add(j);
                    }
                    nearby.put(f.base, j);
                    tellStart("onNearby", nearbyJson(shown, false));
                });
                tellStart("onNearby", nearbyJson(shown, true));
                // The saved jukebox has a new Wi-Fi address (routers do that): use it
                final String saved = prefs.getString("id", "");
                if (saved.length() > 0) {
                    synchronized (shown) {
                        for (JSONObject j : shown) {
                            final String base = text(j, "base");
                            if (saved.equals(text(j, "id")) && !base.equals(prefs.getString("local", ""))) {
                                onStartScreen(() -> {
                                    prefs.edit().putString("local", base).apply();
                                    openJukebox();
                                });
                                break;
                            }
                        }
                    }
                }
            } finally {
                searching = false;
            }
        }).start();
    }

    private static JSONObject describe(Finder.Found f) {
        try {
            JSONObject hello = new JSONObject(f.hello);
            String id = text(hello, "id");
            if (id.length() == 0) return null;
            JSONObject j = new JSONObject();
            j.put("id", id);
            j.put("name", text(hello, "name").length() > 0 ? text(hello, "name") : "VYBE jukebox");
            j.put("version", text(hello, "version"));
            j.put("base", f.base);
            j.put("host", Uri.parse(f.base).getHost());
            return j;
        } catch (Exception e) {
            return null;
        }
    }

    private static String nearbyJson(List<JSONObject> shown, boolean done) {
        try {
            JSONArray list = new JSONArray();
            synchronized (shown) {
                List<JSONObject> sorted = new ArrayList<>(shown);
                sorted.sort((a, b) -> text(a, "name").compareToIgnoreCase(text(b, "name")));
                for (JSONObject j : sorted) list.put(j);
            }
            return new JSONObject().put("wifi", true).put("done", done).put("found", list).toString();
        } catch (Exception e) {
            return "{\"wifi\":true,\"done\":true,\"found\":[]}";
        }
    }

    /** Tapped a jukebox the search found */
    private void pickNearby(String base) {
        JSONObject j = nearby.get(base);
        if (j == null) return;
        String id = text(j, "id");
        SharedPreferences.Editor e = prefs.edit().putString("local", base).putString("id", id);
        // Picking the same jukebox again keeps its internet link
        if (!id.equals(prefs.getString("id", ""))) e.putString("internet", "");
        e.apply();
        openJukebox();
    }

    // ── The owner's phone: its key, and every jukebox that's checked in

    private PrivateKey ownerKey() {
        String t = prefs.getString("ownerKey", "");
        if (t.length() == 0) return null;
        try {
            return Fleet.readPrivate(t);
        } catch (Exception e) {
            return null;
        }
    }

    private void sendOwner() {
        String pem = prefs.getString("ownerPub", "");
        try {
            tellStart("onOwner", new JSONObject().put("owner", pem.length() > 0 && ownerKey() != null).put("key", pem).toString());
        } catch (Exception ignored) {
        }
    }

    /** Make this the owner's phone (once: the key it makes is the one the jukeboxes use) */
    private void makeOwner() {
        if (prefs.getString("ownerKey", "").length() > 0) {
            sendOwner();
            return;
        }
        if (makingKey) return; // a second tap: one key is enough
        makingKey = true;
        new Thread(() -> {
            try {
                KeyPair k = Fleet.newKey();
                prefs.edit()
                        .putString("ownerKey", Fleet.privateText(k.getPrivate()))
                        .putString("ownerPub", Fleet.publicPem(k.getPublic()))
                        .commit();
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Couldn't make the key. Try again.", Toast.LENGTH_LONG).show());
            } finally {
                makingKey = false;
            }
            sendOwner();
        }).start();
    }

    private void shareOwnerKey() {
        String pem = prefs.getString("ownerPub", "");
        if (pem.length() == 0) return;
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_SUBJECT, "VYBE owner key (fleet/owner-key.pem)");
        send.putExtra(Intent.EXTRA_TEXT, pem);
        try {
            startActivity(Intent.createChooser(send, "Share the owner key"));
        } catch (Exception ignored) {
        }
    }

    private void copyOwnerKey() {
        String pem = prefs.getString("ownerPub", "");
        if (pem.length() == 0) return;
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm == null) return;
        cm.setPrimaryClip(ClipData.newPlainText("VYBE owner key", pem));
        if (Build.VERSION.SDK_INT < 33) Toast.makeText(this, "Key copied", Toast.LENGTH_SHORT).show(); // Android 13 says so itself
    }

    private JSONObject knownJukeboxes() {
        try {
            return new JSONObject(prefs.getString("fleet", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /** Every jukebox that's checked in: first what the app knew last time, then fresh, checked live */
    private void loadFleet() {
        final PrivateKey key = ownerKey();
        final String pem = prefs.getString("ownerPub", "");
        if (key == null || pem.length() == 0) return;
        tellStart("onFleet", fleetJson(knownJukeboxes(), null, true, false));
        if (fleetBusy) return;
        fleetBusy = true;
        new Thread(() -> {
            try {
                JSONObject known = knownJukeboxes();
                boolean reached = false;
                try {
                    String topic = Fleet.topicFor(Fleet.readPublic(pem));
                    // Only what's new since last time (ntfy's own clock, with a few minutes to spare)
                    long polled = prefs.getLong("fleetPolled", 0), newest = polled;
                    String since = polled > 0 ? String.valueOf(polled - 300) : "all";
                    String lines = new String(download(Fleet.NTFY + topic + "/json?poll=1&since=" + since, 4 * 1024 * 1024), "UTF-8");
                    reached = true;
                    for (String line : lines.split("\n")) {
                        try {
                            JSONObject m = new JSONObject(line);
                            if (!"message".equals(text(m, "event"))) continue;
                            String opened = Fleet.open(text(m, "message"), key);
                            if (opened == null) continue; // not from one of the owner's jukeboxes
                            JSONObject note = new JSONObject(opened);
                            String id = text(note, "id");
                            if (id.length() == 0 || id.length() > 80) continue;
                            long heard = m.optLong("time", 0) * 1000;
                            newest = Math.max(newest, heard / 1000);
                            JSONObject old = known.optJSONObject(id);
                            if (old != null && old.optLong("heard", 0) >= heard) continue;
                            note.put("heard", heard);
                            known.put(id, note);
                        } catch (Exception ignored) {
                        }
                    }
                    prefs.edit().putString("fleet", known.toString()).putLong("fleetPolled", newest).apply();
                } catch (Exception ignored) {
                    // No internet, or ntfy didn't answer: still check the ones the app already knows
                }
                tellStart("onFleet", fleetJson(known, null, true, !reached));
                tellStart("onFleet", fleetJson(known, checkLive(known), false, !reached));
            } finally {
                fleetBusy = false;
            }
        }).start();
    }

    /** Asks each jukebox "who are you?" on its Wi-Fi address and its internet link: id → "wifi"/"internet" */
    private Map<String, String> checkLive(JSONObject known) {
        final Map<String, String> on = Collections.synchronizedMap(new HashMap<>());
        // All at once (a jukebox that's off takes the full wait), so a long list doesn't run out of time
        ExecutorService pool = Executors.newFixedThreadPool(Math.max(1, Math.min(48, known.length())));
        Iterator<String> ids = known.keys();
        while (ids.hasNext()) {
            final String id = ids.next();
            final JSONObject note = known.optJSONObject(id);
            if (note == null) continue;
            pool.execute(() -> {
                String local = text(note, "local");
                if (isWeb(local) && id.equals(idOf(Finder.httpHello(local, 1500)))) {
                    on.put(id, "wifi");
                    return;
                }
                String net = baseOf(text(note, "internet"));
                if (net.length() > 0 && id.equals(idOf(Finder.httpHello(net, 6000)))) on.put(id, "internet");
            });
        }
        pool.shutdown();
        try {
            pool.awaitTermination(12, TimeUnit.SECONDS);
        } catch (InterruptedException ignored) {
        }
        pool.shutdownNow();
        return on;
    }

    /** What the start screen shows: names and how each one is, never its links */
    private static String fleetJson(JSONObject known, Map<String, String> on, boolean checking, boolean stale) {
        try {
            JSONArray list = new JSONArray();
            Iterator<String> ids = known.keys();
            while (ids.hasNext()) {
                String id = ids.next();
                JSONObject n = known.optJSONObject(id);
                if (n == null) continue;
                JSONObject j = new JSONObject();
                j.put("id", id);
                j.put("name", text(n, "name").length() > 0 ? text(n, "name") : "VYBE jukebox");
                j.put("version", text(n, "version"));
                j.put("heard", n.optLong("heard", 0));
                j.put("net", isWeb(text(n, "internet")));
                j.put("wifi", isWeb(text(n, "local")));
                String via = on == null ? null : on.get(id);
                if (via != null) j.put("via", via);
                list.put(j);
            }
            return new JSONObject().put("checking", checking).put("stale", stale).put("jukeboxes", list).toString();
        } catch (Exception e) {
            return "{\"checking\":false,\"stale\":true,\"jukeboxes\":[]}";
        }
    }

    /** Tapped one of the owner's jukeboxes */
    private void pickFleet(String id) {
        JSONObject note = knownJukeboxes().optJSONObject(id == null ? "" : id);
        if (note == null) return;
        String local = text(note, "local"), internet = text(note, "internet");
        if (!isWeb(local) && !isWeb(internet)) return;
        prefs.edit()
                .putString("local", isWeb(local) ? local : "")
                .putString("internet", isWeb(internet) ? internet : "")
                .putString("id", id)
                .apply();
        openJukebox();
    }

    private static boolean isWeb(String s) {
        return s != null && (s.startsWith("http://") || s.startsWith("https://"));
    }

    /** Google's QR code scanner (Google Play services): it handles the camera itself */
    private void scan() {
        try {
            GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .build();
            GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(this, options);
            scanner.startScan()
                    .addOnSuccessListener(barcode -> scanned(barcode.getRawValue()))
                    .addOnFailureListener(e -> showStart("scanfail"));
        } catch (Exception e) {
            showStart("scanfail");
        }
    }

    private void scanned(String text) {
        if (text == null) return;
        Uri u = Uri.parse(text.trim());
        if ("vybe".equals(u.getScheme())) connectFrom(u);
        else showStart("badcode");
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /** What the start screen and the control page can ask the app to do */
    private class Bridge {
        @JavascriptInterface
        public void scan() {
            runOnUiThread(MainActivity.this::scan);
        }

        /** Typed in by hand: "192.168.1.20:8787" or a full address */
        @JavascriptInterface
        public void connect(String address) {
            String a = address == null ? "" : address.trim();
            if (a.length() == 0) return;
            if (!a.startsWith("http://") && !a.startsWith("https://")) a = "http://" + a;
            if (Uri.parse(a).getPort() == -1 && a.startsWith("http://")) a = a.replaceAll("/+$", "") + ":8787";
            final String local = a;
            runOnUiThread(() -> {
                prefs.edit().putString("local", local).putString("internet", "").remove("id").apply();
                openJukebox();
            });
        }

        /** Look for jukeboxes on this Wi-Fi; answers window.onNearby({wifi, done, found: [...]}) */
        @JavascriptInterface
        public void findNearby() {
            onStartScreen(MainActivity.this::findNearby);
        }

        /** Open a jukebox the search found (its address, e.g. http://192.168.1.20:8787) */
        @JavascriptInterface
        public void pickNearby(String base) {
            onStartScreen(() -> MainActivity.this.pickNearby(base));
        }

        /** Whether this is the owner's phone; answers window.onOwner({owner, key}) */
        @JavascriptInterface
        public void ownerState() {
            onStartScreen(MainActivity.this::sendOwner);
        }

        @JavascriptInterface
        public void makeOwner() {
            onStartScreen(MainActivity.this::makeOwner);
        }

        @JavascriptInterface
        public void shareOwnerKey() {
            onStartScreen(MainActivity.this::shareOwnerKey);
        }

        @JavascriptInterface
        public void copyOwnerKey() {
            onStartScreen(MainActivity.this::copyOwnerKey);
        }

        /** The owner's jukeboxes; answers window.onFleet({checking, stale, jukeboxes: [...]}) */
        @JavascriptInterface
        public void loadFleet() {
            onStartScreen(MainActivity.this::loadFleet);
        }

        @JavascriptInterface
        public void pickFleet(String id) {
            onStartScreen(() -> MainActivity.this.pickFleet(id));
        }

        @JavascriptInterface
        public void retry() {
            runOnUiThread(MainActivity.this::openJukebox);
        }

        /** "Connect to a different jukebox": forgets this one (the owner's key and list stay) */
        @JavascriptInterface
        public void forget() {
            runOnUiThread(() -> {
                prefs.edit().remove("local").remove("internet").remove("id").apply();
                web.clearHistory();
                showStart("");
            });
        }
    }
}
