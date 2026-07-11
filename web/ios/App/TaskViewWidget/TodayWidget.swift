import WidgetKit
import SwiftUI

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: .now, snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(TodayEntry(date: .now, snapshot: WidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let entry = TodayEntry(date: .now, snapshot: WidgetSnapshot.load())
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

struct TodayWidget: Widget {
    let kind = "TaskViewTodayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            TodayWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color(uiColor: .systemBackground)
                }
        }
        .configurationDisplayName("TaskView")
        .description("Today's tasks / Задачи на сегодня")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) private var family

    let entry: TodayEntry

    private var strings: WidgetStrings {
        WidgetStrings.forLocale(entry.snapshot?.locale)
    }

    var body: some View {
        GeometryReader { geo in
            TaskListTodayView(
                snapshot: entry.snapshot,
                strings: strings,
                maxSlots: slots(for: geo.size.height),
                compact: family == .systemSmall,
                pinMoreToBottom: true
            )
        }
    }

    // Rows are given a fixed frame (24pt compact / 32pt regular), so this math is exact:
    // header = top + bottom padding + content; chrome = list top + bottom padding;
    // each slot after the first adds a hairline divider.
    private func slots(for height: CGFloat) -> Int {
        let compact = family == .systemSmall
        let headerHeight: CGFloat = compact ? 38 : 46
        let listChrome: CGFloat = compact ? 9 : 12
        let rowHeight: CGFloat = compact ? 24 : 32
        let dividerHeight: CGFloat = 0.34
        let available = height - headerHeight - listChrome + dividerHeight
        return max(2, Int(available / (rowHeight + dividerHeight)))
    }
}

struct TaskListTodayView: View {
    let snapshot: WidgetSnapshot?
    let strings: WidgetStrings
    let maxSlots: Int
    let compact: Bool
    let pinMoreToBottom: Bool

    private var horizontalPadding: CGFloat { compact ? 16 : 20 }
    private var rowFixedHeight: CGFloat { compact ? 24 : 32 }
    private var rowVerticalPadding: CGFloat { compact ? 3 : 6 }
    private var dividerInset: CGFloat { compact ? 42 : 52 }

    private var isUpcoming: Bool {
        snapshot?.isUpcoming ?? false
    }

    private var visibleTasks: [WidgetSnapshotTask] {
        guard let snapshot else { return [] }
        let count = snapshot.activeCount > maxSlots ? maxSlots - 1 : maxSlots
        return Array(snapshot.tasks.prefix(count))
    }

    private var hiddenCount: Int {
        guard let snapshot else { return 0 }
        return max(0, snapshot.activeCount - visibleTasks.count)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: compact ? 6 : 8) {
                WidgetLogoView(size: compact ? 16 : 20)

                Text(isUpcoming ? strings.upcoming : strings.today)
                    .font(compact ? .footnote.weight(.semibold) : .headline)
                    .lineLimit(1)
                    .truncationMode(.tail)

                Spacer()

                Text("\(snapshot?.activeCount ?? 0)")
                    .font(.caption2.weight(.bold))
                    .contentTransition(.numericText(countsDown: true))
                    .foregroundStyle(.white)
                    .padding(.horizontal, compact ? 6 : 8)
                    .padding(.vertical, compact ? 2 : 3)
                    .background(WidgetPalette.accent, in: Capsule())
            }
            .padding(.horizontal, horizontalPadding)
            .padding(.top, compact ? 16 : 18)
            .padding(.bottom, compact ? 4 : 6)
            .background(WidgetPalette.headerBackground)

            if !visibleTasks.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(visibleTasks.enumerated()), id: \.element.id) { index, task in
                        VStack(spacing: 0) {
                            if index > 0 {
                                Divider()
                                    .padding(.leading, dividerInset)
                            }

                            TaskRowView(task: task, strings: strings, compact: compact, showDate: isUpcoming)
                                .padding(.horizontal, horizontalPadding)
                                .frame(height: pinMoreToBottom ? rowFixedHeight : nil)
                                .padding(.vertical, pinMoreToBottom ? 0 : rowVerticalPadding)
                        }
                        .transition(.opacity.combined(with: .move(edge: .trailing)))
                    }

                    if hiddenCount > 0 {
                        Divider()
                            .padding(.leading, dividerInset)

                        if pinMoreToBottom {
                            Spacer(minLength: 0)
                        }

                        Text(strings.more(hiddenCount))
                            .font(compact ? .caption2 : .footnote)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.leading, dividerInset)
                            .padding(.trailing, horizontalPadding)
                            .frame(height: pinMoreToBottom ? rowFixedHeight : nil)
                            .padding(.vertical, pinMoreToBottom ? 0 : rowVerticalPadding)
                    }
                }
                .padding(.top, compact ? 3 : 4)
                .padding(.bottom, compact ? 6 : 8)
                if !(pinMoreToBottom && hiddenCount > 0) {
                    Spacer(minLength: 0)
                }
            } else {
                Spacer()
                Text(snapshot == nil ? strings.openApp : strings.empty)
                    .font(compact ? .caption : .footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.horizontal, horizontalPadding)
                Spacer()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(compact ? URL(string: "taskview://open") : nil)
    }
}

struct TaskRowView: View {
    let task: WidgetSnapshotTask
    let strings: WidgetStrings
    let compact: Bool
    let showDate: Bool

    private var destination: URL {
        task.deepLinkURL ?? URL(string: "taskview://open")!
    }

    var body: some View {
        if compact {
            if #available(iOS 18.0, *) {
                Button(intent: OpenTaskIntent(urlString: destination.absoluteString)) {
                    row
                }
                .buttonStyle(.plain)
            } else {
                row
            }
        } else {
            Link(destination: destination) {
                row
            }
        }
    }

    private var row: some View {
        HStack(spacing: compact ? 4 : 6) {
            Circle()
                .strokeBorder(WidgetPalette.priority(task.priority), lineWidth: compact ? 1.2 : 1.5)
                .frame(width: compact ? 14 : 18, height: compact ? 14 : 18)
                .padding(4)

            content
        }
    }

    private var content: some View {
        HStack(spacing: compact ? 8 : 10) {
            Text(task.title)
                .font(compact ? .caption : .subheadline)
                .foregroundStyle(.primary)
                .lineLimit(1)

            Spacer(minLength: 4)

            if showDate {
                if let endDate = task.shortEndDate {
                    Text(endDate)
                        .font(compact ? .caption2 : .caption)
                        .foregroundStyle(.secondary)
                }
            } else if task.overdue {
                Text(compact ? "!" : strings.overdue)
                    .font(compact ? .caption.weight(.bold) : .caption.weight(.medium))
                    .foregroundStyle(WidgetPalette.overdue)
            } else if let endTime = task.shortEndTime {
                Text(endTime)
                    .font(compact ? .caption2 : .caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct WidgetLogoView: View {
    let size: CGFloat

    var body: some View {
        Image("WidgetLogo")
            .resizable()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.28))
    }
}

enum WidgetPalette {
    static let accent = Color(red: 0.086, green: 0.639, blue: 0.290)
    static let overdue = Color(red: 1.0, green: 0.090, blue: 0.267)
    static let headerBackground = Color(uiColor: .secondarySystemBackground).opacity(0.7)

    static func priority(_ priority: Int) -> Color {
        switch priority {
        case 3: return Color(red: 1.0, green: 0.090, blue: 0.267)
        case 2: return Color(red: 1.0, green: 0.569, blue: 0.0)
        default: return Color(red: 0.220, green: 0.839, blue: 0.506)
        }
    }
}
