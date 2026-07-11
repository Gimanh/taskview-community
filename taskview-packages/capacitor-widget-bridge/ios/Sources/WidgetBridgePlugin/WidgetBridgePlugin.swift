import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSnapshot", returnType: CAPPluginReturnPromise)
    ]

    static let snapshotKey = "widgetSnapshot"

    private var sharedDefaults: UserDefaults? {
        guard let appGroup = getConfig().getString("appGroup") else { return nil }
        return UserDefaults(suiteName: appGroup)
    }

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot") else {
            call.reject("snapshot is required")
            return
        }
        guard let defaults = sharedDefaults else {
            call.reject("WidgetBridge appGroup is not configured in capacitor.config")
            return
        }
        defaults.set(snapshot, forKey: Self.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clearSnapshot(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults else {
            call.reject("WidgetBridge appGroup is not configured in capacitor.config")
            return
        }
        defaults.removeObject(forKey: Self.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
