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

    // Post / Edit Diary Form States
    val editingDiaryId = MutableStateFlow<String?>(null)
    val postType = MutableStateFlow("homework")
    val postSubjectId = MutableStateFlow<String?>(null)
    val postTitle = MutableStateFlow("")
    val postDescription = MutableStateFlow("")
    val postDueDate = MutableStateFlow(LocalDate.now().plusDays(1).toString())
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
        editingDiaryId.value = null
        postType.value = "homework"
        postSubjectId.value = _subjects.value.firstOrNull()?._id
        postTitle.value = ""
        postDescription.value = ""
        postDueDate.value = LocalDate.now().plusDays(1).toString()
        postAttachments.value = emptyList()
    }

    fun startEditDiary(diary: DiaryDto) {
        editingDiaryId.value = diary._id
        postType.value = diary.type
        postSubjectId.value = diary.subjectId?._id ?: _subjects.value.firstOrNull()?._id
        postTitle.value = diary.title
        postDescription.value = diary.description
        postDueDate.value = diary.dueDate?.take(10) ?: LocalDate.now().plusDays(1).toString()
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
                val inputStream = context.contentResolver.openInputStream(uri)
                val originalBitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
                inputStream?.close()

                if (originalBitmap == null) {
                    snackbarEvent.emit("❌ Failed to decode selected image")
                    isUploadingImage.value = false
                    return@launch
                }

                // Scale image down to max 1280px maintaining aspect ratio
                val maxDim = 1280
                val width = originalBitmap.width
                val height = originalBitmap.height
                val scaledBitmap = if (width > maxDim || height > maxDim) {
                    val ratio = width.toFloat() / height.toFloat()
                    val newW = if (ratio >= 1f) maxDim else (maxDim * ratio).toInt()
                    val newH = if (ratio >= 1f) (maxDim / ratio).toInt() else maxDim
                    android.graphics.Bitmap.createScaledBitmap(originalBitmap, newW, newH, true)
                } else {
                    originalBitmap
                }

                val baos = java.io.ByteArrayOutputStream()
                scaledBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, baos)
                val imageBytes = baos.toByteArray()
                val base64String = "data:image/jpeg;base64," + android.util.Base64.encodeToString(imageBytes, android.util.Base64.NO_WRAP)

                val uploadResult = diaryRepo.uploadImage(base64String, "diary_${System.currentTimeMillis()}.jpg")
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

        if (title.isEmpty() || desc.isEmpty() || cId.isEmpty()) {
            viewModelScope.launch { snackbarEvent.emit("Title and instructions are required") }
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
                    dueDate = if (postType.value == "homework" || postType.value == "test") postDueDate.value else null,
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
                    dueDate = if (postType.value == "homework" || postType.value == "test") postDueDate.value else null,
                    attachments = postAttachments.value
                )
                diaryRepo.createDiaryEntry(req)
            }

            when (res) {
                is SaveResult.Success -> {
                    snackbarEvent.emit(if (editId != null) "✅ Diary entry updated successfully!" else "✅ Diary entry posted successfully!")
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

    private inline fun <T> List<T>.findIndex(predicate: (T) -> Boolean): Int {
        for (i in indices) {
            if (predicate(this[i])) return i
        }
        return -1
    }
}
