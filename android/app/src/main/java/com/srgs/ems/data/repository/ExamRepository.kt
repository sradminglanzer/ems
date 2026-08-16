package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.CreateExamRequest
import com.srgs.ems.data.api.ExamDto
import com.srgs.ems.data.api.ExamResultDto
import com.srgs.ems.data.api.RankSheetEntryDto

class ExamRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getExams(academicYearId: String? = null): List<ExamDto> {
        return try {
            val response = api.getExams(academicYearId)
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun createExam(request: CreateExamRequest): SaveResult {
        return try {
            val response = api.createExam(request)
            if (response.isSuccessful) SaveResult.Success
            else SaveResult.Error(response.message())
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getExamResults(examId: String): List<ExamResultDto> {
        return try {
            val response = api.getExamResults(examId)
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getRankSheet(examId: String): List<RankSheetEntryDto> {
        return try {
            val response = api.getRankSheet(examId)
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
