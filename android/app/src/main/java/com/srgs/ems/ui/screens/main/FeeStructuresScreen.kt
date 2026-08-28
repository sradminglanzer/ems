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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
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
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.FeeStructureDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.FeeStructureType
import com.srgs.ems.viewmodel.FeeStructuresViewModel
import java.text.NumberFormat
import java.util.Locale

private val FREQUENCY_LABELS = mapOf(
    "daily" to "Daily", "weekly" to "Weekly", "monthly" to "Monthly",
    "quarterly" to "Quarterly", "half-yearly" to "Half-Yearly",
    "annual" to "Annual", "one-time" to "One-Time"
)
private val GYM_FREQS = listOf("daily", "weekly", "monthly", "quarterly", "half-yearly", "annual", "one-time")
private val SCHOOL_FREQS = listOf("monthly", "quarterly", "annual", "one-time")

private val currencyFmt = NumberFormat.getNumberInstance(Locale("en", "IN"))

enum class FeeFilterCategory(val label: String) {
    ALL("All Plans"),
    CLASS("Class Packages"),
    ADDON("Optional Add-ons")
}

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

    var selectedFilter by remember { mutableStateOf(FeeFilterCategory.ALL) }
    val snackbar = remember { SnackbarHostState() }
    var showSheet by remember { mutableStateOf(false) }

    val selectedYear by com.srgs.ems.data.AcademicYearManager.selectedYear.collectAsState()

    LaunchedEffect(selectedYear) {
        vm.load()
    }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            if (msg.startsWith("✅")) showSheet = false
            snackbar.showSnackbar(msg)
        }
    }
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    val filteredStructures = remember(structures, selectedFilter) {
        when (selectedFilter) {
            FeeFilterCategory.ALL -> structures
            FeeFilterCategory.CLASS -> structures.filter { !it.isAddon }
            FeeFilterCategory.ADDON -> structures.filter { it.isAddon }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = { EmsTopBar(labels.planPlural, scrollBehavior) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { vm.startCreate(); showSheet = true },
                containerColor = Primary, contentColor = Color.White, shape = CircleShape
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add Plan", modifier = Modifier.size(26.dp))
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
        ) {
            // Segmented Filter Tabs
            Surface(
                color = Surface,
                tonalElevation = 1.dp,
                border = BorderStroke(0.dp, Border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FeeFilterCategory.values().forEach { category ->
                        val isSelected = selectedFilter == category
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isSelected) Primary else Background,
                            border = BorderStroke(1.dp, if (isSelected) Primary else Border),
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(20.dp))
                                .clickable { selectedFilter = category }
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.padding(vertical = 8.dp)
                            ) {
                                Text(
                                    text = category.label,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else TextSecondary
                                )
                            }
                        }
                    }
                }
            }

            when {
                isLoading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                }
                filteredStructures.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                        Surface(
                            shape = CircleShape,
                            color = Primary.copy(alpha = 0.1f),
                            modifier = Modifier.size(64.dp)
                        ) {
                            Box(Modifier.fillMaxSize(), Alignment.Center) {
                                Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(32.dp))
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Text("No fee plans configured yet", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(Modifier.height(4.dp))
                        Text("Tap '+' to create a new fee structure", fontSize = 13.sp, color = TextSecondary)
                    }
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    item {
                        Text(
                            text = "${filteredStructures.size} plan${if (filteredStructures.size != 1) "s" else ""} configured",
                            fontSize = 13.sp, color = TextSecondary, fontWeight = FontWeight.Medium
                        )
                    }
                    items(filteredStructures, key = { it._id }) { s ->
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
    }

    if (showSheet) {
        CreateFeeStructureSheet(vm = vm, isGym = isGym, classLabel = classLabel, onDismiss = { showSheet = false })
    }

    // Delete confirmation dialog
    deleteTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { vm.deleteTarget.value = null },
            icon = {
                Surface(shape = CircleShape, color = Danger.copy(alpha = 0.12f), modifier = Modifier.size(48.dp)) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Icon(Icons.Filled.Delete, contentDescription = null, tint = Danger, modifier = Modifier.size(24.dp))
                    }
                }
            },
            title = { Text("Delete Fee Plan", fontWeight = FontWeight.Bold, fontSize = 19.sp) },
            text = { Text("Are you sure you want to delete \"${target.name}\"? This action cannot be undone.", fontSize = 14.sp, color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = { vm.delete(target._id); vm.deleteTarget.value = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger),
                    shape = RoundedCornerShape(10.dp)
                ) { Text("Delete Plan", fontWeight = FontWeight.Bold, color = Color.White) }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { vm.deleteTarget.value = null },
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, Border)
                ) { Text("Cancel", color = TextPrimary) }
            },
            containerColor = Surface,
            shape = RoundedCornerShape(20.dp)
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
    val assignedClassesText = remember(s) {
        when {
            isAddon -> "Optional Add-on"
            !s.groupNames.isNullOrEmpty() -> s.groupNames.joinToString(", ")
            s.groupDetails != null -> s.groupDetails.name
            else -> "All ${classLabel}s"
        }
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Surface,
        border = BorderStroke(1.dp, Border),
        tonalElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left Column: Fee Name + Metadata Row
            Column(Modifier.weight(1f)) {
                Text(
                    text = s.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Primary.copy(alpha = 0.08f),
                        border = BorderStroke(0.5.dp, Primary.copy(alpha = 0.2f))
                    ) {
                        Text(
                            text = (FREQUENCY_LABELS[s.frequency] ?: s.frequency).uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Text(
                        text = "•",
                        fontSize = 11.sp,
                        color = TextMuted
                    )

                    Text(
                        text = assignedClassesText,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(Modifier.width(12.dp))

            // Right Column: Price & Quick Action Icons
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "₹${currencyFmt.format(s.amount.toLong())}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary
                )
                Spacer(Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    IconButton(
                        onClick = onClick,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Edit,
                            contentDescription = "Edit",
                            tint = Primary,
                            modifier = Modifier.size(15.dp)
                        )
                    }
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Delete,
                            contentDescription = "Delete",
                            tint = Danger,
                            modifier = Modifier.size(15.dp)
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
    val selectedGroupIds by vm.selectedGroupIds.collectAsState()
    val selectedType by vm.selectedType.collectAsState()
    val groups by vm.groups.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()
    val editingStructure by vm.editingStructure.collectAsState()

    val freqs = if (isGym) GYM_FREQS else SCHOOL_FREQS

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        tonalElevation = 6.dp,
        dragHandle = {
            Box(
                modifier = Modifier.padding(vertical = 10.dp).width(40.dp).height(4.dp)
                    .clip(CircleShape).background(Border)
            )
        }
    ) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 28.dp)
        ) {
            Text(if (editingStructure != null) "Edit Fee Plan" else "Create Fee Plan", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text(if (editingStructure != null) "Update pricing structure details" else "Add a new pricing structure for classes or add-ons", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(20.dp))

            // Fee Name Input
            Text("Fee Name *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = name, onValueChange = { vm.name.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. Annual Tuition Fee / Bus Transport") },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(16.dp))

            // Amount Input
            Text("Amount (₹) *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = amount, onValueChange = { vm.amount.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. 45000") },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(18.dp))

            // Type selector (FeeStructure vs FeeStructureAddon)
            Text("Fee Structure Type *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 8.dp))
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
            Spacer(Modifier.height(18.dp))

            // Target Class Multi-Selection Chips
            if (selectedType == FeeStructureType.FeeStructure.value && !isGym && groups.isNotEmpty()) {
                Text("Target ${classLabel}s Assignment *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 8.dp))
                OptMultiSelectClassChips(
                    groups = groups,
                    selectedGroupIds = selectedGroupIds,
                    onToggle = { vm.toggleClassSelection(it) }
                )
                Spacer(Modifier.height(18.dp))
            }

            // Billing Frequency
            Text("Billing Frequency *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 8.dp))
            FrequencySelectChips(freqs = freqs, selected = frequency, onSelect = { vm.frequency.value = it })
            Spacer(Modifier.height(26.dp))

            Button(
                onClick = { vm.save(isGym) },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(22.dp), Color.White, 2.5.dp)
                else {
                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (editingStructure != null) "Update Fee Plan" else "Create Fee Plan", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun OptMultiSelectClassChips(
    groups: List<FeeGroupDto>,
    selectedGroupIds: List<String>,
    onToggle: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        groups.chunked(2).forEach { rowGroups ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                rowGroups.forEach { g ->
                    val isSel = selectedGroupIds.contains(g._id)
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSel) Primary.copy(alpha = 0.12f) else Background,
                        border = BorderStroke(1.5.dp, if (isSel) Primary else Border),
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).clickable { onToggle(g._id) }
                    ) {
                        Row(
                            Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (isSel) Icons.Filled.Check else Icons.Filled.Person,
                                contentDescription = null,
                                tint = if (isSel) Primary else TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(g.name, fontSize = 13.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium, color = if (isSel) Primary else TextPrimary)
                        }
                    }
                }
                if (rowGroups.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun FrequencySelectChips(freqs: List<String>, selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        freqs.chunked(3).forEach { rowFreqs ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                rowFreqs.forEach { item ->
                    val isSel = selected == item
                    val label = FREQUENCY_LABELS[item] ?: item
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSel) Primary.copy(alpha = 0.12f) else Background,
                        border = BorderStroke(1.5.dp, if (isSel) Primary else Border),
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(20.dp)).clickable { onSelect(item) }
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(vertical = 8.dp)) {
                            Text(label, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium, color = if (isSel) Primary else TextSecondary)
                        }
                    }
                }
            }
        }
    }
}
