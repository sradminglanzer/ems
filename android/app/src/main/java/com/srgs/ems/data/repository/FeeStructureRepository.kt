package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.CreateFeeStructureRequest
import com.srgs.ems.data.api.FeeStructureDto

class FeeStructureRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getStructures(academicYearId: String? = null): List<FeeStructureDto> {
        return try {
            val res = api.getFeeStructures(academicYearId)
            if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun createStructure(
        name: String,
        amount: Double,
        frequency: String,
        academicYearId: String? = null,
        feeGroupId: String? = null,
        feeGroupIds: List<String>? = null,
        type: String = "FeeStructure"
    ): SaveResult {
        return try {
            val res = api.createFeeStructure(
                CreateFeeStructureRequest(name, amount, frequency, academicYearId, feeGroupId, feeGroupIds, type)
            )
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to create structure")
        } catch (e: Exception) { SaveResult.Error(e.message ?: "Unknown error") }
    }

    suspend fun updateStructure(
        id: String,
        name: String,
        amount: Double,
        frequency: String,
        academicYearId: String? = null,
        feeGroupId: String? = null,
        feeGroupIds: List<String>? = null,
        type: String = "FeeStructure"
    ): SaveResult {
        return try {
            val res = api.updateFeeStructure(
                id, CreateFeeStructureRequest(name, amount, frequency, academicYearId, feeGroupId, feeGroupIds, type)
            )
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error(res.errorBody()?.string() ?: "Failed to update structure")
        } catch (e: Exception) { SaveResult.Error(e.message ?: "Unknown error") }
    }

    suspend fun deleteStructure(id: String): SaveResult {
        return try {
            val res = api.deleteFeeStructure(id)
            if (res.isSuccessful) SaveResult.Success
            else SaveResult.Error("Failed to delete structure")
        } catch (e: Exception) { SaveResult.Error(e.message ?: "Unknown error") }
    }
}
