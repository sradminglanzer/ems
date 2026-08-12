package com.srgs.ems.data.api

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

// ── Retrofit interface ────────────────────────────────────────────────────────
interface ApiService {

    // ── Auth ──────────────────────────────────────────────────────────────────
    @POST("auth/login")
    suspend fun login(@Body request: LoginApiRequest): Response<LoginApiResponse>

    // ── Dashboard ─────────────────────────────────────────────────────────────
    @GET("dashboard/stats")
    suspend fun getDashboardStats(
        @Query("academicYearId") academicYearId: String? = null
    ): Response<DashboardStatsDto>

    // ── Members ───────────────────────────────────────────────────────────────
    @GET("members")
    suspend fun getMembers(): Response<List<MemberDto>>

    @GET("members/{id}")
    suspend fun getMemberDetail(@Path("id") id: String): Response<MemberDetailDto>

    @POST("members")
    suspend fun createMember(@Body request: CreateMemberRequest): Response<CreateMemberResponse>

    @PUT("members/{id}")
    suspend fun updateMember(@Path("id") id: String, @Body request: CreateMemberRequest): Response<Unit>

    @DELETE("members/{id}")
    suspend fun deleteMember(@Path("id") id: String): Response<Unit>

    @PUT("members/{id}/hold")
    suspend fun holdMember(@Path("id") id: String): Response<Unit>

    @PUT("members/{id}/resume")
    suspend fun resumeMember(@Path("id") id: String, @Body body: ResumeRequest = ResumeRequest()): Response<Unit>


    // ── Fee Payments ──────────────────────────────────────────────────────────
    @GET("fee-payments")
    suspend fun getFeePayments(
        @Query("memberId")      memberId: String,
        @Query("academicYearId") academicYearId: String? = null
    ): Response<List<FeePaymentDto>>

    @POST("fee-payments")
    suspend fun collectFee(@Body request: CollectFeeRequest): Response<List<FeePaymentResponseDto>>

    // ── Attendance ────────────────────────────────────────────────────────────
    @GET("attendance")
    suspend fun getAttendance(
        @Query("classId")        classId: String,
        @Query("date")           date: String,
        @Query("academicYearId") academicYearId: String? = null
    ): Response<AttendanceResponseDto>

    @POST("attendance")
    suspend fun saveAttendance(@Body request: SaveAttendanceRequest): Response<Unit>

    // ── Expenses ──────────────────────────────────────────────────────────────
    @GET("expenses")
    suspend fun getExpenses(
        @Query("startDate") startDate: String,
        @Query("endDate")   endDate: String,
        @Query("year")      year: Int,
        @Query("month")     month: Int
    ): Response<ExpenseResponseDto>

    @POST("expenses")
    suspend fun createExpense(@Body request: CreateExpenseRequest): Response<ExpenseDto>

    @PUT("expenses/{id}")
    suspend fun updateExpense(@Path("id") id: String, @Body request: CreateExpenseRequest): Response<ExpenseDto>

    @DELETE("expenses/{id}")
    suspend fun deleteExpense(@Path("id") id: String): Response<Unit>

    @PUT("expenses/{id}/confirm")
    suspend fun confirmExpense(@Path("id") id: String, @Body request: ConfirmExpenseRequest): Response<ExpenseDto>

