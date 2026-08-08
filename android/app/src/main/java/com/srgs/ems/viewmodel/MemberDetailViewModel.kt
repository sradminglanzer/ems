package com.srgs.ems.viewmodel

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.data.api.FeePaymentDto
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.data.api.MemberDetailDto
import com.srgs.ems.data.repository.CollectFeeItem
import com.srgs.ems.data.repository.CollectResult
import com.srgs.ems.data.repository.MemberDetailRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

// ── Cart item state ────────────────────────────────────────────────────────────
data class CartItemState(
    val feeStructureId: String,
    val name: String,
    val defaultAmount: Double,
    val amount: String,
    val checked: Boolean,
    val nextDateStr: String,
    val frequency: String,
    val isAddon: Boolean,
    val groupName: String?
)

class MemberDetailViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = MemberDetailRepository(application.applicationContext)

    private val _member          = MutableStateFlow<MemberDetailDto?>(null)
    private val _payments        = MutableStateFlow<List<FeePaymentDto>>(emptyList())
    private val _feeStructures   = MutableStateFlow<List<FeeStructureDto>>(emptyList())
    private val _isLoading       = MutableStateFlow(true)
    private val _memberStatus    = MutableStateFlow("active")
    private val _isSaving        = MutableStateFlow(false)

    val member:        StateFlow<MemberDetailDto?>    = _member.asStateFlow()
    val payments:      StateFlow<List<FeePaymentDto>> = _payments.asStateFlow()
    val feeStructures: StateFlow<List<FeeStructureDto>> = _feeStructures.asStateFlow()
    val isLoading:     StateFlow<Boolean>             = _isLoading.asStateFlow()
    val memberStatus:  StateFlow<String>              = _memberStatus.asStateFlow()
    val isSaving:      StateFlow<Boolean>             = _isSaving.asStateFlow()

    val collectResult = MutableSharedFlow<CollectResult>()
    val holdResult    = MutableSharedFlow<Boolean>()
    val deleteResult  = MutableSharedFlow<Boolean>()

    /** Compose-observable cart — triggers recomposition on toggle/edit */
    var cartItems by mutableStateOf<List<CartItemState>>(emptyList())
        private set

    private var memberId: String = ""
    private var initialized = false

    fun initialize(id: String) {
        if (initialized && memberId == id) return
        initialized = true
        memberId    = id
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _isLoading.value = true
            coroutineScope {
                val memberJob     = async { repository.getMember(memberId) }
                val paymentsJob   = async { repository.getPayments(memberId) }
                val structuresJob = async { repository.getFeeStructures() }
                _member.value       = memberJob.await()
                _memberStatus.value = _member.value?.status ?: "active"
                _payments.value     = paymentsJob.await()
                _feeStructures.value = structuresJob.await()
            }
            _isLoading.value = false
        }
    }

    // ── Collect Fee cart ──────────────────────────────────────────────────────
    fun initCart() {
        val m          = _member.value ?: return
        val structures = _feeStructures.value
        val assignedIds = ((m.addonFeeIds ?: emptyList()) +
            structures.filter { it.feeGroupId != null && it.feeGroupId == m.feeGroupId }.map { it._id }
        ).toSet()

        cartItems = structures.map { s ->
            val lastPayment = _payments.value
                .filter { p -> p.feeStructureId == s._id }
                .maxByOrNull { p -> p.paymentDate }
            val grpName = when {
                s.isAddon              -> null
                s.groupDetails != null -> s.groupDetails.name
                else                   -> null
            }
            CartItemState(
                feeStructureId = s._id,
                name           = s.name,
                defaultAmount  = s.amount,
                amount         = s.amount.toInt().toString(),
                checked        = assignedIds.contains(s._id),
                nextDateStr    = calcNextDate(s.frequency, lastPayment?.paymentDate),
                frequency      = s.frequency,
                isAddon        = s.isAddon,
                groupName      = grpName
            )
        }
        notes         = ""
        paymentMethod = "cash"
        paymentDate   = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    fun toggleCartItem(id: String) {
        val item = cartItems.find { it.feeStructureId == id } ?: return
        if (!item.isAddon && !item.checked) {
            // Selecting a primary plan → uncheck all other primary plans (radio behavior)
            cartItems = cartItems.map {
                when {
                    it.feeStructureId == id -> it.copy(checked = true)
                    !it.isAddon             -> it.copy(checked = false)
                    else                    -> it
                }
            }
        } else {
            // Toggling an addon or unchecking the current primary
            cartItems = cartItems.map { if (it.feeStructureId == id) it.copy(checked = !it.checked) else it }
        }
    }

    fun updateCartAmount(id: String, amount: String) {
        cartItems = cartItems.map { if (it.feeStructureId == id) it.copy(amount = amount) else it }
    }

    fun updateNextDate(id: String, date: String) {
        cartItems = cartItems.map { if (it.feeStructureId == id) it.copy(nextDateStr = date) else it }
    }

    var notes by mutableStateOf("")
        private set
    var paymentMethod by mutableStateOf("cash")
        private set
    var paymentDate by mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
        private set

    fun updateNotes(v: String) { notes = v }
    fun updatePaymentMethod(m: String) { paymentMethod = m }
    fun updatePaymentDate(d: String) { paymentDate = d }

    /** Unconditionally select a primary plan (used from plan picker). */
    fun selectPrimaryPlan(planId: String) {
        cartItems = cartItems.map { item ->
            when {
                item.feeStructureId == planId && !item.isAddon -> item.copy(checked = true)
                !item.isAddon -> item.copy(checked = false)
                else          -> item
            }
        }
    }

    fun collectFee() {
        val pm    = paymentMethod
        val note  = notes
        val items = cartItems.filter { it.checked && (it.amount.toDoubleOrNull() ?: 0.0) > 0 }
        if (items.isEmpty()) return

        viewModelScope.launch {
            _isSaving.value = true
            val collectItems = items.map { item ->
                val struct = _feeStructures.value.find { it._id == item.feeStructureId }
                CollectFeeItem(
                    feeStructureId = item.feeStructureId,
                    feeGroupId     = struct?.feeGroupId,
                    amount         = item.amount.toDoubleOrNull() ?: item.defaultAmount,
                    nextDateStr    = item.nextDateStr.ifEmpty { null },
                    notes          = note.ifEmpty { null },
                    paymentMethod  = pm
                )
            }
            val result = repository.collectFee(memberId, collectItems)
            collectResult.emit(result)
            if (result.success) loadData()
            _isSaving.value = false
        }
    }

    // ── Hold / Resume ─────────────────────────────────────────────────────────
    fun holdMember() {
        viewModelScope.launch {
            val ok = repository.holdMember(memberId)
            if (ok) _memberStatus.value = "on_hold"
            holdResult.emit(ok)
        }
    }

    fun resumeMember() {
        viewModelScope.launch {
            val ok = repository.resumeMember(memberId)
            if (ok) { _memberStatus.value = "active"; loadData() }
            holdResult.emit(ok)
        }
    }

    fun deleteMember() {
        viewModelScope.launch {
            val ok = repository.deleteMember(memberId)
            deleteResult.emit(ok)
        }
    }

    // ── Date calculation ──────────────────────────────────────────────────────
    private fun calcNextDate(frequency: String, lastDateStr: String?): String {
        val cal = Calendar.getInstance()
        if (!lastDateStr.isNullOrEmpty()) {
            for (fmt in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd")) {
                try { cal.time = SimpleDateFormat(fmt, Locale.US).parse(lastDateStr)!!; break }
                catch (_: Exception) {}
            }
        }
        when (frequency) {
            "monthly"              -> cal.add(Calendar.MONTH, 1)
            "quarterly"            -> cal.add(Calendar.MONTH, 3)
            "half-yearly"          -> cal.add(Calendar.MONTH, 6)
            "annual", "yearly"     -> cal.add(Calendar.YEAR, 1)
            "weekly"               -> cal.add(Calendar.WEEK_OF_YEAR, 1)
            "daily"                -> cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
    }
}
