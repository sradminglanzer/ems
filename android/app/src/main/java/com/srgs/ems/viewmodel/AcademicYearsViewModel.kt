package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.AcademicYearDto
import com.srgs.ems.data.repository.AcademicYearRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class AcademicYearsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AcademicYearRepository(application.applicationContext)

    private val _years = MutableStateFlow<List<AcademicYearDto>>(emptyList())
    val years = _years.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // Selected year for local view context
    private val _selectedYearId = MutableStateFlow(AcademicYearManager.selectedYearId)
    val selectedYearId = _selectedYearId.asStateFlow()

    // Form fields
    val yearName = MutableStateFlow("")
    // Default: June 1 of current year → May 31 of next year
    val startDate = MutableStateFlow(run {
        val cal = Calendar.getInstance()
        cal.set(Calendar.MONTH, Calendar.JUNE)
        cal.set(Calendar.DAY_OF_MONTH, 1)
        cal.time
    })
    val endDate = MutableStateFlow(run {
        val cal = Calendar.getInstance()
        cal.add(Calendar.YEAR, 1)
        cal.set(Calendar.MONTH, Calendar.MAY)
        cal.set(Calendar.DAY_OF_MONTH, 31)
        cal.time
    })
    val isSubmitting = MutableStateFlow(false)

    val snackbarEvent = MutableSharedFlow<String>()

    private val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    init { load() }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.getYears()
            _years.value = result
            // Auto-select active year if nothing is selected yet
            if (AcademicYearManager.selectedYearId == null && result.isNotEmpty()) {
                val active = result.firstOrNull { it.isActive } ?: result.first()
                AcademicYearManager.setYear(active._id)
                _selectedYearId.value = active._id
            }
            _isLoading.value = false
        }
    }

    fun selectView(id: String) {
        AcademicYearManager.setYear(id)
        _selectedYearId.value = id
    }

    fun setActive(id: String) {
        viewModelScope.launch {
            when (val r = repository.setActive(id)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Default academic year updated!")
                    selectView(id)
                    load()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${r.message}")
            }
        }
    }

    fun createYear() {
        val n = yearName.value.trim()
        if (n.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please enter a year name") }
            return
        }
        viewModelScope.launch {
            isSubmitting.value = true
            val isFirst = _years.value.isEmpty()
            when (val r = repository.createYear(n, fmt.format(startDate.value), fmt.format(endDate.value), isFirst)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Academic year created!")
                    yearName.value = ""
                    load()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${r.message}")
            }
            isSubmitting.value = false
        }
    }

    fun deleteYear(id: String) {
        viewModelScope.launch {
            when (val r = repository.deleteYear(id)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Academic year deleted!")
                    load()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${r.message}")
            }
        }
    }

    fun formatDate(date: Date): String = fmt.format(date)
}
