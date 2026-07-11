import Foundation

struct WidgetSnapshotTask: Decodable, Identifiable {
    let id: Int
    let title: String
    let priority: Int
    let overdue: Bool
    let endTime: String?
    let endDate: String?
    let path: String

    var deepLinkURL: URL? {
        guard let encoded = path.addingPercentEncoding(withAllowedCharacters: .alphanumerics) else { return nil }
        return URL(string: "taskview://open?path=\(encoded)")
    }

    var shortEndTime: String? {
        guard let endTime, endTime.count >= 5 else { return endTime }
        return String(endTime.prefix(5))
    }

    var shortEndDate: String? {
        guard let endDate else { return nil }
        let parts = endDate.split(separator: "-")
        guard parts.count == 3 else { return endDate }
        return "\(parts[2]).\(parts[1])"
    }
}

struct WidgetSnapshot: Decodable {
    let v: Int
    let generatedAt: String
    let locale: String
    let orgSlug: String?
    let mode: String?
    let todayCount: Int
    let overdueCount: Int
    let upcomingCount: Int?
    let tasks: [WidgetSnapshotTask]

    var isUpcoming: Bool {
        mode == "upcoming"
    }

    var activeCount: Int {
        isUpcoming ? (upcomingCount ?? tasks.count) : todayCount
    }

    static let appGroup = "group.com.handscream.taskview.app"
    static let snapshotKey = "widgetSnapshot"

    static func load() -> WidgetSnapshot? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let raw = defaults.string(forKey: snapshotKey),
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
}

struct WidgetStrings {
    let today: String
    let upcoming: String
    let empty: String
    let overdue: String
    let openApp: String
    let moreFormat: String

    static let ru = WidgetStrings(
        today: "Сегодня",
        upcoming: "Ближайшие",
        empty: "Нет задач на сегодня",
        overdue: "Просрочено",
        openApp: "Откройте TaskView",
        moreFormat: "и ещё %d"
    )

    static let en = WidgetStrings(
        today: "Today",
        upcoming: "Upcoming",
        empty: "No tasks for today",
        overdue: "Overdue",
        openApp: "Open TaskView",
        moreFormat: "+%d more"
    )

    func more(_ count: Int) -> String {
        String(format: moreFormat, count)
    }

    static func forLocale(_ locale: String?) -> WidgetStrings {
        let resolved = locale ?? Locale.preferredLanguages.first ?? "ru"
        return resolved.hasPrefix("ru") ? ru : en
    }
}
