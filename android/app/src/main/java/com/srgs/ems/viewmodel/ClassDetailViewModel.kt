package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.*
import com.srgs.ems.data.repository.DiaryRepository
import com.srgs.ems.data.repository.FeeGroupRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

enum class ClassDetailTab {
    ROSTER,
    DIARY,
    FEES
}

class ClassDetailViewModel(application: Application) : AndroidViewModel(application) {
    private val feeGroupRepo = FeeGroupRepository(application.applicationContext)
    private val diaryRepo = DiaryRepository(application.applicationContext)

    private val _classId = MutableStateFlow("")
    val classId = _classId.asStateFlow()

    private val _details = MutableStateFlow<FeeGroupDetailsResponseDto?>(null)
    val details = _details.asStateFlow()

    private val _diaryFeed = MutableStateFlow<List<DiaryDto>>(emptyList())
    val diaryFeed = _diaryFeed.asStateFlow()

    private val _subjects = MutableStateFlow<List<SubjectDto>>(emptyList())
    val subjects = _subjects.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    val activeTab = MutableStateFlow(ClassDetailTab.ROSTER)
    val searchQuery = MutableStateFlow("")

    // Post Diary Form States
    val postType = MutableStateFlow("homework")
    val postSubjectId = MutableStateFlow<String?>(null)
    val postTitle = MutableStateFlow("")
    val postDescription = MutableStateFlow("")
    val postDueDate = MutableStateFlow(LocalDate.now().plusDays(1).toString())
    val isPosting = MutableStateFlow(false)

    val snackbarEvent = MutableSharedFlow<String>()

    init {
        viewModelScope.launch {
            AcademicYearManager.selectedYear.collect {
                if (_classId.value.isNotEmpty()) {
                    loadClassData(_classId.value)
                }
            }
        }
    }

    fun initClass(id: String) {
        if (_classId.value != id) {
            _classId.value = id
            loadClassData(id)
        }
    }

    fun loadClassData(id: String = _classId.value) {
        if (id.isEmpty()) return
        viewModelScope.launch {
            _isLoading.value = true
            val yearId = AcademicYearManager.selectedYearId
            val detailsJob = async { feeGroupRepo.getGroupDetails(id, yearId) }
            val diaryJob = async { diaryRepo.getDiaryFeed(id, yearId) }
            val subjectsJob = async { diaryRepo.getSubjects() }

            _details.value = detailsJob.await()
            _diaryFeed.value = diaryJob.await()
            _subjects.value = subjectsJob.await()
            _isLoading.value = false
        }
    }

    fun startPostDiary() {
        postType.value = "homework"
        postSubjectId.value = _subjects.value.firstOrNull()?._id
        postTitle.value = ""
        postDescription.value = ""
        postDueDate.value = LocalDate.now().plusDays(1).toString()
    }

    fun submitDiaryEntry(onSuccess: () -> Unit) {
        val title = postTitle.value.trim()
        val desc = postDescription.value.trim()
        val cId = _classId.value
        val yearId = AcademicYearManager.selectedYearId

        if (title.isEmpty() || desc.isEmpty() || cId.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Title and instructions are required") }
            return
        }

        viewModelScope.launch {
            isPosting.value = true
            val req = CreateDiaryRequest(
                classId = cId,
                subjectId = postSubjectId.value?.ifBlank { null },
                academicYearId = yearId,
                type = postType.value,
                title = title,
                description = desc,
                dueDate = if (postType.value == "homework" || postType.value == "test") postDueDate.value else null
            )
            val res = diaryRepo.createDiaryEntry(req)
            when (res) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("✅ Diary entry posted successfully!")
                    postTitle.value = ""
                    postDescription.value = ""
                    onSuccess()
                    loadClassData(cId)
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
            isPosting.value = false
        }
    }

    fun updateStudentTracking(diaryId: String, studentId: String, newStatus: String) {
        viewModelScope.launch {
            val updates = listOf(StudentTrackingUpdate(studentId, newStatus))
            val res = diaryRepo.updateTracking(diaryId, updates)
            if (res is SaveResult.Success) {
                // Update in-memory feed
                val currentFeed = _diaryFeed.value.toMutableList()
                val idx = currentFeed.findIndex { it._id == diaryId }
                if (idx != -1) {
                    val entry = currentFeed[idx]
                    val trackingList = entry.studentTracking.map { t ->
                        val tId = if (t.memberId is MemberDto) t.memberId._id else t.memberId.toString()
                        if (tId == studentId) t.copy(status = newStatus) else t
                    }
                    currentFeed[idx] = entry.copy(studentTracking = trackingList)
                    _diaryFeed.value = currentFeed
                }
            }
        }
    }

    private inline fun <T> List<T>.findIndex(predicate: (T) -> Boolean): Int {
        for (i in indices) {
            if (predicate(this[i])) return i
        }
        return -1
    }
}
