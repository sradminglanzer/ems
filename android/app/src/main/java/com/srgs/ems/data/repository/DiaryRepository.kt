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

    suspend fun updateDiaryEntry(id: String, req: UpdateDiaryRequest): SaveResult {
        return try {
            val res = api.updateDiaryEntry(id, req)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to update diary entry")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteDiaryEntry(id: String): SaveResult {
        return try {
            val res = api.deleteDiaryEntry(id)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to delete diary entry")
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

    suspend fun uploadImage(base64: String, filename: String = "diary_image.jpg"): Result<String> {
        return try {
            val res = api.uploadImage(DirectImageUploadRequest(imageBase64 = base64, filename = filename))
            if (res.isSuccessful && res.body() != null) {
                val url = res.body()!!.publicUrl.ifBlank { res.body()!!.url }
                Result.success(url)
            } else {
                Result.failure(Exception(res.errorBody()?.string() ?: "Failed to upload image"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
