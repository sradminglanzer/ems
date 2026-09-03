package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

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

    suspend fun saveResults(examId: String, results: List<MemberResultInput>): SaveResult {
        return try {
            val response = api.addExamResults(examId, AddResultsRequest(results))
            if (response.isSuccessful) SaveResult.Success
            else SaveResult.Error(response.message())
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Failed to save results")
        }
    }

    suspend fun getFeeGroups(): List<FeeGroupDto> {
        return try {
            val response = api.getFeeGroups()
            if (response.isSuccessful) response.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getFeeGroupDetails(groupId: String, yearId: String?): FeeGroupDetailsResponseDto? {
        return try {
            val response = api.getFeeGroupDetails(groupId, yearId)
            if (response.isSuccessful) response.body() else null
        } catch (_: Exception) { null }
    }
}
