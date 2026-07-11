package tech.taskview.plugins.widgetbridge;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    public static final String PREFS_NAME = "taskview_widget";
    public static final String SNAPSHOT_KEY = "widgetSnapshot";
    public static final String ACTION_WIDGET_UPDATE = "tech.taskview.widget.UPDATE";

    @PluginMethod
    public void setSnapshot(PluginCall call) {
        String snapshot = call.getString("snapshot");
        if (snapshot == null) {
            call.reject("snapshot is required");
            return;
        }
        prefs().edit().putString(SNAPSHOT_KEY, snapshot).apply();
        notifyWidgets();
        call.resolve();
    }

    @PluginMethod
    public void clearSnapshot(PluginCall call) {
        prefs().edit().remove(SNAPSHOT_KEY).apply();
        notifyWidgets();
        call.resolve();
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private void notifyWidgets() {
        Context context = getContext();
        Intent intent = new Intent(ACTION_WIDGET_UPDATE);
        intent.setPackage(context.getPackageName());
        context.sendBroadcast(intent);
    }
}
