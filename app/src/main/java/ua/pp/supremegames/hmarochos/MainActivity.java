package ua.pp.supremegames.hmarochos;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.content.pm.PackageManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/** «Мій Хмарочос» — повноекранна обгортка для веб-гри. */
public class MainActivity extends Activity {
    static final String GAME_URL = "https://supremegamescompany.pp.ua/games2/";
    static final String GAME_HOST = "supremegamescompany.pp.ua";
    WebView web; ImageView splash; LinearLayout offline; FrameLayout root;
    boolean loadedOk = false, failed = false, visible = false; long backAt = 0;
    String pendingOpen = null; // куди перейти після натискання на сповіщення
    final Handler h = new Handler();

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w.setStatusBarColor(Color.parseColor("#0a1236"));
        w.setNavigationBarColor(Color.parseColor("#0a1236"));
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0a1236"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0a1236"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " MyHmarochosApp/1.1");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @SuppressWarnings("deprecation")
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                Uri u = Uri.parse(url);
                if (u.getHost() != null && u.getHost().endsWith(GAME_HOST)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) {}
                return true;
            }
            @Override public void onPageStarted(WebView v, String url, Bitmap f) { failed = false; }
            @Override public void onPageFinished(WebView v, String url) {
                if (failed) return;
                loadedOk = true; hideSplash(); offline.setVisibility(View.GONE); web.setVisibility(View.VISIBLE);
                jsTokenChanged(); deliverOpen();
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) { failed = true; showOffline(); }
            }
        });
        web.addJavascriptInterface(new Bridge(), "HmApp"); // гра бачить застосунок через window.HmApp
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));

        offline = buildOffline();
        offline.setVisibility(View.GONE);
        root.addView(offline, new FrameLayout.LayoutParams(-1, -1));

        splash = new ImageView(this);
        splash.setImageResource(R.drawable.splash);
        splash.setScaleType(ImageView.ScaleType.CENTER_CROP);
        root.addView(splash, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        immersive();

        if (b != null) web.restoreState(b);
        else if (online()) web.loadUrl(GAME_URL);
        else { failed = true; h.postDelayed(new Runnable() { public void run() { showOffline(); } }, 700); }
        // заставка не довше 6 секунд
        h.postDelayed(new Runnable() { public void run() { hideSplash(); } }, 6000);

        // пуш-сповіщення: канали, токен, дозвіл (Android 13+ питає гравця один раз)
        Push.active = this; Push.channels(this); Push.fetchToken(this);
        takeOpen(getIntent());
        h.postDelayed(new Runnable() { public void run() { askNotifications(false); } }, 9000);
    }

    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); takeOpen(i); deliverOpen(); }
    void takeOpen(Intent i) { if (i != null && i.getStringExtra("open") != null) { pendingOpen = i.getStringExtra("open"); i.removeExtra("open"); } }
    void deliverOpen() {
        if (pendingOpen == null || !loadedOk) return;
        String t = pendingOpen.replaceAll("[^a-zA-Z0-9:_-]", ""); pendingOpen = null;
        web.evaluateJavascript("window.hmOpen&&hmOpen('" + t + "')", null);
    }
    void jsTokenChanged() {
        h.post(new Runnable() { public void run() { if (loadedOk && web != null) web.evaluateJavascript("window.hmPushToken&&hmPushToken()", null); } });
    }
    boolean gameVisible() { return visible; }
    boolean notificationsAllowed() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) return false;
        android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        return Build.VERSION.SDK_INT < 24 || nm == null || nm.areNotificationsEnabled();
    }
    void askNotifications(boolean fromGame) {
        if (notificationsAllowed()) return;
        if (Build.VERSION.SDK_INT >= 33) {
            boolean asked = getSharedPreferences(Push.PREFS, 0).getBoolean("asked", false);
            if (!asked || fromGame) { getSharedPreferences(Push.PREFS, 0).edit().putBoolean("asked", true).apply();
                if (!asked || shouldShowRequestPermissionRationale("android.permission.POST_NOTIFICATIONS")) { requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 7); return; } }
        }
        if (fromGame) { // дозвіл уже відхилено — відкриваємо налаштування сповіщень застосунку
            try {
                Intent i = new Intent("android.settings.APP_NOTIFICATION_SETTINGS").putExtra("android.provider.extra.APP_PACKAGE", getPackageName()).putExtra("app_package", getPackageName()).putExtra("app_uid", getApplicationInfo().uid);
                startActivity(i);
            } catch (Exception e) { try { startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) {} }
        }
    }
    @Override public void onRequestPermissionsResult(int code, String[] p, int[] r) { super.onRequestPermissionsResult(code, p, r); Push.fetchToken(this); jsTokenChanged(); }

    /** Що гра може запитати в застосунку (window.HmApp у JavaScript). */
    class Bridge {
        @JavascriptInterface public String getPushToken() { return Push.token(MainActivity.this); }
        @JavascriptInterface public boolean notificationsAllowed() { return MainActivity.this.notificationsAllowed(); }
        @JavascriptInterface public void requestNotifications() { h.post(new Runnable() { public void run() { askNotifications(true); } }); }
        @JavascriptInterface public String appVersion() { return "1.1"; }
    }

    LinearLayout buildOffline() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL); l.setGravity(Gravity.CENTER);
        l.setBackgroundColor(Color.parseColor("#0a1236")); int p = dp(28); l.setPadding(p, p, p, p);
        ImageView ic = new ImageView(this); ic.setImageResource(R.mipmap.ic_launcher);
        l.addView(ic, new LinearLayout.LayoutParams(dp(110), dp(110)));
        TextView t = new TextView(this); t.setText("Немає з’єднання з інтернетом");
        t.setTextColor(Color.WHITE); t.setTextSize(21); t.setGravity(Gravity.CENTER); t.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2); lp.topMargin = dp(22); l.addView(t, lp);
        TextView t2 = new TextView(this); t2.setText("Перевір Wi-Fi або мобільний інтернет і спробуй ще раз — твій прогрес збережено на сервері.");
        t2.setTextColor(Color.parseColor("#b9c6f0")); t2.setTextSize(14); t2.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(-2, -2); lp2.topMargin = dp(10); l.addView(t2, lp2);
        Button btn = new Button(this); btn.setText("Спробувати ще"); btn.setTextColor(Color.parseColor("#3d2200")); btn.setTextSize(17);
        btn.setAllCaps(false); btn.setTypeface(null, android.graphics.Typeface.BOLD);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Color.parseColor("#fff27a"), Color.parseColor("#ffc531"), Color.parseColor("#f08c00")});
        g.setCornerRadius(dp(26)); btn.setBackground(g); btn.setPadding(dp(30), 0, dp(30), 0);
        LinearLayout.LayoutParams lp3 = new LinearLayout.LayoutParams(-2, dp(52)); lp3.topMargin = dp(26); l.addView(btn, lp3);
        btn.setOnClickListener(new View.OnClickListener() { public void onClick(View v) {
            if (!online()) { Toast.makeText(MainActivity.this, "Інтернету все ще немає", Toast.LENGTH_SHORT).show(); return; }
            failed = false; offline.setVisibility(View.GONE); web.setVisibility(View.VISIBLE);
            if (loadedOk) web.reload(); else web.loadUrl(GAME_URL);
        }});
        return l;
    }

    void showOffline() { hideSplash(); web.setVisibility(View.INVISIBLE); offline.setVisibility(View.VISIBLE); }
    void hideSplash() {
        if (splash == null || splash.getVisibility() != View.VISIBLE) return;
        splash.animate().alpha(0f).setDuration(350).withEndAction(new Runnable() { public void run() { splash.setVisibility(View.GONE); } });
        getWindow().setBackgroundDrawable(null);
    }
    boolean online() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkInfo n = cm == null ? null : cm.getActiveNetworkInfo();
        return n != null && n.isConnected();
    }
    int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + .5f); }

    @SuppressWarnings("deprecation")
    void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
    @Override protected void onResume() { super.onResume(); visible = true; Push.active = this; web.onResume(); web.resumeTimers(); immersive(); jsTokenChanged(); }
    @Override protected void onPause() { visible = false; web.onPause(); web.pauseTimers(); CookieManager.getInstance().flush(); super.onPause(); }
    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override protected void onDestroy() { if (Push.active == this) Push.active = null; if (web != null) { root.removeView(web); web.destroy(); } super.onDestroy(); }

    /** «Назад»: спершу закриває вікна гри, потім — подвійне натискання для виходу. */
    @Override public void onBackPressed() {
        if (offline.getVisibility() == View.VISIBLE || !loadedOk) { exitTwice(); return; }
        web.evaluateJavascript("(function(){try{var r=document.querySelector('#reward.show button');if(r){r.click();return 1}"
            + "var e=document.querySelector('.emo-pick');if(e){e.remove();return 1}"
            + "var m=document.getElementById('modal-bg');if(m&&m.classList.contains('show')){if(window.modalBack){var f=modalBack;modalBack=null;f();return 1}"
            + "var x=m.querySelector('[data-close]');if(x){x.click();return 1}if(window.closeModal){closeModal();return 1}}}catch(e){}return 0})()",
            new android.webkit.ValueCallback<String>() { public void onReceiveValue(String v) {
                if (!"1".equals(v)) exitTwice();
            }});
    }
    void exitTwice() {
        long t = System.currentTimeMillis();
        if (t - backAt < 2000) { finish(); return; }
        backAt = t; Toast.makeText(this, "Натисни «Назад» ще раз, щоб вийти", Toast.LENGTH_SHORT).show();
    }
}
