package com.srgs.ems.data.repository

import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.srgs.ems.data.api.*

sealed class SaveResult {
    object Success : SaveResult()
    data class Error(val message: String) : SaveResult()
}

class AddMemberRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getFeeGroups(): List<FeeGroupDto> {
        return try {
            val r = api.getFeeGroups()
            if (r.isSuccessful) r.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getFeeStructures(): List<FeeStructureDto> {
        return try {
            val r = api.getFeeStructures()
            if (r.isSuccessful) r.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getMember(id: String): MemberDetailDto? {
        return try {
            val r = api.getMemberDetail(id)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun createMember(request: CreateMemberRequest): SaveResult {
        return try {
            val r = api.createMember(request)
            if (r.isSuccessful) SaveResult.Success
            else SaveResult.Error(parseError(r.errorBody()?.string()))
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Failed to create member")
        }
    }

    suspend fun updateMember(id: String, request: CreateMemberRequest): SaveResult {
        return try {
            val r = api.updateMember(id, request)
            if (r.isSuccessful) SaveResult.Success
            else SaveResult.Error(parseError(r.errorBody()?.string()))
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Failed to update member")
        }
    }

    private fun parseError(body: String?): String {
        if (body.isNullOrEmpty()) return "Something went wrong"
        return try {
            Gson().fromJson(body, JsonObject::class.java)?.get("message")?.asString
                ?: "Something went wrong"
        } catch (_: Exception) { "Something went wrong" }
    }
}
