package com.vybe.control;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

/**
 * VYBE Control: the jukebox owner's remote.
 *
 * The controls themselves are a page served by the jukebox (http://its-wifi-address:8787/control),
 * so they update whenever the jukebox does. This app remembers which jukebox to open, scans the
 * "Connect it to this jukebox" QR code in the jukebox admin, and shows a start screen when it
 * can't reach it.
 */
public class MainActivity extends Activity {
    private static final String PREFS = "vybe";
    private static final String START = "file:///android_asset/start.html";

    private WebView web;
    private SharedPreferences prefs;
    /** True while trying the internet link after the Wi-Fi address didn't answer */
    private boolean triedInternet = false;

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
                // Pages on the jukebox stay in the app; anything else opens in the browser
                Uri home = Uri.parse(currentBase());
                if (home.getHost() != null && home.getHost().equals(url.getHost())) return false;
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
                    view.loadUrl(controlUrl(internet));
                    return;
                }
                showStart("offline");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (url != null && !url.startsWith("file:")) triedInternet = false;
            }
        });

        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (data != null && "vybe".equals(data.getScheme())) connectFrom(data);
        else openJukebox();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri data = intent.getData();
        if (data != null && "vybe".equals(data.getScheme())) connectFrom(data);
    }

    /** The jukebox's Wi-Fi address (or the internet link when there's no Wi-Fi one) */
    private String currentBase() {
        String local = prefs.getString("local", "");
        return local.length() > 0 ? local : prefs.getString("internet", "");
    }

    /** http://192.168.1.20:8787 → http://192.168.1.20:8787/control (keeping the internet link's access key) */
    private static String controlUrl(String base) {
        Uri u = Uri.parse(base);
        Uri.Builder b = u.buildUpon().path("/control");
        return b.build().toString();
    }

    private void openJukebox() {
        String base = currentBase();
        if (base.length() == 0) {
            showStart("");
            return;
        }
        triedInternet = prefs.getString("local", "").length() == 0;
        web.loadUrl(controlUrl(base));
    }

    private void showStart(String reason) {
        String url = START + "?reason=" + Uri.encode(reason) + "&jukebox=" + Uri.encode(currentBase());
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
