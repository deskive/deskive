import Foundation
import os.log

class SocketConnection: NSObject {
    private let filePath: String
    private var socketHandle: Int32 = -1
    private var address: sockaddr_un?

    var didOpen: (() -> Void)?
    var didClose: ((Error?) -> Void)?
    var streamHasSpaceAvailable: (() -> Void)?

    private var networkQueue: DispatchQueue?
    private var shouldKeepRunning = false

    init(filePath: String) {
        self.filePath = filePath
        super.init()
    }

    func open() -> Bool {
        os_log("Opening socket connection", log: sharedLogger, type: .debug)

        socketHandle = socket(AF_UNIX, SOCK_STREAM, 0)
        guard socketHandle != -1 else {
            os_log("Failed to create socket", log: sharedLogger, type: .error)
            return false
        }

        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)
        filePath.withCString { ptr in
            withUnsafeMutablePointer(to: &addr.sun_path.0) { dest in
                _ = strcpy(dest, ptr)
            }
        }
        self.address = addr

        let connectResult = withUnsafePointer(to: &addr) { ptr in
            ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPtr in
                connect(socketHandle, sockaddrPtr, socklen_t(MemoryLayout<sockaddr_un>.size))
            }
        }

        guard connectResult != -1 else {
            os_log("Failed to connect: %{public}s", log: sharedLogger, type: .error, String(cString: strerror(errno)))
            close()
            return false
        }

        os_log("Socket connected successfully", log: sharedLogger, type: .debug)
        didOpen?()

        networkQueue = DispatchQueue(label: "broadcast.network")
        shouldKeepRunning = true

        return true
    }

    func close() {
        os_log("Closing socket connection", log: sharedLogger, type: .debug)
        shouldKeepRunning = false

        if socketHandle != -1 {
            Darwin.close(socketHandle)
            socketHandle = -1
        }
    }

    func writeToStream(buffer: UnsafePointer<UInt8>, maxLength length: Int) -> Int {
        guard socketHandle != -1 else { return -1 }
        return write(socketHandle, buffer, length)
    }
}
