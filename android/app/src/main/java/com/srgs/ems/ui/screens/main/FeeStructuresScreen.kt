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
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
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
import com.srgs.ems.viewmodel.*
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import androidx.compose.ui.platform.LocalContext
import android.app.DatePickerDialog
import java.util.Calendar
import java.text.SimpleDateFormat
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs

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
    val isGym = session?.isGym ?: false
    val classLabel = labels.groupSingle

    val structures by vm.structures.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val deleteTarget by vm.deleteTarget.collectAsState()

    var selectedFilter by remember { mutableStateOf(FeeFilterCategory.ALL) }
    val snackbar = remember { SnackbarHostState() }
    var isFormOpen by remember { mutableStateOf(false) }

    val selectedYear by com.srgs.ems.data.AcademicYearManager.selectedYear.collectAsState()

    LaunchedEffect(selectedYear) {
        vm.load()
    }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            if (msg.startsWith("✅")) isFormOpen = false
            snackbar.showSnackbar(msg)
        }
    }

    BackHandler(enabled = isFormOpen) {
        isFormOpen = false
    }

    if (isFormOpen) {
        FeeStructureFormScreen(
            vm = vm,
            isGym = isGym,
            classLabel = classLabel,
            onBack = { isFormOpen = false }
        )
    } else {
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
                    onClick = { vm.startCreate(); isFormOpen = true },
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
                                onClick = { vm.startEdit(s); isFormOpen = true },
                                onDelete = { vm.setDeleteTarget(s) }
                            )
                        }
                    }
                }
            }
        }
    }

    // Delete confirmation dialog
    deleteTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { vm.setDeleteTarget(null) },
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
                    onClick = { vm.delete(target._id); vm.setDeleteTarget(null) },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger),
                    shape = RoundedCornerShape(10.dp)
                ) { Text("Delete Plan", fontWeight = FontWeight.Bold, color = Color.White) }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { vm.setDeleteTarget(null) },
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
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val totalAmount = s.amount
    val installmentCount = s.installments?.size ?: 0
    val freqLabel = FREQUENCY_LABELS[s.frequency] ?: s.frequency.replaceFirstChar { it.uppercase() }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Surface,
        border = BorderStroke(1.dp, Border),
        tonalElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
    ) {
        Column(Modifier.padding(16.dp)) {
            // Row 1: Plan Title & Badges
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = s.name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Type Badge (Class Standard vs Addon)
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (s.isAddon) Color(0xFFF3E8FF) else Primary.copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = if (s.isAddon) "Optional Add-on" else "Class Fee",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (s.isAddon) Color(0xFF7E22CE) else Primary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        // Frequency Badge
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Background
                        ) {
                            Text(
                                text = freqLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = TextSecondary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                // Delete Button
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = "Delete Plan",
                        tint = TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = Border.copy(alpha = 0.6f))
            Spacer(Modifier.height(12.dp))

            // Row 2: Total Amount + Installment info + Assigned classes
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text(
                        text = "Plan Total",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                    Text(
                        text = "₹${currencyFmt.format(totalAmount.toLong())}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary
                    )
                    if (installmentCount > 0) {
                        Text(
                            text = "$installmentCount installments scheduled",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Primary
                        )
                    }
                }

                // Assigned Classes chip
                if (!s.isAddon && (!s.groupNames.isNullOrEmpty() || s.groupDetails != null)) {
                    val classNames = s.groupNames ?: listOfNotNull(s.groupDetails?.name)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Background,
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Row(
                            Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Person,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = if (classNames.size == 1) classNames.first() else "${classNames.size} ${classLabel}s",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = TextPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeeStructureFormScreen(
    vm: FeeStructuresViewModel,
    isGym: Boolean,
    classLabel: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val name by vm.name.collectAsState()
    val amount by vm.amount.collectAsState()
    val frequency by vm.frequency.collectAsState()
    val selectedGroupIds by vm.selectedGroupIds.collectAsState()
    val selectedType by vm.selectedType.collectAsState()
    val installments: List<InstallmentRow> by vm.installments.collectAsState()
    val groups by vm.groups.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()
    val editingStructure by vm.editingStructure.collectAsState()

    val freqs = if (isGym) GYM_FREQS else SCHOOL_FREQS

    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = if (editingStructure != null) "Edit Fee Plan" else "Create Fee Plan",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = if (editingStructure != null) "Update fee details & schedules" else "Configure new fee plan & schedules",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                    }
                },
                actions = {
                    TextButton(
                        onClick = { vm.save(isGym) },
                        enabled = !isSubmitting && name.isNotBlank() && amount.isNotBlank()
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(Modifier.size(16.dp), color = Primary, strokeWidth = 2.dp)
                        } else {
                            Text(
                                "Save",
                                fontWeight = FontWeight.Bold,
                                color = if (name.isNotBlank() && amount.isNotBlank()) Primary else TextMuted
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Section 1: Basic Details Card
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Surface,
                border = BorderStroke(1.dp, Border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Basic Information", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(14.dp))

                    Text("Fee Plan Name *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
                    OutlinedTextField(
                        value = name, onValueChange = { vm.updateName(it) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("e.g. Annual Tuition Fee / Transport / Lab Fee") },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                    )
                    Spacer(Modifier.height(14.dp))

                    Text("Total Plan Amount (₹) *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
                    OutlinedTextField(
                        value = amount, onValueChange = { vm.updateAmount(it) },
                        modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. 45000") },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                    )
                }
            }

            // Section 2: Installment Schedule (School Mode Only)
            if (!isGym) {
                val installmentSum: Double = installments.sumOf { it.amount.toDoubleOrNull() ?: 0.0 }
                val planTotal: Double = amount.toDoubleOrNull() ?: 0.0
                val diff: Double = planTotal - installmentSum

                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Surface,
                    border = BorderStroke(1.dp, Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Installment Schedule", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text(
                                    text = if (installments.isEmpty()) "Single full payment (or pick a preset below)" else "${installments.size} installments scheduled",
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                            }
                            if (installments.isNotEmpty()) {
                                TextButton(
                                    onClick = { vm.applyPreset("clear") },
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text("Reset", fontSize = 12.sp, color = Danger, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Spacer(Modifier.height(12.dp))

                        // Scrollable Presets Row (LazyRow with generous spacing & pill styling)
                        Text("Schedule Presets:", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                        Spacer(Modifier.height(6.dp))

                        val presets = listOf(
                            "4_quarters" to "4 Quarters",
                            "3_terms" to "3 Terms",
                            "monthly_10" to "10 Months",
                            "monthly_12" to "12 Months",
                            "custom" to "+ Custom"
                        )

                        LazyRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(vertical = 4.dp)
                        ) {
                            items(presets) { (key, label) ->
                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = Primary.copy(alpha = 0.08f),
                                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.3f)),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(20.dp))
                                        .clickable { vm.applyPreset(key) }
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Primary,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                    )
                                }
                            }
                        }

                        // Balance status banner & Auto-split button
                        if (installments.isNotEmpty()) {
                            Spacer(Modifier.height(14.dp))
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (abs(diff) < 0.01) Success.copy(alpha = 0.08f) else Warning.copy(alpha = 0.12f),
                                border = BorderStroke(1.dp, if (abs(diff) < 0.01) Success.copy(alpha = 0.25f) else Warning.copy(alpha = 0.35f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            text = if (abs(diff) < 0.01) "✅ Installments balanced: ₹${currencyFmt.format(installmentSum.toLong())}"
                                            else "⚠️ Scheduled: ₹${currencyFmt.format(installmentSum.toLong())} / Total: ₹${currencyFmt.format(planTotal.toLong())}",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (abs(diff) < 0.01) Success else Color(0xFFD97706)
                                        )
                                        if (abs(diff) >= 0.01 && planTotal > 0) {
                                            Text(
                                                text = if (diff > 0) "₹${currencyFmt.format(diff.toLong())} unallocated" else "₹${currencyFmt.format((-diff).toLong())} over-allocated",
                                                fontSize = 11.sp,
                                                color = TextSecondary
                                            )
                                        }
                                    }

                                    if (planTotal > 0) {
                                        Spacer(Modifier.width(8.dp))
                                        Surface(
                                            shape = RoundedCornerShape(16.dp),
                                            color = Primary,
                                            modifier = Modifier.clip(RoundedCornerShape(16.dp)).clickable { vm.splitEqually() }
                                        ) {
                                            Text(
                                                "⚡ Split Equally",
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }
                            }

                            // Installment Cards
                            Spacer(Modifier.height(14.dp))
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                installments.forEachIndexed { idx: Int, inst: InstallmentRow ->
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = Background,
                                        border = BorderStroke(1.dp, Border),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(Modifier.padding(12.dp)) {
                                            // Header: Number pill + Delete
                                            Row(
                                                Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Surface(
                                                        shape = CircleShape,
                                                        color = Primary.copy(alpha = 0.12f),
                                                        modifier = Modifier.size(24.dp)
                                                    ) {
                                                        Box(contentAlignment = Alignment.Center) {
                                                            Text("${idx + 1}", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary)
                                                        }
                                                    }
                                                    Spacer(Modifier.width(8.dp))
                                                    Text("Installment ${idx + 1}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                                }

                                                IconButton(
                                                    onClick = { vm.removeInstallment(idx) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = Danger, modifier = Modifier.size(16.dp))
                                                }
                                            }

                                            Spacer(Modifier.height(10.dp))

                                            // Inputs Row: Name + Amount
                                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                                OutlinedTextField(
                                                    value = inst.name,
                                                    onValueChange = { vm.updateInstallment(idx, name = it) },
                                                    modifier = Modifier.weight(1.3f),
                                                    label = { Text("Name / Term", fontSize = 11.sp) },
                                                    placeholder = { Text("e.g. Term 1", fontSize = 12.sp) },
                                                    singleLine = true,
                                                    shape = RoundedCornerShape(10.dp),
                                                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                                                )

                                                OutlinedTextField(
                                                    value = inst.amount,
                                                    onValueChange = { vm.updateInstallment(idx, amount = it) },
                                                    modifier = Modifier.weight(1f),
                                                    label = { Text("Amount (₹)", fontSize = 11.sp) },
                                                    placeholder = { Text("0", fontSize = 12.sp) },
                                                    singleLine = true,
                                                    shape = RoundedCornerShape(10.dp),
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                                                )
                                            }

                                            Spacer(Modifier.height(10.dp))

                                            // Due Date Picker Button
                                            Surface(
                                                shape = RoundedCornerShape(10.dp),
                                                color = Surface,
                                                border = BorderStroke(1.dp, Border),
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clip(RoundedCornerShape(10.dp))
                                                    .clickable {
                                                        val cal = Calendar.getInstance()
                                                        if (inst.dueDate.isNotEmpty()) {
                                                            for (fmt in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd")) {
                                                                try {
                                                                    cal.time = SimpleDateFormat(fmt, Locale.US).parse(inst.dueDate)!!
                                                                    break
                                                                } catch (_: Exception) {}
                                                            }
                                                        }
                                                        DatePickerDialog(
                                                            context,
                                                            { _, y, m, d ->
                                                                val chosen = Calendar.getInstance().apply { set(y, m, d) }
                                                                val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(chosen.time)
                                                                vm.updateInstallment(idx, dueDate = dateStr)
                                                            },
                                                            cal.get(Calendar.YEAR),
                                                            cal.get(Calendar.MONTH),
                                                            cal.get(Calendar.DAY_OF_MONTH)
                                                        ).show()
                                                    }
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(16.dp))
                                                        Spacer(Modifier.width(8.dp))
                                                        Text(
                                                            text = if (inst.dueDate.isNotEmpty()) "Due Date: ${inst.dueDate}" else "Set Due Date (Tap to pick)",
                                                            fontSize = 12.sp,
                                                            fontWeight = if (inst.dueDate.isNotEmpty()) FontWeight.SemiBold else FontWeight.Normal,
                                                            color = if (inst.dueDate.isNotEmpty()) TextPrimary else TextMuted
                                                        )
                                                    }
                                                    Text("Change 📅", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                                                }
                                            }
                                        }
                                    }
                                }

                                // Add Installment Button
                                OutlinedButton(
                                    onClick = { vm.addInstallment() },
                                    modifier = Modifier.fillMaxWidth().height(44.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.5f))
                                ) {
                                    Icon(Icons.Filled.Add, contentDescription = null, tint = Primary, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Add Another Installment", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Primary)
                                }
                            }
                        }
                    }
                }
            }

            // Section 3: Fee Structure Type Card
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Surface,
                border = BorderStroke(1.dp, Border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Fee Structure Type *", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(12.dp))

                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        FeeStructureType.values().forEach { t ->
                            val isSel = selectedType == t.value
                            Surface(
                                modifier = Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).clickable { vm.updateSelectedType(t.value) },
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSel) Primary.copy(alpha = 0.12f) else Background,
                                border = BorderStroke(1.5.dp, if (isSel) Primary else Border)
                            ) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(t.label, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isSel) Primary else TextPrimary)
                                    Spacer(Modifier.height(4.dp))
                                    Text(t.description, fontSize = 11.sp, color = TextSecondary)
                                }
                            }
                        }
                    }
                }
            }

            // Section 4: Target Class Multi-Selection Card
            if (selectedType == FeeStructureType.FeeStructure.value && !isGym && groups.isNotEmpty()) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Surface,
                    border = BorderStroke(1.dp, Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Target ${classLabel}s Assignment *", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Select which ${classLabel.lowercase()}s this fee structure applies to", fontSize = 12.sp, color = TextSecondary)
                        Spacer(Modifier.height(12.dp))

                        OptMultiSelectClassChips(
                            groups = groups,
                            selectedGroupIds = selectedGroupIds,
                            onToggle = { vm.toggleClassSelection(it) }
                        )
                    }
                }
            }

            // Section 5: Billing Frequency Card
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Surface,
                border = BorderStroke(1.dp, Border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Billing Frequency *", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(12.dp))
                    FrequencySelectChips(freqs = freqs, selected = frequency, onSelect = { vm.updateFrequency(it) })
                }
            }

            // Save / Update Plan Button
            Button(
                onClick = { vm.save(isGym) },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(Modifier.size(22.dp), Color.White, 2.5.dp)
                } else {
                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = if (editingStructure != null) "Update Fee Plan" else "Create Fee Plan",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
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
