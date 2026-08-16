package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.repository.FeeGroupRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class FeeGroupsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = FeeGroupRepository(application.applicationContext)

    private val _groups = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val groups = _groups.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // Form fields
    val name = MutableStateFlow("")
    val description = MutableStateFlow("")
    val isSubmitting = MutableStateFlow(false)

    val snackbarEvent = MutableSharedFlow<String>()

    init { loadGroups() }

    fun loadGroups() {
        viewModelScope.launch {
            _isLoading.value = true
            _groups.value = repository.getGroups()
            _isLoading.value = false
        }
    }

    fun addGroup() {
        val n = name.value.trim()
        if (n.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Group name is required") }
            return
        }
        viewModelScope.launch {
            isSubmitting.value = true
            when (val result = repository.createGroup(n, description.value.trim())) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Group created successfully!")
                    name.value = ""
                    description.value = ""
                    loadGroups()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
            isSubmitting.value = false
        }
    }
}
