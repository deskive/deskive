package com.deskive.app

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PictureInPictureParams
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.util.Rational
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    companion object {
        private const val TAG = "MainActivity"
        private const val REQUEST_MEDIA_PROJECTION = 1002

        // Track if app is in foreground (Flutter is active)
        @Volatile
        var isAppInForeground = false
            private set
    }

    private val PIP_CHANNEL = "com.deskive/pip"
    private val CALL_CHANNEL = "com.deskive/calls"
    private val SCREEN_CAPTURE_CHANNEL = "com.deskive/screen_capture"
    private var isInPipMode = false
    private var shouldEnterPipOnLeave = false
    private var pipMethodChannel: MethodChannel? = null
    private var callMethodChannel: MethodChannel? = null
    private var screenCaptureMethodChannel: MethodChannel? = null

    // Pending result for MediaProjection permission request
    private var pendingScreenCaptureResult: MethodChannel.Result? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "MainActivity onCreate")

        // Create notification channels for Android 8.0+
        createNotificationChannels()

        // Check if launched from IncomingCallActivity with accepted call
        handleAcceptedCallIntent(intent)

        // Check if launched from FCM notification click (when app was terminated)
        // This handles the case when FCM has notification payload and system showed
        // the notification automatically without calling DeskiveFirebaseMessagingService
        handleFCMNotificationClick(intent)
    }

    /**
     * Create notification channels required for foreground services
     * This includes the screen capture service channel for Android 14+
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Screen Capture notification channel (required for flutter_webrtc screen share on Android 14+)
            val screenCaptureChannel = NotificationChannel(
                "screen_capture_channel",
                "Screen Capture",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when screen is being shared in a video call"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(screenCaptureChannel)

            // Also create with the ID that flutter_webrtc might use
            val webrtcScreenCaptureChannel = NotificationChannel(
                "WebRTC_Screen_Capture",
                "Screen Sharing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active when sharing your screen"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(webrtcScreenCaptureChannel)

            Log.d(TAG, "Notification channels created for screen capture")
        }
    }

    override fun onResume() {
        super.onResume()
        isAppInForeground = true
        Log.d(TAG, "MainActivity onResume - App is now in FOREGROUND")
    }

    override fun onPause() {
        super.onPause()
        isAppInForeground = false
        Log.d(TAG, "MainActivity onPause - App is now in BACKGROUND")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Log.d(TAG, "MainActivity onNewIntent")
        setIntent(intent)
        handleAcceptedCallIntent(intent)
        handleFCMNotificationClick(intent)
    }

    /**
     * Handle FCM notification click when app was terminated
     * When FCM has a notification payload and app is terminated, Android shows
     * the notification automatically WITHOUT calling DeskiveFirebaseMessagingService.
     * When user clicks, the intent contains FCM data that we can use to show the call UI.
     */
    private fun handleFCMNotificationClick(intent: Intent?) {
        if (intent == null) return

        // Check for FCM data in the intent extras
        val extras = intent.extras ?: return

        // FCM puts data payload in intent extras when notification is clicked
        val callId = extras.getString("call_id")
        val callType = extras.getString("call_type")
        val callerUserId = extras.getString("caller_user_id")
        val callerName = extras.getString("caller_name")

        // Check if this is an incoming call notification click
        if (callId != null && callType != null && callerUserId != null && callerName != null) {
            Log.d(TAG, "FCM notification click detected with call data:")
            Log.d(TAG, "  Call ID: $callId")
            Log.d(TAG, "  Caller: $callerName")
            Log.d(TAG, "  Type: $callType")

            // Check if CallService is already running (to avoid duplicate)
            if (CallService.isServiceRunning()) {
                Log.d(TAG, "CallService already running, skipping")
                return
            }

            // Start CallService to show IncomingCallActivity
            val callerAvatar = extras.getString("caller_avatar")
            val isGroupCall = extras.getString("is_group_call") == "true"

            Log.d(TAG, "Starting CallService from FCM notification click")
            CallService.startService(
                this,
                callId,
                callerName,
                callerAvatar,
                callerUserId,
                callType,
                isGroupCall
            )

            // Clear the intent to prevent re-processing
            intent.removeExtra("call_id")
        }
    }

    private fun handleAcceptedCallIntent(intent: Intent?) {
        if (intent?.getBooleanExtra("call_accepted", false) == true) {
            Log.d(TAG, "Call was accepted from IncomingCallActivity")

            // Get call data from SharedPreferences
            val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            val callId = prefs.getString("flutter.pending_accepted_call_id", null)

            if (callId != null) {
                Log.d(TAG, "Found pending accepted call: $callId, notifying Flutter")

                // If Flutter is already running, notify it immediately via MethodChannel
                // This handles the case when app was in background (not terminated)
                flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
                    val callData = mapOf(
                        "call_id" to callId,
                        "call_type" to prefs.getString("flutter.pending_accepted_call_type", "video"),
                        "caller_user_id" to prefs.getString("flutter.pending_accepted_caller_user_id", ""),
                        "caller_name" to prefs.getString("flutter.pending_accepted_caller_name", ""),
                        "caller_avatar" to prefs.getString("flutter.pending_accepted_caller_avatar", ""),
                        "is_group_call" to prefs.getBoolean("flutter.pending_accepted_is_group_call", false)
                    )

                    // Clear the pending call data now that we're passing it to Flutter
                    prefs.edit().apply {
                        remove("flutter.pending_accepted_call_id")
                        remove("flutter.pending_accepted_call_type")
                        remove("flutter.pending_accepted_caller_user_id")
                        remove("flutter.pending_accepted_caller_name")
                        remove("flutter.pending_accepted_caller_avatar")
                        remove("flutter.pending_accepted_is_group_call")
                        apply()
                    }

                    // Notify Flutter about the accepted call
                    MethodChannel(messenger, CALL_CHANNEL).invokeMethod("onCallAccepted", callData)
                    Log.d(TAG, "Notified Flutter about accepted call: $callId")
                }
            }
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        setupPipChannel(flutterEngine)
        setupCallChannel(flutterEngine)
        setupScreenCaptureChannel(flutterEngine)
    }

    private fun setupCallChannel(flutterEngine: FlutterEngine) {
        callMethodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CALL_CHANNEL)
        callMethodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "getPendingAcceptedCall" -> {
                    // Check SharedPreferences for pending accepted call
                    val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
                    val callId = prefs.getString("flutter.pending_accepted_call_id", null)

                    if (callId != null) {
                        val callData = mapOf(
                            "call_id" to callId,
                            "call_type" to prefs.getString("flutter.pending_accepted_call_type", "video"),
                            "caller_user_id" to prefs.getString("flutter.pending_accepted_caller_user_id", ""),
                            "caller_name" to prefs.getString("flutter.pending_accepted_caller_name", ""),
                            "caller_avatar" to prefs.getString("flutter.pending_accepted_caller_avatar", ""),
                            "is_group_call" to prefs.getBoolean("flutter.pending_accepted_is_group_call", false)
                        )

                        // Clear the pending call data
                        prefs.edit().apply {
                            remove("flutter.pending_accepted_call_id")
                            remove("flutter.pending_accepted_call_type")
                            remove("flutter.pending_accepted_caller_user_id")
                            remove("flutter.pending_accepted_caller_name")
                            remove("flutter.pending_accepted_caller_avatar")
                            remove("flutter.pending_accepted_is_group_call")
                            apply()
                        }

                        Log.d(TAG, "Returning pending accepted call: $callId")
                        result.success(callData)
                    } else {
                        result.success(null)
                    }
                }

                "getPendingDeclinedCall" -> {
                    // Check SharedPreferences for pending declined call
                    val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
                    val callId = prefs.getString("flutter.pending_declined_call_id", null)

                    if (callId != null) {
                        val callData = mapOf(
                            "call_id" to callId,
                            "caller_user_id" to prefs.getString("flutter.pending_declined_caller_user_id", "")
                        )

                        // Clear the pending declined call data
                        prefs.edit().apply {
                            remove("flutter.pending_declined_call_id")
                            remove("flutter.pending_declined_caller_user_id")
                            apply()
                        }

                        Log.d(TAG, "Returning pending declined call: $callId")
                        result.success(callData)
                    } else {
                        result.success(null)
                    }
                }

                "showIncomingCall" -> {
                    // Start CallService to show incoming call UI
                    val callId = call.argument<String>("call_id") ?: ""
                    val callerName = call.argument<String>("caller_name") ?: "Unknown"
                    val callerAvatar = call.argument<String>("caller_avatar")
                    val callerUserId = call.argument<String>("caller_user_id") ?: ""
                    val callType = call.argument<String>("call_type") ?: "video"
                    val isGroupCall = call.argument<Boolean>("is_group_call") ?: false

                    Log.d(TAG, "Starting CallService for incoming call: $callId")
                    CallService.startService(
                        this,
                        callId,
                        callerName,
                        callerAvatar,
                        callerUserId,
                        callType,
                        isGroupCall
                    )
                    result.success(true)
                }

                "stopCallService" -> {
                    Log.d(TAG, "Stopping CallService")
                    CallService.stopService(this)
                    result.success(true)
                }

                "isCallServiceRunning" -> {
                    result.success(CallService.isServiceRunning())
                }

                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun setupScreenCaptureChannel(flutterEngine: FlutterEngine) {
        screenCaptureMethodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SCREEN_CAPTURE_CHANNEL)
        screenCaptureMethodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "startForegroundService" -> {
                    // Just start the foreground service - LiveKit will handle MediaProjection
                    Log.d(TAG, "Starting ScreenCaptureService foreground service")
                    try {
                        ScreenCaptureService.startService(this)
                        // Give the service a moment to start
                        Thread.sleep(100)
                        result.success(true)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error starting ScreenCaptureService", e)
                        result.error("SERVICE_ERROR", e.message, null)
                    }
                }

                "requestScreenCapturePermission" -> {
                    // DEPRECATED: Now just starts the service without requesting permission
                    // LiveKit will handle the MediaProjection permission request
                    Log.d(TAG, "Starting foreground service (legacy requestScreenCapturePermission)")
                    try {
                        ScreenCaptureService.startService(this)
                        Thread.sleep(100)
                        result.success(true)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error starting ScreenCaptureService", e)
                        result.error("SERVICE_ERROR", e.message, null)
                    }
                }

                "stopForegroundService" -> {
                    Log.d(TAG, "Stopping ScreenCaptureService from Flutter")
                    try {
                        ScreenCaptureService.stopService(this)
                        result.success(true)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error stopping ScreenCaptureService", e)
                        result.error("SERVICE_ERROR", e.message, null)
                    }
                }

                "isServiceRunning" -> {
                    result.success(ScreenCaptureService.isServiceRunning())
                }

                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == REQUEST_MEDIA_PROJECTION) {
            Log.d(TAG, "MediaProjection permission result: $resultCode")

            if (resultCode == Activity.RESULT_OK && data != null) {
                // Permission granted - start the foreground service with the permission data
                Log.d(TAG, "MediaProjection permission granted, starting foreground service")
                try {
                    ScreenCaptureService.startServiceWithPermission(this, resultCode, data)
                    // Give the service a moment to start
                    Thread.sleep(200)
                    pendingScreenCaptureResult?.success(true)
                } catch (e: Exception) {
                    Log.e(TAG, "Error starting ScreenCaptureService after permission grant", e)
                    pendingScreenCaptureResult?.error("SERVICE_ERROR", e.message, null)
                }
            } else {
                // Permission denied
                Log.d(TAG, "MediaProjection permission denied")
                pendingScreenCaptureResult?.success(false)
            }
            pendingScreenCaptureResult = null
        }
    }

    private fun setupPipChannel(flutterEngine: FlutterEngine) {
        pipMethodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, PIP_CHANNEL)
        pipMethodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "isPipSupported" -> {
                    val supported = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE)
                    } else {
                        false
                    }
                    result.success(supported)
                }
                "enterPipMode" -> {
                    val entered = enterPipModeInternal()
                    result.success(entered)
                }
                "isInPipMode" -> {
                    result.success(isInPipMode)
                }
                "enableAutoPip" -> {
                    shouldEnterPipOnLeave = call.arguments as? Boolean ?: false
                    result.success(true)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Called when user presses home or switches apps
        if (shouldEnterPipOnLeave && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            enterPipModeInternal()
        }
    }

    private fun enterPipModeInternal(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(9, 16)) // Portrait mode (vertical)
                    .build()
                enterPictureInPictureMode(params)
                true
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        } else {
            false
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        isInPipMode = isInPictureInPictureMode

        // Notify Flutter about PiP mode change
        flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
            MethodChannel(messenger, PIP_CHANNEL).invokeMethod("onPipModeChanged", isInPictureInPictureMode)
        }
    }
}
