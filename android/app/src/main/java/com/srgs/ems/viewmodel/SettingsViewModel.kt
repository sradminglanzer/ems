package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.data.repository.SettingsRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository(application.applicationContext)

    val sequence = MutableStateFlow("")
    val isSubmitting = MutableStateFlow(false)
    val snackbarEvent = MutableSharedFlow<String>()

    fun updateSequence() {
        val n = sequence.value.trim().toIntOrNull()
        if (n == null || n <= 0) {
            viewModelScope.launch { snackbarEvent.emit("Please enter a valid number") }
            return
        }
        viewModelScope.launch {
            isSubmitting.value = true
            when (val result = repository.updateInvoiceSequence(n)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Next invoice will be REC-${String.format("%04d", n)}")
                    sequence.value = ""
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
            isSubmitting.value = false
        }
    }
}
