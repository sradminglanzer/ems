package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.FeePaymentDto
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.data.api.MemberDetailDto
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

    var showCollectSheet  by remember { mutableStateOf(false) }
    var showReceiptDialog by remember { mutableStateOf(false) }
    var receiptInfo       by remember { mutableStateOf<Pair<String?, Double>>(null to 0.0) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

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

    if (showCollectSheet) {
        ModalBottomSheet(
            onDismissRequest = { showCollectSheet = false },
            containerColor = Surface
        ) {
            CollectFeeSheet(
                cartItems     = vm.cartItems,
                notes         = vm.notes,
                paymentMethod = vm.paymentMethod,
                isSaving      = isSaving,
                onToggle      = { vm.toggleCartItem(it) },
                onAmount      = { id, amt -> vm.updateCartAmount(id, amt) },
                onNextDate    = { id, d   -> vm.updateNextDate(id, d) },
                onNotes       = { vm.updateNotes(it) },
                onPayMethod   = { vm.updatePaymentMethod(it) },
                onCollect     = { vm.collectFee() }
            )
        }
    }

    if (showReceiptDialog) {
        AlertDialog(
            onDismissRequest = { showReceiptDialog = false },
            confirmButton = {
                TextButton(onClick = { showReceiptDialog = false }) {
                    Text("Done", color = Primary, fontWeight = FontWeight.Bold)
                }
            },
            title = { Text("✅ Payment Recorded", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    receiptInfo.first?.let {
                        Text("Receipt: $it", fontSize = 14.sp, color = TextSecondary)
                    }
                    Text(
                        "Amount Collected: ${inrFmt(receiptInfo.second)}",
                        fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Success
                    )
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
                        onDelete = { showDeleteConfirm = true }
                    )
                }

                // Personal details
                item { SCard { PersonalDetails(m, session?.isGym ?: false) } }

                // Financial overview (non-teacher admins)
                if (session?.isTeacher != true) {
                    val totalPaid = payments.sumOf { it.amount }
                    item { SCard { FinancialOverview(m.totalFee, totalPaid) } }
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
                            PaymentCard(p, feeStructures)
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
    onDelete: () -> Unit
) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        RoundedCornerShape(14.dp), CardDefaults.cardColors(Surface), CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            ActionBtn("✎ Edit", Primary.copy(.12f), Primary, Modifier.weight(1f), onEdit)
            if (isAdmin) {
                ActionBtn("💰 Fee", Color(0xFF059669).copy(.12f), Color(0xFF059669), Modifier.weight(1f), onCollect)
            }
            if (isAdmin) {
                if (status == "active") {
                    ActionBtn("⏸ Hold", Color(0xFFF59E0B).copy(.12f), Color(0xFFD97706), Modifier.weight(1f), onHold)
                } else {
                    ActionBtn("▶ Resume", Color(0xFF10B981).copy(.12f), Color(0xFF059669), Modifier.weight(1f), onResume)
                }
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
                    Text("🗑 Delete Member", color = Danger, fontSize = 13.sp, fontWeight = FontWeight.Bold)
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
private fun PersonalDetails(m: MemberDetailDto, isGym: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("👤", fontSize = 18.sp); Spacer(Modifier.width(8.dp))
        Text("Personal Details", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
    }
    Spacer(Modifier.height(12.dp))
    val items = buildList<Pair<String, String>> {
        if (!isGym && !m.knownId.isNullOrEmpty()) add("Roll / ID" to m.knownId)
        if (isGym) add("Plans" to (m.addonNames?.joinToString(", ")?.ifEmpty { "None" } ?: "None"))
        else m.groupName?.let { add("Class Enrolled" to it) }
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

// ── Financial overview ────────────────────────────────────────────────────────
@Composable
private fun FinancialOverview(totalFee: Double, totalPaid: Double) {
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
private fun PaymentCard(p: FeePaymentDto, structures: List<FeeStructureDto>) {
    val structName = structures.find { it._id == p.feeStructureId }?.name ?: "Fee Payment"
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
            .border(1.dp, Border, RoundedCornerShape(10.dp)),
        RoundedCornerShape(10.dp), CardDefaults.cardColors(Surface), CardDefaults.cardElevation(0.dp)
    ) {
        Row(Modifier.fillMaxWidth().padding(12.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
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
@Composable
private fun CollectFeeSheet(
    cartItems: List<CartItemState>,
    notes: String,
    paymentMethod: String,
    isSaving: Boolean,
    onToggle: (String) -> Unit,
    onAmount: (String, String) -> Unit,
    onNextDate: (String, String) -> Unit,
    onNotes: (String) -> Unit,
    onPayMethod: (String) -> Unit,
    onCollect: () -> Unit
) {
    val total = cartItems.filter { it.checked }.sumOf { it.amount.toDoubleOrNull() ?: 0.0 }

    Column(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Collect Fee", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary,
            modifier = Modifier.padding(top = 8.dp))
        HorizontalDivider(color = Border)

        if (cartItems.isEmpty()) {
            Text("No fee structures available.", color = TextSecondary,
                modifier = Modifier.padding(vertical = 16.dp))
        } else {
            // ── Fee structure rows ──
            cartItems.forEach { item ->
                Column(Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = item.checked, onCheckedChange = { onToggle(item.feeStructureId) },
                            colors = CheckboxDefaults.colors(checkedColor = Primary))
                        Column(Modifier.weight(1f).padding(start = 4.dp)) {
                            Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text(item.frequency, fontSize = 11.sp, color = TextMuted)
                        }
                        OutlinedTextField(
                            value         = item.amount,
                            onValueChange = { v -> if (v.all { c -> c.isDigit() || c == '.' }) onAmount(item.feeStructureId, v) },
                            modifier      = Modifier.width(100.dp),
                            singleLine    = true,
                            prefix        = { Text("₹", fontSize = 13.sp) },
                            enabled       = item.checked,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape         = RoundedCornerShape(8.dp),
                            colors        = OutlinedTextFieldDefaults.colors(
                                unfocusedBorderColor = Border, focusedBorderColor = Primary)
                        )
                    }
                    if (item.checked) {
                        EmsDateField(
                            label         = "Next Renewal Date",
                            value         = item.nextDateStr,
                            onValueChange = { onNextDate(item.feeStructureId, it) },
                            modifier      = Modifier.fillMaxWidth().padding(start = 48.dp, bottom = 4.dp)
                        )
                    }
                }
            }

            HorizontalDivider(color = Border)

            // ── Payment Method ──
            Text("Payment Method", fontSize = 12.sp, color = TextSecondary)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("cash", "online", "card", "upi").forEach { m ->
                    val sel = paymentMethod == m
                    Surface(
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp))
                            .clickable { onPayMethod(m) },
                        shape  = RoundedCornerShape(8.dp),
                        color  = if (sel) Primary else Background,
                        border = if (!sel) BorderStroke(1.dp, Border) else null
                    ) {
                        Text(
                            m.uppercase(), Modifier.padding(vertical = 10.dp),
                            fontSize = 12.sp, fontWeight = FontWeight.Bold,
                            color = if (sel) Color.White else TextSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }

            // ── Notes ──
            OutlinedTextField(
                value         = notes,
                onValueChange = onNotes,
                modifier      = Modifier.fillMaxWidth(),
                label         = { Text("Notes (optional)", fontSize = 12.sp) },
                minLines      = 2,
                maxLines      = 3,
                shape         = RoundedCornerShape(8.dp),
                colors        = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )

            // ── Total & Collect button ──
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text("Total", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text(inrFmt(total), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Success)
            }

            Button(
                onClick   = onCollect,
                enabled   = !isSaving && total > 0,
                modifier  = Modifier.fillMaxWidth().height(50.dp),
                shape     = RoundedCornerShape(12.dp),
                colors    = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSaving) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text("Collect ${inrFmt(total)}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
