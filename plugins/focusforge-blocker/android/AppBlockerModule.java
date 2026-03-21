package com.focusforge.app;

import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.app.AppOpsManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;

import java.util.ArrayList;
import java.util.List;

/**
 * Native bridge module for Android app blocking.
 *
 * Provides:
 * - startBlocking(blockedApps[]) — starts foreground service to monitor foreground app
 * - stopBlocking() — stops the monitoring service
 * - hasUsagePermission() — checks if PACKAGE_USAGE_STATS is granted
 * - openUsageSettings() — opens the Usage Access settings screen
 */
public class AppBlockerModule extends ReactContextBaseJavaModule {

    public AppBlockerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AppBlockerModule";
    }

    @ReactMethod
    public void startBlocking(ReadableArray blockedApps, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            ArrayList<String> packageNames = new ArrayList<>();
            for (int i = 0; i < blockedApps.size(); i++) {
                packageNames.add(blockedApps.getString(i));
            }

            Intent intent = new Intent(context, AppBlockerService.class);
            intent.putStringArrayListExtra("blocked_apps", packageNames);
            intent.setAction("START");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("BLOCKING_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopBlocking(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent intent = new Intent(context, AppBlockerService.class);
            intent.setAction("STOP");
            context.startService(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("BLOCKING_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void hasUsagePermission(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.getPackageName()
            );
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void openUsageSettings(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SETTINGS_ERROR", e.getMessage());
        }
    }
}
