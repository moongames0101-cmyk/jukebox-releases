package com.vybe.control;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** The twice-a-day update check, so VYBE Control stays up to date even if it isn't opened */
public class UpdateJob extends JobService {
    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            try {
                Updater.backgroundCheck(getApplicationContext());
            } finally {
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true; // stopped part way (e.g. the Wi-Fi went): try again later
    }
}
