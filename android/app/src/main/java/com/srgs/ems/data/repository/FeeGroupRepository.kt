package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

class FeeGroupRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getGroups(academicYearId: String? = null): List<FeeGroupDto> {
        return try {
            val res = api.getFeeGroups(academicYearId)
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun createGroup(
        name: String,
        description: String?,
        capacity: Int = 1,
        classTeacherId: String? = null
    ): SaveResult {
        return try {
            val res = api.createFeeGroup(
                CreateFeeGroupRequest(name, description?.ifBlank { null }, capacity, classTeacherId?.ifBlank { null })
            )
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to create group")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateGroup(
        id: String,
        name: String,
        description: String?,
        capacity: Int = 1,
        classTeacherId: String? = null
    ): SaveResult {
        return try {
            val res = api.updateFeeGroup(
                id,
                CreateFeeGroupRequest(name, description?.ifBlank { null }, capacity, classTeacherId?.ifBlank { null })
            )
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to update group")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteGroup(id: String): SaveResult {
        return try {
            val res = api.deleteFeeGroup(id)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to delete group")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getGroupDetails(id: String, academicYearId: String? = null): FeeGroupDetailsResponseDto? {
        return try {
            val res = api.getFeeGroupDetails(id, academicYearId)
            if (res.isSuccessful) res.body() else null
        } catch (_: Exception) { null }
    }
}
