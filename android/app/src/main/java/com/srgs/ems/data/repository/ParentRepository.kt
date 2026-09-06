package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

class ParentRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun setPin(phone: String, newPin: String): SaveResult {
        return try {
            val res = api.setParentPin(ParentSetPinRequest(contactNumber = phone.trim(), newPin = newPin.trim()))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.message())
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Failed to set PIN")
        }
    }

    suspend fun getChildDashboard(memberId: String): ParentDashboardDto? {
        return try {
            val res = api.getStudentDashboard(memberId)
            if (res.isSuccessful) res.body() else null
        } catch (_: Exception) { null }
    }
}

sealed class ResponseResult<out T> {
    data class Success<out T>(val data: T) : ResponseResult<T>()
    data class Error(val message: String) : ResponseResult<Nothing>()
}
