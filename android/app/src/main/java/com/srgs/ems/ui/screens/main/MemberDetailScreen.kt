package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.*
import android.app.DatePickerDialog
import androidx.compose.ui.platform.LocalContext
import com.srgs.ems.ui.components.EmsDateField
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.CartItemState
import com.srgs.ems.viewmodel.MemberDetailViewModel
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

private fun inrFmt(v: Double) =
    "₹${NumberFormat.getNumberInstance(Locale("en", "IN")).format(v)}"

private val payDateFmt = SimpleDateFormat("dd MMM yyyy", Locale.ENGLISH)
private fun fmtDate(s: String?): String {
    if (s.isNullOrEmpty()) return ""
    for (fmt in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd")) {
        try { return payDateFmt.format(SimpleDateFormat(fmt, Locale.US).parse(s)!!) } catch (_: Exception) {}
    }
    return s.take(10)
}

private fun shareWhatsAppReceipt(
    context: android.content.Context,
    session: com.srgs.ems.data.models.UserSession?,
    member: MemberDetailDto?,
    amount: Double,
    receiptNo: String?,
    paymentDate: String?,
    paymentMethod: String?,
    nextDate: String?,
    planOrRoomName: String?
) {
    if (member == null) return
    val entityName = session?.name ?: "PG / Hostel"
    val roomOrPlan = if (session?.isBusinessMode == true && session?.isGym != true) {
        "Room: ${member.groupName ?: "Assigned"}"
    } else {
        "Plan: ${planOrRoomName ?: "Membership"}"
    }

    val sb = StringBuilder()
    sb.append("🧾 *${entityName.trim()} — Fee Receipt*\n\n")
    sb.append("👤 *Tenant / Member:* ${member.firstName} ${member.lastName}\n")
    sb.append("🏠 *${roomOrPlan}*\n")
    if (!receiptNo.isNullOrEmpty()) sb.append("🔢 *Receipt No:* #${receiptNo}\n")
    sb.append("💰 *Amount Paid:* ${inrFmt(amount)}\n")
    if (!paymentMethod.isNullOrEmpty()) sb.append("💳 *Payment Mode:* ${paymentMethod.uppercase()}\n")
    if (!paymentDate.isNullOrEmpty()) sb.append("📅 *Payment Date:* ${fmtDate(paymentDate)}\n")
    if (!nextDate.isNullOrEmpty()) sb.append("⏰ *Next Renewal Date:* ${fmtDate(nextDate)}\n")
    sb.append("\n_Thank you for your payment!_")

    val message = sb.toString()
    val phone = member.contact?.filter { it.isDigit() } ?: ""
    val formattedPhone = if (phone.length == 10) "91$phone" else phone

    val url = if (formattedPhone.isNotEmpty()) {
        "https://api.whatsapp.com/send?phone=$formattedPhone&text=${java.net.URLEncoder.encode(message, "UTF-8")}"
    } else {
        "https://api.whatsapp.com/send?text=${java.net.URLEncoder.encode(message, "UTF-8")}"
    }

    try {
        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
            data = android.net.Uri.parse(url)
        }
        context.startActivity(intent)
    } catch (_: Exception) {
        try {
            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(android.content.Intent.EXTRA_TEXT, message)
            }
            context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Receipt"))
        } catch (_: Exception) {}
    }
}

