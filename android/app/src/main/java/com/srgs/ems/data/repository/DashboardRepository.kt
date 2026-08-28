package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.DashboardStatsDto
import com.srgs.ems.data.api.ExpenseResponseDto
import java.util.Calendar

class DashboardRepository(context: Context) {

    private val api = ApiClient.getApiService(context)

    data class ExpenseStats(
        val total: Double,
        val topCategories: List<Pair<String, Double>>
    )

    suspend fun getStats(academicYearId: String? = null): DashboardStatsDto? {
        return try {
            val r = api.getDashboardStats(academicYearId)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun getMonthExpenses(): ExpenseStats? {
        return try {
            val cal = Calendar.getInstance()
            val year = cal.get(Calendar.YEAR)
            val month = cal.get(Calendar.MONTH) + 1
            val mm = month.toString().padStart(2, '0')
            val lastDay = cal.getActualMaximum(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')

            val r = api.getExpenses(
                startDate = "$year-$mm-01",
                endDate   = "$year-$mm-${lastDay}T23:59:59.000Z",
                year      = year,
                month     = month
            )
            if (r.isSuccessful) {
                val body = r.body()!!
                val confirmed = body.expenses.filter { it.status == "confirmed" }
                val total = confirmed.sumOf { it.amount }
                val top = (body.summary ?: emptyList()).take(2).map { it._id to it.total }
                ExpenseStats(total, top)
            } else null
        } catch (_: Exception) { null }
    }
}
