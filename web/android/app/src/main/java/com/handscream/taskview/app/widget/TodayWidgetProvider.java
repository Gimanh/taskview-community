package com.handscream.taskview.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import com.handscream.taskview.app.MainActivity;
import com.handscream.taskview.app.R;

import org.json.JSONObject;

import tech.taskview.plugins.widgetbridge.WidgetBridgePlugin;

public class TodayWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, buildViews(context, appWidgetId));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetBridgePlugin.ACTION_WIDGET_UPDATE.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, TodayWidgetProvider.class));
            if (ids.length == 0) return;
            manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_today_list);
            onUpdate(context, manager, ids);
        }
    }

    private RemoteViews buildViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);

        JSONObject snapshot = readSnapshot(context);
        boolean upcoming = snapshot != null && "upcoming".equals(snapshot.optString("mode"));
        int count = snapshot == null
                ? 0
                : (upcoming ? snapshot.optInt("upcomingCount", 0) : snapshot.optInt("todayCount", 0));
        views.setTextViewText(
                R.id.widget_today_title,
                context.getString(upcoming ? R.string.widget_upcoming_title : R.string.widget_today_title));
        views.setTextViewText(R.id.widget_today_count, String.valueOf(count));

        Intent adapter = new Intent(context, TodayWidgetService.class);
        adapter.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        adapter.setData(Uri.parse(adapter.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_today_list, adapter);
        views.setEmptyView(R.id.widget_today_list, R.id.widget_today_empty);

        PendingIntent openApp = PendingIntent.getActivity(
                context,
                0,
                new Intent(context, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_today_header, openApp);
        views.setOnClickPendingIntent(R.id.widget_today_empty, openApp);

        Intent template = new Intent(context, MainActivity.class);
        template.setAction(Intent.ACTION_VIEW);
        PendingIntent templateIntent = PendingIntent.getActivity(
                context,
                1,
                template,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        views.setPendingIntentTemplate(R.id.widget_today_list, templateIntent);

        return views;
    }

    private JSONObject readSnapshot(Context context) {
        String snapshot = context
                .getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
                .getString(WidgetBridgePlugin.SNAPSHOT_KEY, null);
        if (snapshot == null) return null;
        try {
            return new JSONObject(snapshot);
        } catch (Exception e) {
            return null;
        }
    }
}
