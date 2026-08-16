package com.srgs.ems.ui.screens.main

import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.DetailedPaymentHistoryDto
import com.srgs.ems.data.api.PlanBreakdownDto
import com.srgs.ems.data.api.TopExpenseDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ReportsViewModel
import java.text.NumberFormat
import java.util.Locale

private fun inrFmt(v: Double): String =
    "₹${NumberFormat.getNumberInstance(Locale("en", "IN")).format(v.toLong())}"

// ─────────────────────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ReportsScreen(
    vm: ReportsViewModel = viewModel(),
    onNavigateToMemberDetail: (memberId: String) -> Unit = {},
    onNavigateToMembers: () -> Unit = {},
    onNavigateToExpenses: () -> Unit = {}
) {
    val academicYearId = AcademicYearManager.selectedYearId

    val dateFilter       by vm.dateFilter.collectAsState()
    val activeTab        by vm.activeTab.collectAsState()
    val searchQuery      by vm.searchQuery.collectAsState()
    val methodFilter     by vm.paymentMethodFilter.collectAsState()

    val summary          by vm.summary.collectAsState()
    val paymentsResponse by vm.paymentsResponse.collectAsState()
    val plansResponse    by vm.plansResponse.collectAsState()
    val expensesResponse by vm.expensesResponse.collectAsState()

    val isLoading        by vm.isLoading.collectAsState()
    val isTabLoading     by vm.isTabLoading.collectAsState()

    // Fetch summary & active tab on date range / academic year change
    LaunchedEffect(dateFilter, academicYearId) {
        vm.fetchSummary(academicYearId)
        vm.fetchActiveTabData(academicYearId)
    }

    // Fetch active tab data when switching tabs, payment method, or search query
    LaunchedEffect(activeTab, methodFilter, searchQuery) {
        vm.fetchActiveTabData(academicYearId)
    }

    val netBalance = summary?.netBalance  ?: 0.0
    val totalColl  = summary?.collections ?: 0.0
    val totalExp   = summary?.expenses    ?: 0.0
    val profitPct  = if (totalColl > 0) ((netBalance / totalColl) * 100).toInt() else 0

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()
    val focusManager   = LocalFocusManager.current

    Scaffold(
        containerColor = Background,
        topBar         = { EmsTopBar("Business Reports", scrollBehavior) },
        modifier       = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(bottom = 80.dp),
            modifier       = Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
        ) {

            // ── 1. Scrollable Top Header (Date Filter + KPI Summary Cards) ────
            item {
                Column(Modifier.fillMaxWidth()) {
                    // Date filter pills
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
                            "ytd"       to "This Year"
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
                                    color      = if (sel) Color.White else TextSecondary
                                )
                            }
                        }
                    }

                    if (isLoading && summary == null) {
                        Box(Modifier.fillMaxWidth().height(160.dp), Alignment.Center) {
                            CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                        }
                    } else {
                        // Summary Cards Row
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .padding(bottom = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            SummaryCard(
                                label  = "Collections",
                                value  = inrFmt(totalColl),
                                color  = Success,
                                icon   = "💰",
                                modifier = Modifier.weight(1f)
                            )
                            SummaryCard(
                                label  = "Expenses",
                                value  = inrFmt(totalExp),
                                color  = Danger,
                                icon   = "💸",
                                onClick = onNavigateToExpenses,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Net Balance card
                        Card(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .padding(bottom = 10.dp),
                            shape     = RoundedCornerShape(14.dp),
                            colors    = CardDefaults.cardColors(Surface),
                            elevation = CardDefaults.cardElevation(2.dp),
                            border    = BorderStroke(1.dp, if (netBalance >= 0) Success.copy(.25f) else Danger.copy(.25f))
                        ) {
                            Row(
                                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                                Arrangement.SpaceBetween,
                                Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Net Balance", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        inrFmt(netBalance),
                                        fontSize   = 22.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color      = if (netBalance >= 0) Success else Danger
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = (if (netBalance >= 0) Success else Danger).copy(alpha = 0.1f)
                                    ) {
                                        Text(
                                            if (netBalance >= 0) "✅ Profit" else "⚠️ Loss",
                                            Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                            fontSize   = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color      = if (netBalance >= 0) Success else Danger
                                        )
                                    }
                                    if (totalColl > 0) {
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            "$profitPct% margin",
                                            fontSize = 11.sp,
                                            color    = TextMuted
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ── 2. STICKY HEADER (Pins Tabs & Search Bar to Top on Scroll) ────
            stickyHeader {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color    = Background
                ) {
                    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        // Tab pills
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(
                                "payment_history" to "💳 Payments",
                                "billing_plans"   to "📋 Plans",
                                "addons"          to "🧩 Add-ons",
                                "expenses"        to "💸 Expenses"
                            ).forEach { (key, label) ->
                                val sel = activeTab == key
                                Surface(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable { vm.activeTab.value = key },
                                    shape  = RoundedCornerShape(10.dp),
                                    color  = if (sel) Primary.copy(alpha = 0.12f) else Surface,
                                    border = BorderStroke(1.dp, if (sel) Primary else Border)
                                ) {
                                    Text(
                                        label,
                                        Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        fontSize   = 12.sp,
                                        fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal,
                                        color      = if (sel) Primary else TextSecondary
                                    )
                                }
                            }
                        }

                        // Persistent Search Bar & Payment Method Filter Chips (for Payments tab)
                        if (activeTab == "payment_history") {
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value          = searchQuery,
                                onValueChange  = { vm.searchQuery.value = it },
                                placeholder    = { Text("Search member, plan, receipt…", fontSize = 13.sp) },
                                singleLine     = true,
                                modifier       = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp),
                                shape          = RoundedCornerShape(12.dp),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                                colors         = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor    = Border,
                                    focusedBorderColor      = Primary,
                                    focusedContainerColor   = Surface,
                                    unfocusedContainerColor = Surface
                                )
                            )
                            Spacer(Modifier.height(6.dp))
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState())
                                    .padding(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf("all" to "All", "cash" to "💵 Cash", "upi" to "📱 UPI", "online" to "🌐 Online", "card" to "💳 Card").forEach { (key, label) ->
                                    val sel = methodFilter == key
                                    Surface(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(16.dp))
                                            .clickable { vm.paymentMethodFilter.value = key },
                                        shape  = RoundedCornerShape(16.dp),
                                        color  = if (sel) Primary else Surface,
                                        border = if (!sel) BorderStroke(1.dp, Border) else null
                                    ) {
                                        Text(
                                            label,
                                            Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                            fontSize   = 11.sp,
                                            fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal,
                                            color      = if (sel) Color.White else TextSecondary
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        HorizontalDivider(color = Border)
                    }
                }
            }

            // ── 3. Tab List Items (Maximized Scroll Height) ───────────────────
            when (activeTab) {

                // ── PAYMENTS TAB ──────────────────────────────────────────────
                "payment_history" -> {
                    if (isTabLoading && paymentsResponse == null) {
                        item {
                            Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) {
                                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                            }
                        }
                    } else {
                        val payments = paymentsResponse?.payments ?: emptyList()
                        if (payments.isEmpty()) {
                            item { EmptyState(if (searchQuery.isNotBlank()) "No results for \"$searchQuery\"" else "No payments for this period.") }
                        } else {
                            item {
                                Text(
                                    "${paymentsResponse?.total ?: payments.size} payment${if (payments.size != 1) "s" else ""}",
                                    Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.SemiBold
                                )
                            }
                            items(payments, key = { it._id }) { p ->
                                Box(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) {
                                    PaymentHistoryCard(
                                        p = p,
                                        onClick = { if (p.memberId.isNotBlank()) onNavigateToMemberDetail(p.memberId) }
                                    )
                                }
                            }
                        }
                    }
                }

                // ── PLANS TAB ─────────────────────────────────────────────────
                "billing_plans" -> {
                    if (isTabLoading && plansResponse == null) {
                        item {
                            Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) {
                                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                            }
                        }
                    } else {
                        val plans = plansResponse?.plans ?: emptyList()
                        if (plans.isEmpty()) {
                            item { EmptyState("No billing plans configured.") }
                        } else {
                            item {
                                Text(
                                    "${plans.size} plan${if (plans.size != 1) "s" else ""} · Total collected ${inrFmt(plans.sumOf { it.collectedAmount })}",
                                    Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.SemiBold
                                )
                            }
                            items(plans, key = { it.id }) { plan ->
                                Box(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) {
                                    PlanBreakdownCard(
                                        plan = plan,
                                        totalCollections = totalColl,
                                        accentColor = Primary,
                                        onMembersClick = onNavigateToMembers
                                    )
                                }
                            }
                        }
                    }
                }

                // ── ADD-ONS TAB ───────────────────────────────────────────────
                "addons" -> {
                    if (isTabLoading && plansResponse == null) {
                        item {
                            Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) {
                                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                            }
                        }
                    } else {
                        val addons = plansResponse?.addons ?: emptyList()
                        if (addons.isEmpty()) {
                            item { EmptyState("No add-on services configured.") }
                        } else {
                            item {
                                Text(
                                    "${addons.size} add-on${if (addons.size != 1) "s" else ""} · Total collected ${inrFmt(addons.sumOf { it.collectedAmount })}",
                                    Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.SemiBold
                                )
                            }
                            items(addons, key = { it.id }) { addon ->
                                Box(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) {
                                    PlanBreakdownCard(
                                        plan = addon,
                                        totalCollections = totalColl,
                                        accentColor = AccentPurple,
                                        onMembersClick = onNavigateToMembers
                                    )
                                }
                            }
                        }
                    }
                }

                // ── EXPENSES TAB ──────────────────────────────────────────────
                "expenses" -> {
                    if (isTabLoading && expensesResponse == null) {
                        item {
                            Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) {
                                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                            }
                        }
                    } else {
                        val expList = expensesResponse?.expenses ?: emptyList()
                        if (expList.isEmpty()) {
                            item { EmptyState("No expenses recorded for this period.") }
                        } else {
                            item {
                                Text(
                                    "${expList.size} categor${if (expList.size != 1) "ies" else "y"} · Total ${inrFmt(totalExp)}",
                                    Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.SemiBold
                                )
                            }
                            items(expList, key = { it._id }) { exp ->
                                Box(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) {
                                    ExpenseCategoryCard(
                                        exp = exp,
                                        totalExpenses = totalExp,
                                        onClick = onNavigateToExpenses
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun SummaryCard(
    label: String,
    value: String,
    color: Color,
    icon: String,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Card(
        modifier  = modifier.then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.1f)),
                Alignment.Center
            ) {
                Text(icon, fontSize = 16.sp)
            }
            Column {
                Text(label, fontSize = 10.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                Text(value, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = color)
            }
        }
    }
}

@Composable
private fun PaymentHistoryCard(p: DetailedPaymentHistoryDto, onClick: () -> Unit) {
    val methodColor = when (p.paymentMethod.lowercase()) {
        "upi"    -> AccentGreen
        "card"   -> AccentBlue
        "online" -> AccentPurple
        else     -> AccentOrange   // cash
    }
    Card(
        Modifier.fillMaxWidth().clickable { onClick() },
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(0.dp),
        border    = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(14.dp)) {
            // Row 1 – name + amount
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.Top) {
                Row(
                    Modifier.weight(1f).padding(end = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(if (p.isAddon) AccentPurple.copy(.12f) else Primary.copy(.1f)),
                        Alignment.Center
                    ) {
                        Text(if (p.isAddon) "🧩" else "💳", fontSize = 14.sp)
                    }
                    Column {
                        Text(
                            p.memberName,
                            fontSize   = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color      = TextPrimary,
                            maxLines   = 1,
                            overflow   = TextOverflow.Ellipsis
                        )
                        Text(
                            p.structureName,
                            fontSize = 11.sp,
                            color    = TextSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Text(
                    "+${inrFmt(p.amount)}",
                    fontSize   = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color      = Success
                )
            }

            Spacer(Modifier.height(8.dp))
            HorizontalDivider(color = Border.copy(.5f))
            Spacer(Modifier.height(8.dp))

            // Row 2 – date · receipt · method badge
            Row(
                Modifier.fillMaxWidth(),
                Arrangement.SpaceBetween,
                Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment     = Alignment.CenterVertically
                ) {
                    Text(p.paymentDate.take(10), fontSize = 11.sp, color = TextMuted)
                    p.receiptNo?.let {
                        Text(
                            "#$it",
                            fontSize   = 11.sp,
                            color      = Primary,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = methodColor.copy(alpha = 0.12f)
                ) {
                    Text(
                        p.paymentMethod.uppercase(),
                        Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontSize   = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color      = methodColor
                    )
                }
            }

            // Optional notes
            if (!p.notes.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "📝 ${p.notes}",
                    fontSize = 11.sp,
                    color    = TextSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun PlanBreakdownCard(
    plan: PlanBreakdownDto,
    totalCollections: Double,
    accentColor: Color,
    onMembersClick: () -> Unit
) {
    val ratio = if (totalCollections > 0) (plan.collectedAmount / totalCollections).coerceIn(0.0, 1.0).toFloat() else 0f
    val pct   = (ratio * 100).toInt()

    Card(
        Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(14.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border    = BorderStroke(1.dp, accentColor.copy(alpha = 0.2f))
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Header – name + collected amount
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.Top) {
                Column(Modifier.weight(1f).padding(end = 8.dp)) {
                    Text(plan.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        "₹${plan.amount.toInt().let { NumberFormat.getNumberInstance(Locale("en","IN")).format(it) }} / ${plan.frequency.replaceFirstChar { it.uppercase() }}",
                        fontSize = 11.sp, color = TextSecondary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(inrFmt(plan.collectedAmount), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = accentColor)
                    Text("Collected", fontSize = 10.sp, color = TextMuted)
                }
            }

            // Progress bar
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                    Text("Revenue share", fontSize = 10.sp, color = TextMuted)
                    Text("$pct%", fontSize = 10.sp, color = accentColor, fontWeight = FontWeight.Bold)
                }
                LinearProgressIndicator(
                    progress       = { ratio },
                    modifier       = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                    color          = accentColor,
                    trackColor     = accentColor.copy(alpha = 0.12f),
                    strokeCap      = StrokeCap.Round
                )
            }

            // Footer – member count badge
            Surface(
                modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { onMembersClick() },
                shape = RoundedCornerShape(8.dp),
                color = accentColor.copy(alpha = 0.12f)
            ) {
                Text(
                    "👥  ${plan.memberCount} ${if (plan.isAddon) "subscribed" else "assigned"}  →",
                    Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    fontSize   = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color      = accentColor
                )
            }
        }
    }
}

@Composable
private fun ExpenseCategoryCard(exp: TopExpenseDto, totalExpenses: Double, onClick: () -> Unit) {
    val ratio = if (totalExpenses > 0) (exp.total / totalExpenses).coerceIn(0.0, 1.0).toFloat() else 0f
    val pct   = (ratio * 100).toInt()

    Card(
        Modifier.fillMaxWidth().clickable { onClick() },
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border    = BorderStroke(1.dp, Danger.copy(alpha = 0.15f))
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text(
                    exp._id.replaceFirstChar { it.uppercase() },
                    fontSize   = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color      = TextPrimary
                )
                Text(inrFmt(exp.total), fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Danger)
            }
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                    Text("Of total expenses", fontSize = 10.sp, color = TextMuted)
                    Text("$pct%", fontSize = 10.sp, color = Danger, fontWeight = FontWeight.Bold)
                }
                LinearProgressIndicator(
                    progress   = { ratio },
                    modifier   = Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)),
                    color      = Danger,
                    trackColor = Danger.copy(alpha = 0.1f),
                    strokeCap  = StrokeCap.Round
                )
            }
        }
    }
}

@Composable
private fun EmptyState(message: String) {
    Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("📭", fontSize = 36.sp)
            Spacer(Modifier.height(8.dp))
            Text(message, fontSize = 13.sp, color = TextSecondary)
        }
    }
}
