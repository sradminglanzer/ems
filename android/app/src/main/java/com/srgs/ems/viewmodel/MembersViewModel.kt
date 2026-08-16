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
    val statusFilter = MutableStateFlow("all")  // "all" | "active" | "on_hold"

    val filteredMembers: StateFlow<List<MemberDto>> = combine(
        _allMembers, searchQuery.debounce(150), statusFilter
    ) { members, query, filter ->
        members
            .filter { m -> filter == "all" || m.status == filter }
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

    init { loadMembers() }

    fun loadMembers(isRefresh: Boolean = false) {
        viewModelScope.launch {
            if (isRefresh) _isRefreshing.value = true else _isLoading.value = true
            _allMembers.value   = repository.getMembers()
            _isLoading.value    = false
            _isRefreshing.value = false
        }
    }
}
