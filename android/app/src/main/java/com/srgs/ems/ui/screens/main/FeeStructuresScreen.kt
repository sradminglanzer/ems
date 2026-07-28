package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.FeeStructuresViewModel
import java.text.NumberFormat
import java.util.Locale


private val FREQUENCY_LABELS = mapOf(
    "daily" to "Daily", "weekly" to "Weekly", "monthly" to "Monthly",
    "quarterly" to "Quarterly", "half-yearly" to "Half-Yearly",
    "annual" to "Annual", "one-time" to "One-Time"
)
private val GYM_FREQS = listOf("daily", "weekly", "monthly", "quarterly", "half-yearly", "annual", "one-time")
private val SCHOOL_FREQS = listOf("monthly", "annual", "one-time")

private val currencyFmt = NumberFormat.getNumberInstance(Locale("en", "IN"))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeeStructuresScreen(vm: FeeStructuresViewModel = viewModel()) {
    val session = SessionManager.session
    val isGym = session?.entityType == "gym"
    val classLabel = when (session?.entityType) { "gym" -> "Plan"; "coaching" -> "Batch"; else -> "Class" }

    val structures by vm.structures.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val deleteTarget by vm.deleteTarget.collectAsState()

    val snackbar = remember { SnackbarHostState() }
    var showSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
            if (showSheet && msg.startsWith("✅")) showSheet = false
        }
    }
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = { EmsTopBar(if (isGym) "Billing Plans" else "Fee Structures", scrollBehavior) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showSheet = true },
                containerColor = Primary, contentColor = Color.White, shape = CircleShape
            ) {
                Text("+", fontSize = 28.sp, modifier = Modifier.padding(bottom = 4.dp))
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        when {
            isLoading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
            structures.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("💳", fontSize = 48.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("No fee structures created yet.", color = TextSecondary)
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(top = padding.calculateTopPadding() + 8.dp, start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Text("${structures.size} plan${if (structures.size != 1) "s" else ""} configured",
                        fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 4.dp))
                }
                items(structures, key = { it._id }) { s ->
                    FeeStructureCard(s, classLabel, onDelete = { vm.deleteTarget.value = s })
                }
            }
        }
    }

    if (showSheet) {
        CreateFeeStructureSheet(vm = vm, isGym = isGym, classLabel = classLabel, onDismiss = { showSheet = false })
    }

    // Delete confirmation
    deleteTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { vm.deleteTarget.value = null },
            title = { Text("Delete Fee Structure", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to delete \"${target.name}\"? This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = { vm.delete(target._id); vm.deleteTarget.value = null },
                    colors = ButtonDefaults.textButtonColors(contentColor = Danger)
                ) { Text("Delete", fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { vm.deleteTarget.value = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun FeeStructureCard(s: FeeStructureDto, classLabel: String, onDelete: () -> Unit) {
    val groupLabel = if (s.feeGroupId != null)
        "$classLabel: ${s.groupDetails?.name ?: "Unknown"}"
    else "Global Add-on Fee"

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(s.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary,
                        modifier = Modifier.weight(1f))
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)).background(DangerLight.copy(.5f))
                    ) { Text("🗑", fontSize = 14.sp) }
                }
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("👥", fontSize = 12.sp)
                    Spacer(Modifier.width(4.dp))
                    Text(groupLabel, fontSize = 13.sp, color = TextSecondary)
                }
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🕒", fontSize = 12.sp)
                    Spacer(Modifier.width(4.dp))
                    Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFCCFBF1)) {
                        Text(
                            (FREQUENCY_LABELS[s.frequency] ?: s.frequency).uppercase(),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary,
                            letterSpacing = 0.6.sp
                        )
                    }
                }
            }
            Spacer(Modifier.width(12.dp))
            Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFCCFBF1).copy(.6f),
                border = BorderStroke(1.dp, Primary.copy(.2f))) {
                Text("₹${currencyFmt.format(s.amount.toLong())}",
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Primary)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateFeeStructureSheet(
    vm: FeeStructuresViewModel, isGym: Boolean, classLabel: String, onDismiss: () -> Unit
) {
    val name by vm.name.collectAsState()
    val amount by vm.amount.collectAsState()
    val frequency by vm.frequency.collectAsState()
    val selectedGroupId by vm.selectedGroupId.collectAsState()
    val isGlobal by vm.isGlobal.collectAsState()
    val groups by vm.groups.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    val freqs = if (isGym) GYM_FREQS else SCHOOL_FREQS

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface, tonalElevation = 0.dp) {
        Column(
            Modifier.verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp).padding(bottom = 32.dp)
        ) {
            Text("Create Fee Plan", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text("Add a new pricing structure", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(24.dp))

            // Name
            Text("Fee Name *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(value = name, onValueChange = { vm.name.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. Tuition Fee") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary))
            Spacer(Modifier.height(16.dp))

            // Amount
            Text("Amount (₹) *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(value = amount, onValueChange = { vm.amount.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. 5000") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary))
            Spacer(Modifier.height(16.dp))

            // Global toggle (school/coaching only)
            if (!isGym) {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                        .clickable { vm.isGlobal.value = !isGlobal }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(checked = isGlobal, onCheckedChange = { vm.isGlobal.value = it },
                        colors = CheckboxDefaults.colors(checkedColor = Primary))
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text("Global Add-on Fee", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        Text("Optional fee available across all classes", fontSize = 12.sp, color = TextSecondary)
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            // Group selector (school/coaching + not global)
            if (!isGym && !isGlobal && groups.isNotEmpty()) {
                Text("Assign to $classLabel", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
                FlowRow(groups, selectedGroupId) { vm.selectedGroupId.value = it }
                Spacer(Modifier.height(12.dp))
            }

            // Frequency
            Text("Frequency", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
            FlowRow(freqs.map { Pair(it, FREQUENCY_LABELS[it] ?: it) }, frequency) { vm.frequency.value = it }
            Spacer(Modifier.height(28.dp))

            Button(
                onClick = { vm.create(isGym) }, enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text("Create Structure", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

/** A wrapping row of pill chips */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowRow(items: List<Any>, selected: String, onSelect: (String) -> Unit) {
    val pairs: List<Pair<String, String>> = when {
        items.isEmpty() -> emptyList()
        items.first() is Pair<*, *> -> @Suppress("UNCHECKED_CAST") (items as List<Pair<String, String>>)
        else -> (items as? List<com.srgs.ems.data.api.FeeGroupDto>)?.map { Pair(it._id, it.name) } ?: emptyList()
    }
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        pairs.forEach { (id, label) ->
            val isSelected = selected == id
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) Primary.copy(.12f) else Background,
                border = BorderStroke(1.5.dp, if (isSelected) Primary else Border),
                modifier = Modifier.padding(bottom = 8.dp).clip(RoundedCornerShape(20.dp)).clickable { onSelect(id) }
            ) {
                Text(label, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    fontSize = 13.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = if (isSelected) Primary else TextSecondary)
            }
        }
    }
}
