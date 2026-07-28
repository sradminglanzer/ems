package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.CreateExpenseRequest
import com.srgs.ems.data.repository.ExpenseRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class AddExpenseViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ExpenseRepository(application.applicationContext)

    val title = MutableStateFlow("")
    val category = MutableStateFlow("")
    val amount = MutableStateFlow("")
    val vendor = MutableStateFlow("")
    val notes = MutableStateFlow("")
    val paymentMethod = MutableStateFlow("cash")
    val expenseDate = MutableStateFlow("") // YYYY-MM-DD
    val isRecurring = MutableStateFlow(false)
    val recurringFrequency = MutableStateFlow("monthly")
    
    val isSubmitting = MutableStateFlow(false)
    val saveResult = MutableSharedFlow<SaveResult>()

    private var editingId: String? = null
    val isEditing get() = editingId != null

    fun initialize(id: String?, initTitle: String?, initCat: String?, initAmt: String?, initVendor: String?, initNotes: String?, initPm: String?, initDate: String?, initRecur: Boolean?, initFreq: String?) {
        if (id != null) {
            editingId = id
            title.value = initTitle ?: ""
            category.value = initCat ?: ""
            amount.value = initAmt ?: ""
            vendor.value = initVendor ?: ""
            notes.value = initNotes ?: ""
            paymentMethod.value = initPm ?: "cash"
            expenseDate.value = initDate ?: ""
            isRecurring.value = initRecur ?: false
            recurringFrequency.value = initFreq ?: "monthly"
        } else {
            // Set default date to today if empty
            if (expenseDate.value.isEmpty()) {
                val cal = java.util.Calendar.getInstance()
                expenseDate.value = String.format("%04d-%02d-%02d", cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1, cal.get(java.util.Calendar.DAY_OF_MONTH))
            }
        }
    }

    fun submit() {
        val t = title.value.trim()
        val cat = category.value
        val amtStr = amount.value.trim()

        if (t.isEmpty() || cat.isEmpty() || amtStr.isEmpty()) {
            viewModelScope.launch { saveResult.emit(SaveResult.Error("Please fill required fields (Title, Category, Amount)")) }
            return
        }
        val amt = amtStr.toDoubleOrNull()
        if (amt == null || amt <= 0) {
            viewModelScope.launch { saveResult.emit(SaveResult.Error("Invalid amount")) }
            return
        }

        viewModelScope.launch {
            isSubmitting.value = true
            val req = CreateExpenseRequest(
                title = t,
                category = cat,
                amount = amt,
                expenseDate = expenseDate.value,
                paymentMethod = paymentMethod.value,
                vendor = vendor.value.trim().ifEmpty { null },
                notes = notes.value.trim().ifEmpty { null },
                isRecurring = isRecurring.value,
                recurringFrequency = if (isRecurring.value) recurringFrequency.value else null
            )

            val res = if (isEditing) {
                repository.updateExpense(editingId!!, req)
            } else {
                repository.createExpense(req)
            }
            saveResult.emit(res)
            isSubmitting.value = false
        }
    }

    fun deleteExpense() {
        if (editingId == null) return
        viewModelScope.launch {
            isSubmitting.value = true
            val res = repository.deleteExpense(editingId!!)
            saveResult.emit(res)
            isSubmitting.value = false
        }
    }
}
