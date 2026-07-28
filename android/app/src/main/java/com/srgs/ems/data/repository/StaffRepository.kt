package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.CreateStaffRequest
import com.srgs.ems.data.api.StaffDto

class StaffRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getStaff(): List<StaffDto> {
        return try {
            val res = api.getStaff()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun createStaff(name: String, contactNumber: String, role: String): SaveResult {
        return try {
            val res = api.createStaff(CreateStaffRequest(name, contactNumber, role))
            if (res.isSuccessful) SaveResult.Success else {
                val msg = res.errorBody()?.string() ?: "Failed to create staff member"
                SaveResult.Error(msg)
            }
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteStaff(id: String): SaveResult {
        return try {
            val res = api.deleteStaff(id)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to delete staff member")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }
}
