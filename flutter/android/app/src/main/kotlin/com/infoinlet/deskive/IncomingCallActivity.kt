package com.deskive.app

import android.Manifest
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * Full-screen activity for incoming calls
 * Shows over the lockscreen with accept/decline buttons
 * Launches Flutter VideoCallScreen when call is accepted
 */
class IncomingCallActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "IncomingCallActivity"
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    private var callId: String? = null
    private var callerName: String? = null
    private var callerAvatar: String? = null
    private var callerUserId: String? = null
    private var callType: String? = null
    private var isGroupCall: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "IncomingCallActivity onCreate")

        // Make activity show over lockscreen and turn on screen
        setupWindowFlags()

        // Extract call data from intent
        extractCallData()

        // Create the UI programmatically (no XML needed)
        setContentView(createCallUI())

        // Request microphone and camera permissions for the call
        requestCallPermissions()
    }

    private fun requestCallPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        // Check microphone permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
        }

        // Check camera permission (for video calls)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.CAMERA)
        }

        if (permissionsToRequest.isNotEmpty()) {
            Log.d(TAG, "Requesting permissions: $permissionsToRequest")
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        } else {
            Log.d(TAG, "All call permissions already granted")
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            for (i in permissions.indices) {
                val permission = permissions[i]
                val granted = grantResults[i] == PackageManager.PERMISSION_GRANTED
                Log.d(TAG, "Permission $permission granted: $granted")
            }
        }
    }

    private fun setupWindowFlags() {
        // Show activity over lockscreen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)

            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        // Make activity full screen
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                )

        // Set status bar and navigation bar colors
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK
    }

    private fun extractCallData() {
        callId = intent.getStringExtra(CallService.EXTRA_CALL_ID)
        callerName = intent.getStringExtra(CallService.EXTRA_CALLER_NAME) ?: "Unknown Caller"
        callerAvatar = intent.getStringExtra(CallService.EXTRA_CALLER_AVATAR)
        callerUserId = intent.getStringExtra(CallService.EXTRA_CALLER_USER_ID)
        callType = intent.getStringExtra(CallService.EXTRA_CALL_TYPE) ?: "video"
        isGroupCall = intent.getBooleanExtra(CallService.EXTRA_IS_GROUP_CALL, false)

        Log.d(TAG, "Call data - ID: $callId, Caller: $callerName, Type: $callType")
    }

    private fun createCallUI(): View {
        // Main container - black background
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.BLACK)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
            setPadding(0, dpToPx(80), 0, dpToPx(60))
        }

        // Top section - Call type label
        val callTypeLabel = TextView(this).apply {
            text = if (callType == "video") "Incoming Video Call" else "Incoming Voice Call"
            setTextColor(Color.parseColor("#B0B0B0"))
            textSize = 16f
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(40)
            }
        }
        mainLayout.addView(callTypeLabel)

        // Avatar circle with initial
        val avatarSize = dpToPx(140)
        val avatarContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val avatarCircle = TextView(this).apply {
            val initial = callerName?.firstOrNull()?.uppercaseChar() ?: '?'
            text = initial.toString()
            setTextColor(Color.WHITE)
            textSize = 60f
            gravity = Gravity.CENTER
            background = createCircleDrawable(Color.parseColor("#1E88E5"))
            layoutParams = LinearLayout.LayoutParams(avatarSize, avatarSize)
        }
        avatarContainer.addView(avatarCircle)

        // Caller name
        val callerNameView = TextView(this).apply {
            text = callerName
            setTextColor(Color.WHITE)
            textSize = 28f
            gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(30)
            }
        }
        avatarContainer.addView(callerNameView)

        // Ringing text
        val ringingText = TextView(this).apply {
            text = "Ringing..."
            setTextColor(Color.parseColor("#808080"))
            textSize = 16f
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(8)
            }
        }
        avatarContainer.addView(ringingText)

        mainLayout.addView(avatarContainer)

        // Spacer
        val spacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }
        mainLayout.addView(spacer)

        // Bottom buttons container
        val buttonsContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(40)
            }
        }

        // Decline button (red)
        val declineButton = createActionButton(
            Color.parseColor("#F44336"),
            "Decline"
        ) {
            onDeclineCall()
        }
        buttonsContainer.addView(declineButton)

        // Space between buttons
        val buttonSpacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(80), 1)
        }
        buttonsContainer.addView(buttonSpacer)

        // Accept button (green)
        val acceptButton = createActionButton(
            Color.parseColor("#4CAF50"),
            "Accept"
        ) {
            onAcceptCall()
        }
        buttonsContainer.addView(acceptButton)

        mainLayout.addView(buttonsContainer)

        return mainLayout
    }

    private fun createActionButton(color: Int, label: String, onClick: () -> Unit): LinearLayout {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val buttonSize = dpToPx(70)
        val button = TextView(this).apply {
            val icon = if (label == "Accept") "\uD83D\uDCDE" else "\uD83D\uDCF5" // Phone emojis
            text = icon
            textSize = 28f
            gravity = Gravity.CENTER
            background = createCircleDrawable(color)
            layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize)
            setOnClickListener { onClick() }
            isClickable = true
            isFocusable = true
        }
        container.addView(button)

        val labelView = TextView(this).apply {
            text = label
            setTextColor(Color.WHITE)
            textSize = 14f
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(12)
            }
        }
        container.addView(labelView)

        return container
    }

    private fun createCircleDrawable(color: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
        }
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    private fun onAcceptCall() {
        Log.d(TAG, "Call accepted - launching Flutter VideoCallScreen")

        // Store call data in SharedPreferences for Flutter to read
        val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString("flutter.pending_accepted_call_id", callId)
        editor.putString("flutter.pending_accepted_call_type", callType)
        editor.putString("flutter.pending_accepted_caller_user_id", callerUserId)
        editor.putString("flutter.pending_accepted_caller_name", callerName)
        editor.putString("flutter.pending_accepted_caller_avatar", callerAvatar ?: "")
        editor.putBoolean("flutter.pending_accepted_is_group_call", isGroupCall)
        editor.apply()

        // Stop the call service (stops ringtone/vibration)
        CallService.stopService(this)

        // Launch Flutter app - it will check for pending_accepted_call and show VideoCallScreen
        val flutterIntent = Intent(this, MainActivity::class.java)
        flutterIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        flutterIntent.putExtra("call_accepted", true)
        flutterIntent.putExtra(CallService.EXTRA_CALL_ID, callId)
        flutterIntent.putExtra(CallService.EXTRA_CALLER_NAME, callerName)
        flutterIntent.putExtra(CallService.EXTRA_CALL_TYPE, callType)
        startActivity(flutterIntent)

        // Close this activity
        finish()
    }

    private fun onDeclineCall() {
        Log.d(TAG, "Call declined")

        // Store decline info for Flutter to notify backend
        val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString("flutter.pending_declined_call_id", callId)
        editor.putString("flutter.pending_declined_caller_user_id", callerUserId)
        editor.apply()

        // Stop the call service
        CallService.stopService(this)

        // Close this activity
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Don't allow back button to dismiss the call screen
        // User must accept or decline
    }

    override fun onDestroy() {
        Log.d(TAG, "IncomingCallActivity onDestroy")
        super.onDestroy()
    }
}
