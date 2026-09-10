package com.srgs.ems.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.*
import com.srgs.ems.data.repository.DiaryRepository
import com.srgs.ems.data.repository.FeeGroupRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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

    // Post / Edit Diary Form States
    val selectedDiaryDate = MutableStateFlow(LocalDate.now().toString())
    val editingDiaryId = MutableStateFlow<String?>(null)
    val postType = MutableStateFlow("homework")
    val postSubjectId = MutableStateFlow<String?>(null)
    val postTitle = MutableStateFlow("")
    val postDescription = MutableStateFlow("")
    val postAttachments = MutableStateFlow<List<String>>(emptyList())
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
        Log.d("ClassDetailVM", "initClass() invoked with id='$id' (current classId='${_classId.value}')")
        if (_classId.value != id) {
            _classId.value = id
            loadClassData(id)
        }
    }

    fun selectDate(dateStr: String) {
        selectedDiaryDate.value = dateStr
    }

    fun goToPreviousDay() {
        try {
            selectedDiaryDate.value = LocalDate.parse(selectedDiaryDate.value).minusDays(1).toString()
        } catch (_: Exception) {}
    }

    fun goToNextDay() {
        try {
            selectedDiaryDate.value = LocalDate.parse(selectedDiaryDate.value).plusDays(1).toString()
        } catch (_: Exception) {}
    }

    fun goToToday() {
        selectedDiaryDate.value = LocalDate.now().toString()
    }

    fun loadClassData(id: String = _classId.value) {
        Log.d("ClassDetailVM", "loadClassData() requested for id='$id'")
        if (id.isEmpty()) {
            Log.w("ClassDetailVM", "⚠️ loadClassData() aborted: class id is empty!")
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            val yearId = AcademicYearManager.selectedYearId
            Log.d("ClassDetailVM", "📡 Fetching details & diary feed for classId='$id', academicYearId='$yearId'")
            val detailsJob = async { feeGroupRepo.getGroupDetails(id, yearId) }
            val diaryJob = async { diaryRepo.getDiaryFeed(id, yearId) }
            val subjectsJob = async { diaryRepo.getSubjects() }

            _details.value = detailsJob.await()
            _diaryFeed.value = diaryJob.await()
            _subjects.value = subjectsJob.await()
            Log.d("ClassDetailVM", "✅ Loaded ${_diaryFeed.value.size} diary entries and ${_subjects.value.size} subjects for classId='$id'")
            _isLoading.value = false
        }
    }

    fun startPostDiary(subjectId: String? = null) {
        editingDiaryId.value = null
        postType.value = "homework"
        postSubjectId.value = subjectId ?: _subjects.value.firstOrNull()?._id
        postTitle.value = ""
        postDescription.value = ""
        postAttachments.value = emptyList()
    }

    fun startEditDiary(diary: DiaryDto) {
        editingDiaryId.value = diary._id
        postType.value = diary.type
        postSubjectId.value = diary.subjectId?._id ?: _subjects.value.firstOrNull()?._id
        postTitle.value = diary.title
        postDescription.value = diary.description
        postAttachments.value = diary.attachments
    }

    fun addAttachment(url: String) {
        val trimmed = url.trim()
        if (trimmed.isNotEmpty() && !postAttachments.value.contains(trimmed)) {
            postAttachments.value = postAttachments.value + trimmed
        }
    }

    fun removeAttachment(index: Int) {
        val current = postAttachments.value.toMutableList()
        if (index in current.indices) {
            current.removeAt(index)
            postAttachments.value = current
        }
    }

    val isUploadingImage = MutableStateFlow(false)

    fun uploadPhotoFromUri(context: android.content.Context, uri: android.net.Uri) {
        viewModelScope.launch {
            try {
                isUploadingImage.value = true
                val uploadResult = withContext(Dispatchers.IO) {
                    val cr = context.contentResolver
                    val mime = cr.getType(uri) ?: "image/jpeg"
                    val bytes = cr.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw Exception("Could not read image file")
                    val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                    val dataUri = "data:$mime;base64,$base64"
                    diaryRepo.uploadImage(dataUri, "diary_${System.currentTimeMillis()}.jpg")
                }

                uploadResult.onSuccess { url ->
                    addAttachment(url)
                    snackbarEvent.emit("📸 Photo attached successfully!")
                }.onFailure { err ->
                    snackbarEvent.emit("❌ Upload failed: ${err.message}")
                }
            } catch (e: Exception) {
                snackbarEvent.emit("❌ Error processing photo: ${e.message}")
            } finally {
                isUploadingImage.value = false
            }
        }
    }

    fun submitDiaryEntry(onSuccess: () -> Unit) {
        val title = postTitle.value.trim()
        val desc = postDescription.value.trim()
        val cId = _classId.value
        val yearId = AcademicYearManager.selectedYearId
        val editId = editingDiaryId.value
        val dateStr = selectedDiaryDate.value

        if (title.isEmpty() || cId.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Homework title/topic is required") }
            return
        }

        viewModelScope.launch {
            isPosting.value = true
            val res = if (editId != null) {
                val req = UpdateDiaryRequest(
                    title = title,
                    description = desc,
                    type = postType.value,
                    subjectId = postSubjectId.value?.ifBlank { null },
                    date = dateStr,
                    attachments = postAttachments.value
                )
                diaryRepo.updateDiaryEntry(editId, req)
            } else {
                val req = CreateDiaryRequest(
                    classId = cId,
                    subjectId = postSubjectId.value?.ifBlank { null },
                    academicYearId = yearId,
                    type = postType.value,
                    title = title,
                    description = desc,
                    date = dateStr,
                    attachments = postAttachments.value
                )
                diaryRepo.createDiaryEntry(req)
            }

            when (res) {
                is SaveResult.Success -> {
                    snackbarEvent.emit(if (editId != null) "✅ Diary entry updated successfully!" else "✅ Diary entry saved!")
                    editingDiaryId.value = null
                    postTitle.value = ""
                    postDescription.value = ""
                    postAttachments.value = emptyList()
                    onSuccess()
                    loadClassData(cId)
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
            isPosting.value = false
        }
    }

    fun deleteDiaryEntry(diaryId: String) {
        viewModelScope.launch {
            val res = diaryRepo.deleteDiaryEntry(diaryId)
            when (res) {
                is SaveResult.Success -> {
                    snackbarEvent.emit("🗑️ Diary entry deleted")
                    _diaryFeed.value = _diaryFeed.value.filter { it._id != diaryId }
                }
                is SaveResult.Error -> snackbarEvent.emit("❌ ${res.message}")
            }
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

    val isBroadcasting = MutableStateFlow(false)

    fun broadcastDailyDiary() {
        val cId = _classId.value
        if (cId.isEmpty()) {
            Log.w("ClassDetailVM", "⚠️ Cannot broadcast diary: _classId is empty!")
            return
        }
        val yearId = AcademicYearManager.selectedYearId
        Log.d("ClassDetailVM", "📢 broadcastDailyDiary() triggered for classId='$cId', yearId='$yearId'")
        viewModelScope.launch {
            isBroadcasting.value = true
            try {
                val payload = BroadcastDiaryRequest(classId = cId, academicYearId = yearId)
                Log.d("ClassDetailVM", "📡 Sending POST /api/diary/broadcast payload: classId=${payload.classId}, academicYearId=${payload.academicYearId}")
                val res = ApiClient.getApiService(getApplication<Application>().applicationContext).broadcastDailyDiary(payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    val msg = res.body()?.message ?: "Daily diary broadcasted to parents!"
                    Log.d("ClassDetailVM", "🎉 Broadcast succeeded: HTTP ${res.code()} - $msg")
                    snackbarEvent.emit("📢 $msg")
                    loadClassData(cId)
                } else {
                    val errBody = res.errorBody()?.string()
                    Log.e("ClassDetailVM", "❌ Broadcast failed: HTTP ${res.code()} - $errBody")
                    val parsedMsg = try {
                        val obj = org.json.JSONObject(errBody ?: "")
                        obj.optString("message", "Failed to broadcast diary")
                    } catch (_: Exception) {
                        "Failed to broadcast diary"
                    }
                    snackbarEvent.emit("❌ $parsedMsg")
                }
            } catch (e: Exception) {
                Log.e("ClassDetailVM", "❌ Broadcast exception: ${e.message}", e)
                snackbarEvent.emit("❌ Error: ${e.message}")
            } finally {
                isBroadcasting.value = false
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

