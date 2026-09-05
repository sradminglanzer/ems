package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

class ParentRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun parentLogin(phone: String, pin: String?): ResponseResult<ParentLoginResponseDto> {
        return try {
            val res = api.parentLogin(ParentLoginRequest(contactNumber = phone.trim(), pin = pin?.trim()))
            if (res.isSuccessful && res.body() != null) {
                ResponseResult.Success(res.body()!!)
            } else {
                ResponseResult.Error(res.errorBody()?.string() ?: "Login failed")
            }
        } catch (e: Exception) {
            ResponseResult.Error(e.message ?: "Network error")
        }
    }

    suspend fun setPin(phone: String, newPin: String): SaveResult {
        return try {
            val res = api.parentSetPin(ParentSetPinRequest(contactNumber = phone.trim(), newPin = newPin.trim()))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.message())
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Failed to set PIN")
        }
    }

    suspend fun getChildDashboard(memberId: String): ParentDashboardDto? {
        return try {
            val res = api.getChildDashboard(memberId)
            if (res.isSuccessful) res.body() else null
        } catch (_: Exception) { null }
    }
}

sealed class ResponseResult<out T> {
    data class Success<out T>(val data: T) : ResponseResult<T>()
    data class Error(val message: String) : ResponseResult<Nothing>()
}
