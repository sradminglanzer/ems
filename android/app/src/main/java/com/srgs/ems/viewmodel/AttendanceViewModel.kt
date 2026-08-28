package com.srgs.ems.viewmodel

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.repository.AttendanceRecord
import com.srgs.ems.data.repository.AttendanceRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate

class AttendanceViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AttendanceRepository(application.applicationContext)

    val feeGroups        = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val selectedGroupId  = MutableStateFlow<String?>(null)
    val selectedDate     = MutableStateFlow(LocalDate.now().toString())  // "YYYY-MM-DD"

    val isLoadingGroups     = MutableStateFlow(true)
    val isLoadingAttendance = MutableStateFlow(false)
    val isSaving            = MutableStateFlow(false)
    val isNew               = MutableStateFlow(true)

    /** Compose-observable mutable list so toggling status triggers recomposition */
    var records by mutableStateOf<List<AttendanceRecord>>(emptyList())
        private set

    val saveResult = MutableSharedFlow<Boolean>()

    init {
        loadFeeGroups()
        // Re-fetch attendance whenever group, date, or academic year changes
        viewModelScope.launch {
            combine(
                selectedGroupId,
                selectedDate,
                com.srgs.ems.data.AcademicYearManager.selectedYear
            ) { g, d, _ -> g to d }
                .collect { (group, date) -> if (group != null) fetchAttendance(group, date) }
        }
    }

    private fun loadFeeGroups() {
        viewModelScope.launch {
            isLoadingGroups.value = true
            feeGroups.value = repository.getFeeGroups()
            if (feeGroups.value.isNotEmpty() && selectedGroupId.value == null) {
                selectedGroupId.value = feeGroups.value.first()._id
            }
            isLoadingGroups.value = false
        }
    }

    private fun fetchAttendance(classId: String, date: String) {
        viewModelScope.launch {
            isLoadingAttendance.value = true
            val yearId = com.srgs.ems.data.AcademicYearManager.selectedYearId
            val sheet = repository.getAttendance(classId, date, yearId)
            records = sheet?.records ?: emptyList()
            isNew.value = sheet?.isNew ?: true
            isLoadingAttendance.value = false
        }
    }

    fun selectGroup(id: String) { selectedGroupId.value = id }

    fun shiftDate(days: Int) {
        selectedDate.value = LocalDate.parse(selectedDate.value).plusDays(days.toLong()).toString()
    }

    /** Cycles: present → absent → late → present */
    fun toggleStatus(memberId: String) {
        records = records.map { r ->
            if (r.memberId != memberId) r
            else r.copy(
                status = when (r.status) {
                    "present" -> "absent"
                    "absent"  -> "late"
                    else      -> "present"
                }
            )
        }
    }

    fun saveAttendance() {
        val classId = selectedGroupId.value ?: return
        viewModelScope.launch {
            isSaving.value = true
            val success = repository.saveAttendance(classId, selectedDate.value, null, records)
            if (success) isNew.value = false
            saveResult.emit(success)
            isSaving.value = false
        }
    }
}
