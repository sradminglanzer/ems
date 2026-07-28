package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.ConfirmExpenseRequest
import com.srgs.ems.data.api.CreateExpenseRequest
import com.srgs.ems.data.api.ExpenseDto
import com.srgs.ems.data.api.ExpenseResponseDto

class ExpenseRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getExpenses(startDate: String, endDate: String, year: Int, month: Int): ExpenseResponseDto? {
        return try {
            val res = api.getExpenses(startDate, endDate, year, month)
            if (res.isSuccessful) res.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun createExpense(request: CreateExpenseRequest): SaveResult {
        return try {
            val res = api.createExpense(request)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to create expense")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateExpense(id: String, request: CreateExpenseRequest): SaveResult {
        return try {
            val res = api.updateExpense(id, request)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to update expense")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteExpense(id: String): SaveResult {
        return try {
            val res = api.deleteExpense(id)
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to delete expense")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun confirmExpense(id: String, amount: Double): SaveResult {
        return try {
            val res = api.confirmExpense(id, ConfirmExpenseRequest(amount))
            if (res.isSuccessful) SaveResult.Success else SaveResult.Error("Failed to confirm expense")
        } catch (e: Exception) {
            SaveResult.Error(e.message ?: "Unknown error")
        }
    }
}
