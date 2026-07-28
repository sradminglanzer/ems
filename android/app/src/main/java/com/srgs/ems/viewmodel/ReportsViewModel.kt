package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.ComprehensiveFinancialsDto
import com.srgs.ems.data.api.ReportDataDto
import com.srgs.ems.data.repository.ReportsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class ReportsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ReportsRepository(application.applicationContext)

    val dateFilter = MutableStateFlow("this_month")
    
    private val _reports = MutableStateFlow<ReportDataDto?>(null)
    val reports = _reports.asStateFlow()

    private val _financials = MutableStateFlow<ComprehensiveFinancialsDto?>(null)
    val financials = _financials.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    fun fetchReports(academicYearId: String?) {
        viewModelScope.launch {
            _isLoading.value = true
            
            var startDate: String? = null
            var endDate: String? = null
            
            val cal = Calendar.getInstance()
            val year = cal.get(Calendar.YEAR)
            val month = cal.get(Calendar.MONTH) // 0-based
            
            when (dateFilter.value) {
                "this_month" -> {
                    startDate = String.format("%04d-%02d-01T00:00:00.000Z", year, month + 1)
                    val maxDay = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
                    endDate = String.format("%04d-%02d-%02dT23:59:59.999Z", year, month + 1, maxDay)
                }
                "last_month" -> {
                    val lmCal = Calendar.getInstance().apply { add(Calendar.MONTH, -1) }
                    val lmYear = lmCal.get(Calendar.YEAR)
                    val lmMonth = lmCal.get(Calendar.MONTH) + 1
                    startDate = String.format("%04d-%02d-01T00:00:00.000Z", lmYear, lmMonth)
                    endDate = String.format("%04d-%02d-%02dT23:59:59.999Z", lmYear, lmMonth, lmCal.getActualMaximum(Calendar.DAY_OF_MONTH))
                }
                "3_months" -> {
                    val lmCal = Calendar.getInstance().apply { add(Calendar.MONTH, -2) }
                    val lmYear = lmCal.get(Calendar.YEAR)
                    val lmMonth = lmCal.get(Calendar.MONTH) + 1
                    startDate = String.format("%04d-%02d-01T00:00:00.000Z", lmYear, lmMonth)
                    
                    val eCal = Calendar.getInstance()
                    endDate = String.format("%04d-%02d-%02dT23:59:59.999Z", eCal.get(Calendar.YEAR), eCal.get(Calendar.MONTH) + 1, eCal.getActualMaximum(Calendar.DAY_OF_MONTH))
                }
                "6_months" -> {
                    val lmCal = Calendar.getInstance().apply { add(Calendar.MONTH, -5) }
                    val lmYear = lmCal.get(Calendar.YEAR)
                    val lmMonth = lmCal.get(Calendar.MONTH) + 1
                    startDate = String.format("%04d-%02d-01T00:00:00.000Z", lmYear, lmMonth)
                    
                    val eCal = Calendar.getInstance()
                    endDate = String.format("%04d-%02d-%02dT23:59:59.999Z", eCal.get(Calendar.YEAR), eCal.get(Calendar.MONTH) + 1, eCal.getActualMaximum(Calendar.DAY_OF_MONTH))
                }
                "ytd" -> {
                    startDate = String.format("%04d-01-01T00:00:00.000Z", year)
                    endDate = String.format("%04d-12-31T23:59:59.999Z", year)
                }
            }

            val pair = repository.getReportsData(academicYearId, startDate, endDate)
            _reports.value = pair.first
            _financials.value = pair.second
            
            _isLoading.value = false
        }
    }
}
