package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.StaffDto
import com.srgs.ems.data.api.StaffRoleSettingDto
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.data.repository.StaffRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class StaffViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = StaffRepository(application.applicationContext)

    private val _staffList = MutableStateFlow<List<StaffDto>>(emptyList())
    val staffList = _staffList.asStateFlow()

    private val _staffRoles = MutableStateFlow<List<StaffRoleSettingDto>>(emptyList())
    val staffRoles = _staffRoles.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // Form state
    val name = MutableStateFlow("")
    val contactNumber = MutableStateFlow("")
    val selectedRole = MutableStateFlow("admin")

    val isSubmitting = MutableStateFlow(false)

    // One-shot events for snackbar messages
    val snackbarEvent = MutableSharedFlow<String>()

    init {
        loadStaffAndSettings()
    }

    fun loadStaffAndSettings() {
        viewModelScope.launch {
            _isLoading.value = true
            val list = repository.getStaffList()
            val settings = repository.getEntitySettings()

            _staffList.value = list
            _staffRoles.value = settings?.staffRoles?.ifEmpty { defaultRoles() } ?: defaultRoles()

            if (_staffRoles.value.isNotEmpty() && selectedRole.value.isEmpty()) {
                selectedRole.value = _staffRoles.value.first().code
            }

            _isLoading.value = false
        }
    }

    private fun defaultRoles(): List<StaffRoleSettingDto> = listOf(
        StaffRoleSettingDto("Admin", "admin", enable_login = true),
        StaffRoleSettingDto("Staff", "staff", enable_login = false)
    )

    fun addStaff() {
        val n = name.value.trim()
        val c = contactNumber.value.trim()
        val r = selectedRole.value

        if (n.isEmpty() || c.isEmpty() || r.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please fill in all required fields") }
            return
        }

        viewModelScope.launch {
            isSubmitting.value = true
            when (val result = repository.createStaff(n, c, r)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Staff member created successfully!")
                    // Reset form
                    name.value = ""
                    contactNumber.value = ""
                    selectedRole.value = _staffRoles.value.firstOrNull()?.code ?: "admin"
                    loadStaffAndSettings()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
            isSubmitting.value = false
        }
    }

    fun deleteStaff(id: String) {
        viewModelScope.launch {
            when (val result = repository.deleteStaff(id)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("Staff member removed")
                    loadStaffAndSettings()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
        }
    }

    fun toggleStaffLogin(id: String) {
        viewModelScope.launch {
            when (val result = repository.toggleStaffLogin(id)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("Updated login access")
                    loadStaffAndSettings()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
        }
    }
}
