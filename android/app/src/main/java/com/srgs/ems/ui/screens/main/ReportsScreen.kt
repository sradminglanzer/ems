package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ReportsViewModel
import java.text.NumberFormat
import java.util.Locale

private val RMaxH = 180.dp
private val RMinH  = 80.dp

private fun inrFmt(v: Double) = "₹${NumberFormat.getNumberInstance(Locale("en", "IN")).format(v)}"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(vm: ReportsViewModel = viewModel()) {
    val session = SessionManager.session
    val academicYearId = session?.entityId
    
    LaunchedEffect(vm.dateFilter.value) {
        vm.fetchReports(academicYearId)
    }

    val reports by vm.reports.collectAsState()
    val financials by vm.financials.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val dateFilter by vm.dateFilter.collectAsState()

    val netBalance = financials?.summary?.netBalance ?: 0.0
    val totalColl = financials?.summary?.collections ?: 0.0
    val totalExp = financials?.summary?.expenses ?: 0.0

    var activeTab by remember { mutableStateOf("financials") }

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        containerColor = Background,
        topBar = { EmsTopBar("Business Reports", scrollBehavior) },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(top = padding.calculateTopPadding())) {
            // Date Filters
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "this_month" to "This Month",
                    "last_month" to "Last Month",
                    "3_months" to "3 Months",
                    "6_months" to "6 Months",
                    "ytd" to "YTD"
                ).forEach { (key, label) ->
                    val sel = dateFilter == key
                    Surface(
                        modifier = Modifier.clip(RoundedCornerShape(20.dp)).clickable { vm.dateFilter.value = key },
                        shape = RoundedCornerShape(20.dp),
                        color = if (sel) Primary else Surface,
                        border = if (!sel) BorderStroke(1.dp, Border) else null
                    ) {
                        Text(label, Modifier.padding(horizontal = 16.dp, vertical = 8.dp), fontSize = 13.sp, fontWeight = if (sel) FontWeight.Bold else FontWeight.Medium, color = if (sel) Color.White else TextPrimary)
                    }
                }
            }

            if (isLoading) {
                Box(Modifier.fillMaxWidth().weight(1f), Alignment.Center) { CircularProgressIndicator(color = Primary) }
            } else {
                // KPI Cards
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    KpiCard("Total Collections", inrFmt(totalColl), Color(0xFF27AE60), Modifier.weight(1f))
                    KpiCard("Total Expenses", inrFmt(totalExp), Color(0xFFE74C3C), Modifier.weight(1f))
                }
                Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(Surface), elevation = CardDefaults.cardElevation(2.dp)) {
                    Column(Modifier.padding(16.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Net Balance", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                        Text(inrFmt(netBalance), fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = if (netBalance >= 0) Color(0xFF27AE60) else Color(0xFFE74C3C), modifier = Modifier.padding(top = 4.dp))
                    }
                }

                // Tabs
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    listOf("financials" to "Financials", "overview" to "Overview", "history" to "History").forEach { (key, label) ->
                        val sel = activeTab == key
                        Text(
                            label,
                            modifier = Modifier.clickable { activeTab = key }.padding(bottom = 4.dp),
                            fontSize = 15.sp,
                            fontWeight = if (sel) FontWeight.Bold else FontWeight.Medium,
                            color = if (sel) Primary else TextSecondary,
                        )
                    }
                }
                HorizontalDivider(color = Border)

                LazyColumn(contentPadding = PaddingValues(bottom = 80.dp), modifier = Modifier.fillMaxWidth().weight(1f)) {
                    when (activeTab) {
                        "financials" -> {
                            item {
                                val topExp = financials?.topExpenses ?: emptyList()
                                if (topExp.isNotEmpty()) {
                                    Text("Top Expenses", fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp))
                                    topExp.forEach { e ->
                                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(e._id, fontSize = 14.sp)
                                            Text(inrFmt(e.total), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFE74C3C))
                                        }
                                        HorizontalDivider(color = Border)
                                    }
                                } else {
                                    Text("No expenses found.", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(16.dp))
                                }
                            }
                        }
                        "overview" -> {
                            item {
                                val incomeGrp = financials?.incomeDetails?.byGroup ?: emptyList()
                                if (incomeGrp.isNotEmpty()) {
                                    Text(financials?.groupLabel ?: "Collections by Plan", fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp))
                                    incomeGrp.forEach { g ->
                                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Column {
                                                Text(g.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                                Text("${g.count} members", fontSize = 12.sp, color = TextSecondary)
                                            }
                                            Text(inrFmt(g.total), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF27AE60))
                                        }
                                        HorizontalDivider(color = Border)
                                    }
                                } else {
                                    Text("No collections found.", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(16.dp))
                                }
                            }
                        }
                        "history" -> {
                            item {
                                val history = financials?.history ?: emptyList()
                                if (history.isNotEmpty()) {
                                    history.forEach { h ->
                                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            val isInc = h.type == "income"
                                            Text(if (isInc) "💰" else "💸", fontSize = 20.sp, modifier = Modifier.padding(end = 12.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(h.label, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                                Text(h.date.take(10), fontSize = 12.sp, color = TextSecondary)
                                            }
                                            Text("${if(isInc) "+" else "-"}${inrFmt(h.amount)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (isInc) Color(0xFF27AE60) else Color(0xFFE74C3C))
                                        }
                                        HorizontalDivider(color = Border)
                                    }
                                } else {
                                    Text("No history found.", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(16.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


@Composable
private fun KpiCard(label: String, value: String, color: Color, modifier: Modifier) {
    Card(modifier, RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(Surface), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(label, fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = color)
        }
    }
}
