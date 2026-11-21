package com.vybe.control;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * The owner's list of every VYBE jukebox that's on. Each jukebox posts a note to ntfy.sh sealed with
 * the owner's public key (electron/fleet.cjs in the jukebox); this phone holds the private key and
 * opens them. Note: "v1.key.iv.tag.data" in base64: an AES-256-GCM key sealed with RSA-OAEP (SHA-1),
 * then the note itself encrypted with that key. Plain Java, so it can be tested off the phone.
 */
final class Fleet {
    private Fleet() {}

    static final String NTFY = "https://ntfy.sh/";

    static KeyPair newKey() throws Exception {
        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
        g.initialize(2048);
        return g.generateKeyPair();
    }

    /** The public half as the PEM text the jukeboxes read (fleet/owner-key.pem in the releases repo) */
    static String publicPem(PublicKey key) {
        String b64 = B64.encode(key.getEncoded());
        StringBuilder out = new StringBuilder("-----BEGIN PUBLIC KEY-----\n");
        for (int i = 0; i < b64.length(); i += 64) out.append(b64, i, Math.min(b64.length(), i + 64)).append('\n');
        return out.append("-----END PUBLIC KEY-----\n").toString();
    }

    static PublicKey readPublic(String pem) throws Exception {
        String b64 = pem.replaceAll("-----[A-Z ]+-----", "").replaceAll("\\s", "");
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(B64.decode(b64)));
    }

    static String privateText(PrivateKey key) {
        return B64.encode(key.getEncoded());
    }

    static PrivateKey readPrivate(String text) throws Exception {
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(B64.decode(text.trim())));
    }

    /** The ntfy topic the jukeboxes post to: from the key, so it's the same everywhere and can't be guessed */
    static String topicFor(PublicKey key) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(key.getEncoded());
        StringBuilder hex = new StringBuilder("vybe-");
        for (int i = 0; i < 16; i++) hex.append(String.format("%02x", hash[i] & 0xff));
        return hex.toString();
    }

    /** Open a note: the jukebox's JSON, or null if it isn't one of ours (anyone can post to a topic) */
    static String open(String note, PrivateKey key) {
        try {
            String[] p = note.trim().split("\\.");
            if (p.length != 5 || !"v1".equals(p[0])) return null;
            Cipher rsa = Cipher.getInstance("RSA/ECB/OAEPWithSHA-1AndMGF1Padding");
            rsa.init(Cipher.DECRYPT_MODE, key);
            byte[] aesKey = rsa.doFinal(B64.decode(p[1]));
            byte[] iv = B64.decode(p[2]), tag = B64.decode(p[3]), data = B64.decode(p[4]);
            byte[] sealed = Arrays.copyOf(data, data.length + tag.length);
            System.arraycopy(tag, 0, sealed, data.length, tag.length);
            Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
            aes.init(Cipher.DECRYPT_MODE, new SecretKeySpec(aesKey, "AES"), new GCMParameterSpec(128, iv));
            return new String(aes.doFinal(sealed), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }
}
