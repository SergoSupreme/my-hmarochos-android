package ua.pp.supremegames.hmarochos;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/** Приймає сповіщення Firebase. Коли гра згорнута — Android показує їх сам. */
public class PushService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) { Push.saveToken(this, token); }

    @Override public void onMessageReceived(RemoteMessage msg) {
        // Сюди потрапляємо, коли гра відкрита на екрані: гравець і так бачить усе в грі.
        // Показуємо лише особисті повідомлення й подарунки, якщо гра зараз не на передньому плані.
        MainActivity a = Push.active;
        if (a != null && a.gameVisible()) return;
        RemoteMessage.Notification n = msg.getNotification();
        if (n == null) return;
        String ch = n.getChannelId() != null ? n.getChannelId() : "main";
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        String target = msg.getData().get("open"); if (target != null) open.putExtra("open", target);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, (int) (System.currentTimeMillis() & 0xffff), open, flags);
        android.app.Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new android.app.Notification.Builder(this, ch) : new android.app.Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_stat_notify).setColor(0xFFF3A600).setContentTitle(n.getTitle()).setContentText(n.getBody())
            .setStyle(new android.app.Notification.BigTextStyle().bigText(n.getBody())).setAutoCancel(true).setContentIntent(pi);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        String tag = n.getTag();
        if (nm != null) nm.notify(tag, tag == null ? (int) System.currentTimeMillis() : 1, b.build());
    }
}
