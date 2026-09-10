package com.srgs.ems.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.srgs.ems.MainActivity
import com.srgs.ems.R
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.RegisterFcmTokenRequest
import com.srgs.ems.data.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class EmsFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "EmsFCM"
        const val CHANNEL_PARENT_ALERTS = "ems_parent_alerts"
        const val CHANNEL_ATTENDANCE = "ems_attendance_channel"
        const val CHANNEL_DIARY = "ems_diary_channel"
        const val CHANNEL_FEES = "ems_fees_channel"
        const val CHANNEL_EXAMS = "ems_exams_channel"
        const val CHANNEL_GENERAL = "ems_general_channel"

        fun createNotificationChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                val channels = listOf(
                    NotificationChannel(
                        CHANNEL_PARENT_ALERTS,
                        "School Parent Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Instant alerts for attendance, diary, fees, and school notices"
                        enableVibration(true)
                    },
                    NotificationChannel(
                        CHANNEL_ATTENDANCE,
                        "Attendance Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Alerts for student absences and late arrivals"
                        enableVibration(true)
                    },
                    NotificationChannel(
                        CHANNEL_DIARY,
                        "Daily Class Diary",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Daily homework and class diary updates"
                        enableVibration(true)
                    },
                    NotificationChannel(
                        CHANNEL_FEES,
                        "Fee Receipts & Dues",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Payment receipts and pending fee reminders"
                        enableVibration(true)
                    },
                    NotificationChannel(
                        CHANNEL_EXAMS,
                        "Exams & Report Cards",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Exam timetables and published results"
                        enableVibration(true)
                    },
                    NotificationChannel(
                        CHANNEL_GENERAL,
                        "General Notifications",
                        NotificationManager.IMPORTANCE_DEFAULT
                    ).apply {
                        description = "School circulars and announcements"
                    }
                )

                notificationManager.createNotificationChannels(channels)
                Log.d(TAG, "Notification channels registered.")
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Token generated: $token")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val phone = SessionManager.session?.phone
                if (!phone.isNullOrBlank()) {
                    ApiClient.getApiService(applicationContext).registerParentFcmToken(
                        RegisterFcmTokenRequest(
                            contactNumber = phone,
                            fcmToken = token,
                            deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"
                        )
                    )
                    Log.d(TAG, "FCM Token synced to server for $phone")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync FCM Token onNewToken", e)
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "📩 FCM Message received from: ${remoteMessage.from}")
        Log.d(TAG, "📩 Notification: title='${remoteMessage.notification?.title}', body='${remoteMessage.notification?.body}'")
        Log.d(TAG, "📩 Data payload: ${remoteMessage.data}")

        val title = remoteMessage.notification?.title 
            ?: remoteMessage.data["title"] 
            ?: "School Notification"
            
        val body = remoteMessage.notification?.body 
            ?: remoteMessage.data["body"] 
            ?: ""

        val type = remoteMessage.data["type"] ?: "general"

        showNotification(title, body, type, remoteMessage.data)
    }

    private fun showNotification(
        title: String,
        body: String,
        type: String,
        data: Map<String, String>
    ) {
        createNotificationChannels(this)

        val channelId = when (type) {
            "attendance_alert" -> CHANNEL_ATTENDANCE
            "daily_diary" -> CHANNEL_DIARY
            "fee_receipt", "fee_reminder" -> CHANNEL_FEES
            "exam_timetable", "exam_result" -> CHANNEL_EXAMS
            else -> CHANNEL_GENERAL
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("notification_type", type)
            data.forEach { (k, v) -> putExtra(k, v) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = (System.currentTimeMillis() % 100000).toInt()
        notificationManager.notify(notificationId, notificationBuilder.build())
    }
}
