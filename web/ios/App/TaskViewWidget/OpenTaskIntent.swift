import Foundation
import AppIntents
#if !WIDGET_EXTENSION
import UIKit
#endif

@available(iOS 18.0, *)
struct OpenTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Task"
    static let isDiscoverable = false
    static let openAppWhenRun = true

    @Parameter(title: "URL")
    var urlString: String

    init() {
        urlString = "taskview://open"
    }

    init(urlString: String) {
        self.urlString = urlString
    }

    private var resolvedURL: URL {
        URL(string: urlString) ?? URL(string: "taskview://open")!
    }

    #if WIDGET_EXTENSION
    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(resolvedURL))
    }
    #else
    @MainActor
    func perform() async throws -> some IntentResult {
        await UIApplication.shared.open(resolvedURL)
        return .result()
    }
    #endif
}
