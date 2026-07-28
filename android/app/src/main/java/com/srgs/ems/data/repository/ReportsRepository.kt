package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.ComprehensiveFinancialsDto
import com.srgs.ems.data.api.ReportDataDto
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

class ReportsRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getReportsData(
        academicYearId: String?,
        startDate: String?,
        endDate: String?
    ): Pair<ReportDataDto?, ComprehensiveFinancialsDto?> {
        return coroutineScope {
            try {
                val reportsDef = async { api.getReports(academicYearId, startDate, endDate) }
                val financialsDef = async { api.getComprehensiveFinancials(academicYearId, startDate, endDate) }
                
                val reportsRes = reportsDef.await()
                val financialsRes = financialsDef.await()
                
                val r = if (reportsRes.isSuccessful) reportsRes.body() else null
                val f = if (financialsRes.isSuccessful) financialsRes.body() else null
                
                Pair(r, f)
            } catch (_: Exception) {
                Pair(null, null)
            }
        }
    }
}
