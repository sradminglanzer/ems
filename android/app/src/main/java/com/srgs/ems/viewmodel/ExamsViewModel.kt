package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.CreateExamRequest
import com.srgs.ems.data.api.ExamDto
import com.srgs.ems.data.api.ExamResultDto
import com.srgs.ems.data.api.ExamSubjectDto
import com.srgs.ems.data.api.RankSheetEntryDto
import com.srgs.ems.data.repository.ExamRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class ExamsViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = ExamRepository(application.applicationContext)

    // ── List state ────────────────────────────────────────────────────────────
    val exams     = MutableStateFlow<List<ExamDto>>(emptyList())
    val isLoading = MutableStateFlow(false)

    // ── Selected exam & results ───────────────────────────────────────────────
    val selectedExam     = MutableStateFlow<ExamDto?>(null)
    val results          = MutableStateFlow<List<ExamResultDto>>(emptyList())
    val rankSheet        = MutableStateFlow<List<RankSheetEntryDto>>(emptyList())
    val isLoadingResults = MutableStateFlow(false)

    // ── Create exam form ──────────────────────────────────────────────────────
    val createName      = MutableStateFlow("")
    val createStartDate = MutableStateFlow("")
    val createEndDate   = MutableStateFlow("")
    val isCreating      = MutableStateFlow(false)

    // ── Subject entries for create form ──────────────────────────────────────
    val subjectEntries = MutableStateFlow<List<ExamSubjectDto>>(
        listOf(ExamSubjectDto("", "", "", ""))
    )

    // ── Events ────────────────────────────────────────────────────────────────
    val snackbarEvent = MutableSharedFlow<String>()

    init { fetchExams() }

    fun fetchExams() {
        viewModelScope.launch {
            isLoading.value = true
            exams.value = repo.getExams(AcademicYearManager.selectedYearId)
            isLoading.value = false
        }
    }

    fun selectExam(exam: ExamDto) {
        selectedExam.value = exam
        viewModelScope.launch {
            isLoadingResults.value = true
            results.value   = repo.getExamResults(exam._id)
            rankSheet.value = repo.getRankSheet(exam._id)
            isLoadingResults.value = false
        }
    }

    fun clearSelectedExam() {
        selectedExam.value = null
        results.value      = emptyList()
        rankSheet.value    = emptyList()
    }

    fun addSubjectEntry() {
        subjectEntries.value = subjectEntries.value + ExamSubjectDto("", "", "", "")
    }

    fun removeSubjectEntry(index: Int) {
        val list = subjectEntries.value.toMutableList()
        if (list.size > 1) { list.removeAt(index); subjectEntries.value = list }
    }

    fun updateSubjectEntry(index: Int, entry: ExamSubjectDto) {
        val list = subjectEntries.value.toMutableList()
        if (index in list.indices) { list[index] = entry; subjectEntries.value = list }
    }

    fun createExam() {
        val name  = createName.value.trim()
        val start = createStartDate.value.trim()
        val end   = createEndDate.value.trim()

        if (name.isEmpty() || start.isEmpty() || end.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Please fill in all required fields") }
            return
        }
        val validSubjects = subjectEntries.value.filter { it.name.isNotBlank() }
        if (validSubjects.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Add at least one subject") }
            return
        }

        val request = CreateExamRequest(
            name           = name,
            startDate      = start,
            endDate        = end,
            academicYearId = AcademicYearManager.selectedYearId,
            subjects       = validSubjects
        )
        viewModelScope.launch {
            isCreating.value = true
            when (val res = repo.createExam(request)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Exam created successfully")
                    createName.value      = ""
                    createStartDate.value = ""
                    createEndDate.value   = ""
                    subjectEntries.value  = listOf(ExamSubjectDto("", "", "", ""))
                    fetchExams()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
            isCreating.value = false
        }
    }
}
