package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.srgs.ems.data.api.ExpenseDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ExpensesViewModel
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale

private val CATEGORY_ICONS = mapOf(
    "Rent / Lease" to "🏠", "Electricity" to "⚡", "Water" to "💧",
    "Internet & Phone" to "📡", "Staff Salaries" to "👤",
    "Equipment Purchase" to "🏋️", "Equipment Maintenance" to "🔧",
    "Cleaning & Housekeeping" to "🧹", "Marketing & Advertising" to "📢",
    "Supplements & Products" to "💊", "Gym Supplies" to "🛍️",
    "Software & Subscriptions" to "💻", "Insurance" to "🛡️",
    "Taxes & Govt Fees" to "🏛️", "Miscellaneous" to "📋"
)

private val ALL_CATEGORIES = listOf(
    "Rent / Lease", "Electricity", "Water", "Internet & Phone",
    "Staff Salaries", "Equipment Purchase", "Equipment Maintenance",
    "Cleaning & Housekeeping", "Marketing & Advertising",
    "Supplements & Products", "Gym Supplies", "Software & Subscriptions",
    "Insurance", "Taxes & Govt Fees", "Miscellaneous"
)

private fun inrFmt(v: Double) = "₹${NumberFormat.getNumberInstance(Locale("en", "IN")).format(v)}"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpensesScreen(
    onAddExpense: (String?) -> Unit,
    vm: ExpensesViewModel = viewModel()
) {
    val expenses by vm.expenses.collectAsState()
    val summary by vm.summary.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val selectedYear by vm.selectedYear.collectAsState()
    val selectedMonth by vm.selectedMonth.collectAsState()
    val selectedCategory by vm.selectedCategory.collectAsState()

    val monthName = java.text.DateFormatSymbols().months[selectedMonth - 1]
    val totalSpend = expenses.filter { it.status == "confirmed" || it.status == "paid" }.sumOf { it.amount }
    val pendingCount = expenses.count { it.status == "pending_confirmation" }

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        containerColor = Background,
        topBar = { EmsTopBar("Expenses", scrollBehavior) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onAddExpense(null) },
                containerColor = Primary, contentColor = Color.White, shape = CircleShape
            ) {
                Text("+", fontSize = 28.sp, modifier = Modifier.padding(bottom = 4.dp))
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(top = padding.calculateTopPadding())) {
            Row(
                Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { vm.prevMonth() }) { Text("◀", color = Primary) }
                Text(
                    "$monthName $selectedYear",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                IconButton(onClick = { vm.nextMonth() }) { Text("▶", color = Primary) }
            }

            // Summary Card
            Card(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 16.dp),
                RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(Surface),
                elevation = CardDefaults.cardElevation(2.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Total Spent", fontSize = 12.sp, color = TextSecondary)
                    Text(inrFmt(totalSpend), fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                    if (pendingCount > 0) {
                        Text(
                            "⏳ $pendingCount recurring expense(s) pending confirmation",
                            fontSize = 12.sp,
                            color = Color(0xFFD97706),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }

                    if (summary.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            summary.take(2).forEach { s ->
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Background,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(Modifier.padding(8.dp)) {
                                        Text(
                                            "${CATEGORY_ICONS[s._id] ?: "📋"} ${s._id.split(" ").first()}",
                                            fontSize = 12.sp,
                                            color = TextSecondary,
                                            maxLines = 1
                                        )
                                        Text(inrFmt(s.total), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Category Filter Pills
            Text(
                "Filter by Category",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterPill("All", selectedCategory == "") {
                        vm.selectedCategory.value = ""; vm.fetchExpenses()
                    }
                }
                items(ALL_CATEGORIES) { cat ->
                    val label = "${CATEGORY_ICONS[cat] ?: ""} $cat"
                    FilterPill(label, selectedCategory == cat) {
                        vm.selectedCategory.value = cat; vm.fetchExpenses()
                    }
                }
            }
            Spacer(Modifier.height(8.dp))

            if (isLoading) {
                Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Primary) }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(bottom = 80.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    val pending = expenses.filter { it.status == "pending_confirmation" }
                    if (pending.isNotEmpty()) {
                        item {
                            Text(
                                "⏳ Awaiting Confirmation",
                                color = Color(0xFFD97706),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                        items(pending) { e ->
                            ExpenseCard(
                                e,
                                isPending = true,
                                onConfirm = { vm.confirmRecurring(e._id, e.amount) },
                                onClick = { onAddExpense(e._id) }
                            )
                        }
                    }

                    val confirmed = expenses.filter { it.status != "pending_confirmation" }
                    if (confirmed.isNotEmpty()) {
                        item {
                            Text(
                                "Confirmed Expenses",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                        items(confirmed) { e ->
                            ExpenseCard(
                                e,
                                isPending = false,
                                onConfirm = {},
                                onClick = { onAddExpense(e._id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterPill(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.clip(RoundedCornerShape(20.dp)).clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) Primary else Surface,
        border = if (!isSelected) BorderStroke(1.dp, Border) else null
    ) {
        Text(
            label,
            Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            fontSize = 13.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) Color.White else TextPrimary
        )
    }
}

@Composable
private fun ExpenseCard(e: ExpenseDto, isPending: Boolean, onConfirm: () -> Unit, onClick: () -> Unit) {
    val dateFmt = try {
        SimpleDateFormat("dd MMM", Locale.US).format(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(e.expenseDate)!!
        )
    } catch (_: Exception) {
        e.expenseDate.take(10)
    }
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp).clickable(onClick = onClick),
        RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border = if (isPending) BorderStroke(1.dp, Color(0xFFF59E0B).copy(.5f)) else null
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(CATEGORY_ICONS[e.category] ?: "📋", fontSize = 24.sp, modifier = Modifier.padding(end = 12.dp))
            Column(Modifier.weight(1f)) {
                Text(e.title, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                Text("${e.category}${if (e.vendor != null) " · ${e.vendor}" else ""}", fontSize = 12.sp, color = TextSecondary)
                Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFFE5E7EB)) {
                        Text(
                            e.paymentMethod.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                            color = TextSecondary
                        )
                    }
                    if (e.isRecurring) {
                        Surface(shape = RoundedCornerShape(4.dp), color = PrimaryLight.copy(0.2f)) {
                            Text(
                                "⟳ Recurring",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                                color = Primary
                            )
                        }
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    inrFmt(e.amount),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (isPending) Color(0xFFD97706) else TextPrimary
                )
                if (isPending) {
                    Button(
                        onClick = onConfirm,
                        modifier = Modifier.padding(top = 4.dp).height(28.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706))
                    ) {
                        Text("Confirm", fontSize = 11.sp, color = Color.White)
                    }
                } else {
                    Text(dateFmt, fontSize = 11.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }
    }
}
