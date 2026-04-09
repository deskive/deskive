package com.deskive.app

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Custom Firebase Messaging Service to handle FCM messages natively
 * This is critical for handling incoming calls when app is TERMINATED or in BACKGROUND
 *
 * IMPORTANT: We only use native call handling when Flutter is NOT in foreground.
 * When Flutter is in foreground, it handles the call UI directly.
 *
 * When app is terminated/background:
 * 1. FCM message arrives with high priority
 * 2. This service receives it (even when app is killed)
 * 3. For incoming calls, we start CallService which shows full-screen UI
 * 4. Other notifications are passed to Flutter handler via FlutterFire
 *
 * When app is in foreground:
 * 1. FCM message arrives
 * 2. We pass it to Flutter handler (via super.onMessageReceived)
 * 3. Flutter shows its own incoming call UI
 */
class DeskiveFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "DeskiveFCMService"
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "FCM message received from: ${remoteMessage.from}")
        Log.d(TAG, "FCM data: ${remoteMessage.data}")

        // Check if this is an incoming call notification
        val data = remoteMessage.data
        val isIncomingCall = data.containsKey("call_id") &&
                data.containsKey("call_type") &&
                data.containsKey("caller_user_id") &&
                data.containsKey("caller_name")

        if (isIncomingCall) {
            Log.d(TAG, "Incoming call notification detected!")

            // ⭐ CRITICAL: Check if Flutter app is in foreground
            // If in foreground, let Flutter handle the call UI
            // If in background/terminated, use native CallService
            val isAppInForeground = MainActivity.isAppInForeground

            if (isAppInForeground) {
                Log.d(TAG, "App is in FOREGROUND - passing to Flutter handler")
                // Let Flutter handle the call via its own incoming call screen
                super.onMessageReceived(remoteMessage)
            } else {
                Log.d(TAG, "App is in BACKGROUND/TERMINATED - using native CallService")
                handleIncomingCall(data)
            }
        } else {
            // For non-call notifications, let Flutter handle it
            // FlutterFire will automatically invoke the background handler
            Log.d(TAG, "Non-call notification, passing to Flutter handler")
            super.onMessageReceived(remoteMessage)
        }
    }

    private fun handleIncomingCall(data: Map<String, String>) {
        try {
            val callId = data["call_id"] ?: return
            val callerName = data["caller_name"] ?: "Unknown Caller"
            val callerAvatar = data["caller_avatar"]
            val callerUserId = data["caller_user_id"] ?: return
            val callType = data["call_type"] ?: "video"
            val isGroupCall = data["is_group_call"] == "true"

            Log.d(TAG, "Starting CallService for incoming call:")
            Log.d(TAG, "  Call ID: $callId")
            Log.d(TAG, "  Caller: $callerName")
            Log.d(TAG, "  Type: $callType")

            // Start the foreground CallService
            // This will show the incoming call UI even when app is terminated
            CallService.startService(
                this,
                callId,
                callerName,
                callerAvatar,
                callerUserId,
                callType,
                isGroupCall
            )

            Log.d(TAG, "CallService started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming call", e)
        }
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "FCM token refreshed: $token")
        // FlutterFire will handle token refresh via onTokenRefresh listener
        super.onNewToken(token)
    }
}
