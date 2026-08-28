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

enum class FeeStructureType(val value: String, val label: String, val description: String) {
    FeeStructure("FeeStructure", "Standard Fee", "Regular fee structure assigned to a class/group"),
    FeeStructureAddon("FeeStructureAddon", "Add-on Fee", "Optional add-on fee available for any member")
}

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
        frequency.value = "monthly"
        selectedType.value = FeeStructureType.FeeStructure.value
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

    fun save(isGymMode: Boolean) {
        val n = name.value.trim()
        val a = amount.value.trim().toDoubleOrNull()
        val typeVal = selectedType.value
        val isAddon = typeVal == FeeStructureType.FeeStructureAddon.value

        if (n.isEmpty() || a == null) {
            viewModelScope.launch { snackbarEvent.emit("Name and a valid amount are required") }
            return
        }
        if (!isAddon && !isGymMode && selectedGroupIds.value.isEmpty() && groups.value.isNotEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please select at least one class/group") }
            return
        }

        val yearId = if (isGymMode) null else com.srgs.ems.data.AcademicYearManager.selectedYearId
        val groupIds = if (isAddon || isGymMode) null else selectedGroupIds.value.ifEmpty { null }
        val groupId = if (isAddon || isGymMode) null else (selectedGroupIds.value.firstOrNull() ?: selectedGroupId.value.ifEmpty { null })
        val target = editingStructure.value

        viewModelScope.launch {
            isSubmitting.value = true
            val r = if (target == null) {
                structRepo.createStructure(
                    name = n,
                    amount = a,
                    frequency = frequency.value,
                    academicYearId = yearId,
                    feeGroupId = groupId,
                    feeGroupIds = groupIds,
                    type = typeVal
                )
            } else {
                structRepo.updateStructure(
                    id = target._id,
                    name = n,
                    amount = a,
                    frequency = frequency.value,
                    academicYearId = yearId ?: target.academicYearId,
                    feeGroupId = groupId,
                    feeGroupIds = groupIds,
                    type = typeVal
                )
            }

            when (r) {
                is SaveResult.Success -> {
                    snackbarEvent.emit(if (target == null) "✅ Plan created!" else "✅ Plan updated!")
                    name.value = ""; amount.value = ""; selectedType.value = FeeStructureType.FeeStructure.value
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
