package com.srgs.ems.ui.screens.main

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.*
import com.srgs.ems.ui.components.EmsDateField
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.MONTHS
import com.srgs.ems.viewmodel.StaffViewModel

private fun inr(amt: Double): String = String.format("₹%,.0f", amt)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffScreen(vm: StaffViewModel = viewModel()) {
    val session = SessionManager.session
    val canManage = session?.role == "admin" || session?.role == "owner" || session?.role == "superadmin"

    val selectedTab by vm.selectedTab.collectAsState()
    val staffList by vm.staffList.collectAsState()
    val feeGroups by vm.feeGroups.collectAsState()
    val subjects by vm.subjects.collectAsState()
    val staffRoles by vm.staffRoles.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val monthlyPayroll by vm.monthlyPayroll.collectAsState()
    val processStaffItem by vm.processStaffItem.collectAsState()
    val activePayslip by vm.activePayslipRecord.collectAsState()

    val snackbar = remember { SnackbarHostState() }
    var showFormSheet by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<StaffDto?>(null) }
    var roleFilter by remember { mutableStateOf("all") }

    // Collect snackbar events
    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
            if (showFormSheet && msg.startsWith("✅")) showFormSheet = false
        }
    }

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    // ── Official Salary Slip Dialog ───────────────────────────────────────────
    activePayslip?.let { payslip ->
        InAppSalarySlipDialog(
            payslip    = payslip,
            schoolName = session?.name ?: "School",
            onDismiss  = { vm.activePayslipRecord.value = null }
        )
    }

    // ── Delete Confirmation Dialog ────────────────────────────────────────────
    deleteTarget?.let { staff ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Remove Staff Member", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to remove ${staff.name}? This cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        vm.deleteStaff(staff._id)
                        deleteTarget = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger)
                ) { Text("Remove", color = Color.White) }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) { Text("Cancel", color = TextSecondary) }
            }
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            Column {
                EmsTopBar(title = "Teachers & Staff", scrollBehavior = scrollBehavior)
                // Tab Bar Switcher
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Surface,
                    contentColor = Primary,
                    divider = { HorizontalDivider(color = Border) }
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { vm.selectedTab.value = 0 },
                        text = { Text("👥 Teachers & Staff", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { vm.selectedTab.value = 1; vm.loadPayroll() },
                        text = { Text("💰 School Payroll", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
                    )
                }
            }
        },
        floatingActionButton = {
            if (canManage && selectedTab == 0) {
                FloatingActionButton(
                    onClick = {
                        vm.resetForm()
                        showFormSheet = true
                    },
                    containerColor = Primary,
                    contentColor = Color.White,
                    shape = CircleShape
                ) {
                    Text("+", fontSize = 28.sp, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
        } else {
            when (selectedTab) {
                0 -> {
                    // ── Tab 1: Teachers & Staff Hub ───────────────────────────
                    val filteredStaff = if (roleFilter == "all") staffList else staffList.filter { it.role == roleFilter }

                    LazyColumn(
                        contentPadding = PaddingValues(
                            top = padding.calculateTopPadding() + 12.dp,
                            start = 16.dp, end = 16.dp, bottom = 80.dp
                        ),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        item {
                            // Role filters
                            Row(
                                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf("all" to "All Staff (${staffList.size})", "teacher" to "Teachers", "admin" to "Admin", "staff" to "Support Staff").forEach { (code, label) ->
                                    val isSel = roleFilter == code
                                    FilterChip(
                                        selected = isSel,
                                        onClick  = { roleFilter = code },
                                        label    = { Text(label, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                        colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                                        shape    = RoundedCornerShape(8.dp)
                                    )
                                }
                            }
                            Spacer(Modifier.height(4.dp))
                        }

                        if (filteredStaff.isEmpty()) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(top = 40.dp), Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("👥", fontSize = 48.sp)
                                        Spacer(Modifier.height(8.dp))
                                        Text("No staff members found", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text("Tap + to add a teacher or staff member", fontSize = 13.sp, color = TextSecondary)
                                    }
                                }
                            }
                        } else {
                            items(filteredStaff, key = { it._id }) { staff ->
                                val classTeacherGroup = feeGroups.firstOrNull { it._id == staff.assignedClassTeacherGroupId }
                                StaffMemberCard(
                                    staff               = staff,
                                    classTeacherGroup   = classTeacherGroup?.name,
                                    canManage           = canManage,
                                    onEdit              = {
                                        vm.startEditStaff(staff)
                                        showFormSheet = true
                                    },
                                    onDelete            = { deleteTarget = staff }
                                )
                            }
                        }
                    }
                }

                1 -> {
                    // ── Tab 2: School Payroll ─────────────────────────────────
                    PayrollTabContent(
                        vm         = vm,
                        payroll    = monthlyPayroll,
                        canManage  = canManage,
                        padding    = padding,
                        onViewPayslip = { vm.activePayslipRecord.value = it }
                    )
                }
            }
        }

        // Add/Edit Staff Bottom Sheet
        if (showFormSheet) {
            StaffFormSheet(
                vm         = vm,
                feeGroups  = feeGroups,
                subjects   = subjects,
                onDismiss  = { showFormSheet = false }
            )
        }

        // Process Salary Bottom Sheet
        if (processStaffItem != null) {
            ProcessSalarySheet(
                vm        = vm,
                item      = processStaffItem!!,
                onDismiss = { vm.processStaffItem.value = null }
            )
        }
    }
}

// ── Staff Member Card ─────────────────────────────────────────────────────────
@Composable
private fun StaffMemberCard(
    staff: StaffDto,
    classTeacherGroup: String?,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val context = LocalContext.current
    val roleColor = when (staff.role) {
        "teacher" -> Color(0xFF2563EB)
        "admin", "owner" -> Color(0xFF7C3AED)
        "accountant" -> Color(0xFF059669)
        else -> Color(0xFF4B5563)
    }

    Card(
        Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(14.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        border    = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Avatar
                Box(
                    Modifier.size(44.dp).clip(CircleShape).background(roleColor.copy(alpha = 0.12f)),
                    Alignment.Center
                ) {
                    Text(
                        staff.name.take(1).uppercase(),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = roleColor
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(staff.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        if (!staff.employeeId.isNullOrBlank()) {
                            Spacer(Modifier.width(6.dp))
                            Surface(shape = RoundedCornerShape(4.dp), color = Background) {
                                Text(
                                    staff.employeeId,
                                    Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                                    fontSize = 10.sp, color = TextMuted, fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                    Text(
                        staff.designation ?: staff.role.replaceFirstChar { it.uppercase() },
                        fontSize = 12.sp, color = TextSecondary
                    )
                }

                // Call Shortcut
                if (staff.contactNumber.isNotBlank()) {
                    IconButton(
                        onClick = {
                            try {
                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${staff.contactNumber}"))
                                context.startActivity(intent)
                            } catch (_: Exception) {}
                        },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Text("📞", fontSize = 16.sp)
                    }
                }
            }

            // Badges & Workload row
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                // Role Badge
                Surface(shape = RoundedCornerShape(6.dp), color = roleColor.copy(alpha = 0.1f)) {
                    Text(
                        staff.role.uppercase(),
                        Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = roleColor
                    )
                }

                // Class Teacher Badge
                if (!classTeacherGroup.isNullOrBlank()) {
                    Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFEF3C7)) {
                        Text(
                            "⭐ Class Teacher: $classTeacherGroup",
                            Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFB45309)
                        )
                    }
                }

                // Salary badge
                if (staff.monthlySalary != null && staff.monthlySalary > 0) {
                    Surface(shape = RoundedCornerShape(6.dp), color = Background) {
                        Text(
                            "${inr(staff.monthlySalary)}/mo",
                            Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextSecondary
                        )
                    }
                }
            }

            // Subject Teaching Allocations
            if (staff.assignedSubjects.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(6.dp))
                Text("TEACHING PERIODS", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = TextMuted, letterSpacing = 0.5.sp)
                Spacer(Modifier.height(4.dp))
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    staff.assignedSubjects.forEach { alloc ->
                        Surface(shape = RoundedCornerShape(6.dp), color = Primary.copy(alpha = 0.08f), border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))) {
                            Text(
                                "📐 ${alloc.subjectName} (${alloc.feeGroupName ?: "Class"})",
                                Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 11.sp, color = Primary, fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            // Action Buttons
            if (canManage) {
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onEdit, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)) {
                        Text("Edit Profile", fontSize = 12.sp, color = Primary, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = onDelete, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)) {
                        Text("Remove", fontSize = 12.sp, color = Danger)
                    }
                }
            }
        }
    }
}

