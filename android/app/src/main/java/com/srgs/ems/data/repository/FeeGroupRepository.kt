package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.CreateFeeGroupRequest
import com.srgs.ems.data.api.FeeGroupDto

class FeeGroupRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getGroups(): List<FeeGroupDto> {
        return try {
            val res = api.getFeeGroups()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun createGroup(name: String, description: String?, capacity: Int = 1): SaveResult {
        return try {
            val res = api.createFeeGroup(CreateFeeGroupRequest(name, description?.ifBlank { null }, capacity))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to create group")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateGroup(id: String, name: String, description: String?, capacity: Int = 1): SaveResult {
        return try {
            val res = api.updateFeeGroup(id, CreateFeeGroupRequest(name, description?.ifBlank { null }, capacity))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to update group")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }
}
