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
import java.text.SimpleDateFormat
import java.util.*

class AddMemberViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AddMemberRepository(application.applicationContext)
    private val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)

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
    val posPaymentMethod  = MutableStateFlow("cash")
    // Default payment date to today
    val posPaymentDateStr = MutableStateFlow(fmt.format(Date()))
    // posNextDateStr is auto-computed but the user can still override it manually
    val posNextDateStr    = MutableStateFlow("")

    // ── Loaded data ────────────────────────────────────────────────────────────
    val feeGroups         = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val globalStructures  = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val isLoadingData     = MutableStateFlow(false)
    val isSubmitting      = MutableStateFlow(false)

    val saveResult        = MutableSharedFlow<SaveResult>()

    private var _initialized    = false
    private var memberIdToEdit: String? = null
    val isEditing get() = memberIdToEdit != null

    // ── Auto-compute next renewal date ────────────────────────────────────────
    // Watches payment date + selected addons + loaded structures.
    // When any change, finds the dominant frequency from selected plans and computes
    // paymentDate + N days.  User can still manually override after.
    private var _userOverrodeNextDate = false

    init {
        viewModelScope.launch {
            combine(posPaymentDateStr, addonFeeIds, globalStructures) { payDate, addons, structs ->
                Triple(payDate, addons, structs)
            }.collect { (payDate, addons, structs) ->
                if (_userOverrodeNextDate) return@collect  // respect manual override
                val computed = autoComputeNextDate(payDate, addons, structs)
                if (computed != null) posNextDateStr.value = computed
            }
        }
    }

    /** Called when the user explicitly taps a date on posNextDateStr — stops auto-compute. */
    fun onNextDateManuallyChanged(value: String) {
        _userOverrodeNextDate = true
        posNextDateStr.value = value
    }

    /** Changing the payment date resets the override so auto-compute resumes. */
    fun onPaymentDateChanged(value: String) {
        _userOverrodeNextDate = false
        posPaymentDateStr.value = value
    }

    /**
     * Determines the most-relevant billing frequency from the selected plans,
     * then returns paymentDate + the corresponding number of days.
     */
    private fun autoComputeNextDate(
        payDateStr: String,
        selectedAddonIds: List<String>,
        structs: List<FeeStructureDto>
    ): String? {
        if (payDateStr.isBlank()) return null

        // Find the frequency of any selected addon plan
        val selectedStructs = structs.filter { it._id in selectedAddonIds }
        val frequency = selectedStructs.firstOrNull()?.frequency
            ?: structs.firstOrNull()?.frequency  // fall back to first available plan
            ?: return null

        val base = try { fmt.parse(payDateStr) ?: return null } catch (_: Exception) { return null }

        val cal = Calendar.getInstance().apply { time = base }
        when (frequency) {
            "daily"       -> cal.add(Calendar.DAY_OF_MONTH, 1)
            "weekly"      -> cal.add(Calendar.DAY_OF_MONTH, 7)
            "monthly"     -> cal.add(Calendar.DAY_OF_MONTH, 30)
            "quarterly"   -> cal.add(Calendar.DAY_OF_MONTH, 90)
            "half-yearly" -> cal.add(Calendar.DAY_OF_MONTH, 180)
            "annual"      -> cal.add(Calendar.YEAR, 1)
            "one-time"    -> return null  // no renewal for one-time plans
            else          -> cal.add(Calendar.DAY_OF_MONTH, 30) // safe default
        }
        return fmt.format(cal.time)
    }

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
        _userOverrodeNextDate = false  // re-enable auto-compute when plan selection changes
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
                        amount             = amt,
                        paymentMethod      = posPaymentMethod.value,
                        paymentDateStr     = posPaymentDateStr.value.ifEmpty { null },
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
