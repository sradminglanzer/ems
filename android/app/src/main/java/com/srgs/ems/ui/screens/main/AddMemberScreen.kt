package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.ui.components.EmsDateField
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.AddMemberViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMemberScreen(
    memberId: String?,
    feeGroupIdParam: String?,
    onBack: () -> Unit,
    vm: AddMemberViewModel = viewModel()
) {
    LaunchedEffect(memberId, feeGroupIdParam) { vm.initialize(memberId, feeGroupIdParam) }

    val session = SessionManager.session
    val isGym = session?.isGym ?: false

    val isSubmitting  by vm.isSubmitting.collectAsState()
    val isLoadingData by vm.isLoadingData.collectAsState()

    val fName      by vm.firstName.collectAsState()
    val mName      by vm.middleName.collectAsState()
    val lName      by vm.lastName.collectAsState()
    val kId        by vm.knownId.collectAsState()
    val dob        by vm.dob.collectAsState()
    val joiningDate by vm.joiningDate.collectAsState()
    val contact    by vm.contact.collectAsState()
    val altContact by vm.altContact.collectAsState()
    val address    by vm.address.collectAsState()
    val fOcc       by vm.fatherOccupation.collectAsState()
    val mOcc       by vm.motherOccupation.collectAsState()

    val selGroupId     by vm.feeGroupId.collectAsState()
    val primaryStructs by vm.primaryStructures.collectAsState()
    val addonStructs   by vm.addonStructures.collectAsState()
    val selectedPlanId by vm.selectedPlanId.collectAsState()
    val selAddons      by vm.addonFeeIds.collectAsState()

    val posAmount        by vm.posAmount.collectAsState()
    val posPaymentMethod by vm.posPaymentMethod.collectAsState()
    val posPaymentDate   by vm.posPaymentDateStr.collectAsState()
    val posNextDateStr   by vm.posNextDateStr.collectAsState()

    val groups by vm.feeGroups.collectAsState()

    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        vm.saveResult.collect { res ->
            when (res) {
                is SaveResult.Success -> { snackbar.showSnackbar("✅ Saved successfully!"); onBack() }
                is SaveResult.Error   -> snackbar.showSnackbar("❌ ${res.message}")
            }
        }
    }

    Scaffold(
        snackbarHost   = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (vm.isEditing) "Edit Member" else "Add Member",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 22.sp, color = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Primary)
            )
        }
    ) { pad ->
        if (isLoadingData) {
            Box(Modifier.fillMaxSize().padding(pad), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(
                    top    = pad.calculateTopPadding() + 8.dp,
                    bottom = 80.dp
                ),
                modifier = Modifier.fillMaxSize()
            ) {
                // ── Personal Details ──────────────────────────────────────────
                item {
                    Card(
                        Modifier.fillMaxWidth().padding(16.dp),
                        RoundedCornerShape(14.dp),
                        CardDefaults.cardColors(Surface),
                        CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("👤", fontSize = 18.sp)
                                Spacer(Modifier.width(8.dp))
                                Text("Personal Details", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                            Spacer(Modifier.height(16.dp))
                            TField("First Name *",  fName,      { vm.firstName.value  = it })
                            TField("Middle Name",   mName,      { vm.middleName.value  = it })
                            TField("Last Name *",   lName,      { vm.lastName.value    = it })
                            if (!isGym) {
                                TField("Roll / Student ID *", kId, { vm.knownId.value = it })
                            }
                            EmsDateField(
                                label         = "Date of Birth",
                                value         = dob,
                                onValueChange = { vm.dob.value = it },
                                modifier      = Modifier.padding(bottom = 12.dp)
                            )
                            EmsDateField(
                                label         = "Joining Date (optional)",
                                value         = joiningDate,
                                onValueChange = { vm.joiningDate.value = it },
                                modifier      = Modifier.padding(bottom = 12.dp)
                            )
                            TField("Contact Number",             contact,    { vm.contact.value    = it })
                            TField("Alternate Contact",          altContact, { vm.altContact.value = it })
                            TField("Address",                    address,    { vm.address.value    = it })
                            if (!isGym) {
                                TField("Father's Occupation", fOcc, { vm.fatherOccupation.value = it })
                                TField("Mother's Occupation", mOcc, { vm.motherOccupation.value = it })
                            }
                        }
                    }
                }

                // ── Gym: Plan & Add-on selection ──────────────────────────────
                if (isGym) {
                    item {
                        Card(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            RoundedCornerShape(14.dp),
                            CardDefaults.cardColors(Surface),
                            CardDefaults.cardElevation(2.dp)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                // 1. Primary Membership Plan (Single Choice - Radio)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("💳", fontSize = 18.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Column {
                                        Text("Membership Plan", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text("Select one primary membership plan", fontSize = 12.sp, color = TextSecondary)
                                    }
                                }
                                Spacer(Modifier.height(12.dp))
                                if (primaryStructs.isEmpty()) {
                                    Text("No membership plans configured", color = TextSecondary, fontSize = 13.sp)
                                } else {
                                    primaryStructs.forEach { g ->
                                        val isSel = selectedPlanId == g._id
                                        Row(
                                            Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(8.dp))
                                                .clickable { vm.selectPrimaryPlan(g._id) }
                                                .padding(vertical = 4.dp, horizontal = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            RadioButton(
                                                selected = isSel,
                                                onClick  = { vm.selectPrimaryPlan(g._id) },
                                                colors   = RadioButtonDefaults.colors(selectedColor = Primary)
                                            )
                                            Text(
                                                g.name,
                                                Modifier.weight(1f).padding(start = 8.dp),
                                                fontSize   = 14.sp,
                                                fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal
                                            )
                                            Text("₹${g.amount.toInt()}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Primary)
                                        }
                                    }
                                }

                                // 2. Add-on Services (Multiple Choice - Checkboxes)
                                if (addonStructs.isNotEmpty()) {
                                    Spacer(Modifier.height(16.dp))
                                    HorizontalDivider(color = Border.copy(alpha = 0.5f))
                                    Spacer(Modifier.height(16.dp))

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("🧩", fontSize = 18.sp)
                                        Spacer(Modifier.width(8.dp))
                                        Column {
                                            Text("Add-on Services", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                            Text("Optional extra services", fontSize = 12.sp, color = TextSecondary)
                                        }
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    addonStructs.forEach { g ->
                                        val isChecked = selAddons.contains(g._id)
                                        Row(
                                            Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(8.dp))
                                                .clickable { vm.toggleAddon(g._id) }
                                                .padding(vertical = 4.dp, horizontal = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Checkbox(
                                                checked = isChecked,
                                                onCheckedChange = { vm.toggleAddon(g._id) },
                                                colors = CheckboxDefaults.colors(checkedColor = Primary)
                                            )
                                            Text(g.name, Modifier.weight(1f).padding(start = 8.dp), fontSize = 14.sp)
                                            Text("₹${g.amount.toInt()}", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Gym: Initial Payment (create only)
                    if (!vm.isEditing) {
                        item {
                            Spacer(Modifier.height(16.dp))
                            Card(
                                Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                RoundedCornerShape(14.dp),
                                CardDefaults.cardColors(Surface),
                                CardDefaults.cardElevation(2.dp)
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("💰", fontSize = 18.sp)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Initial Payment", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                    }
                                    Spacer(Modifier.height(16.dp))
                                    NumericTField("Amount Collected (₹)", posAmount, { vm.posAmount.value = it })
                                    Row(
                                        Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        EmsDateField(
                                            label         = "Payment Date",
                                            value         = posPaymentDate,
                                            onValueChange = { vm.onPaymentDateChanged(it) },
                                            modifier      = Modifier.weight(1f)
                                        )
                                        EmsDateField(
                                            label         = "Next Renewal Date",
                                            value         = posNextDateStr,
                                            onValueChange = { vm.onNextDateManuallyChanged(it) },
                                            modifier      = Modifier.weight(1f)
                                        )
                                    }
                                    Text(
                                        "Payment Method",
                                        fontSize = 12.sp, color = TextSecondary,
                                        modifier = Modifier.padding(bottom = 6.dp)
                                    )
                                    Row(
                                        Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        listOf("cash", "online", "card", "upi").forEach { m ->
                                            val sel = posPaymentMethod == m
                                            Surface(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .clickable { vm.posPaymentMethod.value = m },
                                                shape  = RoundedCornerShape(8.dp),
                                                color  = if (sel) Primary else Background,
                                                border = if (!sel) BorderStroke(1.dp, Border) else null
                                            ) {
                                                Text(
                                                    m.uppercase(),
                                                    Modifier.padding(vertical = 10.dp),
                                                    fontSize   = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color      = if (sel) Color.White else TextSecondary,
                                                    textAlign  = androidx.compose.ui.text.style.TextAlign.Center
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // School / Coaching: Class assignment
                    item {
                        Card(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            RoundedCornerShape(14.dp),
                            CardDefaults.cardColors(Surface),
                            CardDefaults.cardElevation(2.dp)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("📚", fontSize = 18.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("Class Assignment", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                }
                                Spacer(Modifier.height(12.dp))
                                if (groups.isEmpty()) {
                                    Text("No classes available", color = TextSecondary, fontSize = 13.sp)
                                } else {
                                    Text(
                                        "Select Class",
                                        fontSize = 12.sp, color = TextSecondary,
                                        modifier = Modifier.padding(bottom = 4.dp)
                                    )
                                    Column(
                                        Modifier
                                            .fillMaxWidth()
                                            .border(1.dp, Border, RoundedCornerShape(8.dp))
                                            .clip(RoundedCornerShape(8.dp))
                                    ) {
                                        groups.forEachIndexed { idx, g ->
                                            val sel = selGroupId == g._id
                                            Row(
                                                Modifier
                                                    .fillMaxWidth()
                                                    .clickable { vm.feeGroupId.value = g._id }
                                                    .padding(12.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                RadioButton(
                                                    selected = sel,
                                                    onClick  = { vm.feeGroupId.value = g._id },
                                                    colors   = RadioButtonDefaults.colors(selectedColor = Primary)
                                                )
                                                Text(
                                                    g.name,
                                                    Modifier.padding(start = 8.dp),
                                                    fontSize   = 15.sp,
                                                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal
                                                )
                                            }
                                            if (idx < groups.lastIndex) HorizontalDivider(color = Border)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Submit button ─────────────────────────────────────────────
                item {
                    Spacer(Modifier.height(24.dp))
                    Button(
                        onClick  = { vm.submit(session) },
                        enabled  = !isSubmitting,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .height(50.dp),
                        shape  = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                        } else {
                            Text(
                                if (vm.isEditing) "Save Changes" else "Create Member",
                                fontSize   = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color      = Color.White
                            )
                        }
                    }
                    Spacer(Modifier.height(32.dp))
                }
            }
        }
    }
}

@Composable
private fun TField(label: String, value: String, onValueChange: (String) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        Text(label, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
        OutlinedTextField(
            value         = value,
            onValueChange = onValueChange,
            modifier      = Modifier.fillMaxWidth(),
            singleLine    = true,
            shape         = RoundedCornerShape(8.dp),
            colors        = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Border,
                focusedBorderColor   = Primary
            )
        )
    }
}

@Composable
private fun NumericTField(label: String, value: String, onValueChange: (String) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        Text(label, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
        OutlinedTextField(
            value          = value,
            onValueChange  = { if (it.all { c -> c.isDigit() || c == '.' }) onValueChange(it) },
            modifier       = Modifier.fillMaxWidth(),
            singleLine     = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape          = RoundedCornerShape(8.dp),
            colors         = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Border,
                focusedBorderColor   = Primary
            )
        )
    }
}
