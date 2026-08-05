package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.data.api.CreateMemberRequest
import com.srgs.ems.data.api.InitialPaymentDto
import com.srgs.ems.data.models.UserSession
import com.srgs.ems.data.repository.AddMemberRepository
import com.srgs.ems.data.repository.SaveResult
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class AddMemberViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AddMemberRepository(application.applicationContext)

    // ── Form fields ────────────────────────────────────────────────────────────
    val firstName         = MutableStateFlow("")
    val middleName        = MutableStateFlow("")
    val lastName          = MutableStateFlow("")
    val knownId           = MutableStateFlow("")
    val dob               = MutableStateFlow("")   // "YYYY-MM-DD"
    val joiningDate       = MutableStateFlow("")   // "YYYY-MM-DD" (optional)
    val contact           = MutableStateFlow("")
    val altContact        = MutableStateFlow("")
    val address           = MutableStateFlow("")
    val fatherOccupation  = MutableStateFlow("")
    val motherOccupation  = MutableStateFlow("")

    // ── Assignment ─────────────────────────────────────────────────────────────
    val feeGroupId        = MutableStateFlow<String?>(null)
    val addonFeeIds       = MutableStateFlow<List<String>>(emptyList())

    // ── Initial payment (gym new member) ──────────────────────────────────────
    val posAmount         = MutableStateFlow("")
    val posPaymentMethod  = MutableStateFlow("cash")  // "cash" | "online" | "card" | "upi"
    val posPaymentDateStr = MutableStateFlow("")       // "YYYY-MM-DD" — defaults to today
    val posNextDateStr    = MutableStateFlow("")       // "YYYY-MM-DD"

    // ── Loaded data ────────────────────────────────────────────────────────────
    val feeGroups         = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val globalStructures  = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val isLoadingData     = MutableStateFlow(false)
    val isSubmitting      = MutableStateFlow(false)

    val saveResult        = MutableSharedFlow<SaveResult>()

    private var _initialized    = false
    private var memberIdToEdit: String? = null
    val isEditing get() = memberIdToEdit != null

    fun initialize(editMemberId: String?, feeGroupIdParam: String?) {
        if (_initialized) return
        _initialized = true
        memberIdToEdit = editMemberId
        if (!feeGroupIdParam.isNullOrEmpty()) feeGroupId.value = feeGroupIdParam
        loadFeeData(feeGroupIdParam)
        if (editMemberId != null) loadMember(editMemberId)
    }

    private fun loadFeeData(fixedGroupId: String?) {
        viewModelScope.launch {
            isLoadingData.value = true
            coroutineScope {
                if (fixedGroupId.isNullOrEmpty()) {
                    val groupsJob  = async { repository.getFeeGroups() }
                    val structsJob = async { repository.getFeeStructures() }
                    feeGroups.value        = groupsJob.await()
                    globalStructures.value = structsJob.await().filter { it.feeGroupId == null }
                } else {
                    globalStructures.value = repository.getFeeStructures().filter { it.feeGroupId == null }
                }
            }
            isLoadingData.value = false
        }
    }

    private fun loadMember(id: String) {
        viewModelScope.launch {
            val m = repository.getMember(id) ?: return@launch
            firstName.value        = m.firstName
            middleName.value       = m.middleName ?: ""
            lastName.value         = m.lastName
            knownId.value          = m.knownId ?: ""
            dob.value              = m.dob?.take(10) ?: ""
            joiningDate.value      = m.joiningDate?.take(10) ?: ""
            contact.value          = m.contact ?: ""
            altContact.value       = m.altContact ?: ""
            address.value          = m.address ?: ""
            fatherOccupation.value = m.fatherOccupation ?: ""
            motherOccupation.value = m.motherOccupation ?: ""
            feeGroupId.value       = m.feeGroupId
            addonFeeIds.value      = m.addonFeeIds ?: emptyList()
        }
    }

    fun toggleAddon(id: String) {
        val curr = addonFeeIds.value
        addonFeeIds.value = if (id in curr) curr - id else curr + id
    }

    fun submit(session: UserSession?) {
        val fn    = firstName.value.trim()
        val ln    = lastName.value.trim()
        val isGym = session?.isGym ?: false

        if (fn.isEmpty() || ln.isEmpty()) {
            viewModelScope.launch { saveResult.emit(SaveResult.Error("First Name and Last Name are required")) }
            return
        }

        val kid = knownId.value.trim().ifEmpty {
            if (isGym) "GYM-${System.currentTimeMillis().toString().takeLast(6)}" else ""
        }

        if (!isGym && kid.isEmpty()) {
            viewModelScope.launch { saveResult.emit(SaveResult.Error("Roll / Student ID is required")) }
            return
        }

        viewModelScope.launch {
            isSubmitting.value = true
            val request = CreateMemberRequest(
                firstName        = fn,
                middleName       = middleName.value.trim().ifEmpty { null },
                lastName         = ln,
                knownId          = kid.ifEmpty { null },
                contact          = contact.value.trim().ifEmpty { null },
                altContact       = altContact.value.trim().ifEmpty { null },
                dob              = dob.value.trim().ifEmpty { null },
                joiningDate      = joiningDate.value.trim().ifEmpty { null },
                address          = address.value.trim().ifEmpty { null },
                fatherOccupation = fatherOccupation.value.trim().ifEmpty { null },
                motherOccupation = motherOccupation.value.trim().ifEmpty { null },
                feeGroupId       = feeGroupId.value,
                addonFeeIds      = addonFeeIds.value.ifEmpty { null },
                initialPayment   = if (isGym && !isEditing) {
                    val amt = posAmount.value.toDoubleOrNull() ?: 0.0
                    if (amt > 0) InitialPaymentDto(
                        amount           = amt,
                        paymentMethod    = posPaymentMethod.value,
                        paymentDateStr   = posPaymentDateStr.value.ifEmpty { null },
                        nextPaymentDateStr = posNextDateStr.value.ifEmpty { null }
                    ) else null
                } else null
            )

            val result = if (isEditing) {
                repository.updateMember(memberIdToEdit!!, request)
            } else {
                repository.createMember(request)
            }
            saveResult.emit(result)
            isSubmitting.value = false
        }
    }
}
