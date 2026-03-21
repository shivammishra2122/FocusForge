package com.focusforge.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.util.ArrayList;
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Foreground service that polls UsageStatsManager every 500ms to detect
 * if a blocked app is in the foreground. If detected, launches BlockingActivity
 * and sends the user to the Home screen.
 */
public class AppBlockerService extends Service {

    private static final String CHANNEL_ID = "focusforge_blocker";
    private static final int NOTIFICATION_ID = 1001;
    private static final long POLL_INTERVAL_MS = 500;

    private Handler handler;
    private Runnable pollRunnable;
    private ArrayList<String> blockedApps = new ArrayList<>();
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if ("STOP".equals(action)) {
                stopMonitoring();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            ArrayList<String> apps = intent.getStringArrayListExtra("blocked_apps");
            if (apps != null) {
                blockedApps = apps;
            }
        }

        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);
        startMonitoring();

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopMonitoring();
        super.onDestroy();
    }

    private void startMonitoring() {
        if (isRunning) return;
        isRunning = true;

        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isRunning) return;

                String foregroundApp = getForegroundApp();
                if (foregroundApp != null && blockedApps.contains(foregroundApp)) {
                    // Send user home
                    Intent homeIntent = new Intent(Intent.ACTION_MAIN);
                    homeIntent.addCategory(Intent.CATEGORY_HOME);
                    homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(homeIntent);

                    // Launch blocking activity
                    Intent blockIntent = new Intent(AppBlockerService.this, BlockingActivity.class);
                    blockIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    blockIntent.putExtra("blocked_app_name", foregroundApp);
                    startActivity(blockIntent);
                }

                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        };

        handler.post(pollRunnable);
    }

    private void stopMonitoring() {
        isRunning = false;
        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
        }
    }

    private String getForegroundApp() {
        UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        long now = System.currentTimeMillis();
        List<UsageStats> stats = usm.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            now - 10000,
            now
        );

        if (stats == null || stats.isEmpty()) return null;

        SortedMap<Long, UsageStats> sortedMap = new TreeMap<>();
        for (UsageStats stat : stats) {
            sortedMap.put(stat.getLastTimeUsed(), stat);
        }

        if (!sortedMap.isEmpty()) {
            return sortedMap.get(sortedMap.lastKey()).getPackageName();
        }
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "FocusForge Blocker",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Active during focus sessions to block distracting apps");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
            .setContentTitle("Focus Session Active")
            .setContentText("Distracting apps are blocked")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build();
    }
}
