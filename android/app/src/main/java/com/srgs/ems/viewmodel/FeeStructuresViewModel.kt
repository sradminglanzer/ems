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
    val isGlobal = MutableStateFlow(false)
    val isSubmitting = MutableStateFlow(false)

    val snackbarEvent = MutableSharedFlow<String>()

    var deleteTarget = MutableStateFlow<FeeStructureDto?>(null)

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

    fun create(isGymMode: Boolean) {
        val n = name.value.trim()
        val a = amount.value.trim().toDoubleOrNull()
        val effectiveGlobal = if (isGymMode) true else isGlobal.value

        if (n.isEmpty() || a == null) {
            viewModelScope.launch { snackbarEvent.emit("Name and a valid amount are required") }
            return
        }
        if (!effectiveGlobal && selectedGroupId.value.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please select a class/group") }
            return
        }

        val groupId = if (effectiveGlobal) null else selectedGroupId.value

        viewModelScope.launch {
            isSubmitting.value = true
            when (val r = structRepo.createStructure(n, a, frequency.value, groupId)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Fee structure created!")
                    name.value = ""; amount.value = ""; isGlobal.value = false
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
                is SaveResult.Success -> { snackbarEvent.emit("Structure deleted"); load() }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${r.message}")
            }
        }
    }
}
