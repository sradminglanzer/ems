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
    val selectedType = MutableStateFlow(FeeStructureType.FeeStructure.value)
    val isSubmitting = MutableStateFlow(false)

    val editingStructure = MutableStateFlow<FeeStructureDto?>(null)
    var deleteTarget = MutableStateFlow<FeeStructureDto?>(null)

    val snackbarEvent = MutableSharedFlow<String>()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            val (s, g) = Pair(structRepo.getStructures(), groupRepo.getGroups())
            _structures.value = s
            _groups.value = g
            if (g.isNotEmpty() && selectedGroupId.value.isEmpty()) {
                selectedGroupId.value = g.first()._id
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
        if (groups.value.isNotEmpty()) selectedGroupId.value = groups.value.first()._id
    }

    fun startEdit(s: FeeStructureDto) {
        editingStructure.value = s
        name.value = s.name
        amount.value = s.amount.toString()
        frequency.value = s.frequency
        selectedGroupId.value = s.feeGroupId ?: (groups.value.firstOrNull()?._id ?: "")
        selectedType.value = if (s.isAddon) FeeStructureType.FeeStructureAddon.value else FeeStructureType.FeeStructure.value
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
        if (!isAddon && !isGymMode && selectedGroupId.value.isEmpty() && groups.value.isNotEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please select a class/group") }
            return
        }

        val groupId = if (isAddon || isGymMode) null else selectedGroupId.value.ifEmpty { null }
        val target = editingStructure.value

        viewModelScope.launch {
            isSubmitting.value = true
            val r = if (target == null) {
                structRepo.createStructure(n, a, frequency.value, groupId, typeVal)
            } else {
                structRepo.updateStructure(target._id, n, a, frequency.value, groupId, typeVal)
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
