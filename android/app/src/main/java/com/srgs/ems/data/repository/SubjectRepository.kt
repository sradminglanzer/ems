package com.srgs.ems.data.repository

import android.content.Context
import android.util.Log
import com.srgs.ems.data.api.*

class SubjectRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getSubjects(): List<SubjectDto> {
        return try {
            val res = api.getSubjects()
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (e: Exception) {
            Log.e("SubjectRepo", "getSubjects() error: ${e.message}", e)
            emptyList()
        }
    }

    suspend fun createSubject(req: CreateSubjectRequest): SaveResult {
        return try {
            val res = api.createSubject(req)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to create subject")
        } catch (e: Exception) {
            Log.e("SubjectRepo", "createSubject() error: ${e.message}", e)
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateSubject(id: String, req: CreateSubjectRequest): SaveResult {
        return try {
            val res = api.updateSubject(id, req)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to update subject")
        } catch (e: Exception) {
            Log.e("SubjectRepo", "updateSubject() error: ${e.message}", e)
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteSubject(id: String): SaveResult {
        return try {
            val res = api.deleteSubject(id)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to delete subject")
        } catch (e: Exception) {
            Log.e("SubjectRepo", "deleteSubject() error: ${e.message}", e)
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }
}
