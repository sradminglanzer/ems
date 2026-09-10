package com.srgs.ems.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.CreateSubjectRequest
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.SubjectDto
import com.srgs.ems.data.repository.FeeGroupRepository
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.data.repository.SubjectRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SubjectsViewModel(application: Application) : AndroidViewModel(application) {
    private val subjectRepo = SubjectRepository(application.applicationContext)
    private val feeGroupRepo = FeeGroupRepository(application.applicationContext)

    private val _subjects = MutableStateFlow<List<SubjectDto>>(emptyList())
    val subjects = _subjects.asStateFlow()

    private val _classes = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val classes = _classes.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    val searchQuery = MutableStateFlow("")

    // Add / Edit Dialog States
    val showDialog = MutableStateFlow(false)
    val editingSubject = MutableStateFlow<SubjectDto?>(null)
    val formName = MutableStateFlow("")
    val formCode = MutableStateFlow("")
    val formSelectedClassIds = MutableStateFlow<Set<String>>(emptySet())
    val isSubmitting = MutableStateFlow(false)

    val deleteTarget = MutableStateFlow<SubjectDto?>(null)
    val isDeleting = MutableStateFlow(false)

    val snackbarEvent = MutableSharedFlow<String>()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val subjectsJob = async { subjectRepo.getSubjects() }
                val classesJob = async { feeGroupRepo.getGroups() }

                _subjects.value = subjectsJob.await()
                _classes.value = classesJob.await()
            } catch (e: Exception) {
                Log.e("SubjectsVM", "Failed to load subjects data", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun startAdd() {
        editingSubject.value = null
        formName.value = ""
        formCode.value = ""
        formSelectedClassIds.value = emptySet()
        showDialog.value = true
    }

    fun startEdit(subject: SubjectDto) {
        editingSubject.value = subject
        formName.value = subject.name
        formCode.value = subject.code ?: ""
        formSelectedClassIds.value = subject.assignedClasses.toSet()
        showDialog.value = true
    }

    fun toggleClassSelection(classId: String) {
        val current = formSelectedClassIds.value.toMutableSet()
        if (current.contains(classId)) {
            current.remove(classId)
        } else {
            current.add(classId)
        }
        formSelectedClassIds.value = current
    }

    fun saveSubject() {
        val name = formName.value.trim()
        if (name.isBlank()) {
            viewModelScope.launch { snackbarEvent.emit("⚠️ Subject name is required") }
            return
        }

        viewModelScope.launch {
            isSubmitting.value = true
            val req = CreateSubjectRequest(
                name = name,
                code = formCode.value.trim().ifEmpty { null },
                assignedClasses = formSelectedClassIds.value.toList()
            )

            val currentEditing = editingSubject.value
            val result = if (currentEditing != null) {
                subjectRepo.updateSubject(currentEditing._id, req)
            } else {
                subjectRepo.createSubject(req)
            }

            when (result) {
                is SaveResult.Success -> {
                    snackbarEvent.emit(if (currentEditing != null) "✅ Subject updated!" else "✅ Subject created!")
                    showDialog.value = false
                    loadData()
                }
                is SaveResult.Error -> {
                    snackbarEvent.emit("❌ ${result.message}")
                }
            }
            isSubmitting.value = false
        }
    }

    fun confirmDelete() {
        val target = deleteTarget.value ?: return
        viewModelScope.launch {
            isDeleting.value = true
            when (val result = subjectRepo.deleteSubject(target._id)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("🗑️ Subject deleted")
                    deleteTarget.value = null
                    loadData()
                }
                is SaveResult.Error -> {
                    snackbarEvent.emit("❌ ${result.message}")
                }
            }
            isDeleting.value = false
        }
    }

    fun addStandardSubjects() {
        val standardList = listOf(
            Pair("Mathematics", "MATH"),
            Pair("English", "ENG"),
            Pair("Science / EVS", "SCI"),
            Pair("Social Science", "SOC"),
            Pair("Hindi", "HIN"),
            Pair("Computer Science", "CS"),
            Pair("General / Activity", "GEN")
        )

        viewModelScope.launch {
            _isLoading.value = true
            var addedCount = 0
            val existingNames = _subjects.value.map { it.name.trim().lowercase() }.toSet()

            for ((name, code) in standardList) {
                if (!existingNames.contains(name.lowercase())) {
                    subjectRepo.createSubject(CreateSubjectRequest(name = name, code = code))
                    addedCount++
                }
            }

            if (addedCount > 0) {
                snackbarEvent.emit("✨ Added $addedCount standard subjects!")
                loadData()
            } else {
                snackbarEvent.emit("ℹ️ Standard subjects already exist.")
                _isLoading.value = false
            }
        }
    }
}
