package com.vybe.control;

import java.io.ByteArrayOutputStream;

/** Standard base64, in plain Java: java.util.Base64 needs Android 8, and this app runs on Android 7 too */
final class B64 {
    private B64() {}

    private static final char[] A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".toCharArray();
    private static final int[] V = new int[128];
    static {
        java.util.Arrays.fill(V, -1);
        for (int i = 0; i < A.length; i++) V[A[i]] = i;
    }

    static String encode(byte[] b) {
        StringBuilder s = new StringBuilder((b.length + 2) / 3 * 4);
        for (int i = 0; i < b.length; i += 3) {
            int n = (b[i] & 0xff) << 16 | (i + 1 < b.length ? (b[i + 1] & 0xff) << 8 : 0) | (i + 2 < b.length ? b[i + 2] & 0xff : 0);
            s.append(A[n >>> 18 & 63]).append(A[n >>> 12 & 63]);
            s.append(i + 1 < b.length ? A[n >>> 6 & 63] : '=');
            s.append(i + 2 < b.length ? A[n & 63] : '=');
        }
        return s.toString();
    }

    /** Ignores whitespace; throws on anything that isn't base64 */
    static byte[] decode(String s) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(s.length() * 3 / 4);
        int buf = 0, bits = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '=') break;
            if (c == ' ' || c == '\n' || c == '\r' || c == '\t') continue;
            int v = c < 128 ? V[c] : -1;
            if (v < 0) throw new IllegalArgumentException("not base64");
            buf = buf << 6 | v;
            bits += 6;
            if (bits >= 8) { bits -= 8; out.write(buf >>> bits & 0xff); }
        }
        return out.toByteArray();
    }
}
