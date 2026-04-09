import Foundation
import ReplayKit
import os.log

class SampleUploader {
    private var connection: SocketConnection
    private var isReady = false
    private var dataQueue = DispatchQueue(label: "broadcast.data")

    init(connection: SocketConnection) {
        self.connection = connection
        setupConnection()
    }

    private func setupConnection() {
        connection.didOpen = { [weak self] in
            self?.isReady = true
        }
        connection.didClose = { [weak self] _ in
            self?.isReady = false
        }
    }

    func send(sample: CMSampleBuffer) {
        guard isReady else { return }

        dataQueue.async { [weak self] in
            self?.sendSampleBuffer(sample)
        }
    }

    private func sendSampleBuffer(_ sampleBuffer: CMSampleBuffer) {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return
        }

        CVPixelBufferLockBaseAddress(imageBuffer, .readOnly)
        defer {
            CVPixelBufferUnlockBaseAddress(imageBuffer, .readOnly)
        }

        let width = CVPixelBufferGetWidth(imageBuffer)
        let height = CVPixelBufferGetHeight(imageBuffer)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(imageBuffer)

        guard let baseAddress = CVPixelBufferGetBaseAddress(imageBuffer) else {
            return
        }

        let bufferSize = bytesPerRow * height

        // Create header with frame info
        var header = FrameHeader(width: UInt32(width), height: UInt32(height), bytesPerRow: UInt32(bytesPerRow), bufferSize: UInt32(bufferSize))

        // Send header
        let headerSize = MemoryLayout<FrameHeader>.size
        _ = withUnsafePointer(to: &header) { ptr in
            ptr.withMemoryRebound(to: UInt8.self, capacity: headerSize) { bytePtr in
                connection.writeToStream(buffer: bytePtr, maxLength: headerSize)
            }
        }

        // Send pixel data
        let bytePtr = baseAddress.assumingMemoryBound(to: UInt8.self)
        _ = connection.writeToStream(buffer: bytePtr, maxLength: bufferSize)
    }
}

struct FrameHeader {
    var width: UInt32
    var height: UInt32
    var bytesPerRow: UInt32
    var bufferSize: UInt32
}
