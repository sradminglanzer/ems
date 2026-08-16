package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

class ReportsRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getSummary(
        academicYearId: String?,
        startDate: String?,
        endDate: String?
    ): ComprehensiveSummaryDto? {
        return try {
            val r = api.getReportSummary(academicYearId, startDate, endDate)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun getPaymentHistory(
        academicYearId: String?,
        startDate: String?,
        endDate: String?,
        paymentMethod: String? = null,
        search: String? = null,
        page: Int = 1,
        limit: Int = 50
    ): PaymentHistoryReportResponseDto? {
        return try {
            val r = api.getPaymentHistoryReport(academicYearId, startDate, endDate, paymentMethod, search, page, limit)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun getPlansBreakdown(
        academicYearId: String?,
        startDate: String?,
        endDate: String?
    ): PlansBreakdownReportResponseDto? {
        return try {
            val r = api.getPlansBreakdownReport(academicYearId, startDate, endDate)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun getExpenseBreakdown(
        academicYearId: String?,
        startDate: String?,
        endDate: String?
    ): ExpenseBreakdownReportResponseDto? {
        return try {
            val r = api.getExpenseBreakdownReport(academicYearId, startDate, endDate)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    /** Legacy fallback method kept for compatibility */
    suspend fun getFinancials(
        academicYearId: String?,
        startDate: String?,
        endDate: String?
    ): ComprehensiveFinancialsDto? {
        return try {
            val r = api.getComprehensiveFinancials(academicYearId, startDate, endDate)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun getReportsData(
        academicYearId: String?,
        startDate: String?,
        endDate: String?
    ): ComprehensiveFinancialsDto? = getFinancials(academicYearId, startDate, endDate)
}
