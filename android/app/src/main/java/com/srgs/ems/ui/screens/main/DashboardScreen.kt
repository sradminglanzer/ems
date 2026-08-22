package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.DashboardStatsDto
import com.srgs.ems.data.api.ExpiringMemberDto
import com.srgs.ems.data.models.UserSession
import com.srgs.ems.data.repository.DashboardRepository
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.DashboardViewModel
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale

private fun inr(v: Double) =
    "₹${NumberFormat.getNumberInstance(Locale("en", "IN")).format(v.toLong())}"

private fun greeting(): String {
    val h = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    return when { h < 12 -> "Good morning" ; h < 17 -> "Good afternoon" ; else -> "Good evening" }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    vm: DashboardViewModel = viewModel(),
    onNavigateToMembers: () -> Unit = {},
    onNavigateToPlans: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onNavigateToExpenses: () -> Unit = {},
    onNavigateToMemberDetail: (memberId: String) -> Unit = {},
    onSignOut: () -> Unit
) {
    val stats        by vm.stats.collectAsState()
    val expenseStats by vm.expenseStats.collectAsState()
    val isLoading    by vm.isLoading.collectAsState()
    val session      = SessionManager.session

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        containerColor = Background,
        topBar = {
            EmsTopBar(
                title = "Dashboard",
                scrollBehavior = scrollBehavior,
                actions = {
                    IconButton(onClick = { vm.loadStats() }) {
                        Text("↻", fontSize = 20.sp, color = Color.White)
                    }
                }
            )
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(
                top = padding.calculateTopPadding(),
                bottom = padding.calculateBottomPadding() + 32.dp
            ),
            modifier = Modifier.fillMaxSize()
        ) {
            // Hero banner (scrolls with content)
            item {
                DashboardHero(
                    name = session?.name ?: "Admin",
                    entityName = session?.entityName ?: "",
                    initials = session?.initials ?: "?",
                    role = session?.role ?: "user"
                )
            }

            if (isLoading) {
                item {
                    Box(Modifier.fillParentMaxWidth().padding(vertical = 40.dp), Alignment.Center) {
                        CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                    }
                }
            } else if (stats != null) {
                val s = stats!!

                // Stat chips
                item { Spacer(Modifier.height(20.dp)) }
                item {
                    Text(
                        "OVERVIEW",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        fontSize = 11.sp, fontWeight = FontWeight.ExtraBold,
                        color = TextMuted, letterSpacing = 1.2.sp
                    )
                }
                item {
                    StatChips(
                        s = s,
                        session = session,
                        onMembersClick = onNavigateToMembers,
                        onPlansClick = onNavigateToPlans
                    )
                }

                // Finance
                if (session?.isTeacher != true) {
                    item { Spacer(Modifier.height(20.dp)) }
                    item {
                        Text(
                            "FINANCIALS",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            fontSize = 11.sp, fontWeight = FontWeight.ExtraBold,
                            color = TextMuted, letterSpacing = 1.2.sp
                        )
                    }
                    item {
                        FinanceCard(
                            s = s,
                            expenses = expenseStats,
                            onReportsClick = onNavigateToReports,
                            onExpensesClick = onNavigateToExpenses
                        )
                    }
                }

                // Alerts
                val overdue  = s.expiringMembers.filter { it.isOverdue }
                val expiring = s.expiringMembers.filter { !it.isOverdue }

                if (overdue.isNotEmpty()) {
                    item { Spacer(Modifier.height(20.dp)) }
                    item {
                        Text(
                            "OVERDUE RENEWALS",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            fontSize = 11.sp, fontWeight = FontWeight.ExtraBold,
                            color = Danger, letterSpacing = 1.2.sp
                        )
                    }
                    items(overdue) { AlertRow(it, isOverdue = true, onClick = { onNavigateToMemberDetail(it.id) }) }
                }
                if (expiring.isNotEmpty()) {
                    item { Spacer(Modifier.height(20.dp)) }
                    item {
                        Text(
                            "EXPIRING SOON",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            fontSize = 11.sp, fontWeight = FontWeight.ExtraBold,
                            color = Warning, letterSpacing = 1.2.sp
                        )
                    }
                    items(expiring) { AlertRow(it, isOverdue = false, onClick = { onNavigateToMemberDetail(it.id) }) }
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }
}

// ─── Hero banner ──────────────────────────────────────────────────────────────
@Composable
private fun DashboardHero(name: String, entityName: String, initials: String, role: String) {
    val gradient = remember {
        Brush.linearGradient(
            listOf(GradientStart, GradientEnd),
            end = Offset(Float.POSITIVE_INFINITY, 0f)
        )
    }
    Box(
        Modifier
            .fillMaxWidth()
            .background(gradient)
            .padding(horizontal = 20.dp, vertical = 24.dp)
    ) {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Column {
                Text("${greeting()},", fontSize = 13.sp, color = Color.White.copy(.75f))
                Text(name, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                Spacer(Modifier.height(8.dp))
                Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(.18f)) {
                    Row(
                        Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(Modifier.size(7.dp).clip(CircleShape).background(Color(0xFF86EFAC)))
                        Spacer(Modifier.width(6.dp))
                        Text(entityName.take(26), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
            Box(
                Modifier.size(52.dp).clip(CircleShape)
                    .background(Color.White.copy(.2f))
                    .border(2.dp, Color.White.copy(.5f), CircleShape),
                Alignment.Center
            ) {
                Text(initials, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
            }
        }
    }
}

// ─── Stat chips ───────────────────────────────────────────────────────────────
@Composable
private fun StatChips(
    s: DashboardStatsDto,
    session: UserSession?,
    onMembersClick: () -> Unit,
    onPlansClick: () -> Unit
) {
    val labels = session?.labels ?: com.srgs.ems.data.api.EntityLabelsDto()
    val isGym = session?.isGym ?: false
    val chips = listOf(
        Triple(labels.memberIcon, labels.memberPlural, s.totalMembers.toString()),
        Triple(labels.groupIcon, labels.groupPlural,
            if (isGym) s.totalFeeStructures.toString() else s.totalFeeGroups.toString())
    )
    val actions = listOf(onMembersClick, onPlansClick)
    val accents = listOf(AccentBlue, AccentPurple)

    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        chips.forEachIndexed { i, (emoji, label, value) ->
            Box(
                Modifier.width(140.dp)
                    .shadow(4.dp, RoundedCornerShape(18.dp), clip = false)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Surface)
                    .clickable { actions[i]() }
                    .padding(16.dp)
            ) {
                Column {
                    Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(accents[i].copy(.1f)), Alignment.Center) {
                        Text(emoji, fontSize = 20.sp)
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(value, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                    Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                }
                Box(Modifier.size(8.dp).align(Alignment.TopEnd).clip(CircleShape).background(accents[i]))
            }
        }
    }
}

// ─── Finance card ─────────────────────────────────────────────────────────────
@Composable
private fun FinanceCard(
    s: DashboardStatsDto,
    expenses: DashboardRepository.ExpenseStats?,
    onReportsClick: () -> Unit,
    onExpensesClick: () -> Unit
) {
    Box(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp)
            .shadow(4.dp, RoundedCornerShape(18.dp), clip = false)
            .clip(RoundedCornerShape(18.dp))
            .background(Surface)
            .clickable { onReportsClick() }
            .padding(20.dp)
    ) {
        Column {
            if (s.totalPendingAmount > 0) {
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                    Column {
                        Text("PENDING DEFICITS", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold,
                            color = TextMuted, letterSpacing = 1.sp)
                        Text(inr(s.totalPendingAmount), fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Danger)
                    }
                    Surface(shape = RoundedCornerShape(20.dp), color = DangerLight) {
                        Text("⚠️ Pending", Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Danger)
                    }
                }
                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(16.dp))
            }

            // Summary breakdown row
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                Column(Modifier.clickable { onReportsClick() }) {
                    Text("Total Collections", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                    Text(inr(s.collectionThisMonth), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Success)
                }
                expenses?.let { exp ->
                    Column(
                        horizontalAlignment = Alignment.End,
                        modifier = Modifier.clickable { onExpensesClick() }
                    ) {
                        Text("Total Expenses", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                        Text(inr(exp.total), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Danger)
                    }
                }
            }
        }
    }
}

// ─── Alert row ────────────────────────────────────────────────────────────────
@Composable
private fun AlertRow(m: ExpiringMemberDto, isOverdue: Boolean, onClick: () -> Unit) {
    val accent = if (isOverdue) Danger else Warning
    val bg     = if (isOverdue) DangerLight else WarningLight

    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
            .shadow(2.dp, RoundedCornerShape(14.dp), clip = false)
            .clip(RoundedCornerShape(14.dp))
            .background(Surface)
            .clickable { onClick() }
    ) {
        Box(Modifier.width(4.dp).fillMaxHeight().background(accent))
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(40.dp).clip(CircleShape).background(bg), Alignment.Center) {
                Text(if (isOverdue) "⚠️" else "⏰", fontSize = 18.sp)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("${m.firstName} ${m.lastName}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                m.contact?.takeIf { it.isNotEmpty() }?.let { Text("📞 $it", fontSize = 12.sp, color = TextSecondary) }
                val dateStr  = m.nextPaymentDate.take(10)
                val subtitle = if (isOverdue) {
                    try {
                        val ms   = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dateStr)?.time ?: 0L
                        val days = (System.currentTimeMillis() - ms) / 86_400_000L
                        "Due $dateStr · ${days}d overdue"
                    } catch (_: Exception) { "Due $dateStr" }
                } else "Due $dateStr"
                Text(subtitle, fontSize = 12.sp, color = accent, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
