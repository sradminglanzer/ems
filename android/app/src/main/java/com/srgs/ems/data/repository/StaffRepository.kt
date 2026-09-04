package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

class StaffRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getStaffList(): List<StaffDto> {
        return try {
            val res = api.getStaff()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getFeeGroups(): List<FeeGroupDto> {
        return try {
            val res = api.getFeeGroups()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getSubjects(): List<SubjectDto> {
        return try {
            val res = api.getSubjects()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getEntitySettings(): EntitySettingsDto? {
        return try {
            val res = api.getEntitySettings()
            if (res.isSuccessful) res.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun createStaff(req: CreateStaffRequest): SaveResult {
        return try {
            val res = api.createStaff(req)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to create staff member")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateStaff(id: String, req: CreateStaffRequest): SaveResult {
        return try {
            val res = api.updateStaff(id, req)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to update staff member")
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

    suspend fun toggleStaffLogin(id: String): SaveResult {
        return try {
            val res = api.toggleStaffLogin(id)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to toggle login access")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getMonthlyPayroll(month: Int, year: Int): MonthlyPayrollResponseDto? {
        return try {
            val res = api.getMonthlyPayroll(month, year)
            if (res.isSuccessful) res.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun processSalary(req: ProcessSalaryRequest): SaveResult {
        return try {
            val res = api.processSalary(req)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to process salary")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }
}
