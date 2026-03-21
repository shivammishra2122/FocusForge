const { withAndroidManifest, withMainApplication, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withAppBlocker(config) {
  // 1. Add permissions and service to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const mainApp = manifest.manifest;

    if (!mainApp['uses-permission']) mainApp['uses-permission'] = [];
    const perms = mainApp['uses-permission'];

    const requiredPerms = [
      'android.permission.PACKAGE_USAGE_STATS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];

    requiredPerms.forEach((perm) => {
      if (!perms.some((p) => p.$?.['android:name'] === perm)) {
        perms.push({ $: { 'android:name': perm } });
      }
    });

    const application = mainApp.application?.[0];
    if (application) {
      if (!application.service) application.service = [];
      if (!application.activity) application.activity = [];

      if (!application.service.some((s) => s.$?.['android:name'] === '.AppBlockerService')) {
        application.service.push({
          $: {
            'android:name': '.AppBlockerService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'specialUse',
          },
        });
      }

      if (!application.activity.some((a) => a.$?.['android:name'] === '.BlockingActivity')) {
        application.activity.push({
          $: {
            'android:name': '.BlockingActivity',
            'android:theme': '@style/Theme.AppCompat.NoActionBar',
            'android:exported': 'false',
            'android:excludeFromRecents': 'true',
            'android:launchMode': 'singleInstance',
          },
        });
      }
    }

    return config;
  });

  // 2. Register package in MainApplication.kt
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('import com.focusforge.app.AppBlockerPackage')) {
      contents = contents.replace(
        /import expo\.modules\.ReactNativeHostWrapper/,
        'import expo.modules.ReactNativeHostWrapper\nimport com.focusforge.app.AppBlockerPackage'
      );
    }
    if (!contents.includes('add(AppBlockerPackage())')) {
      contents = contents.replace(
        /\/\/ add\(MyReactNativePackage\(\)\)/,
        '// add(MyReactNativePackage())\n              add(AppBlockerPackage())'
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  // 3. Copy source files into the android directory
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const pluginDir = path.join(projectRoot, 'plugins/focusforge-blocker/android');
      const targetDir = path.join(projectRoot, 'android/app/src/main/java/com/focusforge/app');

      if (fs.existsSync(pluginDir)) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const files = fs.readdirSync(pluginDir);
        for (const file of files) {
          const src = path.join(pluginDir, file);
          const dest = path.join(targetDir, file);
          fs.copyFileSync(src, dest);
        }
      }
      return config;
    },
  ]);

  return config;
}

module.exports = withAppBlocker;

