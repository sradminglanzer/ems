package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.AcademicYearDto
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.CreateAcademicYearRequest

class AcademicYearRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getYears(): List<AcademicYearDto> {
        return try {
            val res = api.getAcademicYears()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun createYear(
        name: String, startDate: String, endDate: String, isFirst: Boolean
    ): SaveResult {
        return try {
            val res = api.createAcademicYear(
                CreateAcademicYearRequest(name, startDate, endDate, isFirst)
            )
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to create year")
        } catch (e: Exception) { SaveResult.Error(e.message ?: "Unknown error") }
    }

    suspend fun setActive(id: String): SaveResult {
        return try {
            val res = api.setAcademicYearActive(id, mapOf("isActive" to true))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error("Failed to update academic year")
        } catch (e: Exception) { SaveResult.Error(e.message ?: "Unknown error") }
    }
}
