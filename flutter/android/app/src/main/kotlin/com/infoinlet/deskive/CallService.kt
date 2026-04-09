package com.deskive.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground Service for handling incoming VoIP calls
 * This service runs even when the app is terminated and handles:
 * 1. Displaying full-screen incoming call notification
 * 2. Playing ringtone and vibration
 * 3. Launching IncomingCallActivity over lockscreen
 */
class CallService : Service() {

    companion object {
        private const val TAG = "CallService"
        const val CHANNEL_ID = "incoming_call_channel"
        const val NOTIFICATION_ID = 1001

        // Intent extras
        const val EXTRA_CALL_ID = "call_id"
        const val EXTRA_CALLER_NAME = "caller_name"
        const val EXTRA_CALLER_AVATAR = "caller_avatar"
        const val EXTRA_CALLER_USER_ID = "caller_user_id"
        const val EXTRA_CALL_TYPE = "call_type"
        const val EXTRA_IS_GROUP_CALL = "is_group_call"

        // Actions
        const val ACTION_INCOMING_CALL = "com.deskive.app.INCOMING_CALL"
        const val ACTION_ACCEPT_CALL = "com.deskive.app.ACCEPT_CALL"
        const val ACTION_DECLINE_CALL = "com.deskive.app.DECLINE_CALL"
        const val ACTION_STOP_SERVICE = "com.deskive.app.STOP_SERVICE"

        private var isRunning = false

        fun isServiceRunning(): Boolean = isRunning

        /**
         * Start the call service with call data
         */
        fun startService(
            context: Context,
            callId: String,
            callerName: String,
            callerAvatar: String?,
            callerUserId: String,
            callType: String,
            isGroupCall: Boolean
        ) {
            Log.d(TAG, "Starting CallService for call: $callId")
            val intent = Intent(context, CallService::class.java).apply {
                action = ACTION_INCOMING_CALL
                putExtra(EXTRA_CALL_ID, callId)
                putExtra(EXTRA_CALLER_NAME, callerName)
                putExtra(EXTRA_CALLER_AVATAR, callerAvatar)
                putExtra(EXTRA_CALLER_USER_ID, callerUserId)
                putExtra(EXTRA_CALL_TYPE, callType)
                putExtra(EXTRA_IS_GROUP_CALL, isGroupCall)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /**
         * Stop the call service
         */
        fun stopService(context: Context) {
            Log.d(TAG, "Stopping CallService")
            val intent = Intent(context, CallService::class.java).apply {
                action = ACTION_STOP_SERVICE
            }
            context.stopService(intent)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var vibrator: Vibrator? = null
    private var ringtone: android.media.Ringtone? = null

    // Call data
    private var callId: String? = null
    private var callerName: String? = null
    private var callerAvatar: String? = null
    private var callerUserId: String? = null
    private var callType: String? = null
    private var isGroupCall: Boolean = false

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "CallService onCreate")
        isRunning = true
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "CallService onStartCommand: ${intent?.action}")

        when (intent?.action) {
            ACTION_INCOMING_CALL -> {
                // Extract call data
                callId = intent.getStringExtra(EXTRA_CALL_ID)
                callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown Caller"
                callerAvatar = intent.getStringExtra(EXTRA_CALLER_AVATAR)
                callerUserId = intent.getStringExtra(EXTRA_CALLER_USER_ID)
                callType = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "video"
                isGroupCall = intent.getBooleanExtra(EXTRA_IS_GROUP_CALL, false)

                // Start foreground with notification
                // Use only FOREGROUND_SERVICE_TYPE_PHONE_CALL here - microphone permission
                // will be requested in IncomingCallActivity when the call screen shows
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    startForeground(
                        NOTIFICATION_ID,
                        createIncomingCallNotification(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
                    )
                } else {
                    startForeground(NOTIFICATION_ID, createIncomingCallNotification())
                }

                // Acquire wake lock to turn on screen
                acquireWakeLock()

                // Start ringtone and vibration
                startRingtoneAndVibration()

                // Launch full-screen incoming call activity
                launchIncomingCallActivity()
            }

            ACTION_ACCEPT_CALL -> {
                Log.d(TAG, "Call accepted")
                stopRingtoneAndVibration()
                // The IncomingCallActivity will handle navigation to VideoCallScreen
                stopSelf()
            }

            ACTION_DECLINE_CALL -> {
                Log.d(TAG, "Call declined")
                stopRingtoneAndVibration()
                stopSelf()
            }

            ACTION_STOP_SERVICE -> {
                Log.d(TAG, "Stop service requested")
                stopRingtoneAndVibration()
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        Log.d(TAG, "CallService onDestroy")
        isRunning = false
        stopRingtoneAndVibration()
        releaseWakeLock()
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // IMPORTANCE_HIGH is required for full-screen intent to work on Android 10+
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for incoming video calls"
                setSound(null, null) // We handle sound ourselves
                enableVibration(false) // We handle vibration ourselves
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createIncomingCallNotification(): Notification {
        // Full-screen intent to show IncomingCallActivity
        val fullScreenIntent = Intent(this, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION
            putExtra(EXTRA_CALL_ID, callId)
            putExtra(EXTRA_CALLER_NAME, callerName)
            putExtra(EXTRA_CALLER_AVATAR, callerAvatar)
            putExtra(EXTRA_CALLER_USER_ID, callerUserId)
            putExtra(EXTRA_CALL_TYPE, callType)
            putExtra(EXTRA_IS_GROUP_CALL, isGroupCall)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Accept action
        val acceptIntent = Intent(this, CallService::class.java).apply {
            action = ACTION_ACCEPT_CALL
            putExtra(EXTRA_CALL_ID, callId)
        }
        val acceptPendingIntent = PendingIntent.getService(
            this, 1, acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decline action
        val declineIntent = Intent(this, CallService::class.java).apply {
            action = ACTION_DECLINE_CALL
            putExtra(EXTRA_CALL_ID, callId)
        }
        val declinePendingIntent = PendingIntent.getService(
            this, 2, declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val callTypeText = if (callType == "video") "Video Call" else "Voice Call"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(callerName)
            .setContentText("Incoming $callTypeText")
            // PRIORITY_HIGH is required for full-screen intent to work
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(R.mipmap.ic_launcher, "Accept", acceptPendingIntent)
            .addAction(R.mipmap.ic_launcher, "Decline", declinePendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun launchIncomingCallActivity() {
        Log.d(TAG, "Launching IncomingCallActivity")
        val intent = Intent(this, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_NO_USER_ACTION or
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            putExtra(EXTRA_CALL_ID, callId)
            putExtra(EXTRA_CALLER_NAME, callerName)
            putExtra(EXTRA_CALLER_AVATAR, callerAvatar)
            putExtra(EXTRA_CALLER_USER_ID, callerUserId)
            putExtra(EXTRA_CALL_TYPE, callType)
            putExtra(EXTRA_IS_GROUP_CALL, isGroupCall)
        }
        startActivity(intent)
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE,
                "Deskive:IncomingCallWakeLock"
            )
            wakeLock?.acquire(60 * 1000L) // 60 seconds timeout
            Log.d(TAG, "WakeLock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring wake lock", e)
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "WakeLock released")
                }
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock", e)
        }
    }

    private fun startRingtoneAndVibration() {
        try {
            // Start vibration
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            // Vibration pattern: wait 0ms, vibrate 1000ms, wait 1000ms, repeat
            val pattern = longArrayOf(0, 1000, 1000, 1000, 1000)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
            Log.d(TAG, "Vibration started")

            // Start ringtone
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ringtone = RingtoneManager.getRingtone(this, ringtoneUri)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ringtone?.isLooping = true
            }

            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            if (audioManager.ringerMode != AudioManager.RINGER_MODE_SILENT) {
                ringtone?.play()
                Log.d(TAG, "Ringtone started")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting ringtone/vibration", e)
        }
    }

    private fun stopRingtoneAndVibration() {
        try {
            vibrator?.cancel()
            vibrator = null
            Log.d(TAG, "Vibration stopped")

            ringtone?.stop()
            ringtone = null
            Log.d(TAG, "Ringtone stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping ringtone/vibration", e)
        }
    }
}
