package com.vybe.control;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Finds VYBE jukeboxes on the Wi-Fi this phone is on: asks every address on the network
 * "who are you?" (GET /api/hello on the jukebox's phone port) and keeps the ones that answer
 * as a jukebox. Plain Java, so it can be tested off the phone.
 */
final class Finder {
    private Finder() {}

    /** The jukebox's phone port, and the next one it uses if that's taken */
    static final int[] PORTS = {8787, 8788};

    /** Asks one address; returns what it answered, or null */
    interface Probe {
        String hello(String base);
    }

    /** One jukebox that answered */
    static final class Found {
        final String base;   // http://192.168.1.20:8787
        final String hello;  // its answer (JSON)
        Found(String base, String hello) { this.base = base; this.hello = hello; }
    }

    /** This phone's Wi-Fi address and network size, e.g. {192.168.1.37, 24}, or null if not on a network */
    static Object[] wifiAddress() {
        try {
            Object[] best = null;
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback() || ni.isVirtual()) continue;
                String name = ni.getName() == null ? "" : ni.getName();
                if (name.startsWith("rmnet") || name.startsWith("ccmni") || name.startsWith("tun")) continue; // mobile data, VPNs
                for (InterfaceAddress a : ni.getInterfaceAddresses()) {
                    InetAddress ip = a.getAddress();
                    if (!(ip instanceof Inet4Address) || !ip.isSiteLocalAddress()) continue;
                    Object[] here = {ip.getAddress(), (int) a.getNetworkPrefixLength()};
                    if (name.startsWith("wlan")) return here;
                    if (best == null) best = here;
                }
            }
            return best;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Every other address on the phone's network. Big networks are cut down to the 254 addresses
     * around the phone (a pub's Wi-Fi is almost always one of those).
     */
    static List<String> hosts(byte[] ip, int prefix) {
        List<String> out = new ArrayList<>();
        if (ip == null || ip.length != 4) return out;
        int me = ((ip[0] & 0xff) << 24) | ((ip[1] & 0xff) << 16) | ((ip[2] & 0xff) << 8) | (ip[3] & 0xff);
        int bits = Math.max(24, Math.min(prefix, 30));
        int mask = bits == 0 ? 0 : -1 << (32 - bits);
        int net = me & mask, size = 1 << (32 - bits);
        for (int i = 1; i < size - 1; i++) {
            int a = net + i;
            if (a == me) continue;
            out.add(((a >>> 24) & 0xff) + "." + ((a >>> 16) & 0xff) + "." + ((a >>> 8) & 0xff) + "." + (a & 0xff));
        }
        return out;
    }

    /** Told about each jukebox the moment it answers (on the search's own threads) */
    interface OnFound {
        void found(Found f);
    }

    /** Ask every host on every jukebox port at once; give up after `waitMs`. `onFound` may be null. */
    static List<Found> sweep(List<String> hosts, Probe probe, int threads, long waitMs, OnFound onFound) {
        final List<Found> found = Collections.synchronizedList(new ArrayList<>());
        ExecutorService pool = Executors.newFixedThreadPool(Math.max(1, threads));
        for (int port : PORTS) {
            for (String h : hosts) {
                final String base = "http://" + h + ":" + port;
                pool.execute(() -> {
                    String answer = null;
                    try { answer = probe.hello(base); } catch (Exception ignored) { }
                    if (!isJukebox(answer)) return;
                    Found f = new Found(base, answer);
                    found.add(f);
                    if (onFound != null) {
                        try { onFound.found(f); } catch (Exception ignored) { }
                    }
                });
            }
        }
        pool.shutdown();
        try { pool.awaitTermination(waitMs, TimeUnit.MILLISECONDS); } catch (InterruptedException ignored) { }
        pool.shutdownNow();
        synchronized (found) {
            List<Found> out = new ArrayList<>(found);
            out.sort((a, b) -> a.base.compareTo(b.base));
            return out;
        }
    }

    /** A real VYBE jukebox's answer (not any web server that happens to be on that port) */
    static boolean isJukebox(String answer) {
        return answer != null && answer.length() < 4000 && answer.contains("\"vybe\":\"jukebox\"");
    }

    /** GET base/api/hello with short time limits; the answer, or null */
    static String httpHello(String base, int timeoutMs) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(base + "/api/hello").openConnection();
            c.setConnectTimeout(timeoutMs);
            c.setReadTimeout(timeoutMs);
            c.setInstanceFollowRedirects(false);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) return null;
            try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buf = new byte[2048];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    if (out.size() > 4000) return null;
                }
                return new String(out.toByteArray(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }
}
