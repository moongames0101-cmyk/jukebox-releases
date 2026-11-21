package com.vybe.control;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * "Listen on this phone": while the jukebox's song is playing on this phone, this keeps the app
 * running with the screen off (Android stops background apps otherwise), shows a "Listening"
 * notification with Stop, and keeps the phone's Wi-Fi awake so the song keeps coming.
 */
public class ListenService extends Service {
    static final String STOP = "com.vybe.control.STOP_LISTENING";
    private static final String CHANNEL = "listening";
    private static final int ID = 2112;
    static volatile boolean running = false;

    private PowerManager.WakeLock cpu;
    private WifiManager.WifiLock wifi;

    /** Start (from the app, while it's on screen), or show the new song if it's already going */
    static void show(Context c, String text) {
        if (running) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(ID, notification(c, text));
            return;
        }
        Intent i = new Intent(c, ListenService.class).putExtra("text", text);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
            else c.startService(i);
        } catch (Exception ignored) {
            // Android won't start it from the background: it plays while the app is open
        }
    }

    static void hide(Context c) {
        if (running) c.stopService(new Intent(c, ListenService.class));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && STOP.equals(intent.getAction())) {
            MainActivity.stopListeningFromNotification(); // the page stops the song (and tells us)
            stopSelf();
            return START_NOT_STICKY;
        }
        String text = intent != null ? intent.getStringExtra("text") : null;
        Notification n = notification(this, text);
        if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(ID, n);
        running = true;
        holdAwake();
        return START_NOT_STICKY;
    }

    private void holdAwake() {
        try {
            if (cpu == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                cpu = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VYBEControl:listening");
                cpu.setReferenceCounted(false);
                cpu.acquire(6 * 60 * 60 * 1000L); // never more than a night
            }
            if (wifi == null) {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                @SuppressWarnings("deprecation")
                int mode = Build.VERSION.SDK_INT >= 29 ? WifiManager.WIFI_MODE_FULL_LOW_LATENCY : WifiManager.WIFI_MODE_FULL_HIGH_PERF;
                wifi = wm.createWifiLock(mode, "VYBEControl:listening");
                wifi.setReferenceCounted(false);
                wifi.acquire();
            }
        } catch (Exception ignored) {
        }
    }

    static Notification notification(Context c, String text) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Listening on this phone", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("Shows while the jukebox's music plays on this phone");
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        }
        int immutable = Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
        PendingIntent open = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), immutable);
        PendingIntent stop = PendingIntent.getService(c, 1, new Intent(c, ListenService.class).setAction(STOP), immutable);
        @SuppressWarnings("deprecation")
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_listen)
                .setContentTitle("Listening to the jukebox")
                .setContentText(text == null || text.isEmpty() ? "VYBE Control" : text)
                .setContentIntent(open)
                .setOngoing(true)
                .setShowWhen(false)
                .setColor(0xFF9A3DFF)
                .addAction(new Notification.Action.Builder(null, "Stop", stop).build());
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopSelf(); // the app was swiped away: the music went with it
    }

    @Override
    public void onDestroy() {
        running = false;
        try {
            if (cpu != null && cpu.isHeld()) cpu.release();
            if (wifi != null && wifi.isHeld()) wifi.release();
        } catch (Exception ignored) {
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
