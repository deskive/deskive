package com.deskive.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
// MediaProjection is handled by LiveKit/flutter_webrtc, not this service
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground Service for Screen Capture on Android 14+ (SDK 34+)
 *
 * This service satisfies Android 14+ requirement that a foreground service with
 * FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION must be running when using screen capture.
 *
 * IMPORTANT: This service does NOT create MediaProjection itself.
 * LiveKit/flutter_webrtc handles the actual MediaProjection creation.
 * This service's sole purpose is to provide the required foreground service context.
 *
 * Flow:
 * 1. User initiates screen share in Flutter
 * 2. This foreground service is started (with MEDIA_PROJECTION type)
 * 3. LiveKit requests MediaProjection permission and handles screen capture
 * 4. Service shows notification while screen sharing is active
 * 5. Service is stopped when screen sharing ends
 */
class ScreenCaptureService : Service() {

    companion object {
        private const val TAG = "ScreenCaptureService"
        const val CHANNEL_ID = "screen_capture_channel"
        const val NOTIFICATION_ID = 2001

        private var isRunning = false

        fun isServiceRunning(): Boolean = isRunning

        /**
         * Start the foreground service for screen capture.
         * This satisfies Android 14+ requirement for FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION.
         * LiveKit/flutter_webrtc will handle the actual MediaProjection.
         */
        fun startService(context: Context) {
            Log.d(TAG, "Starting ScreenCaptureService foreground service")
            val intent = Intent(context, ScreenCaptureService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /**
         * Legacy method for backward compatibility.
         * Permission result is no longer used - just starts the foreground service.
         */
        fun startServiceWithPermission(context: Context, resultCode: Int, resultData: Intent?) {
            Log.d(TAG, "Starting ScreenCaptureService (permission granted, resultCode=$resultCode)")
            startService(context)
        }

        fun stopService(context: Context) {
            Log.d(TAG, "Stopping ScreenCaptureService")
            context.stopService(Intent(context, ScreenCaptureService::class.java))
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "ScreenCaptureService onCreate")
        isRunning = true
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "ScreenCaptureService onStartCommand")

        // Start foreground FIRST with proper service type for Android 14+
        // IMPORTANT: We do NOT create MediaProjection here!
        // LiveKit/flutter_webrtc will handle MediaProjection creation.
        // This service's sole purpose is to satisfy Android 14+ requirement
        // that a foreground service with MEDIA_PROJECTION type must be running
        // BEFORE requesting MediaProjection permission.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Log.d(TAG, "Starting foreground with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION (Android 14+)")
            startForeground(
                NOTIFICATION_ID,
                createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Log.d(TAG, "Starting foreground with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION (Android 10+)")
            startForeground(
                NOTIFICATION_ID,
                createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )
        } else {
            Log.d(TAG, "Starting foreground without service type (pre-Android 10)")
            startForeground(NOTIFICATION_ID, createNotification())
        }

        // NOTE: We intentionally do NOT create MediaProjection here.
        // The permission result is only used to verify permission was granted.
        // LiveKit will request its own MediaProjection permission and create the projection.
        // This avoids the issue of consuming the permission token before LiveKit can use it.
        Log.d(TAG, "Foreground service started. LiveKit will handle MediaProjection creation.")

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        Log.d(TAG, "ScreenCaptureService onDestroy")
        isRunning = false
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Screen Sharing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when screen is being shared"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "Notification channel created: $CHANNEL_ID")
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Screen Sharing")
            .setContentText("Deskive is sharing your screen")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOngoing(true)
            .build()
    }
}
