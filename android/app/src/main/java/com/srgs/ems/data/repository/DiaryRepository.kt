package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

class DiaryRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getDiaryFeed(classId: String, academicYearId: String? = null): List<DiaryDto> {
        return try {
            val res = api.getDiaryFeed(classId, academicYearId)
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun createDiaryEntry(req: CreateDiaryRequest): SaveResult {
        return try {
            val res = api.createDiaryEntry(req)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to post diary entry")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateTracking(diaryId: String, updates: List<StudentTrackingUpdate>): SaveResult {
        return try {
            val res = api.updateDiaryTracking(diaryId, UpdateTrackingRequest(updates))
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to update tracking")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getSubjects(): List<SubjectDto> {
        return try {
            val res = api.getSubjects()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }
}
