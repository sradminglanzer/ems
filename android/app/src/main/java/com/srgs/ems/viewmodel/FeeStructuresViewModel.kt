package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.data.repository.FeeGroupRepository
import com.srgs.ems.data.repository.FeeStructureRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

import java.util.UUID

enum class FeeStructureType(val value: String, val label: String, val description: String) {
    FeeStructure("FeeStructure", "Standard Fee", "Regular fee structure assigned to a class/group"),
    FeeStructureAddon("FeeStructureAddon", "Add-on Fee", "Optional add-on fee available for any member")
}

data class InstallmentRow(
    val id: String = UUID.randomUUID().toString(),
    val name: String = "",
    val amount: String = "",
    val dueDate: String = ""
)

class FeeStructuresViewModel(application: Application) : AndroidViewModel(application) {
    private val structRepo = FeeStructureRepository(application.applicationContext)
    private val groupRepo = FeeGroupRepository(application.applicationContext)

    private val _structures = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val structures = _structures.asStateFlow()

    private val _groups = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val groups = _groups.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // Form
    val name = MutableStateFlow("")
    val amount = MutableStateFlow("")
    val frequency = MutableStateFlow("monthly")
    val selectedGroupId = MutableStateFlow("")
    val selectedGroupIds = MutableStateFlow<List<String>>(emptyList())
    val selectedType = MutableStateFlow(FeeStructureType.FeeStructure.value)
    val installments = MutableStateFlow<List<InstallmentRow>>(emptyList())
    val isSubmitting = MutableStateFlow(false)

    val editingStructure = MutableStateFlow<FeeStructureDto?>(null)
    var deleteTarget = MutableStateFlow<FeeStructureDto?>(null)

    val snackbarEvent = MutableSharedFlow<String>()

