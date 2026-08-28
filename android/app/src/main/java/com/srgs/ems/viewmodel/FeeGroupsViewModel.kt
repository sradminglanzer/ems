package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.data.repository.FeeGroupRepository
import com.srgs.ems.data.repository.FeeStructureRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class FeeGroupsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = FeeGroupRepository(application.applicationContext)
    private val structRepo = FeeStructureRepository(application.applicationContext)

    private val _groups = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val groups = _groups.asStateFlow()

    private val _structures = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val structures = _structures.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    // Form fields
    val name = MutableStateFlow("")
    val description = MutableStateFlow("")
    val capacity = MutableStateFlow("2") // Default 2 beds for PGs
    val selectedStructureId = MutableStateFlow("")
    val isSubmitting = MutableStateFlow(false)

    val editingGroup = MutableStateFlow<FeeGroupDto?>(null)

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
            val gJob = async { repository.getGroups() }
            val sJob = async { structRepo.getStructures() }
            _groups.value = gJob.await()
            _structures.value = sJob.await().filter { !it.isAddon }
            _isLoading.value = false
        }
    }

    fun startCreate() {
        editingGroup.value = null
        name.value = ""
        description.value = ""
        capacity.value = "2"
        selectedStructureId.value = ""
    }

    fun startEdit(g: FeeGroupDto) {
        editingGroup.value = g
        name.value = g.name
        description.value = g.description ?: ""
        capacity.value = g.capacity.toString()
        // Find linked structure
        val linked = structures.value.firstOrNull { it.feeGroupId == g._id }
        selectedStructureId.value = linked?._id ?: ""
    }

    fun saveGroup() {
        val n = name.value.trim()
        if (n.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Group/Room name is required") }
            return
        }
        val capVal = capacity.value.toIntOrNull() ?: 1
        val target = editingGroup.value

        viewModelScope.launch {
            isSubmitting.value = true
            val result = if (target == null) {
                repository.createGroup(n, description.value.trim(), capVal)
            } else {
                repository.updateGroup(target._id, n, description.value.trim(), capVal)
            }

            when (result) {
                is SaveResult.Success -> {
                    // Link selected structure to this room if selected
                    val selStructId = selectedStructureId.value
                    if (selStructId.isNotEmpty()) {
                        val targetStruct = structures.value.firstOrNull { it._id == selStructId }
                        if (targetStruct != null) {
                            val targetGroupId = target?._id ?: repository.getGroups().firstOrNull { it.name == n }?._id
                            if (targetGroupId != null) {
                                structRepo.updateStructure(
                                    id = targetStruct._id,
                                    name = targetStruct.name,
                                    amount = targetStruct.amount,
                                    frequency = targetStruct.frequency,
                                    feeGroupId = targetGroupId,
                                    feeGroupIds = listOf(targetGroupId),
                                    type = targetStruct.type
                                )
                            }
                        }
                    }

                    snackbarEvent.emit(if (target == null) "✅ Room created successfully!" else "✅ Room updated successfully!")
                    name.value = ""
                    description.value = ""
                    capacity.value = "2"
                    selectedStructureId.value = ""
                    editingGroup.value = null
                    loadGroups()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${result.message}")
            }
            isSubmitting.value = false
        }
    }
}
