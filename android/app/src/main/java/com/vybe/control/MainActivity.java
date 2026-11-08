package com.vybe.control;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
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

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

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
 */
public class MainActivity extends Activity {
    private static final String PREFS = "vybe";
    private static final String START = "file:///android_asset/start.html";
    /** Published with every new build of the app (see .github/workflows/phone-app.yml) */
    private static final String RELEASE = "https://github.com/moongames0101-cmyk/jukebox-releases/releases/download/phone-app/";
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

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

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

    // ── Updates: a newer build on GitHub → "Update VYBE Control?" → Android's installer

    private long myVersion() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception e) {
            return Long.MAX_VALUE;
        }
    }

    private static byte[] download(String address, int limit) throws Exception {
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

    private void checkForUpdate(boolean now) {
        long last = prefs.getLong("updateChecked", 0);
        if (!now && System.currentTimeMillis() - last < CHECK_EVERY_MS) return;
        prefs.edit().putLong("updateChecked", System.currentTimeMillis()).apply();
        new Thread(() -> {
            try {
                JSONObject info = new JSONObject(new String(download(RELEASE + "version.json", 64 * 1024), "UTF-8"));
                long latest = info.optLong("versionCode", 0);
                if (latest > myVersion()) runOnUiThread(() -> offerUpdate(latest));
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
                .setPositiveButton("Update", (d, w) -> startUpdate())
                .setNegativeButton("Later", (d, w) -> prefs.edit().putLong("skipped", version).apply())
                .show();
    }

    private void startUpdate() {
        // The first time, Android asks you to let VYBE Control install updates
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(this, "Allow VYBE Control to install updates, then come back to the app", Toast.LENGTH_LONG).show();
            prefs.edit().putLong("updateChecked", 0).apply(); // ask again when they're back
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
        }).start();
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
                prefs.edit().putString("local", local).putString("internet", "").apply();
                openJukebox();
            });
        }

        @JavascriptInterface
        public void retry() {
            runOnUiThread(MainActivity.this::openJukebox);
        }

        /** "Connect to a different jukebox" */
        @JavascriptInterface
        public void forget() {
            runOnUiThread(() -> {
                prefs.edit().clear().apply();
                web.clearHistory();
                showStart("");
            });
        }
    }
}
