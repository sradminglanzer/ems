package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.*
import com.srgs.ems.data.repository.ParentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class ParentViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ParentRepository(application.applicationContext)

    private val _childrenList = MutableStateFlow<List<ParentChildDto>>(emptyList())
    val childrenList: StateFlow<List<ParentChildDto>> = _childrenList.asStateFlow()

    private val _activeChild = MutableStateFlow<ParentChildDto?>(null)
    val activeChild: StateFlow<ParentChildDto?> = _activeChild.asStateFlow()

    private val _dashboardData = MutableStateFlow<ParentDashboardDto?>(null)
    val dashboardData: StateFlow<ParentDashboardDto?> = _dashboardData.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _selectedDiaryDate = MutableStateFlow(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()))
    val selectedDiaryDate: StateFlow<String> = _selectedDiaryDate.asStateFlow()

    private val _selectedReportCard = MutableStateFlow<ParentExamResultDto?>(null)
    val selectedReportCard: StateFlow<ParentExamResultDto?> = _selectedReportCard.asStateFlow()

    private val _selectedReceipt = MutableStateFlow<ParentPaymentReceiptDto?>(null)
    val selectedReceipt: StateFlow<ParentPaymentReceiptDto?> = _selectedReceipt.asStateFlow()

    fun init(children: List<ParentChildDto>) {
        _childrenList.value = children
        if (children.isNotEmpty()) {
            val current = _activeChild.value
            val target = if (current != null && children.any { it.memberId == current.memberId }) current else children.first()
            _activeChild.value = target
            loadDashboard(target.memberId)
        }
    }

    fun switchChild(child: ParentChildDto) {
        if (_activeChild.value?.memberId == child.memberId) return
        _activeChild.value = child
        loadDashboard(child.memberId)
    }

    fun loadDashboard(memberId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val data = repository.getChildDashboard(memberId)
                if (data != null) {
                    _dashboardData.value = data
                } else {
                    _errorMessage.value = "Failed to load student dashboard"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Failed to fetch student data"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun refreshCurrentChild() {
        _activeChild.value?.let { loadDashboard(it.memberId) }
    }

    fun selectDiaryDate(dateStr: String) {
        _selectedDiaryDate.value = dateStr
    }

    fun showReportCard(examResult: ParentExamResultDto?) {
        _selectedReportCard.value = examResult
    }

    fun showReceipt(receipt: ParentPaymentReceiptDto?) {
        _selectedReceipt.value = receipt
    }

    fun dismissError() {
        _errorMessage.value = null
    }
}
