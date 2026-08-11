package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.DetailedPaymentHistoryDto
import com.srgs.ems.data.api.PlanBreakdownDto
import com.srgs.ems.data.api.TopExpenseDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ReportsViewModel
import java.text.NumberFormat
import java.util.Locale

private fun inrFmt(v: Double) = "₹${NumberFormat.getNumberInstance(Locale("en", "IN")).format(v)}"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(vm: ReportsViewModel = viewModel()) {
    val session = SessionManager.session
    val academicYearId = session?.entityId
    
    LaunchedEffect(vm.dateFilter.value) {
        vm.fetchReports(academicYearId)
    }

    val financials by vm.financials.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val dateFilter by vm.dateFilter.collectAsState()

    val netBalance = financials?.summary?.netBalance ?: 0.0
    val totalColl  = financials?.summary?.collections ?: 0.0
    val totalExp   = financials?.summary?.expenses ?: 0.0

    var activeTab by remember { mutableStateOf("payment_history") }

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        containerColor = Background,
        topBar = { EmsTopBar("Business Reports", scrollBehavior) },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(top = padding.calculateTopPadding())) {
            
            // ── 1. Date Filters ────────────────────────────────────────────────
            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    "this_month" to "This Month",
                    "last_month" to "Last Month",
                    "3_months"  to "3 Months",
                    "6_months"  to "6 Months",
                    "ytd"       to "YTD"
                ).forEach { (key, label) ->
                    val sel = dateFilter == key
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .clickable { vm.dateFilter.value = key },
                        shape  = RoundedCornerShape(20.dp),
                        color  = if (sel) Primary else Surface,
                        border = if (!sel) BorderStroke(1.dp, Border) else null
                    ) {
                        Text(
                            label,
                            Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                            fontSize   = 12.sp,
                            fontWeight = if (sel) FontWeight.Bold else FontWeight.Medium,
                            color      = if (sel) Color.White else TextPrimary
                        )
                    }
                }
            }

            if (isLoading) {
                Box(Modifier.fillMaxWidth().weight(1f), Alignment.Center) {
                    CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                }
            } else {
                // ── 2. KPI Cards ──────────────────────────────────────────────
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    KpiCard("Total Collections", inrFmt(totalColl), Success, Modifier.weight(1f))
                    KpiCard("Total Expenses", inrFmt(totalExp), Danger, Modifier.weight(1f))
                }

                Card(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(Surface),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(14.dp),
                        Arrangement.SpaceBetween,
                        Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Net Balance", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                            Text(
                                inrFmt(netBalance),
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (netBalance >= 0) Success else Danger
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = (if (netBalance >= 0) Success else Danger).copy(alpha = 0.1f)
                        ) {
                            Text(
                                if (netBalance >= 0) "Profit" else "Loss",
                                Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (netBalance >= 0) Success else Danger
                            )
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // ── 3. Tabs Navigation ─────────────────────────────────────────
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        "payment_history" to "💳 Payment History",
                        "billing_plans"   to "💳 Billing Plans",
                        "addons"          to "🧩 Add-on Services",
                        "expenses"        to "💸 Expenses"
                    ).forEach { (key, label) ->
                        val sel = activeTab == key
                        Surface(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { activeTab = key },
                            shape  = RoundedCornerShape(10.dp),
                            color  = if (sel) Primary.copy(alpha = 0.12f) else Surface,
                            border = BorderStroke(1.dp, if (sel) Primary else Border)
                        ) {
                            Text(
                                label,
                                Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                fontSize   = 12.sp,
                                fontWeight = if (sel) FontWeight.Bold else FontWeight.Medium,
                                color      = if (sel) Primary else TextSecondary
                            )
                        }
                    }
                }

                HorizontalDivider(color = Border, modifier = Modifier.padding(top = 8.dp))

                // ── 4. Tab Content ─────────────────────────────────────────────
                LazyColumn(
                    contentPadding = PaddingValues(top = 10.dp, bottom = 80.dp, start = 16.dp, end = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth().weight(1f)
                ) {
                    when (activeTab) {
                        // ── Tab 1: Payment History ─────────────────────────────
                        "payment_history" -> {
                            val payments = financials?.paymentHistory ?: emptyList()
                            if (payments.isEmpty()) {
                                item {
                                    Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) {
                                        Text("No payment history for selected period.", fontSize = 13.sp, color = TextSecondary)
                                    }
                                }
                            } else {
                                item {
                                    Text(
                                        "${payments.size} fee payments collected",
                                        fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted
                                    )
                                }
                                items(payments) { p ->
                                    PaymentHistoryCard(p)
                                }
                            }
                        }

                        // ── Tab 2: Billing Plans Breakdown ─────────────────────
                        "billing_plans" -> {
                            val plans = financials?.plansBreakdown ?: emptyList()
                            if (plans.isEmpty()) {
                                item {
                                    Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) {
                                        Text("No billing plans found.", fontSize = 13.sp, color = TextSecondary)
                                    }
                                }
                            } else {
                                item {
                                    Text(
                                        "Assigned Members & Collected Amounts by Plan",
                                        fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted
                                    )
                                }
                                items(plans) { plan ->
                                    PlanBreakdownCard(plan, totalColl)
                                }
                            }
                        }

                        // ── Tab 3: Add-on Services Breakdown ──────────────────
                        "addons" -> {
                            val addons = financials?.addonsBreakdown ?: emptyList()
                            if (addons.isEmpty()) {
                                item {
                                    Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) {
                                        Text("No add-on services found.", fontSize = 13.sp, color = TextSecondary)
                                    }
                                }
                            } else {
                                item {
                                    Text(
                                        "Subscribed Members & Collected Amounts by Add-on",
                                        fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted
                                    )
                                }
                                items(addons) { addon ->
                                    AddonBreakdownCard(addon, totalColl)
                                }
                            }
                        }

                        // ── Tab 4: Expenses Breakdown ─────────────────────────
                        "expenses" -> {
                            val expensesList = financials?.topExpenses ?: emptyList()
                            if (expensesList.isEmpty()) {
                                item {
                                    Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) {
                                        Text("No expenses recorded for selected period.", fontSize = 13.sp, color = TextSecondary)
                                    }
                                }
                            } else {
                                item {
                                    Text(
                                        "Expenses by Category",
                                        fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted
                                    )
                                }
                                items(expensesList) { exp ->
                                    ExpenseCategoryCard(exp, totalExp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Components ────────────────────────────────────────────────────────────────

@Composable
private fun KpiCard(label: String, value: String, color: Color, modifier: Modifier) {
    Card(
        modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(label, fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = color)
        }
    }
}

@Composable
private fun PaymentHistoryCard(p: DetailedPaymentHistoryDto) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(if (p.isAddon) "🧩" else "💳", fontSize = 14.sp)
                    Text(p.memberName, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                Text(
                    "+${inrFmt(p.amount)}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Success
                )
            }
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text(p.structureName, fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = Primary.copy(alpha = 0.08f)
                ) {
                    Text(
                        p.paymentMethod.uppercase(),
                        Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                }
            }
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text(
                    p.paymentDate.take(10),
                    fontSize = 11.sp,
                    color = TextMuted
                )
                p.receiptNo?.let {
                    Text("#$it", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                }
            }
            if (!p.notes.isNullOrBlank()) {
                Text("Note: ${p.notes}", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Normal)
            }
        }
    }
}

