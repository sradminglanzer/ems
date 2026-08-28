package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.MemberDto
import com.srgs.ems.data.repository.MembersRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
class MembersViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = MembersRepository(application.applicationContext)

    private val _allMembers   = MutableStateFlow<List<MemberDto>>(emptyList())
    private val _isLoading    = MutableStateFlow(true)
    private val _isRefreshing = MutableStateFlow(false)

    val isLoading: StateFlow<Boolean>    = _isLoading.asStateFlow()
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    val searchQuery  = MutableStateFlow("")
    val statusFilter = MutableStateFlow("all")  // "all" | "due_soon" | "overdue" | "active" | "on_hold" | "checked_out"

    val filteredMembers: StateFlow<List<MemberDto>> = combine(
        _allMembers, searchQuery.debounce(150), statusFilter
    ) { members, query, filter ->
        val todayCal = java.util.Calendar.getInstance().apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0)
            set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0)
            set(java.util.Calendar.MILLISECOND, 0)
        }
        val today = todayCal.time
        val fiveDaysLater = java.util.Calendar.getInstance().apply {
            time = today
            add(java.util.Calendar.DAY_OF_YEAR, 5)
            set(java.util.Calendar.HOUR_OF_DAY, 23)
            set(java.util.Calendar.MINUTE, 59)
            set(java.util.Calendar.SECOND, 59)
        }.time

        members
            .filter { m ->
                val nextDate = parseDate(m.nextPaymentDate)
                val isActiveOrDue = m.status != "on_hold" && m.status != "checked_out"
                when (filter) {
                    "overdue"     -> isActiveOrDue && nextDate != null && nextDate.before(today)
                    "due_soon"    -> isActiveOrDue && nextDate != null && !nextDate.before(today) && !nextDate.after(fiveDaysLater)
                    "all"         -> true
                    "checked_out" -> m.status == "checked_out"
                    else          -> m.status == filter
                }
            }
            .filter { m ->
                if (query.isBlank()) true
                else {
                    val q = query.trim().lowercase()
                    "${m.firstName} ${m.lastName}".lowercase().contains(q) ||
                    m.knownId?.lowercase()?.contains(q) == true          ||
                    m.contact?.contains(q) == true                        ||
                    m.groupName?.lowercase()?.contains(q) == true         ||
                    m.addonNames?.joinToString(" ")?.lowercase()?.contains(q) == true
                }
            }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000L), emptyList())

    private fun parseDate(s: String?): java.util.Date? {
        if (s.isNullOrEmpty()) return null
        for (fmt in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd")) {
            try { return java.text.SimpleDateFormat(fmt, java.util.Locale.US).parse(s) } catch (_: Exception) {}
        }
        return null
    }

    init {
        viewModelScope.launch {
            com.srgs.ems.data.AcademicYearManager.selectedYear.collect {
                loadMembers()
            }
        }
    }

    fun loadMembers(isRefresh: Boolean = false) {
        viewModelScope.launch {
            if (isRefresh) _isRefreshing.value = true else _isLoading.value = true
            val yearId = com.srgs.ems.data.AcademicYearManager.selectedYearId
            _allMembers.value   = repository.getMembers(yearId)
            _isLoading.value    = false
            _isRefreshing.value = false
        }
    }
}
