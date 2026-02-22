// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.1.0"),
        .package(name: "CapacitorApp", path: "../../../../node_modules/.pnpm/@capacitor+app@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../../node_modules/.pnpm/@capacitor+browser@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/browser"),
        .package(name: "CapacitorDevice", path: "../../../../node_modules/.pnpm/@capacitor+device@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/device"),
        .package(name: "CapacitorPreferences", path: "../../../../node_modules/.pnpm/@capacitor+preferences@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/preferences"),
        .package(name: "CapacitorSplashScreen", path: "../../../../node_modules/.pnpm/@capacitor+splash-screen@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/splash-screen"),
        .package(name: "CapgoCapacitorUpdater", path: "../../../../node_modules/.pnpm/@capgo+capacitor-updater@8.43.8_@capacitor+core@8.1.0/node_modules/@capgo/capacitor-updater")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorDevice", package: "CapacitorDevice"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapgoCapacitorUpdater", package: "CapgoCapacitorUpdater")
            ]
        )
    ]
)
