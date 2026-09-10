package com.srgs.ems

import android.app.Application
import com.srgs.ems.services.EmsFirebaseMessagingService

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        EmsFirebaseMessagingService.createNotificationChannels(this)
    }
}