private fun shareWhatsAppCheckoutSettlement(
    context: android.content.Context,
    session: com.srgs.ems.data.models.UserSession?,
    member: MemberDetailDto?,
    checkout: CheckoutDetailsDto
) {
    if (member == null) return
    val entityName = session?.name ?: "PG / Hostel"
    val roomOrPlan = "Room: ${member.groupName ?: "Assigned Room"}"

    val sb = StringBuilder()
    sb.append("🚪 *${entityName.trim()} — Check-Out & Deposit Settlement*\n\n")
    sb.append("👤 *Tenant:* ${member.firstName} ${member.lastName}\n")
    sb.append("🏠 *${roomOrPlan}*\n")
    sb.append("📅 *Check-Out Date:* ${fmtDate(checkout.checkoutDate)}\n\n")
    sb.append("💰 *Security Deposit:* ${inrFmt(checkout.depositAmount)}\n")
    if (checkout.pendingDues > 0) {
        sb.append("➖ *Pending Dues Deducted:* ${inrFmt(checkout.pendingDues)}\n")
    }
    if (checkout.deductions > 0) {
        val reason = checkout.deductionReason?.let { " ($it)" } ?: ""
        sb.append("➖ *Other Deductions${reason}:* ${inrFmt(checkout.deductions)}\n")
    }
    sb.append("─────────────────────\n")
    sb.append("💵 *Net Deposit Refunded:* ${inrFmt(checkout.netRefunded)}\n")
    sb.append("💳 *Refund Mode:* ${checkout.refundMethod.uppercase()}\n")
    if (!checkout.notes.isNullOrEmpty()) {
        sb.append("📝 *Remarks:* ${checkout.notes}\n")
    }
    sb.append("\n_Thank you for staying with ${entityName.trim()}! Best wishes!_ 🌟")

    val message = sb.toString()
    val phone = member.contact?.filter { it.isDigit() } ?: ""
    val formattedPhone = if (phone.length == 10) "91$phone" else phone

    val url = if (formattedPhone.isNotEmpty()) {
        "https://api.whatsapp.com/send?phone=$formattedPhone&text=${java.net.URLEncoder.encode(message, "UTF-8")}"
    } else {
        "https://api.whatsapp.com/send?text=${java.net.URLEncoder.encode(message, "UTF-8")}"
    }

    try {
        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
            data = android.net.Uri.parse(url)
        }
        context.startActivity(intent)
    } catch (_: Exception) {
        try {
            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(android.content.Intent.EXTRA_TEXT, message)
            }
            context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Settlement"))
        } catch (_: Exception) {}
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MemberDetailScreen(
    memberId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    vm: MemberDetailViewModel = viewModel()
) {
    LaunchedEffect(memberId) { vm.initialize(memberId) }

    val member        by vm.member.collectAsState()
    val payments      by vm.payments.collectAsState()
    val feeStructures by vm.feeStructures.collectAsState()
    val isLoading     by vm.isLoading.collectAsState()
    val memberStatus  by vm.memberStatus.collectAsState()
    val isSaving      by vm.isSaving.collectAsState()
    val session       = SessionManager.session
    val snackbar      = remember { SnackbarHostState() }
    val context       = LocalContext.current

    var showCollectSheet  by remember { mutableStateOf(false) }
    var showReceiptDialog by remember { mutableStateOf(false) }
    var receiptInfo       by remember { mutableStateOf<Pair<String?, Double>>(null to 0.0) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var paymentToEditDate by remember { mutableStateOf<FeePaymentDto?>(null) }
    var paymentToDelete   by remember { mutableStateOf<FeePaymentDto?>(null) }
    var showCheckoutSheet by remember { mutableStateOf(false) }
    var showCheckoutSuccessDialog by remember { mutableStateOf(false) }
    var lastCheckoutDetails by remember { mutableStateOf<CheckoutDetailsDto?>(null) }

    LaunchedEffect(Unit) {
        vm.collectResult.collect { result ->
            showCollectSheet = false
            if (result.success) {
                receiptInfo       = result.receiptNo to result.totalAmount
                showReceiptDialog = true
            } else {
                snackbar.showSnackbar("❌ ${result.message}")
            }
        }
    }

    LaunchedEffect(Unit) {
        vm.holdResult.collect { ok ->
            snackbar.showSnackbar(if (ok) "✅ Status updated" else "❌ Action failed")
        }
    }

    LaunchedEffect(Unit) {
        vm.deleteResult.collect { ok ->
            if (ok) onBack() else snackbar.showSnackbar("❌ Delete failed")
        }
    }

    LaunchedEffect(Unit) {
        vm.paymentActionResult.collect { (ok, msg) ->
            snackbar.showSnackbar(if (ok) "✅ $msg" else "❌ $msg")
        }
    }

    LaunchedEffect(Unit) {
        vm.checkoutResult.collect { ok ->
            showCheckoutSheet = false
            if (ok) {
                showCheckoutSuccessDialog = true
            } else {
                snackbar.showSnackbar("❌ Check-out failed")
            }
        }
    }

    // Date picker dialog for editing next renewal date
    if (paymentToEditDate != null) {
        val p = paymentToEditDate!!
        val cal = Calendar.getInstance()
        if (!p.nextPaymentDate.isNullOrEmpty()) {
            for (fmt in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd")) {
                try { cal.time = SimpleDateFormat(fmt, Locale.US).parse(p.nextPaymentDate)!!; break } catch (_: Exception) {}
            }
        }
        DatePickerDialog(
            context,
            { _, y, m, d ->
                val chosen = Calendar.getInstance().apply { set(y, m, d) }
                val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(chosen.time)
                vm.updateNextPaymentDate(p._id, dateStr)
                paymentToEditDate = null
            },
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH),
            cal.get(Calendar.DAY_OF_MONTH)
        ).apply {
            setOnCancelListener { paymentToEditDate = null }
            show()
        }
    }

    // Delete payment confirmation dialog
    if (paymentToDelete != null) {
        val p = paymentToDelete!!
        AlertDialog(
            onDismissRequest = { paymentToDelete = null },
            title = { Text("Delete Payment Entry?", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "Are you sure you want to delete payment ${p.receiptNo?.let { "#$it " } ?: ""}of ${inrFmt(p.amount)}? This will recalculate the member's paid and pending balance.",
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    vm.deletePayment(p._id)
                    paymentToDelete = null
                }) {
                    Text("Delete", color = Danger, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { paymentToDelete = null }) { Text("Cancel") }
            }
        )
    }

    val feeGroups     by vm.feeGroups.collectAsState()

    if (showCheckoutSheet && member != null) {
        ModalBottomSheet(
            onDismissRequest = { showCheckoutSheet = false },
            containerColor = Surface
        ) {
            CheckoutSheet(
                member = member!!,
                isSaving = isSaving,
                onDismiss = { showCheckoutSheet = false },
                onConfirmCheckout = { req: CheckoutMemberRequest ->
                    lastCheckoutDetails = CheckoutDetailsDto(
                        checkoutDate    = req.checkoutDate ?: "",
                        depositAmount   = req.depositAmount,
                        pendingDues     = req.pendingDues,
                        deductions      = req.deductions,
                        deductionReason = req.deductionReason,
                        netRefunded     = req.netRefunded,
                        refundMethod    = req.refundMethod,
                        notes           = req.notes
                    )
                    vm.checkoutMember(req)
                }
            )
        }
    }

    if (showCheckoutSuccessDialog) {
        val checkout = member?.checkoutDetails ?: lastCheckoutDetails
        AlertDialog(
            onDismissRequest = { showCheckoutSuccessDialog = false },
            title = { Text("🚪 Check-Out Completed", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Tenant checked out and room bed released successfully!", fontSize = 14.sp, color = TextSecondary)
                    if (checkout != null) {
                        Text(
                            "Net Deposit Refund: ${inrFmt(checkout.netRefunded)} (${checkout.refundMethod.uppercase()})",
                            fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Success
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(
                        onClick = {
                            if (checkout != null) {
                                shareWhatsAppCheckoutSettlement(context, session, member, checkout)
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFF25D366))
                    ) {
                        Text("💬 Share Settlement on WhatsApp", color = Color(0xFF128C7E), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCheckoutSuccessDialog = false }) {
                    Text("Done", color = Primary, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    if (showCollectSheet) {
        ModalBottomSheet(
            onDismissRequest = { showCollectSheet = false },
            containerColor = Surface
        ) {
            CollectFeeSheet(
                cartItems          = vm.cartItems,
                feeGroups          = feeGroups,
                feeStructures      = feeStructures,
                selectedFeeGroupId = vm.selectedFeeGroupId,
                notes              = vm.notes,
                paymentMethod      = vm.paymentMethod,
                paymentDate        = vm.paymentDate,
                isSaving           = isSaving,
                onToggle           = { vm.toggleCartItem(it) },
                onSelectPlan       = { vm.selectPrimaryPlan(it) },
                onSelectRoom       = { vm.selectRoom(it) },
                onAmount           = { id, amt -> vm.updateCartAmount(id, amt) },
                onNextDate         = { id, d   -> vm.updateNextDate(id, d) },
                onNotes            = { vm.updateNotes(it) },
                onPayMethod        = { vm.updatePaymentMethod(it) },
                onPaymentDate      = { vm.updatePaymentDate(it) },
                onCollect          = { vm.collectFee() }
            )
        }
    }

    if (showReceiptDialog) {
        AlertDialog(
            onDismissRequest = { showReceiptDialog = false },
            title = { Text("✅ Payment Recorded", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    receiptInfo.first?.let {
                        Text("Receipt: #$it", fontSize = 14.sp, color = TextSecondary)
                    }
                    Text(
                        "Amount Collected: ${inrFmt(receiptInfo.second)}",
                        fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Success
                    )
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(
                        onClick = {
                            val lastPay = payments.maxByOrNull { it.paymentDate }
                            shareWhatsAppReceipt(
                                context         = context,
                                session         = session,
                                member          = member,
                                amount          = receiptInfo.second,
                                receiptNo       = receiptInfo.first,
                                paymentDate     = lastPay?.paymentDate ?: SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()),
                                paymentMethod   = lastPay?.paymentMethod ?: "Cash",
                                nextDate        = lastPay?.nextPaymentDate,
                                planOrRoomName  = member?.groupName
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFF25D366))
                    ) {
                        Text("💬 Share via WhatsApp", color = Color(0xFF128C7E), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showReceiptDialog = false }) {
                    Text("Done", color = Primary, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title   = { Text("Delete Member?", fontWeight = FontWeight.Bold) },
            text    = { Text("This action cannot be undone.", color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = { showDeleteConfirm = false; vm.deleteMember() }) {
                    Text("Delete", color = Danger, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) { Text("Cancel") }
            }
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = { Text(member?.let { "${it.firstName} ${it.lastName}" } ?: "Member Detail", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Text("←", fontSize = 22.sp, color = Color.White) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Primary)
            )
        }
    ) { pad ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(pad), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
        } else if (member == null) {
            Box(Modifier.fillMaxSize().padding(pad), Alignment.Center) {
                Text("Member not found", color = TextSecondary, fontSize = 16.sp)
            }
        } else {
            val m = member!!
            LazyColumn(
                contentPadding = PaddingValues(top = pad.calculateTopPadding() + 8.dp, bottom = 80.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                // Action buttons
                item {
                    ActionBar(
                        m = m, status = memberStatus, isAdmin = session?.isAdmin ?: false, isGym = session?.isGym ?: false,
                        onEdit = { onEdit(m._id) },
                        onCollect = { vm.initCart(); showCollectSheet = true },
                        onHold = { vm.holdMember() },
                        onResume = { vm.resumeMember() },
                        onCheckout = { showCheckoutSheet = true },
                        onDelete = { showDeleteConfirm = true }
                    )
                }

                // Checked-out settlement card
                if (m.checkoutDetails != null || memberStatus == "checked_out") {
                    m.checkoutDetails?.let { ch ->
                        item {
                            SCard {
                                CheckoutSettlementCard(
                                    checkout = ch,
                                    onShare = { shareWhatsAppCheckoutSettlement(context, session, m, ch) }
                                )
                            }
                        }
                    }
                }

                // Personal details
                item { SCard { PersonalDetails(m, session?.isGym ?: false, session?.isSchool ?: true) } }

                // Financial overview (non-teacher admins)
                if (session?.isTeacher != true) {
                    val totalPaid = payments.sumOf { it.amount }
                    val latestPayment = payments.maxByOrNull { it.paymentDate }
                    item {
                        SCard {
                            FinancialOverview(
                                totalFee          = m.totalFee,
                                totalPaid         = totalPaid,
                                latestPayment     = latestPayment,
                                isAdmin           = session?.isAdmin ?: false,
                                onEditRenewalDate = { paymentToEditDate = it }
                            )
                        }
                    }
                }

                // Payment history
                if (session?.isTeacher != true) {
                    item {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                            Arrangement.SpaceBetween, Alignment.CenterVertically) {
                            Text("💳 Payment History", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("${payments.size} records", fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                    if (payments.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(vertical = 16.dp), Alignment.Center) {
                                Text("No payments recorded yet.", color = TextSecondary, fontSize = 14.sp)
                            }
                        }
                    } else {
                        items(payments.sortedByDescending { it.paymentDate }) { p ->
                            PaymentCard(
                                p               = p,
                                structures      = feeStructures,
                                session         = session,
                                member          = m,
                                isAdmin         = session?.isAdmin ?: false,
                                onEditNextDate  = { paymentToEditDate = it },
                                onDeletePayment = { paymentToDelete = it }
                            )
                        }
                    }
                }

                // Hold history
                val holdHistory = m.holdHistory
                if (!holdHistory.isNullOrEmpty()) {
                    item { Spacer(Modifier.height(8.dp)) }
                    item { Text("⏸ Hold History", Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD97706)) }
                    items(holdHistory) { h ->
                        HoldHistoryCard(h.holdDate, h.resumeDate)
                    }
                }

                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

// ── Action bar ────────────────────────────────────────────────────────────────
@Composable
private fun ActionBar(
    m: MemberDetailDto,
    status: String,
    isAdmin: Boolean,
    isGym: Boolean,
    onEdit: () -> Unit,
    onCollect: () -> Unit,
    onHold: () -> Unit,
    onResume: () -> Unit,
    onCheckout: () -> Unit,
    onDelete: () -> Unit
) {
    val isCheckedOut = status == "checked_out"

    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        RoundedCornerShape(14.dp), CardDefaults.cardColors(Surface), CardDefaults.cardElevation(2.dp)
    ) {
        if (isCheckedOut) {
            Surface(
                color = Danger.copy(alpha = 0.08f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("🚪 Checked Out / Vacated", fontWeight = FontWeight.Bold, color = Danger, fontSize = 14.sp)
                }
            }
        }

        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ActionBtn("✎ Edit", Primary.copy(.12f), Primary, Modifier.weight(1f), onEdit)
            if (isAdmin && !isCheckedOut) {
                ActionBtn("💰 Fee", Color(0xFF059669).copy(.12f), Color(0xFF059669), Modifier.weight(1f), onCollect)
            }
            if (isAdmin && !isCheckedOut) {
                if (status == "active") {
                    ActionBtn("⏸ Hold", Color(0xFFF59E0B).copy(.12f), Color(0xFFD97706), Modifier.weight(1f), onHold)
                } else {
                    ActionBtn("▶ Resume", Color(0xFF10B981).copy(.12f), Color(0xFF059669), Modifier.weight(1f), onResume)
                }
            }
            if (isAdmin && !isCheckedOut && !isGym) {
                ActionBtn("🚪 Vacate", Danger.copy(.12f), Danger, Modifier.weight(1f), onCheckout)
            }
        }
        if (isAdmin) {
            Row(Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, bottom = 12.dp)) {
                OutlinedButton(
                    onClick = onDelete,
                    modifier = Modifier.fillMaxWidth(),
                    border = BorderStroke(1.dp, Danger.copy(.5f)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("🗑 Delete Member Record", color = Danger, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ActionBtn(label: String, bg: Color, fg: Color, modifier: Modifier, onClick: () -> Unit) {
    Surface(modifier = modifier.clip(RoundedCornerShape(8.dp)).clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp), color = bg) {
        Text(label, Modifier.padding(vertical = 10.dp).fillMaxWidth(),
            fontSize = 13.sp, fontWeight = FontWeight.Bold, color = fg,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

// ── Personal details ──────────────────────────────────────────────────────────
@Composable
private fun PersonalDetails(
    m: MemberDetailDto,
    isGym: Boolean,
    isSchool: Boolean = false
) {
    val context = LocalContext.current

    if (isSchool) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // ── Section 1: Student Identity ──
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🎓", fontSize = 18.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("Student Identity & Demographics", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                Spacer(Modifier.height(10.dp))

                val idItems = buildList<Pair<String, String>> {
                    add("Class / Section" to (m.groupName ?: "Unassigned"))
                    m.admissionNo?.let { if (it.isNotEmpty()) add("Admission No" to it) } ?: m.knownId?.let { if (it.isNotEmpty()) add("Admission No" to it) }
                    m.rollNo?.let { if (it.isNotEmpty()) add("Class Roll No" to it) }
                    m.aadhaarNo?.let { if (it.isNotEmpty()) add("Aadhaar UID" to it) }
                    m.apaarId?.let { if (it.isNotEmpty()) add("APAAR / PEN ID" to it) }
                    m.dob?.take(10)?.let { if (it.isNotEmpty()) add("Date of Birth" to it) }
                    m.gender?.let { if (it.isNotEmpty()) add("Gender" to it.replaceFirstChar { c -> c.uppercase() }) }
                    m.bloodGroup?.let { if (it.isNotEmpty()) add("Blood Group" to it) }
                    m.casteCategory?.let { if (it.isNotEmpty()) add("Category / Caste" to "$it ${m.subCaste ?: ""}".trim()) }
                    m.religion?.let { if (it.isNotEmpty()) add("Religion" to it) }
                    m.motherTongue?.let { if (it.isNotEmpty()) add("Mother Tongue" to it) }
                    m.placeOfBirth?.let { if (it.isNotEmpty()) add("Place of Birth" to it) }
                    m.identificationMarks?.let { if (it.isNotEmpty()) add("Ident. Marks" to it) }
                    m.medicalNotes?.let { if (it.isNotEmpty()) add("Medical Notes" to it) }
                }

                idItems.forEachIndexed { i, (label, value) ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
                        Text(label, Modifier.weight(0.42f), fontSize = 13.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                        Text(value, Modifier.weight(0.58f), fontSize = 13.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                    }
                    if (i < idItems.lastIndex) HorizontalDivider(color = Border.copy(alpha = 0.5f))
                }
            }

            HorizontalDivider(color = Border)

            // ── Section 2: Parents & Guardian ──
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("👨‍👩‍👧", fontSize = 18.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("Parents & Guardian Details", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                Spacer(Modifier.height(10.dp))

                // Father Profile
                if (!m.fatherName.isNullOrBlank()) {
                    Text("FATHER'S INFO", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
                    Spacer(Modifier.height(4.dp))
                    Text("Name: ${m.fatherName}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!m.fatherOccupation.isNullOrBlank()) Text("Occupation: ${m.fatherOccupation}", fontSize = 12.sp, color = TextSecondary)
                    if (!m.fatherQualification.isNullOrBlank()) Text("Qualification: ${m.fatherQualification}", fontSize = 12.sp, color = TextSecondary)
                    if (!m.fatherPhone.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                            Text("📞 ${m.fatherPhone}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Primary)
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "Dial",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Success,
                                modifier = Modifier.clickable {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:${m.fatherPhone}"))
                                    context.startActivity(intent)
                                }
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }

                // Mother Profile
                if (!m.motherName.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text("MOTHER'S INFO", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
                    Spacer(Modifier.height(4.dp))
                    Text("Name: ${m.motherName}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!m.motherOccupation.isNullOrBlank()) Text("Occupation: ${m.motherOccupation}", fontSize = 12.sp, color = TextSecondary)
                    if (!m.motherPhone.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                            Text("📞 ${m.motherPhone}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Primary)
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "Dial",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Success,
                                modifier = Modifier.clickable {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:${m.motherPhone}"))
                                    context.startActivity(intent)
                                }
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }

                // Guardian Profile
                if (!m.guardianName.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text("LOCAL GUARDIAN", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.5.sp)
                    Spacer(Modifier.height(4.dp))
                    Text("Name: ${m.guardianName} (${m.guardianRelation ?: "Guardian"})", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!m.guardianPhone.isNullOrBlank()) Text("Phone: 📞 ${m.guardianPhone}", fontSize = 12.sp, color = TextSecondary)
                }
            }

            HorizontalDivider(color = Border)

            // ── Section 3: Address & Emergency ──
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🏠", fontSize = 18.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("Address & Emergency", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                Spacer(Modifier.height(8.dp))

                val fullPresentAddr = buildString {
                    append(m.presentAddress ?: m.address ?: "")
                    if (!m.city.isNullOrBlank()) append(", ${m.city}")
                    if (!m.district.isNullOrBlank()) append(", ${m.district}")
                    if (!m.state.isNullOrBlank()) append(", ${m.state}")
                    if (!m.pincode.isNullOrBlank()) append(" - ${m.pincode}")
                }.trim().trimStart(',')

                if (fullPresentAddr.isNotBlank()) {
                    Text("Present Address:", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                    Text(fullPresentAddr, fontSize = 13.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                }

                if (!m.permanentAddress.isNullOrBlank() && m.permanentAddress != m.presentAddress) {
                    Text("Permanent Address:", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                    Text(m.permanentAddress, fontSize = 13.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                }

                if (!m.emergencyContactPhone.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Danger.copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, Danger.copy(alpha = 0.25f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("🚨 Emergency Contact", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Danger)
                                Text("${m.emergencyContactName ?: "Contact"} (${m.emergencyContactRelation ?: "Relation"})", fontSize = 12.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                            }
                            Text(
                                "📞 ${m.emergencyContactPhone}",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Danger,
                                modifier = Modifier.clickable {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:${m.emergencyContactPhone}"))
                                    context.startActivity(intent)
                                }
                            )
                        }
                    }
                }
            }

            // ── Section 4: Previous School & TC ──
            if (!m.previousSchoolName.isNullOrBlank() || !m.tcNumber.isNullOrBlank()) {
                HorizontalDivider(color = Border)
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🏫", fontSize = 18.sp)
                        Spacer(Modifier.width(8.dp))
                        Text("Previous School & TC", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Spacer(Modifier.height(8.dp))
                    if (!m.previousSchoolName.isNullOrBlank()) Text("School: ${m.previousSchoolName} (${m.previousBoard ?: "Board"})", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    if (!m.previousClassPassed.isNullOrBlank()) Text("Last Class Passed: ${m.previousClassPassed} • Score: ${m.previousPercentage ?: "N/A"}", fontSize = 12.sp, color = TextSecondary)
                    if (!m.tcNumber.isNullOrBlank()) Text("TC No: #${m.tcNumber} ${if (!m.tcDate.isNullOrBlank()) "issued on ${m.tcDate}" else ""}", fontSize = 12.sp, color = TextMuted)
                }
            }

            // ── Section 5: Concession & Scholarship ──
            if (!m.concessionType.isNullOrBlank() && m.concessionType != "none") {
                HorizontalDivider(color = Border)
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🏷️", fontSize = 18.sp)
                        Spacer(Modifier.width(8.dp))
                        Text("Fee Concession / Scholarship", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Success)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text("Type: ${m.concessionType.replaceFirstChar { it.uppercase() }} ${if (m.concessionValue != null && m.concessionValue > 0) "(${m.concessionValue.toInt()}% Off)" else ""}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!m.concessionReason.isNullOrBlank()) Text("Reason: ${m.concessionReason}", fontSize = 12.sp, color = TextSecondary)
                }
            }

            // ── Section 6: Attached Documents & Certificates ──
            if (m.documents.isNotEmpty()) {
                HorizontalDivider(color = Border)
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📁", fontSize = 18.sp)
                            Spacer(Modifier.width(8.dp))
                            Text("Attached Documents (${m.documents.size})", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                    Spacer(Modifier.height(10.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        m.documents.forEach { doc ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Background.copy(alpha = 0.6f),
                                border = BorderStroke(1.dp, Border),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                        Text(
                                            when (doc.docType) {
                                                "birth_certificate" -> "📜"
                                                "aadhaar"           -> "🆔"
                                                "tc"                -> "🏫"
                                                "marksheet"         -> "📊"
                                                "caste_certificate" -> "🏷️"
                                                "photo"             -> "📸"
                                                else                -> "📄"
                                            },
                                            fontSize = 16.sp
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Column {
                                            Text(doc.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                            doc.uploadedAt?.let { Text("Uploaded: ${it.take(10)}", fontSize = 10.sp, color = TextMuted) }
                                        }
                                    }

                                    if (doc.url.isNotBlank()) {
                                        OutlinedButton(
                                            onClick = {
                                                try {
                                                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(doc.url))
                                                    context.startActivity(intent)
                                                } catch (_: Exception) {}
                                            },
                                            shape = RoundedCornerShape(6.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp)
                                        ) {
                                            Text("👁 View", fontSize = 12.sp, color = Primary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("👤", fontSize = 18.sp); Spacer(Modifier.width(8.dp))
            Text("Personal Details", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }
        Spacer(Modifier.height(12.dp))
        val items = buildList<Pair<String, String>> {
            if (!isGym && !m.knownId.isNullOrEmpty()) add("Roll / ID" to m.knownId)
            if (isGym) add("Plans & Services" to (m.addonNames?.joinToString(", ")?.ifEmpty { "None" } ?: "None"))
            else {
                m.groupName?.let { add("Class / Room" to it) }
                if (!m.addonNames.isNullOrEmpty()) add("Add-on Services" to m.addonNames.joinToString(", "))
            }
            m.dob?.take(10)?.let { if (it.isNotEmpty()) add("Date of Birth" to it) }
            m.contact?.let { if (it.isNotEmpty()) add("Contact" to "📞 $it") }
            m.altContact?.let { if (it.isNotEmpty()) add("Alt Contact" to "📞 $it") }
            m.address?.let { if (it.isNotEmpty()) add("Address" to it) }
            m.fatherOccupation?.let { if (it.isNotEmpty() && it.lowercase() !in listOf("no","none","n/a","na","-")) add("Father Occ." to it) }
            m.motherOccupation?.let { if (it.isNotEmpty() && it.lowercase() !in listOf("no","none","n/a","na","-")) add("Mother Occ." to it) }
        }
        items.forEachIndexed { i, (label, value) ->
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                Text(label, Modifier.weight(0.4f), fontSize = 13.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                Text(value, Modifier.weight(0.6f), fontSize = 14.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
            }
            if (i < items.lastIndex) HorizontalDivider(color = Border)
        }
    }
}

// ── Financial overview ────────────────────────────────────────────────────────
@Composable
private fun FinancialOverview(
    totalFee: Double,
    totalPaid: Double,
    latestPayment: FeePaymentDto? = null,
    isAdmin: Boolean = false,
    onEditRenewalDate: ((FeePaymentDto) -> Unit)? = null
) {
    val pending = maxOf(0.0, totalFee - totalPaid)
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("💰", fontSize = 18.sp); Spacer(Modifier.width(8.dp))
        Text("Financial Overview", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
    }
    Spacer(Modifier.height(12.dp))
    Row(Modifier.fillMaxWidth()) {
        FeeStatCell("Total Fee", inrFmt(totalFee), TextPrimary, Modifier.weight(1f))
        FeeStatCell("Paid", inrFmt(totalPaid), Success, Modifier.weight(1f))
        FeeStatCell("Pending", inrFmt(pending), if (pending > 0) Danger else TextPrimary, Modifier.weight(1f))
    }

    // Active Next Renewal Date Banner
    if (latestPayment != null && !latestPayment.nextPaymentDate.isNullOrEmpty()) {
        Spacer(Modifier.height(10.dp))
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Primary.copy(alpha = 0.07f),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                Arrangement.SpaceBetween,
                Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("⏰ Next Renewal: ", fontSize = 12.sp, color = TextSecondary)
                    Text(
                        fmtDate(latestPayment.nextPaymentDate),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                }
                if (isAdmin && onEditRenewalDate != null) {
                    TextButton(
                        onClick = { onEditRenewalDate(latestPayment) },
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp)
                    ) {
                        Text("✎ Edit Date", fontSize = 12.sp, color = Primary, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun FeeStatCell(label: String, value: String, vc: Color, modifier: Modifier) {
    Column(modifier.padding(4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(4.dp))
        Text(value, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = vc)
    }
}

// ── Payment card ──────────────────────────────────────────────────────────────
@Composable
private fun PaymentCard(
    p: FeePaymentDto,
    structures: List<FeeStructureDto>,
    session: com.srgs.ems.data.models.UserSession? = null,
    member: MemberDetailDto? = null,
    isAdmin: Boolean = false,
    onEditNextDate: ((FeePaymentDto) -> Unit)? = null,
    onDeletePayment: ((FeePaymentDto) -> Unit)? = null
) {
    val context = LocalContext.current
    val structName = structures.find { it._id == p.feeStructureId }?.name ?: "Fee Payment"
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
            .border(1.dp, Border, RoundedCornerShape(10.dp)),
        RoundedCornerShape(10.dp), CardDefaults.cardColors(Surface), CardDefaults.cardElevation(0.dp)
    ) {
        Column(Modifier.fillMaxWidth().padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(36.dp).clip(CircleShape).background(Success.copy(.1f)), Alignment.Center) {
                        Text("💰", fontSize = 16.sp)
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(structName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        Text(fmtDate(p.paymentDate), fontSize = 12.sp, color = TextSecondary)
                        p.receiptNo?.let { Text("#$it", fontSize = 11.sp, color = TextMuted) }
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(inrFmt(p.amount), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Success)
                    Text(p.paymentMethod.uppercase(), fontSize = 10.sp, color = TextMuted, letterSpacing = 0.5.sp)
                }
            }

            // Next renewal date if recorded
            if (!p.nextPaymentDate.isNullOrEmpty()) {
                Spacer(Modifier.height(6.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    Arrangement.SpaceBetween,
                    Alignment.CenterVertically
                ) {
                    Text(
                        "⏰ Next Due: ${fmtDate(p.nextPaymentDate)}",
                        fontSize = 11.sp,
                        color = TextSecondary,
                        fontWeight = FontWeight.Medium
                    )
                    if (isAdmin && onEditNextDate != null) {
                        Text(
                            "✎ Edit",
                            fontSize = 11.sp,
                            color = Primary,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { onEditNextDate(p) }
                        )
                    }
                }
            }

            HorizontalDivider(Modifier.padding(top = 8.dp), color = Border.copy(alpha = 0.5f))

            // Action row: WhatsApp Share + Delete
            Row(
                Modifier.fillMaxWidth().padding(top = 4.dp),
                Arrangement.End,
                Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = {
                        shareWhatsAppReceipt(
                            context        = context,
                            session        = session,
                            member         = member,
                            amount         = p.amount,
                            receiptNo      = p.receiptNo,
                            paymentDate    = p.paymentDate,
                            paymentMethod  = p.paymentMethod,
                            nextDate       = p.nextPaymentDate,
                            planOrRoomName = structName
                        )
                    },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text("💬 WhatsApp", fontSize = 11.sp, color = Color(0xFF128C7E), fontWeight = FontWeight.Bold)
                }

                if (isAdmin && onDeletePayment != null) {
                    Spacer(Modifier.width(4.dp))
                    TextButton(
                        onClick = { onDeletePayment(p) },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text("🗑 Delete", fontSize = 11.sp, color = Danger, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

// ── Hold history card ─────────────────────────────────────────────────────────
@Composable
private fun HoldHistoryCard(holdDate: String, resumeDate: String) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 3.dp),
        RoundedCornerShape(8.dp), CardDefaults.cardColors(Color(0xFFFFFBEB)), CardDefaults.cardElevation(0.dp)
    ) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("⏸", fontSize = 16.sp)
            Spacer(Modifier.width(10.dp))
            Text("${fmtDate(holdDate)} → ${fmtDate(resumeDate)}",
                fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFD97706))
        }
    }
}

// ── Section card wrapper ──────────────────────────────────────────────────────
@Composable
private fun SCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        RoundedCornerShape(14.dp), CardDefaults.cardColors(Surface), CardDefaults.cardElevation(2.dp)
    ) { Column(Modifier.padding(16.dp), content = content) }
}

// ── Collect Fee bottom sheet ──────────────────────────────────────────────────
private enum class CollectMode { Quick, PlanPicker }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CollectFeeSheet(
    cartItems: List<CartItemState>,
    feeGroups: List<FeeGroupDto>,
    feeStructures: List<FeeStructureDto>,
    selectedFeeGroupId: String?,
    notes: String,
    paymentMethod: String,
    paymentDate: String,
    isSaving: Boolean,
    onToggle: (String) -> Unit,
    onSelectPlan: (String) -> Unit,
    onSelectRoom: (String) -> Unit,
    onAmount: (String, String) -> Unit,
    onNextDate: (String, String) -> Unit,
    onNotes: (String) -> Unit,
    onPayMethod: (String) -> Unit,
    onPaymentDate: (String) -> Unit,
    onCollect: () -> Unit
) {
    var mode         by remember { mutableStateOf(CollectMode.Quick) }
    var showAddons   by remember { mutableStateOf(false) }
    val session      = SessionManager.session
    val isPg         = session?.isBusinessMode == true && session?.isGym != true

    val currentRoom  = feeGroups.firstOrNull { it._id == selectedFeeGroupId }
    val primaryPlan  = cartItems.firstOrNull { it.checked && !it.isAddon }
    val primaryItems = cartItems.filter { !it.isAddon }
    val addonItems   = cartItems.filter { it.isAddon }
    val primaryTotal = primaryPlan?.amount?.toDoubleOrNull() ?: 0.0
    val addonTotal   = addonItems.filter { it.checked }.sumOf { it.amount.toDoubleOrNull() ?: 0.0 }
    val total        = primaryTotal + addonTotal

    Column(Modifier.fillMaxWidth().fillMaxHeight(0.92f)) {

        // ── Animated content area (Quick / Plan Picker / Room Picker) ──
        Box(Modifier.weight(1f)) {
            // Quick collect view
            androidx.compose.animation.AnimatedVisibility(
                visible = mode == CollectMode.Quick,
                enter   = androidx.compose.animation.slideInHorizontally { -it },
                exit    = androidx.compose.animation.slideOutHorizontally { -it }
            ) {
                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text("Collect Fee", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(Modifier.height(4.dp))
                        HorizontalDivider(color = Border)
                    }
                    // Current room / plan card
                    item {
                        if (primaryPlan == null) {
                            Surface(
                                Modifier.fillMaxWidth(), RoundedCornerShape(12.dp),
                                color = Background, border = BorderStroke(1.dp, Border)
                            ) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(if (isPg) "No room selected" else "No plan selected", fontSize = 14.sp, color = TextSecondary)
                                    OutlinedButton(
                                        onClick = { mode = CollectMode.PlanPicker },
                                        shape  = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, Primary)
                                    ) { Text(if (isPg) "Select Room" else "Select Plan", color = Primary, fontSize = 13.sp) }
                                }
                            }
                        } else {
                            Surface(
                                Modifier.fillMaxWidth(), RoundedCornerShape(12.dp),
                                color  = Primary.copy(alpha = 0.05f),
                                border = BorderStroke(1.5.dp, Primary.copy(alpha = 0.3f))
                            ) {
                                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.Top) {
                                        Column(Modifier.weight(1f)) {
                                            if (isPg && currentRoom != null) {
                                                Text("🛏️ ${currentRoom.name}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                                if (!currentRoom.description.isNullOrBlank()) {
                                                    Spacer(Modifier.height(2.dp))
                                                    Text(currentRoom.description, fontSize = 11.sp, color = TextSecondary)
                                                }
                                                Spacer(Modifier.height(4.dp))
                                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                                    Surface(shape = RoundedCornerShape(4.dp), color = Primary.copy(alpha = 0.1f)) {
                                                        Text(
                                                            primaryPlan.name,
                                                            Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                            fontSize = 10.sp, fontWeight = FontWeight.Medium, color = Primary
                                                        )
                                                    }
                                                    Surface(shape = RoundedCornerShape(4.dp), color = Border.copy(alpha = 0.6f)) {
                                                        Text(
                                                            primaryPlan.frequency.replaceFirstChar { it.uppercase() },
                                                            Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                            fontSize = 10.sp, fontWeight = FontWeight.Medium, color = TextSecondary
                                                        )
                                                    }
                                                }
                                            } else {
                                                Text(primaryPlan.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                                Spacer(Modifier.height(4.dp))
                                                Surface(shape = RoundedCornerShape(4.dp), color = Primary.copy(alpha = 0.1f)) {
                                                    Text(
                                                        primaryPlan.frequency.replaceFirstChar { it.uppercase() },
                                                        Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                        fontSize = 10.sp, fontWeight = FontWeight.Medium, color = Primary
                                                    )
                                                }
                                            }
                                        }
                                        TextButton(
                                            onClick = { mode = CollectMode.PlanPicker },
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(if (isPg) "Change Room →" else "Change Plan →", fontSize = 12.sp, color = Primary, fontWeight = FontWeight.Medium)
                                        }
                                    }
                                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                        Text("Amount", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f))
                                        OutlinedTextField(
                                            value = primaryPlan.amount,
                                            onValueChange = { v -> if (v.all { c -> c.isDigit() || c == '.' }) onAmount(primaryPlan.feeStructureId, v) },
                                            modifier = Modifier.width(130.dp),
                                            singleLine = true,
                                            prefix = { Text("₹", fontSize = 13.sp) },
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            shape = RoundedCornerShape(8.dp),
                                            colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                                        )
                                    }
                                    EmsDateField(
                                        label = "Next Renewal Date",
                                        value = primaryPlan.nextDateStr,
                                        onValueChange = { onNextDate(primaryPlan.feeStructureId, it) },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }
                        }
                    }
                    // Add-ons collapsible
                    if (addonItems.isNotEmpty()) {
                        item {
                            val addonSel = addonItems.count { it.checked }
                            Surface(
                                Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { showAddons = !showAddons },
                                RoundedCornerShape(10.dp), color = Background
                            ) {
                                Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                                    Arrangement.SpaceBetween, Alignment.CenterVertically) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("🧩", fontSize = 16.sp)
                                        Text("Add-on Services", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                                        if (addonSel > 0) {
                                            Box(Modifier.size(20.dp).clip(RoundedCornerShape(10.dp)).background(Primary), Alignment.Center) {
                                                Text("$addonSel", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            }
                                        }
                                    }
                                    Text(if (showAddons) "▲" else "▼", fontSize = 11.sp, color = TextMuted)
                                }
                            }
                        }
                        if (showAddons) {
                            items(addonItems) { item ->
                                AddonRow(item, onToggle, onAmount)
                                Spacer(Modifier.height(4.dp))
                            }
                        }
                    }
                }
            }

            // Room / Plan picker view (slides in from right)
            androidx.compose.animation.AnimatedVisibility(
                visible = mode == CollectMode.PlanPicker,
                enter   = androidx.compose.animation.slideInHorizontally { it },
                exit    = androidx.compose.animation.slideOutHorizontally { it }
            ) {
                if (isPg) {
                    RoomPickerContent(
                        groups             = feeGroups,
                        structures         = feeStructures,
                        currentRoomId      = selectedFeeGroupId,
                        onBack             = { mode = CollectMode.Quick },
                        onSelect           = { roomId -> onSelectRoom(roomId); mode = CollectMode.Quick }
                    )
                } else {
                    PlanPickerContent(
                        primaryItems  = primaryItems,
                        currentPlanId = primaryPlan?.feeStructureId,
                        onBack        = { mode = CollectMode.Quick },
                        onSelect      = { planId -> onSelectPlan(planId); mode = CollectMode.Quick }
                    )
                }
            }
        }

        // ── Fixed bottom: payment controls + collect button ──
        androidx.compose.animation.AnimatedVisibility(visible = mode == CollectMode.Quick) {
            Column {
                HorizontalDivider(color = Border)
                Column(
                    Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp)
                        .padding(top = 12.dp, bottom = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Payment date
                    EmsDateField(
                        label = "Payment Date",
                        value = paymentDate,
                        onValueChange = onPaymentDate,
                        modifier = Modifier.fillMaxWidth()
                    )
                    // Payment method selector
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("cash", "online", "card", "upi").forEach { m ->
                            val sel = paymentMethod == m
                            Surface(
                                Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).clickable { onPayMethod(m) },
                                RoundedCornerShape(8.dp),
                                color  = if (sel) Primary else Background,
                                border = if (!sel) BorderStroke(1.dp, Border) else null
                            ) {
                                Text(m.uppercase(), Modifier.padding(vertical = 9.dp),
                                    fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                    color = if (sel) Color.White else TextSecondary,
                                    textAlign = TextAlign.Center)
                            }
                        }
                    }
                    // Notes
                    OutlinedTextField(
                        value = notes, onValueChange = onNotes,
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Notes (optional)", fontSize = 12.sp) },
                        maxLines = 2, shape = RoundedCornerShape(8.dp),
                        colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                    )
                    // Total + Collect button
                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                        Column {
                            Text("Total", fontSize = 12.sp, color = TextSecondary)
                            Text(inrFmt(total), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Success)
                        }
                        Button(
                            onClick  = onCollect,
                            enabled  = !isSaving && total > 0,
                            modifier = Modifier.height(48.dp),
                            shape    = RoundedCornerShape(12.dp),
                            colors   = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) {
                            if (isSaving) CircularProgressIndicator(Modifier.size(18.dp), Color.White, 2.dp)
                            else Text("Collect ${inrFmt(total)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

// ── Room picker (PG Mode) ─────────────────────────────────────────────────────
@Composable
private fun RoomPickerContent(
    groups: List<FeeGroupDto>,
    structures: List<FeeStructureDto>,
    currentRoomId: String?,
    onBack: () -> Unit,
    onSelect: (String) -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize().navigationBarsPadding(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Text("\u2190", fontSize = 20.sp, color = Primary, fontWeight = FontWeight.Bold)
                }
                Text("Select Room", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
            HorizontalDivider(color = Border)
            Spacer(Modifier.height(4.dp))
        }

        if (groups.isEmpty()) {
            item {
                Box(Modifier.fillMaxWidth().padding(24.dp), Alignment.Center) {
                    Text("No rooms configured", color = TextMuted, fontSize = 13.sp)
                }
            }
        } else {
            items(groups) { room ->
                val isSel = room._id == currentRoomId
                val roomFull = room.isFull && !isSel

                // Find linked structure tariff
                val linkedPlan = structures.firstOrNull { !it.isAddon && it.feeGroupId == room._id }
                    ?: structures.firstOrNull { !it.isAddon && it.name.contains("${room.capacity}", ignoreCase = true) }
                    ?: structures.firstOrNull { !it.isAddon }

                Surface(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .clickable(enabled = !roomFull) { onSelect(room._id) },
                    RoundedCornerShape(10.dp),
                    color  = if (isSel) Primary.copy(alpha = 0.06f) else Surface,
                    border = BorderStroke(if (isSel) 1.5.dp else 1.dp, if (isSel) Primary.copy(alpha = 0.5f) else Border)
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                        Arrangement.SpaceBetween, Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    room.name,
                                    fontSize = 15.sp,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                    color = if (roomFull) TextMuted else TextPrimary
                                )
                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (room.isFull) Danger.copy(alpha = 0.12f) else Success.copy(alpha = 0.12f)
                                ) {
                                    Text(
                                        text = if (room.isFull) "🔴 Full (${room.occupiedCount}/${room.capacity})" else "🟩 ${room.vacantCount} Vacant",
                                        fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                        color = if (room.isFull) Danger else Success,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            if (!room.description.isNullOrBlank()) {
                                Spacer(Modifier.height(2.dp))
                                Text(room.description, fontSize = 11.sp, color = TextSecondary)
                            }
                        }

                        if (linkedPlan != null) {
                            Column(horizontalAlignment = Alignment.End) {
                                Text("₹${linkedPlan.amount.toInt()}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (isSel) Primary else TextPrimary)
                                Text(linkedPlan.frequency.replaceFirstChar { it.uppercase() }, fontSize = 10.sp, color = TextMuted)
                            }
                        }

                        if (isSel) {
                            Spacer(Modifier.width(8.dp))
                            Box(Modifier.size(20.dp).clip(RoundedCornerShape(10.dp)).background(Primary), Alignment.Center) {
                                Text("✓", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Plan picker ──────────────────────────────────────────────────────────────
@Composable
private fun PlanPickerContent(
    primaryItems: List<CartItemState>,
    currentPlanId: String?,
    onBack: () -> Unit,
    onSelect: (String) -> Unit
) {
    val groups = primaryItems.groupBy { it.groupName ?: "Membership Plans" }

    LazyColumn(
        Modifier.fillMaxSize().navigationBarsPadding(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Text("\u2190", fontSize = 20.sp, color = Primary, fontWeight = FontWeight.Bold)
                }
                Text("Select Room / Tariff Plan", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
            HorizontalDivider(color = Border)
            Spacer(Modifier.height(4.dp))
        }
        groups.forEach { (groupName, items) ->
            item {
                Text(
                    groupName.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold,
                    color = TextMuted, letterSpacing = 1.sp,
                    modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                )
            }
            items(items) { item ->
                val isSel = item.feeStructureId == currentPlanId
                Surface(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { onSelect(item.feeStructureId) },
                    RoundedCornerShape(10.dp),
                    color  = if (isSel) Primary.copy(alpha = 0.06f) else Surface,
                    border = BorderStroke(if (isSel) 1.5.dp else 1.dp, if (isSel) Primary.copy(alpha = 0.5f) else Border)
                ) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                        Arrangement.SpaceBetween, Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(item.name, fontSize = 14.sp,
                                fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSel) TextPrimary else TextSecondary)
                            Spacer(Modifier.height(2.dp))
                            Text(item.frequency.replaceFirstChar { it.uppercase() }, fontSize = 11.sp, color = TextMuted)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("\u20b9${item.defaultAmount.toInt()}", fontSize = 14.sp, fontWeight = FontWeight.Bold,
                                color = if (isSel) Primary else TextSecondary)
                            if (isSel) {
                                Box(Modifier.size(20.dp).clip(RoundedCornerShape(10.dp)).background(Primary), Alignment.Center) {
                                    Text("\u2713", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Add-on row ───────────────────────────────────────────────────────────────
@Composable
private fun AddonRow(
    item: CartItemState,
    onToggle: (String) -> Unit,
    onAmount: (String, String) -> Unit
) {
    Surface(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { onToggle(item.feeStructureId) },
        RoundedCornerShape(10.dp),
        color  = if (item.checked) Primary.copy(alpha = 0.04f) else Surface,
        border = BorderStroke(if (item.checked) 1.5.dp else 1.dp, if (item.checked) Primary.copy(alpha = 0.4f) else Border)
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    Modifier.size(18.dp).clip(RoundedCornerShape(4.dp))
                        .background(if (item.checked) Primary else Color.Transparent)
                        .border(BorderStroke(2.dp, if (item.checked) Primary else Border), RoundedCornerShape(4.dp)),
                    Alignment.Center
                ) {
                    if (item.checked) Text("\u2713", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.ExtraBold)
                }
                Column {
                    Text(item.name, fontSize = 13.sp,
                        fontWeight = if (item.checked) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (item.checked) TextPrimary else TextSecondary)
                    Text(item.frequency.replaceFirstChar { it.uppercase() }, fontSize = 10.sp, color = TextMuted)
                }
            }
            OutlinedTextField(
                value = item.amount,
                onValueChange = { v -> if (v.all { c -> c.isDigit() || c == '.' }) onAmount(item.feeStructureId, v) },
                modifier = Modifier.width(80.dp), singleLine = true,
                prefix  = { Text("\u20b9", fontSize = 11.sp) }, enabled = item.checked,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Border, focusedBorderColor = Primary,
                    disabledBorderColor  = Border.copy(alpha = 0.3f)
                )
            )
        }
    }
}

// ── Check-Out Settlement Sheet ───────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CheckoutSheet(
    member: MemberDetailDto,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onConfirmCheckout: (CheckoutMemberRequest) -> Unit
) {
    val todayStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }
    var checkoutDate by remember { mutableStateOf(todayStr) }
    var depositAmountStr by remember { mutableStateOf("5000") }
    var pendingDuesStr by remember { mutableStateOf(String.format(Locale.US, "%.0f", member.pendingAmount ?: 0.0)) }
    var deductionsStr by remember { mutableStateOf("0") }
    var deductionReason by remember { mutableStateOf("") }
    var refundMethod by remember { mutableStateOf("cash") }
    var notes by remember { mutableStateOf("") }

    val deposit = depositAmountStr.toDoubleOrNull() ?: 0.0
    val pending = pendingDuesStr.toDoubleOrNull() ?: 0.0
    val deductions = deductionsStr.toDoubleOrNull() ?: 0.0
    val netRefund = maxOf(0.0, deposit - pending - deductions)

    Column(
        Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Column {
                Text("🚪 Check-Out & Settlement", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Vacate room bed & settle security deposit", fontSize = 12.sp, color = TextSecondary)
            }
            IconButton(onClick = onDismiss) { Text("✕", fontSize = 18.sp, color = TextSecondary) }
        }

        // Room & Member Badge
        Surface(
            shape = RoundedCornerShape(10.dp),
            color = Primary.copy(alpha = 0.06f),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("🛏️", fontSize = 20.sp)
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("${member.firstName} ${member.lastName}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Assigned: ${member.groupName ?: "Room"}", fontSize = 12.sp, color = Primary, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // Checkout Date
        EmsDateField(label = "Check-Out Date *", value = checkoutDate, onValueChange = { checkoutDate = it })

        // Financial Inputs
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = depositAmountStr,
                onValueChange = { depositAmountStr = it },
                label = { Text("Security Deposit (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            )
            OutlinedTextField(
                value = pendingDuesStr,
                onValueChange = { pendingDuesStr = it },
                label = { Text("Pending Dues (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            )
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = deductionsStr,
                onValueChange = { deductionsStr = it },
                label = { Text("Deductions (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            )
            OutlinedTextField(
                value = deductionReason,
                onValueChange = { deductionReason = it },
                label = { Text("Deduction Reason") },
                placeholder = { Text("e.g. Repairs") },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            )
        }

        // Live Net Refund Card
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = if (netRefund > 0) Success.copy(alpha = 0.1f) else SurfaceLight),
            border = BorderStroke(1.dp, if (netRefund > 0) Success.copy(alpha = 0.4f) else Border),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                Modifier.fillMaxWidth().padding(14.dp),
                Arrangement.SpaceBetween,
                Alignment.CenterVertically
            ) {
                Column {
                    Text("Net Deposit Refund", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                    Text("Deposit (₹$deposit) − Dues (₹$pending) − Deductions (₹$deductions)", fontSize = 10.sp, color = TextMuted)
                }
                Text(inrFmt(netRefund), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = if (netRefund > 0) Success else TextPrimary)
            }
        }

        // Refund Payment Method
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Refund Payment Method", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("cash" to "💵 Cash", "upi" to "📱 UPI", "bank" to "🏦 Bank Transfer").forEach { (method, label) ->
                    val sel = refundMethod == method
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (sel) Primary else Surface,
                        border = BorderStroke(1.dp, if (sel) Primary else Border),
                        modifier = Modifier.clickable { refundMethod = method }
                    ) {
                        Text(label, Modifier.padding(horizontal = 12.dp, vertical = 6.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (sel) Color.White else TextPrimary)
                    }
                }
            }
        }

        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Settlement Remarks / Notes") },
            placeholder = { Text("e.g. Returned room keys in good condition") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp)
        )

        Button(
            onClick = {
                onConfirmCheckout(
                    CheckoutMemberRequest(
                        checkoutDate    = checkoutDate,
                        depositAmount   = deposit,
                        pendingDues     = pending,
                        deductions      = deductions,
                        deductionReason = deductionReason.ifEmpty { null },
                        netRefunded     = netRefund,
                        refundMethod    = refundMethod,
                        notes           = notes.ifEmpty { null }
                    )
                )
            },
            enabled = !isSaving,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Danger)
        ) {
            if (isSaving) {
                CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
            } else {
                Text("Confirm Check-Out & Release Bed", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

// ── Checkout Settlement Card ─────────────────────────────────────────────────
@Composable
private fun CheckoutSettlementCard(
    checkout: CheckoutDetailsDto,
    onShare: () -> Unit
) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp)
            .border(1.dp, Color(0xFFFDE68A), RoundedCornerShape(12.dp)),
        RoundedCornerShape(12.dp),
        CardDefaults.cardColors(Color(0xFFFFFBEB))
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🚪", fontSize = 16.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("Check-Out Settlement", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF92400E))
                }
                Text(fmtDate(checkout.checkoutDate), fontSize = 12.sp, color = Color(0xFFB45309), fontWeight = FontWeight.Medium)
            }

            HorizontalDivider(color = Color(0xFFFDE68A))

            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                Text("Security Deposit", fontSize = 12.sp, color = TextSecondary)
                Text(inrFmt(checkout.depositAmount), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            }

            if (checkout.pendingDues > 0) {
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                    Text("Pending Dues Deducted", fontSize = 12.sp, color = Danger)
                    Text("-${inrFmt(checkout.pendingDues)}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Danger)
                }
            }

            if (checkout.deductions > 0) {
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                    Text("Deductions${checkout.deductionReason?.let { " ($it)" } ?: ""}", fontSize = 12.sp, color = Danger)
                    Text("-${inrFmt(checkout.deductions)}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Danger)
                }
            }

            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text("Net Deposit Refunded", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                Text(
                    "${inrFmt(checkout.netRefunded)} (${checkout.refundMethod.uppercase()})",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF059669)
                )
            }

            if (!checkout.notes.isNullOrEmpty()) {
                Text("Remarks: ${checkout.notes}", fontSize = 11.sp, color = TextMuted)
            }

            OutlinedButton(
                onClick = onShare,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                shape = RoundedCornerShape(8.dp),
                border = BorderStroke(1.dp, Color(0xFF25D366))
            ) {
                Text("💬 Share Settlement on WhatsApp", fontSize = 12.sp, color = Color(0xFF128C7E), fontWeight = FontWeight.Bold)
            }
        }
    }
}
