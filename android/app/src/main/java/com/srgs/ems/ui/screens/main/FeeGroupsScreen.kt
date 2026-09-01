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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
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
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.StaffDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.FeeGroupsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeeGroupsScreen(
    vm: FeeGroupsViewModel = viewModel(),
    onNavigateToClassDetail: (classId: String) -> Unit = {}
) {
    val session = SessionManager.session
    val labels = session?.labels ?: com.srgs.ems.data.api.EntityLabelsDto()
    val label = labels.groupSingle
    val labelPlural = labels.groupPlural
    val isSchool = session?.isSchool ?: true
    val isPg = session?.isPg ?: false
    val isGym = session?.isGym ?: false

    val groups by vm.groups.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val deleteTarget by vm.deleteTarget.collectAsState()
    val selectedYear by AcademicYearManager.selectedYear.collectAsState()

    val snackbar = remember { SnackbarHostState() }
    var showSheet by remember { mutableStateOf(false) }

    LaunchedEffect(selectedYear) {
        vm.loadGroups()
    }

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
        topBar = { EmsTopBar(labelPlural, scrollBehavior) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    vm.startCreate(if (isSchool) 40 else 2)
                    showSheet = true
                },
                containerColor = Primary,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add $label", tint = Color.White)
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
                    Text(if (isSchool) "🎓" else if (isPg) "🛏️" else "📋", fontSize = 48.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("No $labelPlural configured yet.", color = TextSecondary, fontSize = 14.sp)
                    Spacer(Modifier.height(16.dp))
                    OutlinedButton(
                        onClick = {
                            vm.startCreate(if (isSchool) 40 else 2)
                            showSheet = true
                        },
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("+ Create First $label")
                    }
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(
                    top = padding.calculateTopPadding() + 8.dp,
                    start = 16.dp,
                    end = 16.dp,
                    bottom = 80.dp
                ),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Text(
                        "${groups.size} active $labelPlural",
                        fontSize = 13.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
                items(groups, key = { it._id }) { group ->
                    FeeGroupCard(
                        group = group,
                        label = label,
                        isSchool = isSchool,
                        isPg = isPg,
                        onClick = {
                            if (isSchool || !isPg) {
                                onNavigateToClassDetail(group._id)
                            } else {
                                vm.startEdit(group)
                                showSheet = true
                            }
                        },
                        onEdit = {
                            vm.startEdit(group)
                            showSheet = true
                        },
                        onDelete = { vm.deleteTarget.value = group }
                    )
                }
            }
        }

        // ── Add / Edit Group Bottom Sheet ──────────────────────────────────────────
        if (showSheet) {
            AddFeeGroupSheet(
                vm = vm,
                label = label,
                isSchool = isSchool,
                isPg = isPg,
                onDismiss = { showSheet = false }
            )
        }

        // ── Delete Confirmation Dialog ────────────────────────────────────────────
        deleteTarget?.let { target ->
            AlertDialog(
                onDismissRequest = { vm.deleteTarget.value = null },
                title = { Text("Delete $label?", fontWeight = FontWeight.Bold) },
                text = {
                    Text("Are you sure you want to delete \"${target.name}\"? This action cannot be undone.")
                },
                confirmButton = {
                    Button(
                        onClick = { vm.deleteGroup(target, label) },
                        colors = ButtonDefaults.buttonColors(containerColor = Danger)
                    ) {
                        Text("Delete", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { vm.deleteTarget.value = null }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

@Composable
private fun FeeGroupCard(
    group: FeeGroupDto,
    label: String,
    isSchool: Boolean = false,
    isPg: Boolean = false,
    onClick: () -> Unit = {},
    onEdit: () -> Unit = {},
    onDelete: () -> Unit = {}
) {
    val progress = if (group.capacity > 0) (group.occupiedCount.toFloat() / group.capacity.toFloat()).coerceIn(0f, 1f) else 0f

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
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Top Row: Class/Room Name + Teacher + Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = group.name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    if (!group.description.isNullOrBlank()) {
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = group.description,
                            fontSize = 12.sp,
                            color = TextSecondary,
                            maxLines = 1
                        )
                    }

                    // Class Teacher Badge for School
                    if (isSchool && group.classTeacher != null) {
                        Spacer(Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Filled.Person,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = "Teacher: ${group.classTeacher.fullName}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Primary
                            )
                        }
                    }
                }

                Spacer(Modifier.width(8.dp))

                // Action Buttons
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    IconButton(
                        onClick = onEdit,
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

            Spacer(Modifier.height(10.dp))

            // Middle Progress Bar
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(5.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (group.isFull) Danger else if (progress > 0.8f) Warning else Primary,
                trackColor = Border.copy(alpha = 0.6f)
            )

            Spacer(Modifier.height(8.dp))

            // Bottom Metrics Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSchool) {
                    Text(
                        text = "${group.occupiedCount} / ${group.capacity} Students Enrolled",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (group.isFull) Danger.copy(alpha = 0.1f) else Success.copy(alpha = 0.1f),
                        border = BorderStroke(0.5.dp, if (group.isFull) Danger.copy(alpha = 0.3f) else Success.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = if (group.isFull) "Full" else "${group.vacantCount} seats open",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (group.isFull) Danger else Success,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                } else if (isPg) {
                    Text(
                        text = "${group.occupiedCount} of ${group.capacity} Beds Taken",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (group.isFull) Danger.copy(alpha = 0.1f) else Success.copy(alpha = 0.1f),
                        border = BorderStroke(0.5.dp, if (group.isFull) Danger.copy(alpha = 0.3f) else Success.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = if (group.isFull) "Fully Occupied" else "${group.vacantCount} Beds Vacant",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (group.isFull) Danger else Success,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                } else {
                    Text(
                        text = "${group.occupiedCount} Members",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFeeGroupSheet(
    vm: FeeGroupsViewModel,
    label: String,
    isSchool: Boolean = false,
    isPg: Boolean = false,
    onDismiss: () -> Unit
) {
    val name by vm.name.collectAsState()
    val description by vm.description.collectAsState()
    val capacity by vm.capacity.collectAsState()
    val selectedTeacherId by vm.selectedTeacherId.collectAsState()
    val staffList by vm.staffList.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()
    val editingGroup by vm.editingGroup.collectAsState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        tonalElevation = 0.dp
    ) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
        ) {
            Text(
                if (editingGroup != null) "Edit $label" else "Add New $label",
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                color = TextPrimary
            )
            Text(
                if (isSchool) "Configure class/section details and teacher"
                else if (isPg) "Configure room name and bed capacity"
                else "Configure group details",
                fontSize = 13.sp,
                color = TextSecondary
            )
            Spacer(Modifier.height(18.dp))

            // Class / Room Name
            Text(
                "$label Name *",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 6.dp)
            )
            OutlinedTextField(
                value = name,
                onValueChange = { vm.name.value = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(if (isSchool) "e.g. Class 10-A, Grade 5" else if (isPg) "e.g. Room 204" else "e.g. Morning Batch") },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(14.dp))

            // Capacity
            if (isSchool) {
                Text(
                    "Student Capacity *",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                val quickOptions = listOf("30", "35", "40", "45", "50")
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    quickOptions.forEach { cap ->
                        val selected = capacity == cap
                        FilterChip(
                            selected = selected,
                            onClick = { vm.capacity.value = cap },
                            label = { Text("$cap Students", fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary,
                                selectedLabelColor = Color.White,
                                containerColor = Surface,
                                labelColor = TextPrimary
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
                    label = { Text("Custom Student Capacity") },
                    placeholder = { Text("Enter max students (e.g. 40)") },
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(14.dp))

                // Class Teacher Dropdown/Chips
                if (staffList.isNotEmpty()) {
                    Text(
                        "Class Teacher (Optional)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Row(
                        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val noneSelected = selectedTeacherId.isEmpty()
                        FilterChip(
                            selected = noneSelected,
                            onClick = { vm.selectedTeacherId.value = "" },
                            label = { Text("No Teacher Assigned", fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary,
                                selectedLabelColor = Color.White,
                                containerColor = Surface,
                                labelColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )
                        staffList.forEach { staff ->
                            val isSel = selectedTeacherId == staff._id
                            FilterChip(
                                selected = isSel,
                                onClick = { vm.selectedTeacherId.value = staff._id },
                                label = { Text(staff.name, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Primary,
                                    selectedLabelColor = Color.White,
                                    containerColor = Surface,
                                    labelColor = TextPrimary
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                }
            } else if (isPg) {
                Text(
                    "Sharing Capacity (Total Beds) *",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                val bedOptions = listOf("1", "2", "3", "4", "5", "6")
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    bedOptions.forEach { b ->
                        val selected = capacity == b
                        FilterChip(
                            selected = selected,
                            onClick = { vm.capacity.value = b },
                            label = { Text("$b ${if (b == "1") "Bed" else "Beds"}", fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary,
                                selectedLabelColor = Color.White,
                                containerColor = Surface,
                                labelColor = TextPrimary
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
                    placeholder = { Text("Enter beds count (e.g. 3)") },
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(14.dp))
            }

            // Description
            Text(
                "Description (Optional)",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 6.dp)
            )
            OutlinedTextField(
                value = description,
                onValueChange = { vm.description.value = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(if (isSchool) "e.g. Room 102, Science Wing" else "e.g. 2nd Floor — AC") },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { vm.saveGroup(label) },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text(
                    if (editingGroup != null) "✓  Update $label" else "✓  Create $label",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
