package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.*
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.data.repository.StaffRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class StaffViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = StaffRepository(application.applicationContext)

    // Tab state: 0 = Members, 1 = Payroll
    val selectedTab = MutableStateFlow(0)

    private val _staffList = MutableStateFlow<List<StaffDto>>(emptyList())
    val staffList = _staffList.asStateFlow()

    private val _staffRoles = MutableStateFlow<List<StaffRoleSettingDto>>(emptyList())
    val staffRoles = _staffRoles.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // ── Payroll State ────────────────────────────────────────────────────────
    val cal = Calendar.getInstance()
    val selectedMonth = MutableStateFlow(cal.get(Calendar.MONTH) + 1)
    val selectedYear = MutableStateFlow(cal.get(Calendar.YEAR))

    private val _monthlyPayroll = MutableStateFlow<MonthlyPayrollResponseDto?>(null)
    val monthlyPayroll = _monthlyPayroll.asStateFlow()

    val processStaffItem = MutableStateFlow<PayrollStaffItemDto?>(null)
    val processBaseSalary = MutableStateFlow("")
    val processAllowances = MutableStateFlow("")
    val processDeductions = MutableStateFlow("")
    val processPaymentMethod = MutableStateFlow("bank_transfer")
    val processRemarks = MutableStateFlow("")

    val activePayslipRecord = MutableStateFlow<SalaryPaymentRecordDto?>(null)

    // Form state
    val editingStaffId = MutableStateFlow<String?>(null)
    val name = MutableStateFlow("")
    val contactNumber = MutableStateFlow("")
    val selectedRole = MutableStateFlow("admin")
    val designation = MutableStateFlow("")
    val qualificationsInput = MutableStateFlow("")
    val monthlySalary = MutableStateFlow("")
    val joiningDate = MutableStateFlow("")

    val isSubmitting = MutableStateFlow(false)

    // One-shot events for snackbar messages
    val snackbarEvent = MutableSharedFlow<String>()

    init {
        loadStaffAndSettings()
        loadPayroll()
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

    fun loadPayroll() {
        viewModelScope.launch {
            val res = repository.getMonthlyPayroll(selectedMonth.value, selectedYear.value)
            _monthlyPayroll.value = res
        }
    }

    private fun defaultRoles(): List<StaffRoleSettingDto> = listOf(
        StaffRoleSettingDto("Admin", "admin", enable_login = true),
        StaffRoleSettingDto("Staff", "staff", enable_login = false)
    )

    fun startEditStaff(staff: StaffDto) {
        editingStaffId.value = staff._id
        name.value = staff.name
        contactNumber.value = staff.contactNumber
        selectedRole.value = staff.role
        designation.value = staff.designation ?: ""
        qualificationsInput.value = staff.qualifications.joinToString(", ")
        monthlySalary.value = staff.monthlySalary?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: ""
        joiningDate.value = staff.joiningDate ?: ""
    }

    fun resetForm() {
        editingStaffId.value = null
        name.value = ""
        contactNumber.value = ""
        selectedRole.value = _staffRoles.value.firstOrNull()?.code ?: "admin"
        designation.value = ""
        qualificationsInput.value = ""
        monthlySalary.value = ""
        joiningDate.value = ""
    }

    fun saveStaff() {
        val n = name.value.trim()
        val c = contactNumber.value.trim()
        val r = selectedRole.value
        val des = designation.value.trim().ifEmpty { null }
        val qualList = qualificationsInput.value.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        val sal = monthlySalary.value.trim().toDoubleOrNull()
        val jDate = joiningDate.value.trim().ifEmpty { null }

        if (n.isEmpty() || c.isEmpty() || r.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please fill in required fields (Name, Phone, Role)") }
            return
        }

        val req = CreateStaffRequest(
            name = n,
            contactNumber = c,
            role = r,
            designation = des,
            qualifications = qualList,
            monthlySalary = sal,
            joiningDate = jDate
        )

        viewModelScope.launch {
            isSubmitting.value = true
            val editId = editingStaffId.value
            val result = if (editId != null) {
                repository.updateStaff(editId, req)
            } else {
                repository.createStaff(req)
            }

            when (result) {
                is SaveResult.Success -> {
                    snackbarEvent.emit(if (editId != null) "✅ Staff profile updated!" else "✅ Staff member created!")
                    resetForm()
                    loadStaffAndSettings()
                    loadPayroll()
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
                    loadPayroll()
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

    // ── Salary Processing ──────────────────────────────────────────────────
    fun startProcessSalary(item: PayrollStaffItemDto) {
        processStaffItem.value = item
        processBaseSalary.value = item.monthlySalary.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() }
        processAllowances.value = ""
        processDeductions.value = ""
        processPaymentMethod.value = "bank_transfer"
        processRemarks.value = "Monthly salary disbursement"
    }

    fun submitProcessSalary() {
        val item = processStaffItem.value ?: return
        val base = processBaseSalary.value.toDoubleOrNull() ?: item.monthlySalary
        val allow = processAllowances.value.toDoubleOrNull() ?: 0.0
        val ded = processDeductions.value.toDoubleOrNull() ?: 0.0

        if (base <= 0) {
            viewModelScope.launch { snackbarEvent.emit("Please specify a valid base salary") }
            return
        }

        val req = ProcessSalaryRequest(
            staffId = item.staffId,
            month = selectedMonth.value,
            year = selectedYear.value,
            baseSalary = base,
            allowances = allow,
            deductions = ded,
            paymentMethod = processPaymentMethod.value,
            remarks = processRemarks.value.trim().ifEmpty { null }
        )

        viewModelScope.launch {
            isSubmitting.value = true
            when (val res = repository.processSalary(req)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Salary processed & expense auto-logged!")
                    processStaffItem.value = null
                    loadPayroll()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
            isSubmitting.value = false
        }
    }
}
