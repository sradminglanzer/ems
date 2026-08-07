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

    // Primary Membership Plans (!isAddon) — Single Selection
    val primaryStructures = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val selectedPlanId    = MutableStateFlow<String?>(null)

    // Add-on Fee Structures (isAddon) — Multiple Selection
    val addonStructures   = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val addonFeeIds       = MutableStateFlow<List<String>>(emptyList())

    // ── Initial payment (gym new member) ──────────────────────────────────────
    val posAmount         = MutableStateFlow("")
    val posPaymentMethod  = MutableStateFlow("cash")
    val posPaymentDateStr = MutableStateFlow(fmt.format(Date()))
    val posNextDateStr    = MutableStateFlow("")

    // ── Loaded data ────────────────────────────────────────────────────────────
    val feeGroups         = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val isLoadingData     = MutableStateFlow(false)
    val isSubmitting      = MutableStateFlow(false)

    val saveResult        = MutableSharedFlow<SaveResult>()

    private var _initialized    = false
    private var memberIdToEdit: String? = null
    val isEditing get() = memberIdToEdit != null

    private var _userOverrodeNextDate = false

    init {
        viewModelScope.launch {
            combine(
                posPaymentDateStr,
                selectedPlanId,
                addonFeeIds,
                primaryStructures,
                addonStructures
            ) { payDate, planId, addons, primaries, addonStructs ->
                AutoComputeParams(payDate, planId, addons, primaries, addonStructs)
            }.collect { params ->
                if (_userOverrodeNextDate) return@collect
                val computed = autoComputeNextDate(params)
                if (computed != null) posNextDateStr.value = computed
            }
        }
    }

    private data class AutoComputeParams(
        val payDate: String,
        val planId: String?,
        val addons: List<String>,
        val primaries: List<FeeStructureDto>,
        val addonStructs: List<FeeStructureDto>
    )

    fun onNextDateManuallyChanged(value: String) {
        _userOverrodeNextDate = true
        posNextDateStr.value = value
    }

    fun onPaymentDateChanged(value: String) {
        _userOverrodeNextDate = false
        posPaymentDateStr.value = value
    }

    /**
     * Determines billing frequency primarily from the selected primary plan,
     * or falls back to selected add-ons / first available plan.
     */
    private fun autoComputeNextDate(params: AutoComputeParams): String? {
        if (params.payDate.isBlank()) return null

        // 1. Primary plan frequency
        val primaryPlan = params.primaries.firstOrNull { it._id == params.planId }
        val frequency = primaryPlan?.frequency
            ?: params.addonStructs.firstOrNull { it._id in params.addons }?.frequency
            ?: params.primaries.firstOrNull()?.frequency
            ?: return null

        val base = try { fmt.parse(params.payDate) ?: return null } catch (_: Exception) { return null }

        val cal = Calendar.getInstance().apply { time = base }
        when (frequency) {
            "daily"       -> cal.add(Calendar.DAY_OF_MONTH, 1)
            "weekly"      -> cal.add(Calendar.DAY_OF_MONTH, 7)
            "monthly"     -> cal.add(Calendar.DAY_OF_MONTH, 30)
            "quarterly"   -> cal.add(Calendar.DAY_OF_MONTH, 90)
            "half-yearly" -> cal.add(Calendar.DAY_OF_MONTH, 180)
            "annual"      -> cal.add(Calendar.YEAR, 1)
            "one-time"    -> return null
            else          -> cal.add(Calendar.DAY_OF_MONTH, 30)
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
                val groupsJob  = async { repository.getFeeGroups() }
                val structsJob = async { repository.getFeeStructures() }
                val allStructs = structsJob.await()
                feeGroups.value = groupsJob.await()

                primaryStructures.value = allStructs.filter { !it.isAddon }
                addonStructures.value   = allStructs.filter { it.isAddon }

                // Auto-select first primary plan if none selected
                if (selectedPlanId.value == null && primaryStructures.value.isNotEmpty()) {
                    selectedPlanId.value = primaryStructures.value.first()._id
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
            
            val mAddons = m.addonFeeIds ?: emptyList()
            val primaryMatch = primaryStructures.value.firstOrNull { it._id in mAddons }
            if (primaryMatch != null) {
                selectedPlanId.value = primaryMatch._id
                addonFeeIds.value = mAddons - primaryMatch._id
            } else {
                addonFeeIds.value = mAddons
            }
        }
    }

    fun selectPrimaryPlan(id: String?) {
        _userOverrodeNextDate = false
        selectedPlanId.value = id
    }

    fun toggleAddon(id: String) {
        _userOverrodeNextDate = false
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

        val combinedFeeIds = (listOfNotNull(selectedPlanId.value) + addonFeeIds.value).distinct()

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
                addonFeeIds      = combinedFeeIds.ifEmpty { null },
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
