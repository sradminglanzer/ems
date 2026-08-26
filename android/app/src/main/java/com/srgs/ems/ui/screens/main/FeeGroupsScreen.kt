package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.FeeGroupsViewModel


/** Returns the entity-aware label for a "class" (singular) */
private fun classLabel(entityType: String?): String = when (entityType) {
    "gym"      -> "Plan"
    "coaching" -> "Batch"
    else       -> "Class"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeeGroupsScreen(vm: FeeGroupsViewModel = viewModel()) {
    val session = SessionManager.session
    val labels = session?.labels ?: com.srgs.ems.data.api.EntityLabelsDto()
    val label = labels.groupSingle
    val labelPlural = labels.groupPlural

    val groups by vm.groups.collectAsState()
    val isLoading by vm.isLoading.collectAsState()

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
        topBar = { EmsTopBar("Manage $labelPlural", scrollBehavior) },
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
            groups.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📚", fontSize = 48.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("No $labelPlural configured yet.", color = TextSecondary)
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(top = padding.calculateTopPadding() + 8.dp, start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Text("${groups.size} active $labelPlural", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 4.dp))
                }
                items(groups, key = { it._id }) { group ->
                    FeeGroupCard(
                        group = group,
                        isPg = session?.isBusinessMode ?: true,
                        onClick = { vm.startEdit(group); showSheet = true }
                    )
                }
            }
        }

        // ── Add / Edit Group Bottom Sheet ──────────────────────────────────────────
        if (showSheet) {
            AddFeeGroupSheet(vm = vm, label = label, isPg = session?.isBusinessMode ?: true, onDismiss = { showSheet = false })
        }
    }
}

@Composable
private fun FeeGroupCard(group: FeeGroupDto, isPg: Boolean = false, onClick: () -> Unit = {}) {
    Card(
        Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(16.dp)) {
            // Top Row: Avatar + Room Name + Capacity Pill
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    Modifier.size(42.dp).clip(CircleShape)
                        .background(remember { Brush.linearGradient(listOf(Primary, PrimaryLight)) }),
                    Alignment.Center
                ) {
                    Text("🛏️", fontSize = 18.sp)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(group.name, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!group.description.isNullOrBlank()) {
                        Text(group.description, fontSize = 12.sp, color = TextSecondary, maxLines = 1)
                    }
                }
                if (isPg) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Primary.copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))
                    ) {
                        Text(
                            "🛏️ ${group.capacity} ${if (group.capacity == 1) "Bed" else "Beds"}",
                            fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
                Text(" ✏️", fontSize = 14.sp, modifier = Modifier.padding(start = 6.dp))
            }

            if (isPg) {
                Spacer(Modifier.height(14.dp))

                // Visual Bed Occupancy Progress Bar
                val progress = if (group.capacity > 0) (group.occupiedCount.toFloat() / group.capacity.toFloat()).coerceIn(0f, 1f) else 0f
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                    color = if (group.isFull) Danger else Success,
                    trackColor = Border.copy(alpha = 0.6f)
                )

                Spacer(Modifier.height(10.dp))

                // Bottom Status Badge & Occupancy Ratio
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (group.isFull) Danger.copy(alpha = 0.1f) else Success.copy(alpha = 0.1f),
                        border = BorderStroke(1.dp, if (group.isFull) Danger.copy(alpha = 0.25f) else Success.copy(alpha = 0.25f))
                    ) {
                        Text(
                            text = if (group.isFull) "🔴 Fully Occupied" else "🟩 ${group.vacantCount} ${if (group.vacantCount == 1) "Bed" else "Beds"} Vacant",
                            fontSize = 11.sp, fontWeight = FontWeight.ExtraBold,
                            color = if (group.isFull) Danger else Success,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }

                    Text(
                        text = "${group.occupiedCount} of ${group.capacity} Beds Taken",
                        fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFeeGroupSheet(vm: FeeGroupsViewModel, label: String, isPg: Boolean = false, onDismiss: () -> Unit) {
    val name by vm.name.collectAsState()
    val description by vm.description.collectAsState()
    val capacity by vm.capacity.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()
    val editingGroup by vm.editingGroup.collectAsState()

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface, tonalElevation = 0.dp) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
        ) {
            Text(if (editingGroup != null) "Edit $label" else "Add New $label", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text(if (isPg) "Configure room name and bed capacity" else "Configure group details", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(20.dp))

            Text("$label Name / Number *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = name, onValueChange = { vm.name.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text(if (isPg) "e.g. Room 204" else "e.g. Grade 10A") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(14.dp))

            if (isPg) {
                Text("Sharing Capacity (Total Beds) *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
                val bedOptions = listOf("1", "2", "3", "4", "5", "6", "8", "10")
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    bedOptions.forEach { b ->
                        val selected = capacity == b
                        FilterChip(
                            selected = selected,
                            onClick = { vm.capacity.value = b },
                            label = { Text("$b ${if (b == "1") "Bed" else "Beds"}", fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary, selectedLabelColor = Color.White,
                                containerColor = Surface, labelColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = capacity,
                    onValueChange = { vm.capacity.value = it.filter { c -> c.isDigit() } },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Custom Bed Count") },
                    placeholder = { Text("Enter beds count (e.g. 5)") },
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(14.dp))

                // Linked Rent / Tariff Plan
                val structures by vm.structures.collectAsState()
                val selectedStructureId by vm.selectedStructureId.collectAsState()

                if (structures.isNotEmpty()) {
                    Text("Linked Rent / Tariff Plan (Optional)", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val noneSelected = selectedStructureId.isEmpty()
                        FilterChip(
                            selected = noneSelected,
                            onClick = { vm.selectedStructureId.value = "" },
                            label = { Text("General Tariff", fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary, selectedLabelColor = Color.White,
                                containerColor = Surface, labelColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )
                        structures.forEach { s ->
                            val sel = selectedStructureId == s._id
                            FilterChip(
                                selected = sel,
                                onClick = { vm.selectedStructureId.value = s._id },
                                label = { Text("${s.name} (₹${s.amount.toInt()})", fontSize = 12.sp, fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Primary, selectedLabelColor = Color.White,
                                    containerColor = Surface, labelColor = TextPrimary
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                }
            }

            Text("Description (Optional)", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = description, onValueChange = { vm.description.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text(if (isPg) "e.g. 2nd Floor — AC" else "e.g. Senior Year – Section A") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { vm.saveGroup() },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text(if (editingGroup != null) "✓  Update $label" else "✓  Create $label", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
