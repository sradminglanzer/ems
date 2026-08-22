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
import com.srgs.ems.viewmodel.FeeStructureType
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
fun FeeStructuresScreen(
    vm: FeeStructuresViewModel = viewModel(),
    onNavigateToMembers: () -> Unit = {}
) {
    val session = SessionManager.session
    val labels = session?.labels ?: com.srgs.ems.data.api.EntityLabelsDto()
    val isGym = session?.isBusinessMode ?: true
    val classLabel = labels.groupSingle

    val structures by vm.structures.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val deleteTarget by vm.deleteTarget.collectAsState()

    val snackbar = remember { SnackbarHostState() }
    var showSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            if (msg.startsWith("✅")) showSheet = false
            snackbar.showSnackbar(msg)
        }
    }
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = { EmsTopBar(labels.planPlural, scrollBehavior) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { vm.startCreate(); showSheet = true },
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
                    FeeStructureCard(
                        s = s,
                        classLabel = classLabel,
                        onClick = { vm.startEdit(s); showSheet = true },
                        onDelete = { vm.deleteTarget.value = s }
                    )
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
private fun FeeStructureCard(
    s: FeeStructureDto,
    classLabel: String,
    onClick: () -> Unit = {},
    onDelete: () -> Unit
) {
    val isAddon = s.isAddon
    val groupLabel = when {
        isAddon -> "Add-on Fee Structure"
        s.feeGroupId != null -> "$classLabel: ${s.groupDetails?.name ?: "Unknown"}"
        else -> "Standard Fee Structure"
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(16.dp)) {
            // Top Row: Icon + Title + Delete Action
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(Primary.copy(alpha = 0.1f)),
                    Alignment.Center
                ) {
                    Text(if (isAddon) "🧩" else "💳", fontSize = 18.sp)
                }
                Spacer(Modifier.width(12.dp))
                Text(
                    text = s.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(34.dp).clip(CircleShape).background(DangerLight)
                ) {
                    Text("🗑", fontSize = 14.sp)
                }
            }

            Spacer(Modifier.height(14.dp))

            // Middle Highlight Row: Amount + Frequency Tag
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "₹${currencyFmt.format(s.amount.toLong())}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Primary
                )

                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Primary.copy(alpha = 0.08f),
                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))
                ) {
                    Text(
                        text = "📅 ${(FREQUENCY_LABELS[s.frequency] ?: s.frequency).uppercase()}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Primary,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = Border.copy(alpha = 0.6f))
            Spacer(Modifier.height(10.dp))

            // Bottom Target Scope
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🛏️ ", fontSize = 12.sp)
                    Text(
                        text = groupLabel,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        fontWeight = FontWeight.Medium
                    )
                }
                Text("✏️ Edit", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
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
    val selectedType by vm.selectedType.collectAsState()
    val groups by vm.groups.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()
    val editingStructure by vm.editingStructure.collectAsState()

    val freqs = if (isGym) GYM_FREQS else SCHOOL_FREQS

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface, tonalElevation = 0.dp) {
        Column(
            Modifier.verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 20.dp).padding(bottom = 24.dp)
        ) {
            Text(if (editingStructure != null) "Edit Fee Plan" else "Create Fee Plan", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text(if (editingStructure != null) "Update pricing structure details" else "Add a new pricing structure", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(24.dp))

            // Name
            Text("Fee Name *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(value = name, onValueChange = { vm.name.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. Monthly Rent - 2 Sharing / Security Deposit") },
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

            // Type selector (FeeStructure vs FeeStructureAddon)
            Text("Fee Structure Type *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                FeeStructureType.values().forEach { t ->
                    val isSel = selectedType == t.value
                    Surface(
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).clickable { vm.selectedType.value = t.value },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSel) Primary.copy(alpha = 0.12f) else Surface,
                        border = BorderStroke(1.5.dp, if (isSel) Primary else Border)
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(t.label, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isSel) Primary else TextPrimary)
                            Spacer(Modifier.height(2.dp))
                            Text(t.description, fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            // Target Room / Class Assignment Selector
            if (!isGym && groups.isNotEmpty()) {
                Text("Target ${classLabel} Assignment", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
                val roomOptions = listOf(Pair("", "🌐 All ${classLabel}s")) + groups.map { Pair(it._id, "🛏️ ${it.name}") }
                FlowRow(items = roomOptions, selected = selectedGroupId, onSelect = { vm.selectedGroupId.value = it })
                Spacer(Modifier.height(16.dp))
            }

            // Frequency
            Text("Billing Frequency *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
            FlowRow(items = freqs, selected = frequency, onSelect = { vm.frequency.value = it })
            Spacer(Modifier.height(28.dp))

            Button(
                onClick = { vm.save(isGym) },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text(if (editingStructure != null) "✓  Update Structure" else "✓  Create Structure", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

/** A wrapping row of pill chips */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowRow(items: List<Any>, selected: String, onSelect: (String) -> Unit) {
    val pairs: List<Pair<String, String>> = items.mapNotNull { item ->
        when (item) {
            is FeeStructureDto -> Pair(item._id, item.name)
            is com.srgs.ems.data.api.FeeGroupDto -> Pair(item._id, item.name)
            is Pair<*, *> -> Pair(item.first.toString(), item.second.toString())
            is String -> Pair(item, FREQUENCY_LABELS[item] ?: item)
            else -> null
        }
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
