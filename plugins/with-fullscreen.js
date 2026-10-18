// Fullscreen immersive mode (system bars hidden, swipe to show them briefly), copied from ganja-farmer.
const { withAndroidStyles, withMainActivity } = require('@expo/config-plugins');

const IMPORTS = [
  'import android.view.WindowManager',
  'import androidx.core.view.WindowCompat',
  'import androidx.core.view.WindowInsetsCompat',
  'import androidx.core.view.WindowInsetsControllerCompat',
];

const IMMERSIVE = `
    // Fullscreen immersive mode (plugins/with-fullscreen.js)
    WindowCompat.setDecorFitsSystemWindows(window, false)
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.hide(WindowInsetsCompat.Type.systemBars())
    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)`;

function withImmersiveActivity(config) {
  return withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (cfg.modResults.language !== 'kt') throw new Error('with-fullscreen: MainActivity must be Kotlin');
    for (const imp of IMPORTS) {
      if (!contents.includes(imp)) contents = contents.replace('import com.facebook.react.ReactActivity', `${imp}\nimport com.facebook.react.ReactActivity`);
    }
    if (!contents.includes('WindowCompat.setDecorFitsSystemWindows')) {
      const anchor = /super\.onCreate\([^)]*\)/;
      if (!anchor.test(contents)) throw new Error('with-fullscreen: super.onCreate(...) not found in MainActivity');
      contents = contents.replace(anchor, (call) => `${call}\n${IMMERSIVE}`);
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withImmersiveTheme(config) {
  return withAndroidStyles(config, (cfg) => {
    const theme = cfg.modResults.resources.style?.find((s) => s.$.name === 'AppTheme');
    if (theme) {
      const items = theme.item || [];
      const add = (name, value, extra) => {
        if (!items.find((i) => i.$.name === name)) items.push({ _: value, $: { name, ...extra } });
      };
      add('android:windowTranslucentNavigation', 'true');
      add('android:enforceNavigationBarContrast', 'false', { 'tools:targetApi': '29' });
      theme.item = items;
    }
    return cfg;
  });
}

module.exports = function withFullscreen(config) {
  return withImmersiveTheme(withImmersiveActivity(config));
};
