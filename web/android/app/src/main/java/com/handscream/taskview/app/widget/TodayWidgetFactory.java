package com.handscream.taskview.app.widget;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.handscream.taskview.app.R;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import tech.taskview.plugins.widgetbridge.WidgetBridgePlugin;

public class TodayWidgetFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final List<JSONObject> tasks = new ArrayList<>();
    private boolean upcoming = false;

    public TodayWidgetFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {
    }

    @Override
    public void onDataSetChanged() {
        tasks.clear();
        upcoming = false;
        String snapshot = context
                .getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
                .getString(WidgetBridgePlugin.SNAPSHOT_KEY, null);
        if (snapshot == null) return;
        try {
            JSONObject parsed = new JSONObject(snapshot);
            upcoming = "upcoming".equals(parsed.optString("mode"));
            JSONArray items = parsed.optJSONArray("tasks");
            if (items == null) return;
            for (int i = 0; i < items.length(); i++) {
                JSONObject task = items.optJSONObject(i);
                if (task != null) tasks.add(task);
            }
        } catch (JSONException ignored) {
        }
    }

    @Override
    public void onDestroy() {
        tasks.clear();
    }

    @Override
    public int getCount() {
        return tasks.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        JSONObject task = tasks.get(position);
        RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_today_item);

        row.setTextViewText(R.id.widget_item_title, task.optString("title"));
        row.setImageViewResource(R.id.widget_item_checkbox, priorityCheckbox(task.optInt("priority", 1)));

        boolean overdue = !upcoming && task.optBoolean("overdue", false);
        String meta = upcoming
                ? formatEndDate(task)
                : (overdue ? context.getString(R.string.widget_overdue) : formatEndTime(task));
        if (meta == null || meta.isEmpty()) {
            row.setViewVisibility(R.id.widget_item_meta, View.GONE);
        } else {
            row.setViewVisibility(R.id.widget_item_meta, View.VISIBLE);
            row.setTextViewText(R.id.widget_item_meta, meta);
            row.setTextColor(
                    R.id.widget_item_meta,
                    context.getColor(overdue ? R.color.widget_overdue : R.color.widget_text_secondary));
        }

        Intent fillIn = new Intent();
        String path = task.optString("path", "");
        if (!path.isEmpty()) {
            fillIn.setData(Uri.parse("taskview://open?path=" + Uri.encode(path)));
        }
        row.setOnClickFillInIntent(R.id.widget_item_root, fillIn);

        return row;
    }

    private int priorityCheckbox(int priority) {
        switch (priority) {
            case 3:
                return R.drawable.widget_checkbox_high;
            case 2:
                return R.drawable.widget_checkbox_medium;
            default:
                return R.drawable.widget_checkbox_low;
        }
    }

    private String formatEndTime(JSONObject task) {
        if (task.isNull("endTime")) return null;
        String endTime = task.optString("endTime", "");
        return endTime.length() >= 5 ? endTime.substring(0, 5) : endTime;
    }

    private String formatEndDate(JSONObject task) {
        if (task.isNull("endDate")) return null;
        String endDate = task.optString("endDate", "");
        String[] parts = endDate.split("-");
        return parts.length == 3 ? parts[2] + "." + parts[1] : endDate;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return tasks.get(position).optLong("id", position);
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
