package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.*

/** Lightweight input model passed from ViewModel to repository */
data class CollectFeeItem(
    val feeStructureId: String,
    val feeGroupId: String?,
    val amount: Double,
    val nextDateStr: String?,
    val notes: String?        = null,
    val paymentMethod: String = "cash"
)

data class CollectResult(
    val success: Boolean,
    val receiptNo: String? = null,
    val totalAmount: Double = 0.0,
    val message: String? = null
)

class MemberDetailRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getMember(id: String): MemberDetailDto? {
        return try {
            val r = api.getMemberDetail(id)
            if (r.isSuccessful) r.body() else null
        } catch (_: Exception) { null }
    }

    suspend fun getPayments(memberId: String): List<FeePaymentDto> {
        return try {
            val r = api.getFeePayments(memberId)
            if (r.isSuccessful) r.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getFeeGroups(): List<FeeGroupDto> {
        return try {
            val r = api.getFeeGroups()
            if (r.isSuccessful) r.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getFeeStructures(): List<FeeStructureDto> {
        return try {
            val r = api.getFeeStructures()
            if (r.isSuccessful) r.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun collectFee(
        memberId: String,
        items: List<CollectFeeItem>,
        activeAddonFeeIds: List<String> = emptyList(),
        newFeeGroupId: String? = null,
        newFeeStructureId: String? = null
    ): CollectResult {
        return try {
            if (activeAddonFeeIds.isNotEmpty() || !newFeeGroupId.isNullOrEmpty() || !newFeeStructureId.isNullOrEmpty()) {
                try {
                    api.updateMemberFeeDetails(memberId, UpdateMemberFeeDetailsRequest(
                        feeGroupId     = newFeeGroupId,
                        feeStructureId = newFeeStructureId,
                        addonFeeIds    = activeAddonFeeIds.ifEmpty { null }
                    ))
                } catch (_: Exception) {}
            }

            val request = CollectFeeRequest(
                payments = items.map { item ->
                    FeePaymentItemDto(
                        memberId        = memberId,
                        feeStructureId  = item.feeStructureId,
                        feeGroupId      = item.feeGroupId,
                        amount          = item.amount,
                        notes           = item.notes?.ifEmpty { null },
                        paymentMethod   = item.paymentMethod,
                        nextPaymentDate = item.nextDateStr?.ifEmpty { null }
                    )
                }
            )
            val r = api.collectFee(request)
            if (r.isSuccessful) {
                CollectResult(
                    success     = true,
                    receiptNo   = r.body()?.firstOrNull()?.receiptNo,
                    totalAmount = items.sumOf { it.amount }
                )
            } else CollectResult(false, message = "Server error ${r.code()}")
        } catch (e: Exception) {
            CollectResult(false, message = e.message ?: "Unknown error")
        }
    }

    suspend fun holdMember(id: String): Boolean {
        return try { api.holdMember(id).isSuccessful } catch (_: Exception) { false }
    }

    suspend fun resumeMember(id: String): Boolean {
        return try { api.resumeMember(id).isSuccessful } catch (_: Exception) { false }
    }

    suspend fun deleteMember(id: String): Boolean {
        return try { api.deleteMember(id).isSuccessful } catch (_: Exception) { false }
    }
}
