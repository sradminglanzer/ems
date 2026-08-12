package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.*
import com.srgs.ems.data.repository.ReportsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class ReportsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ReportsRepository(application.applicationContext)

    val dateFilter          = MutableStateFlow("this_month")
    val searchQuery         = MutableStateFlow("")
    val paymentMethodFilter = MutableStateFlow("all")  // "all" | "cash" | "online" | "card" | "upi"
    val activeTab           = MutableStateFlow("payment_history") // "payment_history" | "billing_plans" | "addons" | "expenses"

    // ── In-Memory Frontend Cache Maps ──────────────────────────────────────────
    private val summaryCache  = mutableMapOf<String, ComprehensiveSummaryDto>()
    private val paymentsCache = mutableMapOf<String, PaymentHistoryReportResponseDto>()
    private val plansCache    = mutableMapOf<String, PlansBreakdownReportResponseDto>()
    private val expensesCache = mutableMapOf<String, ExpenseBreakdownReportResponseDto>()

    // ── UI States ─────────────────────────────────────────────────────────────
    private val _summary = MutableStateFlow<ComprehensiveSummaryDto?>(null)
    val summary = _summary.asStateFlow()

    private val _paymentsResponse = MutableStateFlow<PaymentHistoryReportResponseDto?>(null)
    val paymentsResponse = _paymentsResponse.asStateFlow()

    private val _plansResponse = MutableStateFlow<PlansBreakdownReportResponseDto?>(null)
    val plansResponse = _plansResponse.asStateFlow()

    private val _expensesResponse = MutableStateFlow<ExpenseBreakdownReportResponseDto?>(null)
    val expensesResponse = _expensesResponse.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    private val _isTabLoading = MutableStateFlow(false)
    val isTabLoading = _isTabLoading.asStateFlow()

    /** Helper to format ISO start/end dates for dateFilter */
    private fun getDateRange(): Pair<String?, String?> {
        var startDate: String? = null
        var endDate: String? = null

        val now = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        val (startCal, endCal) = when (dateFilter.value) {
            "this_month" -> {
                val s = (now.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, 1)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val e = (now.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, getActualMaximum(Calendar.DAY_OF_MONTH))
                    set(Calendar.HOUR_OF_DAY, 23)
                    set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59)
                    set(Calendar.MILLISECOND, 999)
                }
                s to e
            }
            "last_month" -> {
                val s = (now.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, 1)
                    add(Calendar.MONTH, -1)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val e = (s.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, getActualMaximum(Calendar.DAY_OF_MONTH))
                    set(Calendar.HOUR_OF_DAY, 23)
                    set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59)
                    set(Calendar.MILLISECOND, 999)
                }
                s to e
            }
            "3_months" -> {
                val s = (now.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, 1)
                    add(Calendar.MONTH, -2)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val e = (now.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, getActualMaximum(Calendar.DAY_OF_MONTH))
                    set(Calendar.HOUR_OF_DAY, 23)
                    set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59)
                    set(Calendar.MILLISECOND, 999)
                }
                s to e
            }
            "6_months" -> {
                val s = (now.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, 1)
                    add(Calendar.MONTH, -5)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val e = (now.clone() as Calendar).apply {
                    set(Calendar.DAY_OF_MONTH, getActualMaximum(Calendar.DAY_OF_MONTH))
                    set(Calendar.HOUR_OF_DAY, 23)
                    set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59)
                    set(Calendar.MILLISECOND, 999)
                }
                s to e
            }
            "ytd" -> {
                val s = (now.clone() as Calendar).apply {
                    set(Calendar.MONTH, Calendar.JANUARY)
                    set(Calendar.DAY_OF_MONTH, 1)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val e = (now.clone() as Calendar).apply {
                    set(Calendar.MONTH, Calendar.DECEMBER)
                    set(Calendar.DAY_OF_MONTH, 31)
                    set(Calendar.HOUR_OF_DAY, 23)
                    set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59)
                    set(Calendar.MILLISECOND, 999)
                }
                s to e
            }
            else -> null to null
        }

        if (startCal != null && endCal != null) {
            startDate = sdf.format(startCal.time)
            endDate   = sdf.format(endCal.time)
        }
        return startDate to endDate
    }

    /** Clear in-memory caches (for pull-to-refresh or mutation invalidation) */
    fun clearCache() {
        summaryCache.clear()
        paymentsCache.clear()
        plansCache.clear()
        expensesCache.clear()
    }

    /** Load top KPI Summary Cards */
    fun fetchSummary(academicYearId: String?, forceNetwork: Boolean = false) {
        viewModelScope.launch {
            val (startDate, endDate) = getDateRange()
            val cacheKey = "${dateFilter.value}_${academicYearId ?: "none"}"

            if (!forceNetwork && summaryCache.containsKey(cacheKey)) {
                _summary.value = summaryCache[cacheKey]
                return@launch
            }

            _isLoading.value = true
            val res = repository.getSummary(academicYearId, startDate, endDate)
            if (res != null) {
                summaryCache[cacheKey] = res
                _summary.value = res
            }
            _isLoading.value = false
        }
    }

    /** Load active tab data (Payments, Plans, Addons, Expenses) */
    fun fetchActiveTabData(academicYearId: String?, forceNetwork: Boolean = false) {
        viewModelScope.launch {
            val (startDate, endDate) = getDateRange()
            val yearKey = academicYearId ?: "none"

            when (activeTab.value) {
                "payment_history" -> {
                    val method = paymentMethodFilter.value
                    val query = searchQuery.value.trim()
                    val cacheKey = "${dateFilter.value}_${yearKey}_${method}_$query"

                    if (!forceNetwork && paymentsCache.containsKey(cacheKey)) {
                        _paymentsResponse.value = paymentsCache[cacheKey]
                        return@launch
                    }

                    _isTabLoading.value = true
                    val res = repository.getPaymentHistory(
                        academicYearId = academicYearId,
                        startDate = startDate,
                        endDate = endDate,
                        paymentMethod = method,
                        search = query
                    )
                    if (res != null) {
                        paymentsCache[cacheKey] = res
                        _paymentsResponse.value = res
                    }
                    _isTabLoading.value = false
                }

                "billing_plans", "addons" -> {
                    val cacheKey = "${dateFilter.value}_$yearKey"

                    if (!forceNetwork && plansCache.containsKey(cacheKey)) {
                        _plansResponse.value = plansCache[cacheKey]
                        return@launch
                    }

                    _isTabLoading.value = true
                    val res = repository.getPlansBreakdown(academicYearId, startDate, endDate)
                    if (res != null) {
                        plansCache[cacheKey] = res
                        _plansResponse.value = res
                    }
                    _isTabLoading.value = false
                }

                "expenses" -> {
                    val cacheKey = "${dateFilter.value}_$yearKey"

                    if (!forceNetwork && expensesCache.containsKey(cacheKey)) {
                        _expensesResponse.value = expensesCache[cacheKey]
                        return@launch
                    }

                    _isTabLoading.value = true
                    val res = repository.getExpenseBreakdown(academicYearId, startDate, endDate)
                    if (res != null) {
                        expensesCache[cacheKey] = res
                        _expensesResponse.value = res
                    }
                    _isTabLoading.value = false
                }
            }
        }
    }

    /** Helper called on date filter change or screen launch */
    fun refreshAll(academicYearId: String?, forceNetwork: Boolean = false) {
        if (forceNetwork) clearCache()
        fetchSummary(academicYearId, forceNetwork)
        fetchActiveTabData(academicYearId, forceNetwork)
    }
}
