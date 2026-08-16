package com.srgs.ems.data.repository

import android.content.Context
import com.google.gson.JsonElement
import com.srgs.ems.data.api.*

// ── Top-level domain models (importable from any screen) ─────────────────────
data class AttendanceRecord(
    val memberId: String,
    val firstName: String  = "Student",
    val lastName: String   = "",
    val knownId: String?   = null,
    val status: String     = "present",   // "present" | "absent" | "late"
    val remarks: String?   = null
)

data class AttendanceSheet(
    val isNew: Boolean,
    val records: List<AttendanceRecord>
)

class AttendanceRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    // ── Public API ─────────────────────────────────────────────────────────────
    suspend fun getFeeGroups(): List<FeeGroupDto> {
        return try {
            val r = api.getFeeGroups()
            if (r.isSuccessful) r.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun getAttendance(classId: String, date: String, academicYearId: String? = null): AttendanceSheet? {
        return try {
            val r = api.getAttendance(classId, date, academicYearId)
            if (r.isSuccessful) {
                val body = r.body()!!
                val mapped = body.records.map { mapRecord(it) }
                    .sortedBy { it.firstName }
                AttendanceSheet(body.isNew, mapped)
            } else null
        } catch (_: Exception) { null }
    }

    suspend fun saveAttendance(
        classId: String,
        date: String,
        academicYearId: String?,
        records: List<AttendanceRecord>
    ): Boolean {
        return try {
            val r = api.saveAttendance(
                SaveAttendanceRequest(
                    classId = classId,
                    date = date,
                    academicYearId = academicYearId,
                    records = records.map { AttendanceRecordPayload(it.memberId, it.status, it.remarks) }
                )
            )
            r.isSuccessful
        } catch (_: Exception) { false }
    }

    // ── Map server record (memberId can be a nested object or plain string) ────
    private fun mapRecord(raw: AttendanceRecordRaw): AttendanceRecord {
        val elem: JsonElement = raw.memberIdRaw
        return if (elem.isJsonObject) {
            val obj = elem.asJsonObject
            AttendanceRecord(
                memberId  = obj.get("_id")?.asString ?: "",
                firstName = obj.get("firstName")?.asString ?: "Student",
                lastName  = obj.get("lastName")?.asString ?: "",
                knownId   = obj.get("knownId")?.asString,
                status    = raw.status,
                remarks   = raw.remarks
            )
        } else {
            AttendanceRecord(
                memberId = try { elem.asString } catch (_: Exception) { "" },
                status   = raw.status,
                remarks  = raw.remarks
            )
        }
    }
}
