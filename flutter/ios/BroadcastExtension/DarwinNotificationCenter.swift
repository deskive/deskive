import Foundation

enum DarwinNotification: String {
    case broadcastStarted = "com.deskive.app.broadcast.started"
    case broadcastStopped = "com.deskive.app.broadcast.stopped"
}

class DarwinNotificationCenter {
    static let shared = DarwinNotificationCenter()

    private let notificationCenter: CFNotificationCenter

    private init() {
        notificationCenter = CFNotificationCenterGetDarwinNotifyCenter()
    }

    func postNotification(_ notification: DarwinNotification) {
        CFNotificationCenterPostNotification(
            notificationCenter,
            CFNotificationName(rawValue: notification.rawValue as CFString),
            nil,
            nil,
            true
        )
    }

    func addObserver(for notification: DarwinNotification, using block: @escaping () -> Void) {
        let callback: CFNotificationCallback = { _, _, _, _, _ in
            // Note: This callback doesn't capture the block directly
            // You'll need to use a different approach for actual implementation
        }

        CFNotificationCenterAddObserver(
            notificationCenter,
            nil,
            callback,
            notification.rawValue as CFString,
            nil,
            .deliverImmediately
        )
    }

    func removeObserver(for notification: DarwinNotification) {
        CFNotificationCenterRemoveObserver(
            notificationCenter,
            nil,
            CFNotificationName(rawValue: notification.rawValue as CFString),
            nil
        )
    }
}
