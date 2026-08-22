package com.srgs.ems.ui.screens.main

import android.app.DatePickerDialog
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.AddExpenseViewModel
import java.util.Calendar

private val CATEGORIES = listOf(
    "Rent / Lease", "Electricity", "Water", "Internet & Phone",
    "Staff Salaries", "Equipment Purchase", "Equipment Maintenance",
    "Cleaning & Housekeeping", "Marketing & Advertising",
    "Supplements & Products", "Gym Supplies", "Software & Subscriptions",
    "Insurance", "Taxes & Govt Fees", "Miscellaneous"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddExpenseScreen(
    expenseId: String?,
    onBack: () -> Unit,
    vm: AddExpenseViewModel = viewModel()
) {
    LaunchedEffect(expenseId) {
        if (expenseId == null) vm.initialize(null, null, null, null, null, null, null, null, null, null)
    }

    val title by vm.title.collectAsState()
    val category by vm.category.collectAsState()
    val amount by vm.amount.collectAsState()
    val vendor by vm.vendor.collectAsState()
    val notes by vm.notes.collectAsState()
    val paymentMethod by vm.paymentMethod.collectAsState()
    val expenseDate by vm.expenseDate.collectAsState()
    val isRecurring by vm.isRecurring.collectAsState()
    val recurringFrequency by vm.recurringFrequency.collectAsState()
    
    val isSubmitting by vm.isSubmitting.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        vm.saveResult.collect { res ->
            when (res) {
                is SaveResult.Success -> {
                    snackbar.showSnackbar("✅ Saved successfully!")
                    onBack()
                }
                is SaveResult.Error -> snackbar.showSnackbar("❌ ${res.message}")
            }
        }
    }

    val context = LocalContext.current
    fun showDatePicker() {
        val cal = Calendar.getInstance()
        DatePickerDialog(context, { _, y, m, d ->
            vm.expenseDate.value = String.format("%04d-%02d-%02d", y, m + 1, d)
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = { Text(if (vm.isEditing) "Edit Expense" else "Add Expense", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Text("←", fontSize = 22.sp, color = Color.White) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Primary)
            )
        }
    ) { pad ->
        LazyColumn(
            contentPadding = PaddingValues(top = pad.calculateTopPadding() + 8.dp, bottom = 80.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Card(
                    Modifier.fillMaxWidth().padding(16.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(Surface),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        // Title
                        TField(
                            label = "Title *",
                            value = title,
                            onValueChange = { vm.title.value = it }
                        )

                        // Category Dropdown
                        Text("Category *", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                        var expanded by remember { mutableStateOf(false) }
                        Box(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                            OutlinedTextField(
                                value = if (category.isEmpty()) "Select Category" else category,
                                onValueChange = {},
                                modifier = Modifier.fillMaxWidth(),
                                readOnly = true,
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                trailingIcon = { Text("▼", fontSize = 12.sp, color = TextSecondary) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = if (category.isEmpty()) Border else Primary,
                                    focusedBorderColor   = Primary
                                )
                            )
                            Box(
                                Modifier
                                    .matchParentSize()
                                    .clickable { expanded = true }
                            )
                            DropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false },
                                modifier = Modifier.fillMaxWidth(0.85f)
                            ) {
                                CATEGORIES.forEach { cat ->
                                    DropdownMenuItem(
                                        text = { Text(cat, fontSize = 14.sp) },
                                        onClick = {
                                            vm.category.value = cat
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }

                        // Amount (Restricted to Decimal / Numbers only)
                        TField(
                            label = "Amount (₹) *",
                            value = amount,
                            keyboardType = KeyboardType.Decimal,
                            onValueChange = { input ->
                                if (input.isEmpty() || input.matches(Regex("^\\d*\\.?\\d{0,2}$"))) {
                                    vm.amount.value = input
                                }
                            }
                        )

                        // Expense Date Picker
                        Text("Expense Date", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                        Box(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                            OutlinedTextField(
                                value = expenseDate,
                                onValueChange = {},
                                modifier = Modifier.fillMaxWidth(),
                                readOnly = true,
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                trailingIcon = { Text("📅", fontSize = 16.sp) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = Border,
                                    focusedBorderColor   = Primary
                                )
                            )
                            Box(
                                Modifier
                                    .matchParentSize()
                                    .clickable { showDatePicker() }
                            )
                        }

                        // Payment Method Selection
                        Text("Payment Method", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                        Row(
                            Modifier.fillMaxWidth().padding(bottom = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("cash", "upi", "bank_transfer", "card").forEach { m ->
                                val sel = paymentMethod == m
                                Surface(
                                    modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).clickable { vm.paymentMethod.value = m },
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (sel) Primary else Background,
                                    border = if (!sel) BorderStroke(1.dp, Border) else null
                                ) {
                                    Text(
                                        m.replace("_", " ").uppercase(),
                                        Modifier.padding(vertical = 10.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (sel) Color.White else TextSecondary,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                }
                            }
                        }

                        // Vendor & Notes
                        TField(label = "Vendor / Payee", value = vendor, onValueChange = { vm.vendor.value = it })
                        TField(label = "Notes", value = notes, onValueChange = { vm.notes.value = it })

                        // Recurring Switch
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Is this a recurring expense?", Modifier.weight(1f), fontSize = 14.sp)
                            Switch(checked = isRecurring, onCheckedChange = { vm.isRecurring.value = it })
                        }

                        if (isRecurring) {
                            Text("Frequency", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                            Row(
                                Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf("weekly", "monthly", "annual").forEach { f ->
                                    val sel = recurringFrequency == f
                                    Surface(
                                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).clickable { vm.recurringFrequency.value = f },
                                        shape = RoundedCornerShape(8.dp),
                                        color = if (sel) Primary else Background,
                                        border = if (!sel) BorderStroke(1.dp, Border) else null
                                    ) {
                                        Text(
                                            f.uppercase(),
                                            Modifier.padding(vertical = 10.dp),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (sel) Color.White else TextSecondary,
                                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item {
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { vm.submit() },
                    enabled = !isSubmitting,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                    else Text(if (vm.isEditing) "Save Changes" else "Add Expense", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                if (vm.isEditing) {
                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(
                        onClick = { vm.deleteExpense() },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Danger)
                    ) {
                        Text("Delete Expense", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Danger)
                    }
                }
                Spacer(Modifier.navigationBarsPadding().height(24.dp))
            }
        }
    }
}

@Composable
private fun TField(
    label: String,
    value: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    onValueChange: (String) -> Unit
) {
    Column(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        Text(label, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(8.dp),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Border,
                focusedBorderColor   = Primary
            )
        )
    }
}
