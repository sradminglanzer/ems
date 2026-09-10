package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import android.util.Log
import com.srgs.ems.data.SessionManager
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

    private val prefs = application.getSharedPreferences("parent_diary_prefs", android.content.Context.MODE_PRIVATE)
    private val _completedHomeworkIds = MutableStateFlow<Set<String>>(emptySet())
    val completedHomeworkIds: StateFlow<Set<String>> = _completedHomeworkIds.asStateFlow()

    init {
        val saved = prefs.getStringSet("completed_homework", emptySet()) ?: emptySet()
        _completedHomeworkIds.value = saved
    }

    private val _selectedReportCard = MutableStateFlow<ParentExamResultDto?>(null)
    val selectedReportCard: StateFlow<ParentExamResultDto?> = _selectedReportCard.asStateFlow()

    private val _selectedReceipt = MutableStateFlow<ParentPaymentReceiptDto?>(null)
    val selectedReceipt: StateFlow<ParentPaymentReceiptDto?> = _selectedReceipt.asStateFlow()

    fun toggleHomeworkCompleted(diaryId: String) {
        val current = _completedHomeworkIds.value.toMutableSet()
        if (current.contains(diaryId)) {
            current.remove(diaryId)
        } else {
            current.add(diaryId)
        }
        _completedHomeworkIds.value = current
        prefs.edit().putStringSet("completed_homework", current).apply()
    }

    fun init(children: List<ParentChildDto>, parentPhone: String? = null) {
        _childrenList.value = children
        if (children.isNotEmpty()) {
            val current = _activeChild.value
            val target = if (current != null && children.any { it.memberId == current.memberId }) current else children.first()
            _activeChild.value = target
            loadDashboard(target.memberId)
        }
        val phone = parentPhone ?: SessionManager.session?.phone
        Log.d("ParentFCM", "ParentViewModel.init() called. Param phone='$parentPhone', Session phone='${SessionManager.session?.phone}', Resolved phone='$phone'")
        if (!phone.isNullOrBlank()) {
            registerFcmToken(phone)
        } else {
            Log.w("ParentFCM", "⚠️ Cannot register FCM token: No parent phone found in session or parameters.")
        }
    }

    fun registerFcmToken(parentPhone: String) {
        Log.d("ParentFCM", "🔄 Attempting to fetch FCM Token for parent: $parentPhone")
        viewModelScope.launch {
            try {
                com.google.firebase.messaging.FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (!task.isSuccessful) {
                        Log.e("ParentFCM", "❌ FirebaseMessaging.getInstance().token failed: ${task.exception?.message}", task.exception)
                        return@addOnCompleteListener
                    }
                    val token = task.result
                    if (token.isNullOrBlank()) {
                        Log.w("ParentFCM", "⚠️ Firebase returned a null or blank token.")
                        return@addOnCompleteListener
                    }
                    Log.d("ParentFCM", "✅ FCM Token fetched: ${token.take(15)}...${token.takeLast(10)}")
                    viewModelScope.launch {
                        try {
                            val context = getApplication<Application>().applicationContext
                            val deviceName = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
                            Log.d("ParentFCM", "📡 Sending token to POST /api/auth/parent-fcm-token ($deviceName)...")
                            val response = ApiClient.getApiService(context).registerParentFcmToken(
                                RegisterFcmTokenRequest(
                                    contactNumber = parentPhone,
                                    fcmToken = token,
                                    deviceName = deviceName
                                )
                            )
                            if (response.isSuccessful) {
                                Log.d("ParentFCM", "🎉 FCM Token registered successfully on backend! (HTTP ${response.code()})")
                            } else {
                                val errBody = response.errorBody()?.string()
                                Log.e("ParentFCM", "❌ Backend rejected token registration: HTTP ${response.code()} - $errBody")
                            }
                        } catch (e: Exception) {
                            Log.e("ParentFCM", "❌ Network error sending token to backend: ${e.message}", e)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("ParentFCM", "❌ Exception initializing FirebaseMessaging: ${e.message}", e)
            }
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