// ── Payroll Tab Content ───────────────────────────────────────────────────────
@Composable
private fun PayrollTabContent(
    vm: StaffViewModel,
    payroll: MonthlyPayrollResponseDto?,
    canManage: Boolean,
    padding: PaddingValues,
    onViewPayslip: (SalaryPaymentRecordDto) -> Unit
) {
    val curMonth by vm.selectedMonth.collectAsState()
    val curYear by vm.selectedYear.collectAsState()

    LazyColumn(
        contentPadding = PaddingValues(
            top = padding.calculateTopPadding() + 12.dp,
            start = 16.dp, end = 16.dp, bottom = 80.dp
        ),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Month & Year Selector
        item {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(Surface),
                border = BorderStroke(1.dp, Border)
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = {
                        if (curMonth == 1) {
                            vm.selectedMonth.value = 12
                            vm.selectedYear.value = curYear - 1
                        } else {
                            vm.selectedMonth.value = curMonth - 1
                        }
                        vm.loadPayroll()
                    }) { Text("‹", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Primary) }

                    Text(
                        "${MONTHS[curMonth - 1]} $curYear",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    IconButton(onClick = {
                        if (curMonth == 12) {
                            vm.selectedMonth.value = 1
                            vm.selectedYear.value = curYear + 1
                        } else {
                            vm.selectedMonth.value = curMonth + 1
                        }
                        vm.loadPayroll()
                    }) { Text("›", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Primary) }
                }
            }
        }

        // Summary Banner
        payroll?.let { p ->
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(Primary.copy(alpha = 0.06f)),
                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("TOTAL DISBURSED", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
                            Text(inr(p.totalDisbursed), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Primary)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Paid", fontSize = 11.sp, color = TextSecondary)
                                Text("${p.paidCount}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Success)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Pending", fontSize = 11.sp, color = TextSecondary)
                                Text("${p.pendingCount}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Danger)
                            }
                        }
                    }
                }
            }

            // Staff Items
            items(p.payroll, key = { it.staffId }) { item ->
                Card(
                    Modifier.fillMaxWidth(),
                    shape  = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(Surface),
                    border = BorderStroke(1.dp, Border)
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(item.staffName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(
                                item.designation ?: item.staffRole.replaceFirstChar { it.uppercase() },
                                fontSize = 12.sp, color = TextSecondary
                            )
                            Text("Base: ${inr(item.monthlySalary)}", fontSize = 11.sp, color = TextMuted)
                        }

                        if (item.status == "paid" && item.paymentRecord != null) {
                            Column(horizontalAlignment = Alignment.End) {
                                Surface(shape = RoundedCornerShape(6.dp), color = Success.copy(alpha = 0.12f)) {
                                    Text("PAID", Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Success)
                                }
                                TextButton(
                                    onClick = { onViewPayslip(item.paymentRecord) },
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Text("📄 Salary Slip", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                                }
                            }
                        } else {
                            if (canManage) {
                                Button(
                                    onClick = { vm.startProcessSalary(item) },
                                    shape   = RoundedCornerShape(8.dp),
                                    colors  = ButtonDefaults.buttonColors(containerColor = Primary),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Text("💰 Pay", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            } else {
                                Surface(shape = RoundedCornerShape(6.dp), color = Danger.copy(alpha = 0.12f)) {
                                    Text("PENDING", Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Danger)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── In-App Official Salary Slip Dialog ────────────────────────────────────────
@Composable
private fun InAppSalarySlipDialog(
    payslip: SalaryPaymentRecordDto,
    schoolName: String,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🏫 $schoolName", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Primary, textAlign = TextAlign.Center)
                Text("SALARY STATEMENT", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 1.sp)
                Text("${MONTHS[payslip.month - 1]} ${payslip.year}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            }
        },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Staff info card
                Surface(shape = RoundedCornerShape(8.dp), color = Background, border = BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(10.dp)) {
                        Text("Employee: ${payslip.staffName}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        if (!payslip.employeeId.isNullOrBlank()) Text("Staff ID: ${payslip.employeeId}", fontSize = 12.sp, color = TextSecondary)
                        if (!payslip.designation.isNullOrBlank()) Text("Designation: ${payslip.designation}", fontSize = 12.sp, color = TextSecondary)
                        Text("Disbursed on: ${payslip.paymentDate}", fontSize = 11.sp, color = TextMuted)
                    }
                }

                // Earnings & Deductions Table
                Surface(shape = RoundedCornerShape(8.dp), color = Surface, border = BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(10.dp)) {
                        Text("EARNINGS", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Success, letterSpacing = 0.5.sp)
                        Spacer(Modifier.height(4.dp))
                        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                            Text("Base Pay", fontSize = 12.sp, color = TextPrimary)
                            Text(inr(payslip.baseSalary), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        }
                        if (payslip.hra > 0) {
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text("HRA", fontSize = 12.sp, color = TextPrimary)
                                Text(inr(payslip.hra), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            }
                        }
                        if (payslip.allowances > 0) {
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text("Special Allowances", fontSize = 12.sp, color = TextPrimary)
                                Text(inr(payslip.allowances), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            }
                        }

                        Spacer(Modifier.height(8.dp))
                        HorizontalDivider(color = Border)
                        Spacer(Modifier.height(8.dp))

                        Text("DEDUCTIONS", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Danger, letterSpacing = 0.5.sp)
                        Spacer(Modifier.height(4.dp))
                        if (payslip.pfDeduction > 0) {
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text("Provident Fund (PF)", fontSize = 12.sp, color = TextPrimary)
                                Text("-${inr(payslip.pfDeduction)}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Danger)
                            }
                        }
                        if (payslip.taxDeduction > 0) {
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text("TDS / Tax", fontSize = 12.sp, color = TextPrimary)
                                Text("-${inr(payslip.taxDeduction)}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Danger)
                            }
                        }
                        if (payslip.unpaidLeaveDeduction > 0) {
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text("Unpaid Leave (LOP)", fontSize = 12.sp, color = TextPrimary)
                                Text("-${inr(payslip.unpaidLeaveDeduction)}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Danger)
                            }
                        }
                        if (payslip.deductions == 0.0) {
                            Text("None (₹0)", fontSize = 12.sp, color = TextMuted)
                        }
                    }
                }

                // Net Amount Banner
                Surface(shape = RoundedCornerShape(8.dp), color = Primary.copy(alpha = 0.08f), border = BorderStroke(1.dp, Primary.copy(alpha = 0.25f)), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        Modifier.fillMaxWidth().padding(12.dp),
                        Arrangement.SpaceBetween,
                        Alignment.CenterVertically
                    ) {
                        Column {
                            Text("NET SALARY PAID", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
                            Text(payslip.paymentMethod.uppercase().replace("_", " "), fontSize = 11.sp, color = TextSecondary)
                        }
                        Text(inr(payslip.netSalary), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Primary)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", fontWeight = FontWeight.Bold, color = Primary)
            }
        }
    )
}

// ── Process Salary Bottom Sheet ───────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProcessSalarySheet(
    vm: StaffViewModel,
    item: PayrollStaffItemDto,
    onDismiss: () -> Unit
) {
    val baseSal by vm.processBaseSalary.collectAsState()
    val hra by vm.processHra.collectAsState()
    val allow by vm.processAllowances.collectAsState()
    val pf by vm.processPfDeduction.collectAsState()
    val tax by vm.processTaxDeduction.collectAsState()
    val lop by vm.processUnpaidLeaveDeduction.collectAsState()
    val payMethod by vm.processPaymentMethod.collectAsState()
    val remarks by vm.processRemarks.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    val totalEarnings = (baseSal.toDoubleOrNull() ?: 0.0) + (hra.toDoubleOrNull() ?: 0.0) + (allow.toDoubleOrNull() ?: 0.0)
    val totalDed = (pf.toDoubleOrNull() ?: 0.0) + (tax.toDoubleOrNull() ?: 0.0) + (lop.toDoubleOrNull() ?: 0.0)
    val net = maxOf(0.0, totalEarnings - totalDed)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 8.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Process Monthly Salary", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text("Staff: ${item.staffName} (${item.designation ?: item.staffRole})", fontSize = 13.sp, color = TextSecondary)

            // Earnings
            Text("EARNINGS", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Success, letterSpacing = 0.5.sp)
            SheetInputField("Base Salary *", baseSal, KeyboardType.Number) { vm.processBaseSalary.value = it }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f)) {
                    SheetInputField("HRA", hra, KeyboardType.Number) { vm.processHra.value = it }
                }
                Box(Modifier.weight(1f)) {
                    SheetInputField("Allowances", allow, KeyboardType.Number) { vm.processAllowances.value = it }
                }
            }

            // Deductions
            Text("DEDUCTIONS", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Danger, letterSpacing = 0.5.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f)) {
                    SheetInputField("PF Deduction", pf, KeyboardType.Number) { vm.processPfDeduction.value = it }
                }
                Box(Modifier.weight(1f)) {
                    SheetInputField("Tax / TDS", tax, KeyboardType.Number) { vm.processTaxDeduction.value = it }
                }
            }
            SheetInputField("Unpaid Leaves (LOP)", lop, KeyboardType.Number) { vm.processUnpaidLeaveDeduction.value = it }

            // Payment Mode
            Text("PAYMENT METHOD", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.5.sp)
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("cash" to "💵 Cash", "upi" to "📱 UPI", "cheque" to "📝 Cheque", "bank_transfer" to "🏦 Bank Transfer").forEach { (mKey, mLabel) ->
                    val isSel = payMethod == mKey
                    FilterChip(
                        selected = isSel,
                        onClick  = { vm.processPaymentMethod.value = mKey },
                        label    = { Text(mLabel, fontSize = 11.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                        colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                        shape    = RoundedCornerShape(8.dp)
                    )
                }
            }

            SheetInputField("Remarks / Note", remarks) { vm.processRemarks.value = it }

            // Net summary card
            Surface(shape = RoundedCornerShape(10.dp), color = Primary.copy(alpha = 0.08f), border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f)), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth().padding(12.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                    Text("Calculated Net Pay:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(inr(net), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Primary)
                }
            }

            Spacer(Modifier.height(4.dp))
            Button(
                onClick = { vm.submitProcessSalary() },
                enabled = !isSubmitting,
                shape   = RoundedCornerShape(10.dp),
                colors  = ButtonDefaults.buttonColors(containerColor = Primary),
                modifier= Modifier.fillMaxWidth().height(48.dp)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(18.dp), Color.White, 2.dp)
                else Text("✓ Confirm & Disburse Salary", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

// ── Staff Add/Edit Form Sheet ─────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StaffFormSheet(
    vm: StaffViewModel,
    feeGroups: List<FeeGroupDto>,
    subjects: List<SubjectDto>,
    onDismiss: () -> Unit
) {
    val editId by vm.editingStaffId.collectAsState()
    val empId by vm.employeeId.collectAsState()
    val name by vm.name.collectAsState()
    val phone by vm.contactNumber.collectAsState()
    val role by vm.selectedRole.collectAsState()
    val gender by vm.gender.collectAsState()
    val dob by vm.dob.collectAsState()
    val des by vm.designation.collectAsState()
    val qual by vm.qualificationsInput.collectAsState()
    val spec by vm.specializationInput.collectAsState()
    val exp by vm.experienceYears.collectAsState()
    val pan by vm.panNumber.collectAsState()
    val aadh by vm.aadhaarNumber.collectAsState()

    val ctGroupId by vm.assignedClassTeacherGroupId.collectAsState()
    val assignedSubs by vm.assignedSubjects.collectAsState()

    val sal by vm.monthlySalary.collectAsState()
    val hra by vm.hra.collectAsState()
    val allow by vm.allowances.collectAsState()
    val pf by vm.pfDeduction.collectAsState()
    val tax by vm.taxDeduction.collectAsState()
    val jDate by vm.joiningDate.collectAsState()
    val addr by vm.address.collectAsState()

    val isSubmitting by vm.isSubmitting.collectAsState()

    var selectedAllocGroupId by remember { mutableStateOf(feeGroups.firstOrNull()?._id ?: "") }
    var selectedAllocSubName by remember { mutableStateOf(subjects.firstOrNull()?.name ?: "") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface
    ) {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 24.dp)
        ) {
            item {
                Text(
                    if (editId != null) "Edit Staff Profile" else "Add Teacher / Staff Member",
                    fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary
                )
                Spacer(Modifier.height(4.dp))
            }

            // ── Section 1: Identity & Demographics ──
            item {
                Text("1. 👤 IDENTITY & ROLE", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(0.65f)) { SheetInputField("Full Name *", name) { vm.name.value = it } }
                    Box(Modifier.weight(0.35f)) { SheetInputField("Staff ID", empId) { vm.employeeId.value = it } }
                }
            }
            item {
                SheetInputField("Mobile Number *", phone, KeyboardType.Phone) { vm.contactNumber.value = it }
            }
            item {
                Text("Role *", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                Spacer(Modifier.height(4.dp))
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("teacher" to "👩‍🏫 Teacher", "admin" to "🛡️ Admin", "accountant" to "📊 Accountant", "librarian" to "📚 Librarian", "driver" to "🚌 Driver", "staff" to "Support Staff").forEach { (rKey, rLabel) ->
                        val isSel = role == rKey
                        FilterChip(
                            selected = isSel,
                            onClick  = { vm.selectedRole.value = rKey },
                            label    = { Text(rLabel, fontSize = 11.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                            colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                            shape    = RoundedCornerShape(8.dp)
                        )
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(1f)) { SheetInputField("Designation", des, placeholder = "e.g. Senior PGT Maths") { vm.designation.value = it } }
                    Box(Modifier.weight(1f)) {
                        EmsDateField(label = "Date of Birth", value = dob, onValueChange = { vm.dob.value = it })
                    }
                }
            }

            // ── Section 2: Qualifications & Specialization ──
            item {
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(4.dp))
                Text("2. 🎓 QUALIFICATIONS & SPECIALIZATION", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
            }
            item {
                SheetInputField("Qualifications", qual, placeholder = "e.g. M.Sc, B.Ed, CTET") { vm.qualificationsInput.value = it }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(0.7f)) { SheetInputField("Specialization", spec, placeholder = "e.g. Maths, Physics") { vm.specializationInput.value = it } }
                    Box(Modifier.weight(0.3f)) { SheetInputField("Exp (Yrs)", exp, KeyboardType.Number) { vm.experienceYears.value = it } }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(1f)) { SheetInputField("PAN Number", pan) { vm.panNumber.value = it } }
                    Box(Modifier.weight(1f)) { SheetInputField("Aadhaar Number", aadh, KeyboardType.Number) { vm.aadhaarNumber.value = it } }
                }
            }

            // ── Section 3: Class & Subject Allocations (Only for Teachers) ──
            if (role == "teacher") {
                item {
                    HorizontalDivider(color = Border)
                    Spacer(Modifier.height(4.dp))
                    Text("3. 🏫 CLASS & SUBJECT WORKLOAD", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
                }

                // Class Teacher Assignment
                item {
                    Text("Assign as Class Teacher", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(Modifier.height(4.dp))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(
                            selected = ctGroupId == null,
                            onClick  = { vm.assignedClassTeacherGroupId.value = null },
                            label    = { Text("None", fontSize = 11.sp) },
                            colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                            shape    = RoundedCornerShape(8.dp)
                        )
                        feeGroups.forEach { g ->
                            val isSel = ctGroupId == g._id
                            FilterChip(
                                selected = isSel,
                                onClick  = { vm.assignedClassTeacherGroupId.value = g._id },
                                label    = { Text(g.name, fontSize = 11.sp) },
                                colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                                shape    = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                }

                // Subject Teaching Allocations List
                item {
                    Text("Subject Teaching Periods", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(Modifier.height(4.dp))
                    if (assignedSubs.isNotEmpty()) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            assignedSubs.forEachIndexed { idx, alloc ->
                                Surface(shape = RoundedCornerShape(8.dp), color = Background, border = BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                                    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                                        Text("📐 ${alloc.subjectName} • ${alloc.feeGroupName ?: "Class"}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                                        IconButton(onClick = { vm.removeSubjectAllocation(idx) }, modifier = Modifier.size(24.dp)) {
                                            Text("✕", fontSize = 12.sp, color = Danger)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Add Subject Allocation Row
                if (feeGroups.isNotEmpty() && subjects.isNotEmpty()) {
                    item {
                        Surface(shape = RoundedCornerShape(8.dp), color = Surface, border = BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Add Teaching Period", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    // Class picker
                                    Column(Modifier.weight(1f)) {
                                        Text("Class", fontSize = 10.sp, color = TextSecondary)
                                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            feeGroups.forEach { g ->
                                                val isSel = selectedAllocGroupId == g._id
                                                FilterChip(
                                                    selected = isSel,
                                                    onClick  = { selectedAllocGroupId = g._id },
                                                    label    = { Text(g.name, fontSize = 10.sp) },
                                                    colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                                                    shape    = RoundedCornerShape(6.dp)
                                                )
                                            }
                                        }
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    // Subject picker
                                    Column(Modifier.weight(1f)) {
                                        Text("Subject", fontSize = 10.sp, color = TextSecondary)
                                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            subjects.forEach { s ->
                                                val isSel = selectedAllocSubName == s.name
                                                FilterChip(
                                                    selected = isSel,
                                                    onClick  = { selectedAllocSubName = s.name },
                                                    label    = { Text(s.name, fontSize = 10.sp) },
                                                    colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                                                    shape    = RoundedCornerShape(6.dp)
                                                )
                                            }
                                        }
                                    }
                                }

                                Button(
                                    onClick = {
                                        val grp = feeGroups.firstOrNull { it._id == selectedAllocGroupId }
                                        if (grp != null && selectedAllocSubName.isNotBlank()) {
                                            vm.addSubjectAllocation(grp._id, grp.name, selectedAllocSubName)
                                        }
                                    },
                                    shape = RoundedCornerShape(6.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Primary.copy(alpha = 0.15f)),
                                    modifier = Modifier.fillMaxWidth().height(36.dp)
                                ) {
                                    Text("+ Add Subject to Schedule", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                                }
                            }
                        }
                    }
                }
            }

            // ── Section 4: Compensation & Salary Setup ──
            item {
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(4.dp))
                Text("4. 💰 COMPENSATION SETUP", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
            }
            item {
                SheetInputField("Monthly Base Salary (₹)", sal, KeyboardType.Number) { vm.monthlySalary.value = it }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(1f)) { SheetInputField("HRA (₹)", hra, KeyboardType.Number) { vm.hra.value = it } }
                    Box(Modifier.weight(1f)) { SheetInputField("Allowances (₹)", allow, KeyboardType.Number) { vm.allowances.value = it } }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(1f)) { SheetInputField("PF Deduction (₹)", pf, KeyboardType.Number) { vm.pfDeduction.value = it } }
                    Box(Modifier.weight(1f)) { SheetInputField("Tax / TDS (₹)", tax, KeyboardType.Number) { vm.taxDeduction.value = it } }
                }
            }
            item {
                EmsDateField(label = "Joining Date", value = jDate, onValueChange = { vm.joiningDate.value = it })
            }
            item {
                SheetInputField("Residential Address", addr) { vm.address.value = it }
            }

            item {
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { vm.saveStaff() },
                    enabled = !isSubmitting,
                    modifier= Modifier.fillMaxWidth().height(50.dp),
                    shape   = RoundedCornerShape(12.dp),
                    colors  = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                    else Text(if (editId != null) "✓ Update Staff Profile" else "✓ Save Staff Member", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun SheetInputField(
    label: String,
    value: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    placeholder: String = "",
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value         = value,
        onValueChange = onValueChange,
        label         = { Text(label, fontSize = 12.sp) },
        placeholder   = if (placeholder.isNotEmpty()) { { Text(placeholder, fontSize = 12.sp) } } else null,
        modifier      = Modifier.fillMaxWidth(),
        singleLine    = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape         = RoundedCornerShape(8.dp),
        colors        = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = Border,
            focusedBorderColor   = Primary,
            unfocusedContainerColor = Surface,
            focusedContainerColor   = Surface
        )
    )
}
