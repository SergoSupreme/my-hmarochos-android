package ua.pp.supremegames.hmarochos;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
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

    /** Канали сповіщень (Android 8+): гравець може вимкнути кожен окремо в налаштуваннях телефона. */
    static void channels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        boolean ua = Locale.getDefault().getLanguage().matches("uk|ru");
        String[][] list = {
            {"msg", ua ? "Повідомлення та подарунки" : "Messages & gifts", "4"},
            {"promo", ua ? "Акції, новини та роздачі" : "Promos & news", "3"},
            {"tour", ua ? "Турніри" : "Tournaments", "3"},
            {"tower", ua ? "Нагадування про вежу" : "Tower reminders", "3"},
            {"main", ua ? "Інше" : "Other", "3"},
        };
        for (String[] ch : list) {
            NotificationChannel n = new NotificationChannel(ch[0], ch[1], Integer.parseInt(ch[2]));
            n.enableVibration(true);
            nm.createNotificationChannel(n);
        }
    }
}
