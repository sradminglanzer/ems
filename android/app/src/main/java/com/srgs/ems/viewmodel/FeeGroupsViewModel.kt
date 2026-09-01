package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.data.api.StaffDto
import com.srgs.ems.data.repository.FeeGroupRepository
import com.srgs.ems.data.repository.FeeStructureRepository
import com.srgs.ems.data.repository.StaffRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class FeeGroupsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = FeeGroupRepository(application.applicationContext)
    private val structRepo = FeeStructureRepository(application.applicationContext)
    private val staffRepo = StaffRepository(application.applicationContext)

    private val _groups = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val groups = _groups.asStateFlow()

    private val _structures = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val structures = _structures.asStateFlow()

    private val _staffList = MutableStateFlow<List<StaffDto>>(emptyList())
    val staffList = _staffList.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // Form fields
    val name = MutableStateFlow("")
    val description = MutableStateFlow("")
    val capacity = MutableStateFlow("40")
    val selectedTeacherId = MutableStateFlow("")
    val selectedStructureId = MutableStateFlow("")
    val isSubmitting = MutableStateFlow(false)

    val editingGroup = MutableStateFlow<FeeGroupDto?>(null)
    var deleteTarget = MutableStateFlow<FeeGroupDto?>(null)

    val snackbarEvent = MutableSharedFlow<String>()

    init {
        viewModelScope.launch {
            com.srgs.ems.data.AcademicYearManager.selectedYear.collect {
                loadGroups()
            }
        }
    }

    fun loadGroups() {
        viewModelScope.launch {
            _isLoading.value = true
            val yearId = com.srgs.ems.data.AcademicYearManager.selectedYearId
            val gJob = async { repository.getGroups(yearId) }
            val sJob = async { structRepo.getStructures(yearId) }
            val staffJob = async { staffRepo.getStaffList() }

            _groups.value = gJob.await()
            _structures.value = sJob.await().filter { !it.isAddon }
            _staffList.value = staffJob.await().filter { it.status == "active" }
            _isLoading.value = false
        }
    }

    fun startCreate(defaultCapacity: Int = 40) {
        editingGroup.value = null
        name.value = ""
        description.value = ""
        capacity.value = defaultCapacity.toString()
        selectedTeacherId.value = ""
        selectedStructureId.value = ""
    }

    fun startEdit(g: FeeGroupDto) {
        editingGroup.value = g
        name.value = g.name
        description.value = g.description ?: ""
        capacity.value = g.capacity.toString()
        selectedTeacherId.value = g.classTeacherId ?: ""
        val linked = structures.value.firstOrNull { it.feeGroupId == g._id || (it.feeGroupIds != null && it.feeGroupIds.contains(g._id)) }
        selectedStructureId.value = linked?._id ?: ""
    }

    fun saveGroup(label: String = "Class") {
        val n = name.value.trim()
        if (n.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("$label name is required") }
            return
        }
        val capVal = capacity.value.toIntOrNull() ?: 1
        val teacherId = selectedTeacherId.value.ifBlank { null }
        val target = editingGroup.value

        viewModelScope.launch {
            isSubmitting.value = true
            val result = if (target == null) {
                repository.createGroup(n, description.value.trim(), capVal, teacherId)
            } else {
                repository.updateGroup(target._id, n, description.value.trim(), capVal, teacherId)
            }

            when (result) {
                is SaveResult.Success -> {
                    // Link selected structure to this class if selected
                    val selStructId = selectedStructureId.value
                    if (selStructId.isNotEmpty()) {
                        val targetStruct = structures.value.firstOrNull { it._id == selStructId }
                        if (targetStruct != null) {
                            val yearId = com.srgs.ems.data.AcademicYearManager.selectedYearId
                            val targetGroupId = target?._id ?: repository.getGroups(yearId).firstOrNull { it.name == n }?._id
                            if (targetGroupId != null) {
                                structRepo.updateStructure(
                                    id = targetStruct._id,
                                    name = targetStruct.name,
                                    amount = targetStruct.amount,
                                    frequency = targetStruct.frequency,
                                    academicYearId = targetStruct.academicYearId ?: yearId,
                                    feeGroupId = targetGroupId,
                                    feeGroupIds = listOf(targetGroupId),
                                    type = targetStruct.type
                                )
                            }
                        }
                    }

                    snackbarEvent.emit(if (target == null) "✅ $label created successfully!" else "✅ $label updated successfully!")
                    name.value = ""
                    description.value = ""
                    capacity.value = "40"
                    selectedTeacherId.value = ""
                    selectedStructureId.value = ""
                    editingGroup.value = null
                    loadGroups()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
            isSubmitting.value = false
        }
    }

    fun deleteGroup(g: FeeGroupDto, label: String = "Class") {
        viewModelScope.launch {
            isSubmitting.value = true
            val result = repository.deleteGroup(g._id)
            when (result) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ $label deleted successfully!")
                    deleteTarget.value = null
                    loadGroups()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
            isSubmitting.value = false
        }
    }
}