@Composable
private fun PlanBreakdownCard(plan: PlanBreakdownDto, totalCollections: Double) {
    val ratio = if (totalCollections > 0) (plan.collectedAmount / totalCollections).toFloat() else 0f

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Column {
                    Text(plan.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "₹${plan.amount.toInt()} / ${plan.frequency.replaceFirstChar { it.uppercase() }}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(inrFmt(plan.collectedAmount), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Success)
                    Text("Collected", fontSize = 10.sp, color = TextMuted)
                }
            }
            HorizontalDivider(color = Border.copy(alpha = 0.5f))
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Primary.copy(alpha = 0.1f)
                ) {
                    Text(
                        "👥 ${plan.memberCount} Members Assigned",
                        Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                }
                Text("${(ratio * 100).toInt()}% of Revenue", fontSize = 11.sp, color = TextMuted)
            }
        }
    }
}

@Composable
private fun AddonBreakdownCard(addon: PlanBreakdownDto, totalCollections: Double) {
    val ratio = if (totalCollections > 0) (addon.collectedAmount / totalCollections).toFloat() else 0f

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border = BorderStroke(1.dp, AccentPurple.copy(alpha = 0.3f))
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("🧩", fontSize = 14.sp)
                        Text(addon.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "₹${addon.amount.toInt()} / ${addon.frequency.replaceFirstChar { it.uppercase() }}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(inrFmt(addon.collectedAmount), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = AccentPurple)
                    Text("Collected", fontSize = 10.sp, color = TextMuted)
                }
            }
            HorizontalDivider(color = Border.copy(alpha = 0.5f))
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = AccentPurple.copy(alpha = 0.1f)
                ) {
                    Text(
                        "👥 ${addon.memberCount} Subscribed",
                        Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = AccentPurple
                    )
                }
                Text("${(ratio * 100).toInt()}% of Revenue", fontSize = 11.sp, color = TextMuted)
            }
        }
    }
}

@Composable
private fun ExpenseCategoryCard(exp: TopExpenseDto, totalExpenses: Double) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(14.dp),
            Arrangement.SpaceBetween,
            Alignment.CenterVertically
        ) {
            Column {
                Text(exp._id.replaceFirstChar { it.uppercase() }, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
            Text(inrFmt(exp.total), fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Danger)
        }
    }
}

