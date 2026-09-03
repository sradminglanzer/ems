package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.*
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

    // ── Student Identity & Demographics ────────────────────────────────────────
    val firstName          = MutableStateFlow("")
    val middleName         = MutableStateFlow("")
    val lastName           = MutableStateFlow("")
    val knownId            = MutableStateFlow("")
    val admissionNo        = MutableStateFlow("")
    val rollNo             = MutableStateFlow("")
    val apaarId            = MutableStateFlow("")
    val aadhaarNo          = MutableStateFlow("")
    val dob                = MutableStateFlow("")   // "YYYY-MM-DD"
    val gender             = MutableStateFlow("male") // "male" | "female" | "other"
    val placeOfBirth       = MutableStateFlow("")
    val nationality        = MutableStateFlow("Indian")
    val motherTongue       = MutableStateFlow("")
    val religion           = MutableStateFlow("Hindu")
    val casteCategory      = MutableStateFlow("General") // "General" | "OBC" | "SC" | "ST" | "EWS"
    val subCaste           = MutableStateFlow("")
    val bloodGroup         = MutableStateFlow("O+")
    val medicalNotes       = MutableStateFlow("")
    val identificationMarks= MutableStateFlow("")

    // ── Contacts ───────────────────────────────────────────────────────────────
    val contact            = MutableStateFlow("")
    val altContact         = MutableStateFlow("")
    val email              = MutableStateFlow("")
    val joiningDate        = MutableStateFlow("")

    // ── Parents & Guardian Details ─────────────────────────────────────────────
    val fatherName         = MutableStateFlow("")
    val fatherAadhaar      = MutableStateFlow("")
    val fatherQualification= MutableStateFlow("")
    val fatherOccupation   = MutableStateFlow("")
    val fatherIncome       = MutableStateFlow("")
    val fatherPhone        = MutableStateFlow("")
    val fatherEmail        = MutableStateFlow("")

    val motherName         = MutableStateFlow("")
    val motherAadhaar      = MutableStateFlow("")
    val motherQualification= MutableStateFlow("")
    val motherOccupation   = MutableStateFlow("")
    val motherIncome       = MutableStateFlow("")
    val motherPhone        = MutableStateFlow("")
    val motherEmail        = MutableStateFlow("")

    val guardianName       = MutableStateFlow("")
    val guardianRelation   = MutableStateFlow("")
    val guardianPhone      = MutableStateFlow("")
    val guardianAddress    = MutableStateFlow("")

    // ── Addresses & Emergency ──────────────────────────────────────────────────
    val presentAddress     = MutableStateFlow("")
    val permanentAddress   = MutableStateFlow("")
    val sameAddress        = MutableStateFlow(true)
    val city               = MutableStateFlow("")
    val district           = MutableStateFlow("")
    val state              = MutableStateFlow("")
    val pincode            = MutableStateFlow("")
    val emergencyName      = MutableStateFlow("")
    val emergencyPhone     = MutableStateFlow("")
    val emergencyRelation  = MutableStateFlow("")

    // ── Previous Academic History ──────────────────────────────────────────────
    val previousSchoolName = MutableStateFlow("")
    val previousBoard      = MutableStateFlow("")
    val previousClassPassed= MutableStateFlow("")
    val tcNumber           = MutableStateFlow("")
    val tcDate             = MutableStateFlow("")
    val previousPercentage = MutableStateFlow("")

    // ── Fee Plans & Concessions ────────────────────────────────────────────────
    val feeGroupId         = MutableStateFlow<String?>(null)
    val isGroupLocked      = MutableStateFlow(false)
    val primaryStructures  = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val selectedPlanId     = MutableStateFlow<String?>(null)
    val addonStructures    = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    val addonFeeIds        = MutableStateFlow<List<String>>(emptyList())

    val concessionType     = MutableStateFlow("none") // "none" | "sibling" | "staff" | "merit" | "custom"
    val concessionValue    = MutableStateFlow("")
    val concessionReason   = MutableStateFlow("")

    // ── Initial payment (for PG/Gym) ───────────────────────────────────────────
    val posAmount          = MutableStateFlow("")
    val posPaymentMethod   = MutableStateFlow("cash")
    val posPaymentDateStr  = MutableStateFlow(fmt.format(Date()))
    val posNextDateStr     = MutableStateFlow("")

    // ── Documents & Certificates ──────────────────────────────────────────────
    val documents          = MutableStateFlow<List<MemberDocumentDto>>(emptyList())

    fun addDocument(title: String, url: String, docType: String) {
        val current = documents.value.toMutableList()
        current.add(MemberDocumentDto(title = title.trim(), url = url.trim(), docType = docType, uploadedAt = fmt.format(Date())))
        documents.value = current
    }

    fun removeDocument(index: Int) {
        val current = documents.value.toMutableList()
        if (index in current.indices) {
            current.removeAt(index)
            documents.value = current
        }
    }

    // ── Loaded data ────────────────────────────────────────────────────────────
    val feeGroups          = MutableStateFlow<List<FeeGroupDto>>(emptyList())
    val isLoadingData      = MutableStateFlow(false)
    val isSubmitting       = MutableStateFlow(false)
    val saveResult         = MutableSharedFlow<SaveResult>()

    private var _initialized       = false
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

    private fun autoComputeNextDate(params: AutoComputeParams): String? {
        if (params.payDate.isBlank()) return null
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
        if (!feeGroupIdParam.isNullOrEmpty()) {
            feeGroupId.value = feeGroupIdParam
            isGroupLocked.value = true
        }
        loadFeeData(feeGroupIdParam)
        if (editMemberId != null) loadMember(editMemberId)
    }

    private fun loadFeeData(fixedGroupId: String?) {
        viewModelScope.launch {
            isLoadingData.value = true
            coroutineScope {
                val yearId = AcademicYearManager.selectedYearId
                val groupsJob  = async { repository.getFeeGroups() }
                val structsJob = async { repository.getFeeStructures() }
                val allStructs = structsJob.await()
                feeGroups.value = groupsJob.await()

                val primaries = allStructs.filter { !it.isAddon }
                val addons    = allStructs.filter { it.isAddon }

                primaryStructures.value = primaries
                addonStructures.value   = addons

                if (selectedPlanId.value == null && primaries.isNotEmpty() && !isEditing) {
                    if (!fixedGroupId.isNullOrEmpty()) {
                        autoMatchRoomRent(fixedGroupId)
                    } else {
                        selectedPlanId.value = primaries.first()._id
                        updatePosAmount(selectedPlanId.value, addonFeeIds.value)
                    }
                }
            }
            isLoadingData.value = false
        }
    }

    private fun loadMember(id: String) {
        viewModelScope.launch {
            val m = repository.getMember(id) ?: return@launch
            firstName.value           = m.firstName
            middleName.value          = m.middleName ?: ""
            lastName.value            = m.lastName
            knownId.value             = m.knownId ?: ""
            admissionNo.value         = m.admissionNo ?: m.knownId ?: ""
            rollNo.value              = m.rollNo ?: ""
            apaarId.value             = m.apaarId ?: ""
            aadhaarNo.value           = m.aadhaarNo ?: ""
            dob.value                 = m.dob ?: ""
            gender.value              = m.gender ?: "male"
            placeOfBirth.value        = m.placeOfBirth ?: ""
            nationality.value         = m.nationality ?: "Indian"
            motherTongue.value        = m.motherTongue ?: ""
            religion.value            = m.religion ?: "Hindu"
            casteCategory.value       = m.casteCategory ?: "General"
            subCaste.value            = m.subCaste ?: ""
            bloodGroup.value          = m.bloodGroup ?: "O+"
            medicalNotes.value        = m.medicalNotes ?: ""
            identificationMarks.value = m.identificationMarks ?: ""

            contact.value             = m.contact ?: ""
            altContact.value          = m.altContact ?: ""
            email.value               = m.email ?: ""
            joiningDate.value         = m.joiningDate?.take(10) ?: ""

            fatherName.value          = m.fatherName ?: ""
            fatherAadhaar.value       = m.fatherAadhaar ?: ""
            fatherQualification.value = m.fatherQualification ?: ""
            fatherOccupation.value    = m.fatherOccupation ?: ""
            fatherIncome.value        = m.fatherIncome ?: ""
            fatherPhone.value         = m.fatherPhone ?: ""
            fatherEmail.value         = m.fatherEmail ?: ""

            motherName.value          = m.motherName ?: ""
            motherAadhaar.value       = m.motherAadhaar ?: ""
            motherQualification.value = m.motherQualification ?: ""
            motherOccupation.value    = m.motherOccupation ?: ""
            motherIncome.value        = m.motherIncome ?: ""
            motherPhone.value         = m.motherPhone ?: ""
            motherEmail.value         = m.motherEmail ?: ""

            guardianName.value        = m.guardianName ?: ""
            guardianRelation.value    = m.guardianRelation ?: ""
            guardianPhone.value       = m.guardianPhone ?: ""
            guardianAddress.value     = m.guardianAddress ?: ""

            presentAddress.value      = m.presentAddress ?: m.address ?: ""
            permanentAddress.value    = m.permanentAddress ?: ""
            sameAddress.value         = (m.permanentAddress.isNullOrBlank() || m.permanentAddress == m.presentAddress)
            city.value                = m.city ?: ""
            district.value            = m.district ?: ""
            state.value               = m.state ?: ""
            pincode.value             = m.pincode ?: ""
            emergencyName.value       = m.emergencyContactName ?: ""
            emergencyPhone.value      = m.emergencyContactPhone ?: ""
            emergencyRelation.value   = m.emergencyContactRelation ?: ""

            previousSchoolName.value  = m.previousSchoolName ?: ""
            previousBoard.value       = m.previousBoard ?: ""
            previousClassPassed.value = m.previousClassPassed ?: ""
            tcNumber.value            = m.tcNumber ?: ""
            tcDate.value              = m.tcDate ?: ""
            previousPercentage.value  = m.previousPercentage ?: ""

            feeGroupId.value          = m.feeGroupId
            selectedPlanId.value      = m.feeStructureId
            addonFeeIds.value         = m.addonFeeIds ?: emptyList()
            concessionType.value      = m.concessionType ?: "none"
            concessionValue.value     = m.concessionValue?.toString() ?: ""
            concessionReason.value    = m.concessionReason ?: ""
            documents.value           = m.documents ?: emptyList()
        }
    }

    fun onGroupSelected(groupId: String?) {
        if (isGroupLocked.value) return
        feeGroupId.value = groupId
        if (groupId != null) {
            autoMatchRoomRent(groupId)
        }
    }

    private fun autoMatchRoomRent(roomId: String) {
        val roomDoc = feeGroups.value.firstOrNull { it._id == roomId }
        val roomCap = roomDoc?.capacity ?: 1
        val matchedPlan = primaryStructures.value.firstOrNull { it.feeGroupId == roomId || it.feeGroupIds?.contains(roomId) == true }
            ?: primaryStructures.value.firstOrNull { it.name.contains("$roomCap", ignoreCase = true) }
            ?: primaryStructures.value.firstOrNull()

        if (matchedPlan != null) {
            selectedPlanId.value = matchedPlan._id
        }
        updatePosAmount(selectedPlanId.value, addonFeeIds.value)
    }

    fun selectPrimaryPlan(id: String?) {
        _userOverrodeNextDate = false
        selectedPlanId.value = id
        updatePosAmount(id, addonFeeIds.value)
    }

    fun toggleAddon(id: String) {
        _userOverrodeNextDate = false
        val curr = addonFeeIds.value
        val newAddons = if (id in curr) curr - id else curr + id
        addonFeeIds.value = newAddons
        updatePosAmount(selectedPlanId.value, newAddons)
    }

    private fun updatePosAmount(planId: String?, addons: List<String>) {
        val primaryPlan = primaryStructures.value.firstOrNull { it._id == planId }
        val primaryAmt  = primaryPlan?.amount ?: 0.0
        val addonsAmt   = addonStructures.value.filter { it._id in addons }.sumOf { it.amount }
        val totalAmt    = primaryAmt + addonsAmt
        posAmount.value = if (totalAmt > 0) totalAmt.toInt().toString() else ""

        if (!_userOverrodeNextDate) {
            val nextDate = autoComputeNextDate(
                AutoComputeParams(
                    payDate      = posPaymentDateStr.value,
                    planId       = planId,
                    addons       = addons,
                    primaries    = primaryStructures.value,
                    addonStructs = addonStructures.value
                )
            )
            if (nextDate != null) {
                posNextDateStr.value = nextDate
            }
        }
    }

    fun submit(session: UserSession?) {
        val fn         = firstName.value.trim()
        val ln         = lastName.value.trim()
        val isSchool   = session?.isSchool ?: true
        val isBusiness = session?.isBusinessMode ?: true

        if (fn.isEmpty() || ln.isEmpty()) {
            viewModelScope.launch { saveResult.emit(SaveResult.Error("First Name and Last Name are required")) }
            return
        }

        val admNo = admissionNo.value.trim()
        val kid = if (admNo.isNotEmpty()) admNo else knownId.value.trim().ifEmpty {
            if (isBusiness) "TEN-${System.currentTimeMillis().toString().takeLast(6)}" else "STU-${System.currentTimeMillis().toString().takeLast(6)}"
        }

        viewModelScope.launch {
            isSubmitting.value = true
            val yearId = AcademicYearManager.selectedYearId
            val finalPermAddress = if (sameAddress.value) presentAddress.value.trim() else permanentAddress.value.trim()

            val request = CreateMemberRequest(
                firstName                = fn,
                middleName               = middleName.value.trim().ifEmpty { null },
                lastName                 = ln,
                knownId                  = kid.ifEmpty { null },
                admissionNo              = admNo.ifEmpty { kid },
                rollNo                   = rollNo.value.trim().ifEmpty { null },
                apaarId                  = apaarId.value.trim().ifEmpty { null },
                aadhaarNo                = aadhaarNo.value.trim().ifEmpty { null },
                dob                      = dob.value.trim().ifEmpty { null },
                gender                   = gender.value,
                placeOfBirth             = placeOfBirth.value.trim().ifEmpty { null },
                nationality              = nationality.value.trim().ifEmpty { "Indian" },
                motherTongue             = motherTongue.value.trim().ifEmpty { null },
                religion                 = religion.value,
                casteCategory            = casteCategory.value,
                subCaste                 = subCaste.value.trim().ifEmpty { null },
                bloodGroup               = bloodGroup.value,
                medicalNotes             = medicalNotes.value.trim().ifEmpty { null },
                identificationMarks      = identificationMarks.value.trim().ifEmpty { null },

                contact                  = contact.value.trim().ifEmpty { fatherPhone.value.trim().ifEmpty { null } },
                altContact               = altContact.value.trim().ifEmpty { motherPhone.value.trim().ifEmpty { null } },
                email                    = email.value.trim().ifEmpty { null },
                joiningDate              = joiningDate.value.trim().ifEmpty { null },

                fatherName               = fatherName.value.trim().ifEmpty { null },
                fatherAadhaar            = fatherAadhaar.value.trim().ifEmpty { null },
                fatherQualification      = fatherQualification.value.trim().ifEmpty { null },
                fatherOccupation         = fatherOccupation.value.trim().ifEmpty { null },
                fatherIncome             = fatherIncome.value.trim().ifEmpty { null },
                fatherPhone              = fatherPhone.value.trim().ifEmpty { null },
                fatherEmail              = fatherEmail.value.trim().ifEmpty { null },

                motherName               = motherName.value.trim().ifEmpty { null },
                motherAadhaar            = motherAadhaar.value.trim().ifEmpty { null },
                motherQualification      = motherQualification.value.trim().ifEmpty { null },
                motherOccupation         = motherOccupation.value.trim().ifEmpty { null },
                motherIncome             = motherIncome.value.trim().ifEmpty { null },
                motherPhone              = motherPhone.value.trim().ifEmpty { null },
                motherEmail              = motherEmail.value.trim().ifEmpty { null },

                guardianName             = guardianName.value.trim().ifEmpty { null },
                guardianRelation         = guardianRelation.value.trim().ifEmpty { null },
                guardianPhone            = guardianPhone.value.trim().ifEmpty { null },
                guardianAddress          = guardianAddress.value.trim().ifEmpty { null },

                address                  = presentAddress.value.trim().ifEmpty { null },
                presentAddress           = presentAddress.value.trim().ifEmpty { null },
                permanentAddress         = finalPermAddress.ifEmpty { null },
                city                     = city.value.trim().ifEmpty { null },
                district                 = district.value.trim().ifEmpty { null },
                state                    = state.value.trim().ifEmpty { null },
                pincode                  = pincode.value.trim().ifEmpty { null },
                emergencyContactName     = emergencyName.value.trim().ifEmpty { null },
                emergencyContactPhone    = emergencyPhone.value.trim().ifEmpty { null },
                emergencyContactRelation = emergencyRelation.value.trim().ifEmpty { null },

                previousSchoolName       = previousSchoolName.value.trim().ifEmpty { null },
                previousBoard            = previousBoard.value.trim().ifEmpty { null },
                previousClassPassed      = previousClassPassed.value.trim().ifEmpty { null },
                tcNumber                 = tcNumber.value.trim().ifEmpty { null },
                tcDate                   = tcDate.value.trim().ifEmpty { null },
                previousPercentage       = previousPercentage.value.trim().ifEmpty { null },

                feeGroupId               = feeGroupId.value,
                feeStructureId           = selectedPlanId.value,
                addonFeeIds              = addonFeeIds.value.ifEmpty { null },
                concessionType           = concessionType.value.ifEmpty { null },
                concessionValue          = concessionValue.value.toDoubleOrNull(),
                concessionReason         = concessionReason.value.trim().ifEmpty { null },
                documents                = documents.value,
                academicYearId           = yearId,

                initialPayment           = if (isBusiness && !isEditing) {
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
