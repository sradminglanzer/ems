package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.DashboardStatsDto
import com.srgs.ems.data.repository.DashboardRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = DashboardRepository(application.applicationContext)

    private val _stats = MutableStateFlow<DashboardStatsDto?>(null)
    val stats: StateFlow<DashboardStatsDto?> = _stats.asStateFlow()

    private val _expenseStats = MutableStateFlow<DashboardRepository.ExpenseStats?>(null)
    val expenseStats: StateFlow<DashboardRepository.ExpenseStats?> = _expenseStats.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        viewModelScope.launch {
            AcademicYearManager.selectedYear.collect {
                loadStats()
            }
        }
    }

    fun loadStats() {
        viewModelScope.launch {
            _isLoading.value = true
            coroutineScope {
                val yearId = com.srgs.ems.data.AcademicYearManager.selectedYearId
                val statsJob    = async { repository.getStats(yearId) }
                val expensesJob = async { repository.getMonthExpenses() }
                _stats.value        = statsJob.await()
                _expenseStats.value = expensesJob.await()
            }
            _isLoading.value = false
        }
    }
}
