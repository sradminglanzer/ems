package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.StaffDto
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

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // Form state
    val name = MutableStateFlow("")
    val contactNumber = MutableStateFlow("")
    val selectedRole = MutableStateFlow("staff")

    val isSubmitting = MutableStateFlow(false)

    // One-shot events for snackbar messages
    val snackbarEvent = MutableSharedFlow<String>()

    init {
        loadStaff()
    }

    fun loadStaff() {
        viewModelScope.launch {
            _isLoading.value = true
            _staffList.value = repository.getStaff()
            _isLoading.value = false
        }
    }

    fun addStaff() {
        val n = name.value.trim()
        val c = contactNumber.value.trim()
        val r = selectedRole.value

        if (n.isEmpty() || c.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please fill in all required fields") }
            return
        }

        // Map "trainer" label back to "teacher" for the API
        val apiRole = if (r == "trainer") "teacher" else r

        viewModelScope.launch {
            isSubmitting.value = true
            when (val result = repository.createStaff(n, c, apiRole)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Staff member created successfully!")
                    // Reset form
                    name.value = ""
                    contactNumber.value = ""
                    selectedRole.value = "staff"
                    loadStaff()
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
                    loadStaff()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
        }
    }
}