    // ── Reports ───────────────────────────────────────────────────────────────
    @GET("dashboard/reports")
    suspend fun getReports(
        @Query("academicYearId") academicYearId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<ReportDataDto>

    @GET("dashboard/comprehensive-financials")
    suspend fun getComprehensiveFinancials(
        @Query("academicYearId") academicYearId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<ComprehensiveFinancialsDto>

    // ── Modular Reports ────────────────────────────────────────────────────────
    @GET("reports/summary")
    suspend fun getReportSummary(
        @Query("academicYearId") academicYearId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<ComprehensiveSummaryDto>

    @GET("reports/payments")
    suspend fun getPaymentHistoryReport(
        @Query("academicYearId") academicYearId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("paymentMethod") paymentMethod: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaymentHistoryReportResponseDto>

    @GET("reports/plans-breakdown")
    suspend fun getPlansBreakdownReport(
        @Query("academicYearId") academicYearId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<PlansBreakdownReportResponseDto>

    @GET("reports/expense-breakdown")
    suspend fun getExpenseBreakdownReport(
        @Query("academicYearId") academicYearId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<ExpenseBreakdownReportResponseDto>

    // ── Staff / Users ─────────────────────────────────────────────────────────
    @GET("users")
    suspend fun getStaff(): Response<List<StaffDto>>

    @POST("users")
    suspend fun createStaff(@Body request: CreateStaffRequest): Response<StaffDto>

    @DELETE("users/{id}")
    suspend fun deleteStaff(@Path("id") id: String): Response<Unit>

    // ── Fee Groups ──────────────────────────────────────────────────────────────
    @GET("fee-groups")
    suspend fun getFeeGroups(): Response<List<FeeGroupDto>>

    @POST("fee-groups")
    suspend fun createFeeGroup(@Body request: CreateFeeGroupRequest): Response<FeeGroupDto>

    // ── Fee Structures ───────────────────────────────────────────────────────────
    @GET("fee-structures")
    suspend fun getFeeStructures(): Response<List<FeeStructureDto>>

    @POST("fee-structures")
    suspend fun createFeeStructure(@Body request: CreateFeeStructureRequest): Response<FeeStructureDto>

    @DELETE("fee-structures/{id}")
    suspend fun deleteFeeStructure(@Path("id") id: String): Response<Unit>

    // ── Academic Years ───────────────────────────────────────────────────────────
    @GET("academic-years")
    suspend fun getAcademicYears(): Response<List<AcademicYearDto>>

    @POST("academic-years")
    suspend fun createAcademicYear(@Body request: CreateAcademicYearRequest): Response<AcademicYearDto>

    @PUT("academic-years/{id}")
    suspend fun setAcademicYearActive(@Path("id") id: String, @Body request: Map<String, Boolean>): Response<AcademicYearDto>

    // ── Settings ───────────────────────────────────────────────────────────────
    @PUT("fee-payments/sequence")
    suspend fun updateInvoiceSequence(@Body request: UpdateSequenceRequest): Response<Unit>

    // ── Subjects ──────────────────────────────────────────────────────────────
    @GET("subjects")
    suspend fun getSubjects(): Response<List<SubjectDto>>

    @POST("subjects")
    suspend fun createSubject(@Body request: CreateSubjectRequest): Response<SubjectDto>

    @DELETE("subjects/{id}")
    suspend fun deleteSubject(@Path("id") id: String): Response<Unit>

    // ── Exams ─────────────────────────────────────────────────────────────────
    @GET("exams")
    suspend fun getExams(
        @Query("academicYearId") academicYearId: String? = null
    ): Response<List<ExamDto>>

    @POST("exams")
    suspend fun createExam(@Body request: CreateExamRequest): Response<ExamDto>

    @GET("exams/{examId}/results")
    suspend fun getExamResults(
        @Path("examId") examId: String
    ): Response<List<ExamResultDto>>

    @POST("exams/{examId}/results")
    suspend fun addExamResults(
        @Path("examId") examId: String,
        @Body request: AddResultsRequest
    ): Response<Unit>

    @GET("exams/{examId}/rank-sheet")
    suspend fun getRankSheet(
        @Path("examId") examId: String
    ): Response<List<RankSheetEntryDto>>
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════════════════

data class LoginApiRequest(
    val contactNumber: String,
    val entityId: String? = null,
    val mpin: String? = null
)

data class LoginApiResponse(
    val token: String? = null,
    val user: UserDto? = null,
    val requiresSetup: Boolean = false,
    val requiresMpin: Boolean = false,
    val requiresEntitySelection: Boolean = false,
    val entities: List<EntityDto>? = null,
    val entity: EntityBrandingDto? = null,
    val message: String? = null
)

data class UserDto(
    @SerializedName("_id") val _id: String = "",
    val name: String          = "",
    val phone: String         = "",
    val role: String          = "",
    val entityId: String?     = null,
    val entityType: String?   = null,
    val entityName: String?   = null,
    val entityLogoUrl: String? = null
)

data class EntityDto(
    val id: String        = "",
    val name: String      = "",
    val logoUrl: String?  = null,
    val type: String?     = null
)

data class EntityBrandingDto(
    val id: String        = "",
    val name: String      = "",
    val logoUrl: String?  = null
)

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

data class DashboardStatsDto(
    val totalMembers: Int           = 0,
    val totalFeeGroups: Int         = 0,
    val totalFeeStructures: Int     = 0,
    val totalPendingAmount: Double  = 0.0,
    val collectionToday: Double     = 0.0,
    val collectionThisMonth: Double = 0.0,
    val collectionLastMonth: Double = 0.0,
    val expiringMembers: List<ExpiringMemberDto> = emptyList()
)

data class ExpiringMemberDto(
    @SerializedName("_id") val id: String = "",
    val firstName: String       = "",
    val lastName: String        = "",
    val contact: String?        = null,
    val nextPaymentDate: String = "",
    val isOverdue: Boolean      = false
)

// ═══════════════════════════════════════════════════════════════════════════════
//  MEMBERS — list view
// ═══════════════════════════════════════════════════════════════════════════════

data class MemberDto(
    @SerializedName("_id") val _id: String = "",
    val firstName: String         = "",
    val lastName: String          = "",
    val contact: String?          = null,
    val knownId: String?          = null,
    val status: String            = "active",
    val groupName: String?        = null,
    val addonNames: List<String>? = null,
    val pendingAmount: Double?    = null,
    val profilePicUrl: String?    = null,
    val nextPaymentDate: String?  = null
)

// ═══════════════════════════════════════════════════════════════════════════════
//  MEMBERS — full detail
// ═══════════════════════════════════════════════════════════════════════════════

data class MemberDetailDto(
    @SerializedName("_id") val _id: String = "",
    val firstName: String         = "",
    val middleName: String?       = null,
    val lastName: String          = "",
    val knownId: String?          = null,
    val contact: String?          = null,
    val altContact: String?       = null,
    val dob: String?              = null,
    val joiningDate: String?      = null,
    val address: String?          = null,
    val fatherOccupation: String? = null,
    val motherOccupation: String? = null,
    val profilePicUrl: String?    = null,
    val status: String            = "active",
    val feeGroupId: String?       = null,
    val groupName: String?        = null,
    val addonFeeIds: List<String>? = null,
    val addonNames: List<String>?  = null,
    val totalFee: Double           = 0.0,
    val pendingAmount: Double?     = null,
    val nextPaymentDate: String?   = null,
    val holdStartDate: String?     = null,
    val holdHistory: List<HoldHistoryDto>? = null
)

data class HoldHistoryDto(
    val holdDate: String   = "",
    val resumeDate: String = ""
)

// ── Create / Update member ───────────────────────────────────────────────────
data class CreateMemberRequest(
    val firstName: String,
    val middleName: String?       = null,
    val lastName: String,
    val knownId: String?          = null,
    val contact: String?          = null,
    val altContact: String?       = null,
    val dob: String?              = null,
    val joiningDate: String?      = null,
    val address: String?          = null,
    val fatherOccupation: String? = null,
    val motherOccupation: String? = null,
    val feeGroupId: String?       = null,
    val addonFeeIds: List<String>? = null,
    val profilePicUrl: String?    = null,
    val academicYearId: String?   = null,
    val initialPayment: InitialPaymentDto? = null
)

data class InitialPaymentDto(
    val amount: Double,
    val paymentMethod: String  = "cash",
    val paymentDateStr: String? = null,
    val nextPaymentDateStr: String? = null
)

data class CreateMemberResponse(
    @SerializedName("_id") val _id: String = "",
    val receiptNo: String? = null
)

data class ResumeRequest(val initialPayment: Any? = null)

// ═══════════════════════════════════════════════════════════════════════════════
//  FEE GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

data class FeeGroupDto(
    @SerializedName("_id") val _id: String = "",
    val name: String         = "",
    val description: String? = null
)

data class CreateFeeGroupRequest(
    val name: String,
    val description: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
//  FEE STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════

data class GroupDetailsDto(
    @SerializedName("_id") val _id: String = "",
    val name: String = ""
)

data class FeeStructureDto(
    @SerializedName("_id") val _id: String = "",
    val name: String = "",
    val amount: Double = 0.0,
    val frequency: String = "monthly",
    val feeGroupId: String? = null,
    val type: String = "FeeStructure", // "FeeStructure" | "FeeStructureAddon"
    val groupDetails: GroupDetailsDto? = null
) {
    val isAddon: Boolean get() = type == "FeeStructureAddon" || (feeGroupId == null && type.isBlank())
}

data class CreateFeeStructureRequest(
    val name: String,
    val amount: Double,
    val frequency: String,
    val feeGroupId: String? = null,
    val type: String = "FeeStructure"
)

// ═══════════════════════════════════════════════════════════════════════════════
//  FEE PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

data class FeePaymentDto(
    @SerializedName("_id") val _id: String = "",
    val feeStructureId: String?  = null,
    val feeGroupId: String?      = null,
    val amount: Double           = 0.0,
    val paymentDate: String      = "",
    val paymentMethod: String    = "cash",
    val nextPaymentDate: String? = null,
    val receiptNo: String?       = null,
    val notes: String?           = null
)

data class CollectFeeRequest(
    val payments: List<FeePaymentItemDto>
)

data class FeePaymentItemDto(
    val memberId: String,
    val feeStructureId: String,
    val feeGroupId: String?       = null,
    val amount: Double,
    val notes: String?            = null,
    val paymentMethod: String     = "cash",
    val nextPaymentDate: String?  = null,
    val academicYearId: String?   = null
)

data class FeePaymentResponseDto(
    @SerializedName("_id") val _id: String = "",
    val receiptNo: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
//  ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════

data class AttendanceResponseDto(
    val isNew: Boolean = true,
    val records: List<AttendanceRecordRaw> = emptyList()
)

data class AttendanceRecordRaw(
    @SerializedName("memberId") val memberIdRaw: JsonElement =
        com.google.gson.JsonPrimitive(""),
    val status: String   = "present",
    val remarks: String? = null
)

data class SaveAttendanceRequest(
    val classId: String,
    val date: String,
    val academicYearId: String? = null,
    val records: List<AttendanceRecordPayload>
)

data class AttendanceRecordPayload(
    val memberId: String,
    val status: String,
    val remarks: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

data class ExpenseResponseDto(
    val expenses: List<ExpenseDto>        = emptyList(),
    val summary: List<ExpenseSummaryDto>? = null
)

data class ExpenseDto(
    @SerializedName("_id") val _id: String = "",
    val title: String    = "",
    val amount: Double   = 0.0,
    val category: String = "",
    val status: String   = "pending",
    val paymentMethod: String = "cash",
    val expenseDate: String = "",
    val vendor: String? = null,
    val isRecurring: Boolean = false,
    val receiptUrl: String? = null
)

data class ExpenseSummaryDto(
    @SerializedName("_id") val _id: String = "",
    val total: Double = 0.0
)

data class CreateExpenseRequest(
    val title: String,
    val category: String,
    val amount: Double,
    val expenseDate: String,
    val paymentMethod: String,
    val vendor: String? = null,
    val notes: String? = null,
    val receiptUrl: String? = null,
    val isRecurring: Boolean = false,
    val recurringFrequency: String? = null
)

data class ConfirmExpenseRequest(
    val amount: Double
)

// ═══════════════════════════════════════════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

data class ReportDataDto(
    val financials: ReportFinancialsDto? = null
)

data class ReportFinancialsDto(
    val totalCollections: Double = 0.0,
    val totalExpenses: Double = 0.0,
    val netBalance: Double = 0.0
)

data class ComprehensiveFinancialsDto(
    val entityType: String = "",
    val groupLabel: String = "",
    val summary: ComprehensiveSummaryDto? = null,
    val incomeDetails: IncomeDetailsDto? = null,
    val topExpenses: List<TopExpenseDto>? = null,
    val history: List<FinancialHistoryDto>? = null,
    val plansBreakdown: List<PlanBreakdownDto>? = null,
    val addonsBreakdown: List<PlanBreakdownDto>? = null,
    val paymentHistory: List<DetailedPaymentHistoryDto>? = null
)

data class PlanBreakdownDto(
    val id: String = "",
    val name: String = "",
    val frequency: String = "",
    val amount: Double = 0.0,
    val isAddon: Boolean = false,
    val memberCount: Int = 0,
    val collectedAmount: Double = 0.0
)

data class DetailedPaymentHistoryDto(
    val _id: String = "",
    val receiptNo: String? = null,
    val memberName: String = "",
    val memberId: String = "",
    val structureName: String = "",
    val isAddon: Boolean = false,
    val amount: Double = 0.0,
    val paymentDate: String = "",
    val nextPaymentDate: String? = null,
    val paymentMethod: String = "cash",
    val notes: String? = null
)

data class ComprehensiveSummaryDto(
    val netBalance: Double = 0.0,
    val collections: Double = 0.0,
    val expenses: Double = 0.0
)

data class IncomeDetailsDto(
    val byGroup: List<IncomeGroupDto>? = null
)

data class IncomeGroupDto(
    val _id: String = "",
    val name: String = "",
    val total: Double = 0.0,
    val count: Int = 0
)

data class TopExpenseDto(
    val _id: String = "",
    val total: Double = 0.0
)

data class PaymentHistoryReportResponseDto(
    val payments: List<DetailedPaymentHistoryDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val totalPages: Int = 1
)

data class PlansBreakdownReportResponseDto(
    val plans: List<PlanBreakdownDto> = emptyList(),
    val addons: List<PlanBreakdownDto> = emptyList()
)

data class ExpenseBreakdownReportResponseDto(
    val expenses: List<TopExpenseDto> = emptyList()
)

data class FinancialHistoryDto(
    val _id: String = "",
    val date: String = "",
    val type: String = "",
    val amount: Double = 0.0,
    val label: String = ""
)

// ═══════════════════════════════════════════════════════════════════════════════
//  STAFF
// ═══════════════════════════════════════════════════════════════════════════════

data class StaffDto(
    @SerializedName("_id") val _id: String = "",
    val name: String = "",
    val contactNumber: String = "",
    val role: String = "staff"
)

data class CreateStaffRequest(
    val name: String,
    val contactNumber: String,
    val role: String
)

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

data class UpdateSequenceRequest(
    val nextSequence: Int
)

// ═══════════════════════════════════════════════════════════════════════════════
//  ACADEMIC YEARS
// ═══════════════════════════════════════════════════════════════════════════════


data class AcademicYearDto(
    @SerializedName("_id") val _id: String = "",
    val name: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val isActive: Boolean = false
)

data class CreateAcademicYearRequest(
    val name: String,
    val startDate: String,
    val endDate: String,
    val isActive: Boolean = false
)

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

data class SubjectDto(
    @SerializedName("_id") val _id: String = "",
    val name: String = "",
    val code: String? = null
)

data class CreateSubjectRequest(
    val name: String,
    val code: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
//  EXAMS
// ═══════════════════════════════════════════════════════════════════════════════

data class ExamSubjectDto(
    val name: String = "",
    val date: String = "",
    val startTime: String = "",
    val endTime: String = ""
)

data class ExamDto(
    @SerializedName("_id") val _id: String = "",
    val name: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val feeGroupId: String? = null,
    val feeGroupName: String? = null,
    val subjects: List<ExamSubjectDto> = emptyList()
)

data class CreateExamRequest(
    val name: String,
    val startDate: String,
    val endDate: String,
    val academicYearId: String? = null,
    val feeGroupId: String? = null,
    val subjects: List<ExamSubjectDto> = emptyList()
)

data class ExamResultDto(
    @SerializedName("_id") val _id: String = "",
    val memberId: String = "",
    val memberName: String? = null,
    val examId: String = "",
    val examName: String? = null,
    val subjectScores: List<SubjectScoreDto> = emptyList(),
    val totalMarks: Double = 0.0,
    val maxMarks: Double = 0.0,
    val percentage: Double = 0.0,
    val grade: String = ""
)

data class SubjectScoreDto(
    val subject: String = "",
    val marks: Double = 0.0,
    val maxMarks: Double = 0.0
)

data class RankSheetEntryDto(
    val memberId: String = "",
    val memberName: String = "",
    val knownId: String? = null,
    val totalMarks: Double = 0.0,
    val maxMarks: Double = 0.0,
    val percentage: Double = 0.0,
    val grade: String = "",
    val rank: Int = 0
)

data class AddResultsRequest(
    val results: List<MemberResultInput>
)

data class MemberResultInput(
    val memberId: String,
    val subjectScores: List<SubjectScoreDto>
)
