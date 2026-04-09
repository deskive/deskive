import ReplayKit
import os.log

private enum Constants {
    // IMPORTANT: This must match the App Group configured in Xcode for both targets
    static let appGroupIdentifier = "group.com.deskive.app"
}

let sharedLogger = OSLog(subsystem: "com.deskive.app.BroadcastExtension", category: "Broadcast")

class SampleHandler: RPBroadcastSampleHandler {

    private var clientConnection: SocketConnection?
    private var uploader: SampleUploader?

    private var frameCount: Int = 0

    private let jsonEncoder = JSONEncoder()

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        os_log("Broadcast started", log: sharedLogger, type: .debug)

        // Open socket connection to the main app
        let socketFilePath = socketPath

        clientConnection = SocketConnection(filePath: socketFilePath)
        setupConnection()

        uploader = SampleUploader(connection: clientConnection!)

        // Notify that broadcast has started
        DarwinNotificationCenter.shared.postNotification(.broadcastStarted)
        openConnection()
    }

    override func broadcastPaused() {
        os_log("Broadcast paused", log: sharedLogger, type: .debug)
    }

    override func broadcastResumed() {
        os_log("Broadcast resumed", log: sharedLogger, type: .debug)
    }

    override func broadcastFinished() {
        os_log("Broadcast finished", log: sharedLogger, type: .debug)

        DarwinNotificationCenter.shared.postNotification(.broadcastStopped)
        clientConnection?.close()
        clientConnection = nil
        uploader = nil
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        switch sampleBufferType {
        case .video:
            uploader?.send(sample: sampleBuffer)
        case .audioApp:
            // Handle audio samples if needed
            break
        case .audioMic:
            // Handle microphone audio if needed
            break
        @unknown default:
            os_log("Unknown sample buffer type", log: sharedLogger, type: .error)
        }
    }

    private func setupConnection() {
        clientConnection?.didClose = { [weak self] error in
            os_log("Client connection closed", log: sharedLogger, type: .debug)
            if let error = error {
                self?.finishBroadcastWithError(error)
            } else {
                let screenCapturedError = NSError(
                    domain: RPRecordingErrorDomain,
                    code: RPRecordingErrorCode.userDeclined.rawValue,
                    userInfo: [NSLocalizedDescriptionKey: "Screen capture has ended"]
                )
                self?.finishBroadcastWithError(screenCapturedError)
            }
        }
    }

    private func openConnection() {
        let queue = DispatchQueue(label: "broadcast.connectTimer")
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now(), repeating: .milliseconds(100), leeway: .milliseconds(500))
        timer.setEventHandler { [weak self] in
            guard self?.clientConnection?.open() == true else {
                return
            }
            timer.cancel()
        }
        timer.resume()
    }

    private var socketPath: String {
        let sharedContainer = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: Constants.appGroupIdentifier
        )
        return sharedContainer?.appendingPathComponent("rtc_SSFD").path ?? ""
    }
}
