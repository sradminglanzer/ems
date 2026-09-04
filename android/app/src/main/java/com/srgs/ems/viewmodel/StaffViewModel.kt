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

    // Tab state: 0 = Members/Teachers, 1 = Payroll
    val selectedTab = MutableStateFlow(0)

    private val _staffList = MutableStateFlow<List<StaffDto>>(emptyList())
    val staffList = _staffList.asStateFlow()

    private val _staffRoles = MutableStateFlow<List<StaffRoleSettingDto>>(emptyList())
    val staffRoles = _staffRoles.asStateFlow()

    private val _feeGroups = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val feeGroups = _feeGroups.asStateFlow()

    private val _subjects = MutableStateFlow<List<SubjectDto>>(emptyList())
    val subjects = _subjects.asStateFlow()

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
    val processHra = MutableStateFlow("")
    val processAllowances = MutableStateFlow("")
    val processPfDeduction = MutableStateFlow("")
    val processTaxDeduction = MutableStateFlow("")
    val processUnpaidLeaveDeduction = MutableStateFlow("")
    val processPaymentMethod = MutableStateFlow("cash")
    val processRemarks = MutableStateFlow("")

    val activePayslipRecord = MutableStateFlow<SalaryPaymentRecordDto?>(null)

    // ── Form State ────────────────────────────────────────────────────────────
    val editingStaffId = MutableStateFlow<String?>(null)
    val employeeId = MutableStateFlow("")
    val name = MutableStateFlow("")
    val contactNumber = MutableStateFlow("")
    val selectedRole = MutableStateFlow("teacher")
    val gender = MutableStateFlow("male")
    val dob = MutableStateFlow("")
    val designation = MutableStateFlow("")
    val qualificationsInput = MutableStateFlow("")
    val specializationInput = MutableStateFlow("")
    val experienceYears = MutableStateFlow("")
    val panNumber = MutableStateFlow("")
    val aadhaarNumber = MutableStateFlow("")

    // Workload Allocations
    val assignedClassTeacherGroupId = MutableStateFlow<String?>(null)
    val assignedSubjects = MutableStateFlow<List<StaffSubjectAllocationDto>>(emptyList())

    // Compensation
    val monthlySalary = MutableStateFlow("")
    val hra = MutableStateFlow("")
    val allowances = MutableStateFlow("")
    val pfDeduction = MutableStateFlow("")
    val taxDeduction = MutableStateFlow("")
    val joiningDate = MutableStateFlow("")
    val address = MutableStateFlow("")

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
            val groups = repository.getFeeGroups()
            val subs = repository.getSubjects()

            _staffList.value = list
            _feeGroups.value = groups
            _subjects.value = subs
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
        StaffRoleSettingDto("Teacher", "teacher", enable_login = true),
        StaffRoleSettingDto("Admin", "admin", enable_login = true),
        StaffRoleSettingDto("Accountant", "accountant", enable_login = true),
        StaffRoleSettingDto("Staff", "staff", enable_login = false)
    )

    fun addSubjectAllocation(groupId: String, groupName: String, subjectName: String) {
        if (groupId.isBlank() || subjectName.isBlank()) return
        val current = assignedSubjects.value.toMutableList()
        current.add(StaffSubjectAllocationDto(feeGroupId = groupId, feeGroupName = groupName, subjectName = subjectName))
        assignedSubjects.value = current
    }

    fun removeSubjectAllocation(index: Int) {
        val current = assignedSubjects.value.toMutableList()
        if (index in current.indices) {
            current.removeAt(index)
            assignedSubjects.value = current
        }
    }

    fun startEditStaff(staff: StaffDto) {
        editingStaffId.value = staff._id
        employeeId.value = staff.employeeId ?: ""
        name.value = staff.name
        contactNumber.value = staff.contactNumber
        selectedRole.value = staff.role
        gender.value = staff.gender ?: "male"
        dob.value = staff.dob ?: ""
        designation.value = staff.designation ?: ""
        qualificationsInput.value = staff.qualifications.joinToString(", ")
        specializationInput.value = staff.specializationSubjects.joinToString(", ")
        experienceYears.value = staff.experienceYears?.toString() ?: ""
        panNumber.value = staff.panNumber ?: ""
        aadhaarNumber.value = staff.aadhaarNumber ?: ""

        assignedClassTeacherGroupId.value = staff.assignedClassTeacherGroupId
        assignedSubjects.value = staff.assignedSubjects

        monthlySalary.value = staff.monthlySalary?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: ""
        hra.value = staff.hra?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: ""
        allowances.value = staff.allowances?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: ""
        pfDeduction.value = staff.pfDeduction?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: ""
        taxDeduction.value = staff.taxDeduction?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: ""
        joiningDate.value = staff.joiningDate ?: ""
        address.value = staff.address ?: ""
    }

    fun resetForm() {
        editingStaffId.value = null
        employeeId.value = ""
        name.value = ""
        contactNumber.value = ""
        selectedRole.value = "teacher"
        gender.value = "male"
        dob.value = ""
        designation.value = ""
        qualificationsInput.value = ""
        specializationInput.value = ""
        experienceYears.value = ""
        panNumber.value = ""
        aadhaarNumber.value = ""
        assignedClassTeacherGroupId.value = null
        assignedSubjects.value = emptyList()
        monthlySalary.value = ""
        hra.value = ""
        allowances.value = ""
        pfDeduction.value = ""
        taxDeduction.value = ""
        joiningDate.value = ""
        address.value = ""
    }

    fun saveStaff() {
        val n = name.value.trim()
        val c = contactNumber.value.trim()
        val r = selectedRole.value
        val empId = employeeId.value.trim().ifEmpty { null }
        val des = designation.value.trim().ifEmpty { null }
        val qualList = qualificationsInput.value.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        val specList = specializationInput.value.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        val exp = experienceYears.value.trim().toIntOrNull()
        val pan = panNumber.value.trim().ifEmpty { null }
        val aadh = aadhaarNumber.value.trim().ifEmpty { null }

        val sal = monthlySalary.value.trim().toDoubleOrNull()
        val hraVal = hra.value.trim().toDoubleOrNull()
        val allowVal = allowances.value.trim().toDoubleOrNull()
        val pfVal = pfDeduction.value.trim().toDoubleOrNull()
        val taxVal = taxDeduction.value.trim().toDoubleOrNull()
        val jDate = joiningDate.value.trim().ifEmpty { null }
        val addr = address.value.trim().ifEmpty { null }

        if (n.isEmpty() || c.isEmpty() || r.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please fill in required fields (Name, Phone, Role)") }
            return
        }

        val req = CreateStaffRequest(
            employeeId = empId,
            name = n,
            contactNumber = c,
            role = r,
            gender = gender.value,
            dob = dob.value.trim().ifEmpty { null },
            designation = des,
            qualifications = qualList,
            specializationSubjects = specList,
            experienceYears = exp,
            panNumber = pan,
            aadhaarNumber = aadh,
            assignedClassTeacherGroupId = assignedClassTeacherGroupId.value,
            assignedSubjects = assignedSubjects.value,
            monthlySalary = sal,
            hra = hraVal,
            allowances = allowVal,
            pfDeduction = pfVal,
            taxDeduction = taxVal,
            joiningDate = jDate,
            address = addr
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
        processHra.value = item.hra.let { if (it > 0) (if (it % 1.0 == 0.0) it.toLong().toString() else it.toString()) else "" }
        processAllowances.value = item.allowances.let { if (it > 0) (if (it % 1.0 == 0.0) it.toLong().toString() else it.toString()) else "" }
        processPfDeduction.value = item.pfDeduction.let { if (it > 0) (if (it % 1.0 == 0.0) it.toLong().toString() else it.toString()) else "" }
        processTaxDeduction.value = item.taxDeduction.let { if (it > 0) (if (it % 1.0 == 0.0) it.toLong().toString() else it.toString()) else "" }
        processUnpaidLeaveDeduction.value = ""
        processPaymentMethod.value = "cash"
        processRemarks.value = "Salary disbursement for ${MONTHS[selectedMonth.value - 1]} ${selectedYear.value}"
    }

    fun submitProcessSalary() {
        val item = processStaffItem.value ?: return
        val base = processBaseSalary.value.toDoubleOrNull() ?: item.monthlySalary
        val hraVal = processHra.value.toDoubleOrNull() ?: 0.0
        val allow = processAllowances.value.toDoubleOrNull() ?: 0.0
        val pf = processPfDeduction.value.toDoubleOrNull() ?: 0.0
        val tax = processTaxDeduction.value.toDoubleOrNull() ?: 0.0
        val lop = processUnpaidLeaveDeduction.value.toDoubleOrNull() ?: 0.0
        val totalDed = pf + tax + lop

        if (base <= 0) {
            viewModelScope.launch { snackbarEvent.emit("Please specify a valid base salary") }
            return
        }

        val req = ProcessSalaryRequest(
            staffId = item.staffId,
            month = selectedMonth.value,
            year = selectedYear.value,
            baseSalary = base,
            hra = hraVal,
            allowances = allow,
            pfDeduction = pf,
            taxDeduction = tax,
            unpaidLeaveDeduction = lop,
            deductions = totalDed,
            paymentMethod = processPaymentMethod.value,
            remarks = processRemarks.value.trim().ifEmpty { null }
        )

        viewModelScope.launch {
            isSubmitting.value = true
            when (val res = repository.processSalary(req)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Salary processed & logged into School Expenses!")
                    processStaffItem.value = null
                    loadPayroll()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
            isSubmitting.value = false
        }
    }
}

val MONTHS = listOf(
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
)