    init {
        viewModelScope.launch {
            com.srgs.ems.data.AcademicYearManager.selectedYear.collect {
                load()
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            val yearId = com.srgs.ems.data.AcademicYearManager.selectedYearId
            val (s, g) = Pair(structRepo.getStructures(yearId), groupRepo.getGroups())
            _structures.value = s
            _groups.value = g
            if (g.isNotEmpty() && selectedGroupId.value.isEmpty()) {
                selectedGroupId.value = g.first()._id
                selectedGroupIds.value = listOf(g.first()._id)
            }
            _isLoading.value = false
        }
    }

    fun startCreate() {
        editingStructure.value = null
        name.value = ""
        amount.value = ""
        frequency.value = "annual"
        selectedType.value = FeeStructureType.FeeStructure.value
        installments.value = emptyList()
        if (groups.value.isNotEmpty()) {
            selectedGroupId.value = groups.value.first()._id
            selectedGroupIds.value = listOf(groups.value.first()._id)
        } else {
            selectedGroupIds.value = emptyList()
        }
    }

    fun startEdit(s: FeeStructureDto) {
        editingStructure.value = s
        name.value = s.name
        amount.value = s.amount.toString()
        frequency.value = s.frequency
        selectedGroupId.value = s.feeGroupId ?: (groups.value.firstOrNull()?._id ?: "")
        selectedGroupIds.value = s.feeGroupIds ?: (s.feeGroupId?.let { listOf(it) } ?: emptyList())
        selectedType.value = if (s.isAddon) FeeStructureType.FeeStructureAddon.value else FeeStructureType.FeeStructure.value
        if (!s.installments.isNullOrEmpty()) {
            installments.value = s.installments.map {
                InstallmentRow(
                    id = it._id ?: UUID.randomUUID().toString(),
                    name = it.name,
                    amount = if (it.amount > 0) ((if (it.amount % 1 == 0.0) it.amount.toLong().toString() else it.amount.toString())) else "",
                    dueDate = it.dueDate ?: ""
                )
            }
        } else {
            installments.value = emptyList()
        }
    }

    fun toggleClassSelection(classId: String) {
        val current = selectedGroupIds.value.toMutableList()
        if (current.contains(classId)) {
            current.remove(classId)
        } else {
            current.add(classId)
        }
        selectedGroupIds.value = current
        selectedGroupId.value = current.firstOrNull() ?: ""
    }

    fun applyPreset(preset: String) {
        val tot = amount.value.toDoubleOrNull() ?: 0.0
        val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        when (preset) {
            "4_quarters" -> {
                val qAmt = if (tot > 0) Math.round(tot / 4.0).toString() else ""
                installments.value = listOf(
                    InstallmentRow(name = "Quarter 1 (Admission)", amount = qAmt, dueDate = "$currentYear-04-10"),
                    InstallmentRow(name = "Quarter 2 (Jul)", amount = qAmt, dueDate = "$currentYear-07-10"),
                    InstallmentRow(name = "Quarter 3 (Oct)", amount = qAmt, dueDate = "$currentYear-10-10"),
                    InstallmentRow(name = "Quarter 4 (Jan)", amount = qAmt, dueDate = "${currentYear + 1}-01-10")
                )
                frequency.value = "quarterly"
            }
            "3_terms" -> {
                val tAmt = if (tot > 0) Math.round(tot / 3.0).toString() else ""
                installments.value = listOf(
                    InstallmentRow(name = "Term 1 (Jun)", amount = tAmt, dueDate = "$currentYear-06-10"),
                    InstallmentRow(name = "Term 2 (Oct)", amount = tAmt, dueDate = "$currentYear-10-10"),
                    InstallmentRow(name = "Term 3 (Jan)", amount = tAmt, dueDate = "${currentYear + 1}-01-10")
                )
                frequency.value = "quarterly"
            }
            "monthly_10" -> {
                val mAmt = if (tot > 0) Math.round(tot / 10.0).toString() else ""
                val monthDefs = listOf(
                    "Jun" to "$currentYear-06-10",
                    "Jul" to "$currentYear-07-10",
                    "Aug" to "$currentYear-08-10",
                    "Sep" to "$currentYear-09-10",
                    "Oct" to "$currentYear-10-10",
                    "Nov" to "$currentYear-11-10",
                    "Dec" to "$currentYear-12-10",
                    "Jan" to "${currentYear + 1}-01-10",
                    "Feb" to "${currentYear + 1}-02-10",
                    "Mar" to "${currentYear + 1}-03-10"
                )
                installments.value = monthDefs.map { (m, d) ->
                    InstallmentRow(name = "$m Installment", amount = mAmt, dueDate = d)
                }
                frequency.value = "monthly"
            }
            "monthly_12" -> {
                val mAmt = if (tot > 0) Math.round(tot / 12.0).toString() else ""
                val monthDefs = listOf(
                    "Apr" to "$currentYear-04-10",
                    "May" to "$currentYear-05-10",
                    "Jun" to "$currentYear-06-10",
                    "Jul" to "$currentYear-07-10",
                    "Aug" to "$currentYear-08-10",
                    "Sep" to "$currentYear-09-10",
                    "Oct" to "$currentYear-10-10",
                    "Nov" to "$currentYear-11-10",
                    "Dec" to "$currentYear-12-10",
                    "Jan" to "${currentYear + 1}-01-10",
                    "Feb" to "${currentYear + 1}-02-10",
                    "Mar" to "${currentYear + 1}-03-10"
                )
                installments.value = monthDefs.map { (m, d) ->
                    InstallmentRow(name = "$m Installment", amount = mAmt, dueDate = d)
                }
                frequency.value = "monthly"
            }
            "custom" -> {
                if (installments.value.isEmpty()) {
                    installments.value = listOf(
                        InstallmentRow(name = "Installment 1", amount = amount.value, dueDate = "$currentYear-04-10"),
                        InstallmentRow(name = "Installment 2", amount = "", dueDate = "$currentYear-10-10")
                    )
                }
            }
            "clear" -> {
                installments.value = emptyList()
            }
        }
        recalcTotalFromInstallments()
    }

    fun splitEqually() {
        val count = installments.value.size
        val tot = amount.value.toDoubleOrNull() ?: 0.0
        if (count > 0 && tot > 0) {
            val perInst = Math.round(tot / count.toDouble())
            val current = installments.value.mapIndexed { idx, inst ->
                val amt = if (idx == count - 1) {
                    (tot - (perInst * (count - 1))).toLong().toString()
                } else {
                    perInst.toString()
                }
                inst.copy(amount = amt)
            }
            installments.value = current
        }
    }

    fun addInstallment() {
        val current = installments.value.toMutableList()
        val nextIdx = current.size + 1
        current.add(InstallmentRow(name = "Installment $nextIdx", amount = "", dueDate = ""))
        installments.value = current
    }

    fun updateInstallment(index: Int, name: String? = null, amount: String? = null, dueDate: String? = null) {
        val current = installments.value.toMutableList()
        if (index in current.indices) {
            val old = current[index]
            current[index] = old.copy(
                name = name ?: old.name,
                amount = amount ?: old.amount,
                dueDate = dueDate ?: old.dueDate
            )
            installments.value = current
            recalcTotalFromInstallments()
        }
    }

    fun removeInstallment(index: Int) {
        val current = installments.value.toMutableList()
        if (index in current.indices) {
            current.removeAt(index)
            installments.value = current
            recalcTotalFromInstallments()
        }
    }

    fun updateName(v: String) { name.value = v }
    fun updateAmount(v: String) { amount.value = v }
    fun updateFrequency(v: String) { frequency.value = v }
    fun updateSelectedType(v: String) { selectedType.value = v }
    fun setDeleteTarget(target: FeeStructureDto?) { deleteTarget.value = target }

    private fun recalcTotalFromInstallments() {
        if (installments.value.isNotEmpty()) {
            val sum = installments.value.sumOf { it.amount.toDoubleOrNull() ?: 0.0 }
            if (sum > 0) {
                amount.value = if (sum % 1 == 0.0) sum.toLong().toString() else sum.toString()
            }
        }
    }

    fun save(isGymMode: Boolean) {
        val n = name.value.trim()
        val a = amount.value.trim().toDoubleOrNull()
        val typeVal = selectedType.value
        val isAddon = typeVal == FeeStructureType.FeeStructureAddon.value

        if (n.isEmpty() || a == null || a <= 0) {
            viewModelScope.launch { snackbarEvent.emit("Name and a valid amount are required") }
            return
        }
        if (!isAddon && !isGymMode && selectedGroupIds.value.isEmpty() && groups.value.isNotEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please select at least one class/group") }
            return
        }

        // Installment validation if present
        val mappedInstallments: List<com.srgs.ems.data.api.FeeInstallmentDto>? = if (installments.value.isNotEmpty() && !isGymMode) {
            val list = mutableListOf<com.srgs.ems.data.api.FeeInstallmentDto>()
            for ((idx, inst) in installments.value.withIndex()) {
                val instName = inst.name.trim().ifEmpty { "Installment ${idx + 1}" }
                val instAmt = inst.amount.toDoubleOrNull()
                if (instAmt == null || instAmt <= 0) {
                    viewModelScope.launch { snackbarEvent.emit("Please enter a valid amount for '$instName'") }
                    return
                }
                list.add(
                    com.srgs.ems.data.api.FeeInstallmentDto(
                        name = instName,
                        amount = instAmt,
                        dueDate = inst.dueDate.trim().ifEmpty { null }
                    )
                )
            }
            list
        } else null

        val finalAmount = mappedInstallments?.sumOf { it.amount } ?: a

        val yearId = if (isGymMode) null else com.srgs.ems.data.AcademicYearManager.selectedYearId
        val groupIds = if (isAddon || isGymMode) null else selectedGroupIds.value.ifEmpty { null }
        val groupId = if (isAddon || isGymMode) null else (selectedGroupIds.value.firstOrNull() ?: selectedGroupId.value.ifEmpty { null })
        val target = editingStructure.value

        viewModelScope.launch {
            isSubmitting.value = true
            val r = if (target == null) {
                structRepo.createStructure(
                    name = n,
                    amount = finalAmount,
                    frequency = frequency.value,
                    academicYearId = yearId,
                    feeGroupId = groupId,
                    feeGroupIds = groupIds,
                    type = typeVal,
                    installments = mappedInstallments
                )
            } else {
                structRepo.updateStructure(
                    id = target._id,
                    name = n,
                    amount = finalAmount,
                    frequency = frequency.value,
                    academicYearId = yearId ?: target.academicYearId,
                    feeGroupId = groupId,
                    feeGroupIds = groupIds,
                    type = typeVal,
                    installments = mappedInstallments
                )
            }

            when (r) {
                is SaveResult.Success -> {
                    snackbarEvent.emit(if (target == null) "✅ Plan created!" else "✅ Plan updated!")
                    name.value = ""; amount.value = ""; selectedType.value = FeeStructureType.FeeStructure.value
                    installments.value = emptyList()
                    editingStructure.value = null
                    load()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${r.message}")
            }
            isSubmitting.value = false
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            when (val r = structRepo.deleteStructure(id)) {
                is SaveResult.Success -> { snackbarEvent.emit("Plan deleted"); load() }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${r.message}")
            }
        }
    }
}
