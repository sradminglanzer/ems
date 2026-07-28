package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.ExpenseDto
import com.srgs.ems.data.api.ExpenseSummaryDto
import com.srgs.ems.data.repository.ExpenseRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class ExpensesViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ExpenseRepository(application.applicationContext)

    private val _expenses = MutableStateFlow<List<ExpenseDto>>(emptyList())
    val expenses = _expenses.asStateFlow()

    private val _summary = MutableStateFlow<List<ExpenseSummaryDto>>(emptyList())
    val summary = _summary.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    private val cal = Calendar.getInstance()
    val selectedYear = MutableStateFlow(cal.get(Calendar.YEAR))
    val selectedMonth = MutableStateFlow(cal.get(Calendar.MONTH) + 1) // 1-based

    val selectedCategory = MutableStateFlow("")

    init {
        fetchExpenses()
    }

    fun fetchExpenses() {
        viewModelScope.launch {
            _isLoading.value = true
            val year = selectedYear.value
            val month = selectedMonth.value
            
            // Format start and end date of the month
            val startDate = String.format("%04d-%02d-01T00:00:00.000Z", year, month)
            val cal = Calendar.getInstance().apply { 
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month - 1)
                set(Calendar.DAY_OF_MONTH, getActualMaximum(Calendar.DAY_OF_MONTH))
            }
            val endDate = String.format("%04d-%02d-%02dT23:59:59.999Z", year, month, cal.get(Calendar.DAY_OF_MONTH))

            val res = repository.getExpenses(startDate, endDate, year, month)
            if (res != null) {
                var list = res.expenses
                val cat = selectedCategory.value
                if (cat.isNotEmpty()) {
                    list = list.filter { it.category == cat }
                }
                _expenses.value = list
                _summary.value = res.summary ?: emptyList()
            } else {
                _expenses.value = emptyList()
                _summary.value = emptyList()
            }
            _isLoading.value = false
        }
    }

    fun nextMonth() {
        if (selectedMonth.value == 12) {
            selectedYear.value += 1
            selectedMonth.value = 1
        } else {
            selectedMonth.value += 1
        }
        fetchExpenses()
    }

    fun prevMonth() {
        if (selectedMonth.value == 1) {
            selectedYear.value -= 1
            selectedMonth.value = 12
        } else {
            selectedMonth.value -= 1
        }
        fetchExpenses()
    }

    fun confirmRecurring(id: String, amount: Double) {
        viewModelScope.launch {
            _isLoading.value = true
            val res = repository.confirmExpense(id, amount)
            fetchExpenses()
        }
    }
}
