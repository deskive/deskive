//
//  Deskive.swift
//  Deskive
//
//  Created by NYMUL ISLAM on 2026/01/23.
//

import Foundation
import ExtensionFoundation
import Photos

@main
class BackgroundUploadExtension: PHBackgroundResourceUploadExtension {

    required init() {
        print("Initialized")
    }

    func process() -> PHBackgroundResourceUploadProcessingResult {
        print("Processing")
        
        /// Please refer to documentation on uploading asset resources in the background. Some todos include:
        
        ///     Retry any failed jobs.
        ///     Acknowledge completed jobs to free up the in-flight job limit.
        ///     Create new upload jobs for unprocessed assets.
        
        /// Return .completed when you are up to date with the photos library
        /// Otherwise return .processing to continue library uploads
        return .processing
    }
    
    func notifyTermination() {
        print("Terminating")
        
        /// Perform any actions here that you need before the extension terminates
    }
}
