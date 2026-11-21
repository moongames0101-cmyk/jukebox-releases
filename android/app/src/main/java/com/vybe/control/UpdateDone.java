package com.vybe.control;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

/** How a quiet update went. If Android wants a tap after all, the app asks next time it's open. */
public class UpdateDone extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        int status = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        long version = i.getLongExtra("version", 0);
        if (status == PackageInstaller.STATUS_SUCCESS) return; // installed
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION && Updater.onScreen) {
            Intent confirm = i.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                try {
                    c.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return;
                } catch (Exception ignored) {
                }
            }
        }
        // Wanted a tap while the app was closed, or didn't install: the old "Update VYBE Control?" way next time
        Updater.askNextTime(c, version);
    }
}
