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
fun FeeStructuresScreen(
    vm: FeeStructuresViewModel = viewModel(),
    onNavigateToMembers: () -> Unit = {}
) {
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
            if (msg.startsWith("✅")) showSheet = false
            snackbar.showSnackbar(msg)
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
                    FeeStructureCard(
                        s = s,
                        classLabel = classLabel,
                        onClick = onNavigateToMembers,
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
            // Header Row: Title + Amount Badge + Delete Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Name
                Column(Modifier.weight(1f).padding(end = 8.dp)) {
                    Text(
                        text = s.name,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }

                // Right actions: Amount + Delete button
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Amount Pill
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Primary.copy(alpha = 0.1f),
                        border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))
                    ) {
                        Text(
                            text = "₹${currencyFmt.format(s.amount.toLong())}",
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Primary
                        )
                    }

                    // Delete Icon Button
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(DangerLight)
                    ) {
                        Text("🗑", fontSize = 14.sp)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Footer Row: Class/Group + Frequency Chip
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Group / Type Indicator
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(if (isAddon) "🧩" else "👥", fontSize = 13.sp)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = groupLabel,
                        fontSize = 13.sp,
                        color = if (isAddon) Primary else TextSecondary,
                        fontWeight = if (isAddon) FontWeight.SemiBold else FontWeight.Normal
                    )
                }

                // Frequency Badge
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = PrimaryLight.copy(alpha = 0.5f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🕒 ", fontSize = 10.sp)
                        Text(
                            text = (FREQUENCY_LABELS[s.frequency] ?: s.frequency).uppercase(),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Primary,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
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
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. Tuition Fee / Personal Training") },
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
                com.srgs.ems.viewmodel.FeeStructureType.values().forEach { t ->
                    val isSel = selectedType == t.value
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { vm.selectedType.value = t.value },
                        shape = RoundedCornerShape(10.dp),
                        color = if (isSel) Primary.copy(.12f) else Background,
                        border = BorderStroke(1.5.dp, if (isSel) Primary else Border)
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(
                                t.label,
                                fontSize = 14.sp,
                                fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSel) Primary else TextPrimary
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                t.description,
                                fontSize = 11.sp,
                                color = TextSecondary,
                                lineHeight = 14.sp
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            // Group selector (school/coaching + Standard FeeStructure type)
            if (!isGym && selectedType == com.srgs.ems.viewmodel.FeeStructureType.FeeStructure.value && groups.isNotEmpty()) {
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
