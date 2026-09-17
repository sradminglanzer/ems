package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

class SettingsRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun updateInvoiceSequence(next: Int): SaveResult {
        return try {
            val res = api.updateInvoiceSequence(UpdateSequenceRequest(next))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to update sequence")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getEntitySettings(): EntitySettingsDto? {
        return try {
            val res = api.getEntitySettings()
            if (res.isSuccessful) res.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun updateAdmissionConfig(config: AdmissionNumberSettingDto): SaveResult {
        return try {
            val res = api.updateEntitySettings(UpdateEntitySettingsRequest(admissionConfig = config))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error("Failed to update admission settings")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }
}
