package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.*
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
    val feeGroups = MutableStateFlow<List<FeeGroupDto>>(emptyList())

    // ── Selected exam & results ───────────────────────────────────────────────
    val selectedExam     = MutableStateFlow<ExamDto?>(null)
    val results          = MutableStateFlow<List<ExamResultDto>>(emptyList())
    val rankSheet        = MutableStateFlow<List<RankSheetEntryDto>>(emptyList())
    val isLoadingResults = MutableStateFlow(false)

    // ── Create exam form ──────────────────────────────────────────────────────
    val createName      = MutableStateFlow("")
    val createClassId   = MutableStateFlow<String?>(null)
    val createStartDate = MutableStateFlow("")
    val createEndDate   = MutableStateFlow("")
    val isCreating      = MutableStateFlow(false)

    val subjectEntries = MutableStateFlow<List<ExamSubjectDto>>(
        listOf(
            ExamSubjectDto("Mathematics", "", "09:30", "12:30", 100.0, 35.0),
            ExamSubjectDto("Science", "", "09:30", "12:30", 100.0, 35.0),
            ExamSubjectDto("English", "", "09:30", "12:30", 100.0, 35.0)
        )
    )

    // ── Marks Entry State ─────────────────────────────────────────────────────
    val classRoster      = MutableStateFlow<List<MemberDto>>(emptyList())
    val marksEntryMap    = MutableStateFlow<Map<String, Map<String, String>>>(emptyMap()) // memberId -> (subjectName -> score)
    val isLoadingRoster  = MutableStateFlow(false)
    val isSavingMarks    = MutableStateFlow(false)

    // ── Report Card Modal ─────────────────────────────────────────────────────
    val activeReportCard = MutableStateFlow<ExamResultDto?>(null)

    // ── Events ────────────────────────────────────────────────────────────────
    val snackbarEvent = MutableSharedFlow<String>()

    init {
        viewModelScope.launch {
            AcademicYearManager.selectedYear.collect {
                fetchExams()
                fetchFeeGroups()
            }
        }
    }

    fun fetchFeeGroups() {
        viewModelScope.launch {
            feeGroups.value = repo.getFeeGroups()
        }
    }

    fun fetchExams() {
        viewModelScope.launch {
            isLoading.value = true
            exams.value = repo.getExams(AcademicYearManager.selectedYearId)
            isLoading.value = false
        }
    }

    fun selectExam(exam: ExamDto) {
        selectedExam.value = exam
        refreshExamResults(exam._id)
    }

    fun refreshExamResults(examId: String) {
        viewModelScope.launch {
            isLoadingResults.value = true
            results.value   = repo.getExamResults(examId)
            rankSheet.value = repo.getRankSheet(examId)
            isLoadingResults.value = false
        }
    }

    fun clearSelectedExam() {
        selectedExam.value = null
        results.value      = emptyList()
        rankSheet.value    = emptyList()
        classRoster.value  = emptyList()
        marksEntryMap.value= emptyMap()
        activeReportCard.value = null
    }

    // ── Subject management in Create Form ─────────────────────────────────────
    fun addSubjectEntry() {
        subjectEntries.value = subjectEntries.value + ExamSubjectDto("", "", "09:30", "12:30", 100.0, 35.0)
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
        val name    = createName.value.trim()
        val start   = createStartDate.value.trim()
        val end     = createEndDate.value.trim()
        val classId = createClassId.value

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
            feeGroupId     = classId,
            academicYearId = AcademicYearManager.selectedYearId,
            subjects       = validSubjects
        )
        viewModelScope.launch {
            isCreating.value = true
            when (val res = repo.createExam(request)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Exam scheduled successfully")
                    createName.value      = ""
                    createStartDate.value = ""
                    createEndDate.value   = ""
                    createClassId.value   = null
                    subjectEntries.value  = listOf(
                        ExamSubjectDto("Mathematics", "", "09:30", "12:30", 100.0, 35.0),
                        ExamSubjectDto("Science", "", "09:30", "12:30", 100.0, 35.0),
                        ExamSubjectDto("English", "", "09:30", "12:30", 100.0, 35.0)
                    )
                    fetchExams()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
            isCreating.value = false
        }
    }

    // ── Marks Entry Logic ─────────────────────────────────────────────────────
    fun loadMarksEntry(exam: ExamDto) {
        viewModelScope.launch {
            isLoadingRoster.value = true
            val yearId = AcademicYearManager.selectedYearId
            val existingResults = repo.getExamResults(exam._id)

            val initialMap = mutableMapOf<String, MutableMap<String, String>>()
            existingResults.forEach { r ->
                val subMap = mutableMapOf<String, String>()
                r.subjectScores.forEach { s ->
                    subMap[s.subject] = if (s.marks % 1.0 == 0.0) s.marks.toInt().toString() else s.marks.toString()
                }
                initialMap[r.memberId] = subMap
            }

            if (!exam.feeGroupId.isNullOrEmpty()) {
                val groupDetails = repo.getFeeGroupDetails(exam.feeGroupId, yearId)
                classRoster.value = groupDetails?.members ?: emptyList()
            } else {
                // If no class filter, use members from results
                val allGroups = repo.getFeeGroups()
                val membersList = mutableListOf<MemberDto>()
                allGroups.forEach { g ->
                    val det = repo.getFeeGroupDetails(g._id, yearId)
                    det?.members?.let { membersList.addAll(it) }
                }
                classRoster.value = membersList.distinctBy { it._id }
            }

            marksEntryMap.value = initialMap
            isLoadingRoster.value = false
        }
    }

    fun updateStudentScore(memberId: String, subjectName: String, scoreStr: String) {
        val current = marksEntryMap.value.toMutableMap()
        val studentMap = current[memberId]?.toMutableMap() ?: mutableMapOf()
        studentMap[subjectName] = scoreStr
        current[memberId] = studentMap
        marksEntryMap.value = current
    }

    fun saveAllMarks(exam: ExamDto, onDone: () -> Unit) {
        viewModelScope.launch {
            isSavingMarks.value = true
            val payload = mutableListOf<MemberResultInput>()

            marksEntryMap.value.forEach { (memberId, subjectScoresMap) ->
                val scores = exam.subjects.mapNotNull { sub ->
                    val entered = subjectScoresMap[sub.name]?.toDoubleOrNull()
                    if (entered != null) {
                        SubjectScoreDto(
                            subject  = sub.name,
                            marks    = entered,
                            maxMarks = if (sub.maxMarks > 0) sub.maxMarks else 100.0
                        )
                    } else null
                }
                if (scores.isNotEmpty()) {
                    payload.add(MemberResultInput(memberId = memberId, subjectScores = scores))
                }
            }

            if (payload.isEmpty()) {
                snackbarEvent.emit("Please enter at least one score")
                isSavingMarks.value = false
                return@launch
            }

            when (val res = repo.saveResults(exam._id, payload)) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Marks saved successfully!")
                    refreshExamResults(exam._id)
                    onDone()
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
            isSavingMarks.value = false
        }
    }

    fun openReportCard(result: ExamResultDto) {
        activeReportCard.value = result
    }

    fun closeReportCard() {
        activeReportCard.value = null
    }
}
