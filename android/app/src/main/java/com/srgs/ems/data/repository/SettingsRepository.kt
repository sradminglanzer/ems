package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.UpdateSequenceRequest

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
}
