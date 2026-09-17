package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.AdmissionNumberSettingDto
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.data.repository.SettingsRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class SettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository(application.applicationContext)

    val sequence = MutableStateFlow("")
    val isSubmitting = MutableStateFlow(false)
    val snackbarEvent = MutableSharedFlow<String>()

    // Admission Number Configuration
    val admPrefix = MutableStateFlow("ADM-")
    val admIncludeYear = MutableStateFlow(true)
    val admStartingNo = MutableStateFlow("1")
    val admPadding = MutableStateFlow("4")
    val isSubmittingAdm = MutableStateFlow(false)

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            val settings = repository.getEntitySettings()
            if (settings != null) {
                val cfg = settings.admissionConfig
                admPrefix.value = cfg.prefix
                admIncludeYear.value = cfg.includeYear
                admStartingNo.value = cfg.startingNumber.toString()
                admPadding.value = cfg.paddingDigits.toString()
            }
        }
    }

    fun getAdmissionPreview(): String {
        val p = admPrefix.value
        val yr = if (admIncludeYear.value) "${Calendar.getInstance().get(Calendar.YEAR)}-" else ""
        val start = admStartingNo.value.toIntOrNull() ?: 1
        val pad = admPadding.value.toIntOrNull() ?: 4
        return "$p$yr${start.toString().padStart(pad, '0')}"
    }

    fun updateAdmissionConfig() {
        val start = admStartingNo.value.trim().toIntOrNull() ?: 1
        val pad = admPadding.value.trim().toIntOrNull() ?: 4
        if (pad < 1 || pad > 8) {
            viewModelScope.launch { snackbarEvent.emit("Padding digits must be between 1 and 8") }
            return
        }

        viewModelScope.launch {
            isSubmittingAdm.value = true
            val config = AdmissionNumberSettingDto(
                prefix = admPrefix.value.trim(),
                includeYear = admIncludeYear.value,
                startingNumber = start,
                paddingDigits = pad,
                autoGenerate = true
            )
            when (val result = repository.updateAdmissionConfig(config)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Admission Number settings updated! Preview: ${getAdmissionPreview()}")
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
            isSubmittingAdm.value = false
        }
    }

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

