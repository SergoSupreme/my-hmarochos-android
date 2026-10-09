package ua.pp.supremegames.hmarochos;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import com.google.firebase.messaging.FirebaseMessaging;

import java.util.Locale;

/** Спільне для пуш-сповіщень: канали Android і токен Firebase. */
final class Push {
    static final String PREFS = "push";
    static volatile MainActivity active; // відкрита гра — їй передаємо новий токен

    static String token(Context c) { return c.getSharedPreferences(PREFS, 0).getString("token", ""); }

    static void saveToken(Context c, String t) {
        if (t == null || t.isEmpty()) return;
        SharedPreferences p = c.getSharedPreferences(PREFS, 0);
        if (t.equals(p.getString("token", ""))) return;
        p.edit().putString("token", t).apply();
        MainActivity a = active; if (a != null) a.jsTokenChanged();
    }

    /** Отримати (або оновити) токен цього пристрою. */
    static void fetchToken(final Context c) {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) saveToken(c, task.getResult());
            });
        } catch (Exception ignored) {}
    }

    static Uri sound(Context c) { return Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.notify); }

    /** Канали сповіщень (Android 8+): гравець може вимкнути кожен окремо в налаштуваннях телефона. */
    static void channels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        boolean ua = Locale.getDefault().getLanguage().matches("uk|ru");
        // старі канали без звуку гри (версія 1.1) прибираємо, щоб у налаштуваннях телефона не було дублікатів
        for (String old : new String[]{"msg", "promo", "tour", "tower", "main"}) { try { nm.deleteNotificationChannel(old); } catch (Exception ignored) {} }
        // звук сповіщень гри; канал запам'ятовує звук назавжди, тому нові канали мають суфікс _s
        Uri snd = sound(c);
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        String[][] list = {
            {"msg_s", ua ? "Повідомлення та подарунки" : "Messages & gifts"},
            {"chat_s", ua ? "Загальний чат" : "Global chat"},
            {"promo_s", ua ? "Акції, новини та роздачі" : "Promos & news"},
            {"tour_s", ua ? "Турніри" : "Tournaments"},
            {"tower_s", ua ? "Нагадування про вежу" : "Tower reminders"},
            {"main_s", ua ? "Інше" : "Other"},
        };
        for (String[] ch : list) {
            NotificationChannel n = new NotificationChannel(ch[0], ch[1], NotificationManager.IMPORTANCE_HIGH);
            n.enableVibration(true);
            n.setSound(snd, aa);
            nm.createNotificationChannel(n);
        }
    }
}
