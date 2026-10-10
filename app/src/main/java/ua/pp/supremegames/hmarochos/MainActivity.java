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
import android.content.SharedPreferences;
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
    WebView web; ImageView splash; FrameLayout offline; FrameLayout root;
    boolean loadedOk = false, failed = false, visible = false; long backAt = 0;
    String pendingOpen = null; // куди перейти після натискання на сповіщення
    final Handler h = new Handler();

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) { // на весь екран, включно з зоною камери («чубчика»)
            WindowManager.LayoutParams lp = w.getAttributes(); lp.layoutInDisplayCutoutMode = 1 /* SHORT_EDGES */; w.setAttributes(lp);
        }
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
        s.setUserAgentString(s.getUserAgentString() + " MyHmarochosApp/1.2");
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
                jsTokenChanged(); deliverOpen(); sendInsets();
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
        // щоб телефон не «присипляв» гру й сповіщення приходили вчасно — один раз просимо не обмежувати роботу у фоні
        h.postDelayed(new Runnable() { public void run() { if (notificationsAllowed()) askBattery(false); } }, 40000);
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
    /** Висота «чубчика»/камери → у гру як CSS-змінна --app-sat, щоб верхня панель не ховалась під камерою */
    void sendInsets() {
        if (Build.VERSION.SDK_INT < 28 || web == null) return;
        try {
            android.view.WindowInsets wi = getWindow().getDecorView().getRootWindowInsets();
            android.view.DisplayCutout dc = wi == null ? null : wi.getDisplayCutout();
            int top = dc == null ? 0 : dc.getSafeInsetTop();
            float css = top / getResources().getDisplayMetrics().density;
            web.evaluateJavascript("document.documentElement.style.setProperty('--app-sat','" + css + "px')", null);
        } catch (Exception ignored) {}
    }
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
    boolean batteryOk() {
        if (Build.VERSION.SDK_INT < 23) return true;
        android.os.PowerManager pm = (android.os.PowerManager) getSystemService(POWER_SERVICE);
        return pm == null || pm.isIgnoringBatteryOptimizations(getPackageName());
    }
    void askBattery(boolean fromGame) {
        if (batteryOk()) return;
        SharedPreferences p = getSharedPreferences(Push.PREFS, 0);
        if (!fromGame && p.getBoolean("askedBattery", false)) return;
        p.edit().putBoolean("askedBattery", true).apply();
        try { startActivity(new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName()))); }
        catch (Exception e) { try { startActivity(new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); } catch (Exception ignored) {} }
    }
    @Override public void onRequestPermissionsResult(int code, String[] p, int[] r) { super.onRequestPermissionsResult(code, p, r); Push.fetchToken(this); jsTokenChanged(); }

    /** Що гра може запитати в застосунку (window.HmApp у JavaScript). */
    class Bridge {
        @JavascriptInterface public String getPushToken() { return Push.token(MainActivity.this); }
        @JavascriptInterface public boolean notificationsAllowed() { return MainActivity.this.notificationsAllowed(); }
        @JavascriptInterface public void requestNotifications() { h.post(new Runnable() { public void run() { askNotifications(true); } }); }
        @JavascriptInterface public String appVersion() { return "1.2"; }
        @JavascriptInterface public boolean batteryOk() { return MainActivity.this.batteryOk(); }
        @JavascriptInterface public void requestBattery() { h.post(new Runnable() { public void run() { askBattery(true); } }); }
    }

    // ---------- екран «Немає інтернету»: заставка гри + стильне повідомлення, гра запускається сама, щойно з'явиться мережа ----------
    static final String[][] OFF_TXT = { // мова телефона: заголовок, текст, кнопка, очікування
        {"uk", "Відсутній інтернет", "Неможливо запустити гру. Перевір Wi-Fi або мобільний інтернет — гра запуститься сама, щойно з’явиться з’єднання. Твій прогрес збережено на сервері.", "Спробувати ще", "Очікуємо на з’єднання…"},
        {"ru", "Нет интернета", "Невозможно запустить игру. Проверь Wi-Fi или мобильный интернет — игра запустится сама, как только появится соединение. Твой прогресс сохранён на сервере.", "Попробовать ещё", "Ожидаем соединение…"},
        {"de", "Keine Internetverbindung", "Das Spiel kann nicht gestartet werden. Prüfe WLAN oder mobile Daten — das Spiel startet automatisch, sobald eine Verbindung besteht. Dein Fortschritt ist auf dem Server gespeichert.", "Erneut versuchen", "Warte auf Verbindung…"},
        {"fr", "Pas d’internet", "Impossible de lancer le jeu. Vérifie le Wi-Fi ou les données mobiles — le jeu démarrera tout seul dès que la connexion revient. Ta progression est sauvegardée sur le serveur.", "Réessayer", "En attente de connexion…"},
        {"it", "Nessuna connessione", "Impossibile avviare il gioco. Controlla il Wi-Fi o i dati mobili — il gioco partirà da solo appena torna la connessione. I tuoi progressi sono salvati sul server.", "Riprova", "In attesa di connessione…"},
        {"ja", "インターネットに接続されていません", "ゲームを起動できません。Wi-Fiまたはモバイルデータを確認してください。接続が戻ると自動で起動します。進行状況はサーバーに保存されています。", "再試行", "接続を待っています…"},
        {"ko", "인터넷 연결 없음", "게임을 시작할 수 없어요. Wi-Fi 또는 모바일 데이터를 확인하세요 — 연결되면 자동으로 시작됩니다. 진행 상황은 서버에 저장되어 있어요.", "다시 시도", "연결을 기다리는 중…"},
        {"zh", "没有网络连接", "无法启动游戏。请检查 Wi-Fi 或移动数据——连接恢复后游戏会自动启动。你的进度已保存在服务器上。", "重试", "正在等待连接…"},
        {"en", "No internet connection", "The game can’t start. Check your Wi-Fi or mobile data — the game will start by itself as soon as you’re back online. Your progress is saved on the server.", "Try again", "Waiting for connection…"},
    };
    String[] offTxt() {
        String l = java.util.Locale.getDefault().getLanguage();
        for (String[] t : OFF_TXT) if (t[0].equals(l)) return t;
        return OFF_TXT[OFF_TXT.length - 1];
    }
    TextView offWait;
    FrameLayout buildOffline() {
        String[] T = offTxt();
        FrameLayout f = new FrameLayout(this);
        f.setClickable(true);
        ImageView bg = new ImageView(this); bg.setImageResource(R.drawable.splash); bg.setScaleType(ImageView.ScaleType.CENTER_CROP);
        f.addView(bg, new FrameLayout.LayoutParams(-1, -1));
        View shade = new View(this);
        shade.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0x00000000, 0x660a1236, 0xF00a1236}));
        f.addView(shade, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL); card.setGravity(Gravity.CENTER_HORIZONTAL);
        GradientDrawable cg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{Color.parseColor("#24398a"), Color.parseColor("#101944")});
        cg.setCornerRadius(dp(24)); cg.setStroke(dp(2), Color.parseColor("#FFD34D"));
        card.setBackground(cg); card.setPadding(dp(20), dp(18), dp(20), dp(18));
        if (Build.VERSION.SDK_INT >= 21) card.setElevation(dp(10));

        TextView ic = new TextView(this); ic.setText("📡"); ic.setTextSize(40); ic.setGravity(Gravity.CENTER);
        card.addView(ic, new LinearLayout.LayoutParams(-2, -2));
        TextView t = new TextView(this); t.setText(T[1]); t.setTextColor(Color.parseColor("#FFD34D")); t.setTextSize(21);
        t.setGravity(Gravity.CENTER); t.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2); lp.topMargin = dp(6); card.addView(t, lp);
        TextView t2 = new TextView(this); t2.setText(T[2]); t2.setTextColor(Color.parseColor("#D3DCFF")); t2.setTextSize(14.5f);
        t2.setGravity(Gravity.CENTER); t2.setLineSpacing(0, 1.15f);
        LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(-2, -2); lp2.topMargin = dp(8); card.addView(t2, lp2);

        Button btn = new Button(this); btn.setText(T[3]); btn.setTextColor(Color.parseColor("#3d2200")); btn.setTextSize(17);
        btn.setAllCaps(false); btn.setTypeface(null, android.graphics.Typeface.BOLD);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Color.parseColor("#fff27a"), Color.parseColor("#ffc531"), Color.parseColor("#f08c00")});
        g.setCornerRadius(dp(26)); btn.setBackground(g); btn.setPadding(dp(30), 0, dp(30), 0);
        LinearLayout.LayoutParams lp3 = new LinearLayout.LayoutParams(-1, dp(52)); lp3.topMargin = dp(16); card.addView(btn, lp3);
        btn.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { retryOnline(true); } });

        offWait = new TextView(this); offWait.setText(T[4]); offWait.setTextColor(Color.parseColor("#9FB0E8")); offWait.setTextSize(12.5f); offWait.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp4 = new LinearLayout.LayoutParams(-2, -2); lp4.topMargin = dp(10); card.addView(offWait, lp4);

        FrameLayout.LayoutParams cp = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        cp.leftMargin = cp.rightMargin = dp(16); cp.bottomMargin = dp(28);
        f.addView(card, cp);
        return f;
    }
    void retryOnline(boolean byUser) {
        if (!online()) { if (byUser) { Toast.makeText(this, offTxt()[1], Toast.LENGTH_SHORT).show(); if (offWait != null) offWait.animate().alpha(0.2f).setDuration(150).withEndAction(new Runnable() { public void run() { offWait.animate().alpha(1f).setDuration(300); } }); } return; }
        failed = false; offline.setVisibility(View.GONE); web.setVisibility(View.VISIBLE);
        if (loadedOk) web.reload(); else web.loadUrl(GAME_URL);
    }
    // мережа з'явилась — пробуємо самі, без натискань
    android.net.ConnectivityManager.NetworkCallback netCb;
    void watchNetwork() {
        if (Build.VERSION.SDK_INT < 24 || netCb != null) return;
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE); if (cm == null) return;
        netCb = new android.net.ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(android.net.Network n) {
                h.postDelayed(new Runnable() { public void run() { if (offline.getVisibility() == View.VISIBLE) retryOnline(false); } }, 800);
            }
        };
        try { cm.registerDefaultNetworkCallback(netCb); } catch (Exception ignored) {}
    }
    void pulseWait() { // м'яке «дихання» напису «Очікуємо на з'єднання…»
        if (offWait == null || offline.getVisibility() != View.VISIBLE) return;
        offWait.animate().alpha(offWait.getAlpha() > 0.6f ? 0.35f : 1f).setDuration(900).withEndAction(new Runnable() { public void run() { pulseWait(); } });
    }

    void showOffline() { hideSplash(); web.setVisibility(View.INVISIBLE); if (offline.getVisibility() != View.VISIBLE) { offline.setAlpha(0f); offline.setVisibility(View.VISIBLE); offline.animate().alpha(1f).setDuration(300); } watchNetwork(); pulseWait(); }
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
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) { immersive(); sendInsets(); } }
    @Override protected void onResume() { super.onResume(); visible = true; Push.active = this; web.onResume(); web.resumeTimers(); immersive(); jsTokenChanged(); }
    @Override protected void onPause() { visible = false; web.onPause(); web.pauseTimers(); CookieManager.getInstance().flush(); super.onPause(); }
    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override protected void onDestroy() { if (Push.active == this) Push.active = null; if (netCb != null) try { ((ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE)).unregisterNetworkCallback(netCb); } catch (Exception ignored) {} if (web != null) { root.removeView(web); web.destroy(); } super.onDestroy(); }

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
