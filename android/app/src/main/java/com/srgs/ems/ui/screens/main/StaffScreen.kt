package com.srgs.ems.ui.screens.main

import android.app.DatePickerDialog
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.StaffDto
import com.srgs.ems.data.api.StaffRoleSettingDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.StaffViewModel
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffScreen(vm: StaffViewModel = viewModel()) {
    val session = SessionManager.session
    val canManage = session?.role == "admin" || session?.role == "owner" || session?.role == "superadmin"

    val staffList by vm.staffList.collectAsState()
    val staffRoles by vm.staffRoles.collectAsState()
    val isLoading by vm.isLoading.collectAsState()

    val snackbar = remember { SnackbarHostState() }

    var showFormSheet by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<StaffDto?>(null) }

    // Collect snackbar events
    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
            if (showFormSheet && msg.startsWith("✅")) showFormSheet = false
        }
    }

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            EmsTopBar(title = "Staff Management", scrollBehavior = scrollBehavior)
        },
        floatingActionButton = {
            if (canManage) {
                FloatingActionButton(
                    onClick = {
                        vm.resetForm()
                        showFormSheet = true
                    },
                    containerColor = Primary, contentColor = Color.White, shape = CircleShape
                ) {
                    Text("+", fontSize = 28.sp, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        when {
            isLoading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
            staffList.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("👥", fontSize = 48.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("No staff members found.", color = TextSecondary, fontWeight = FontWeight.Medium)
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(
                    top = padding.calculateTopPadding() + 8.dp,
                    start = 16.dp, end = 16.dp, bottom = 80.dp
                ),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Text(
                        "${staffList.size} team member${if (staffList.size != 1) "s" else ""}",
                        fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
                items(staffList, key = { it._id }) { staff ->
                    StaffCard(
                        staff = staff,
                        roles = staffRoles,
                        canManage = canManage,
                        onEdit = {
                            vm.startEditStaff(staff)
                            showFormSheet = true
                        },
                        onToggleLogin = { vm.toggleStaffLogin(staff._id) },
                        onDelete = { deleteTarget = staff }
                    )
                }
            }
        }
    }

    // ── Add/Edit Staff Bottom Sheet ───────────────────────────────────────────
    if (showFormSheet) {
        StaffFormSheet(
            vm = vm,
            roles = staffRoles,
            onDismiss = { showFormSheet = false }
        )
    }

    // ── Delete Confirmation Dialog ─────────────────────────────────────────────
    deleteTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete Staff Member", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to permanently remove ${target.name} from the team?") },
            confirmButton = {
                TextButton(
                    onClick = { vm.deleteStaff(target._id); deleteTarget = null },
                    colors = ButtonDefaults.textButtonColors(contentColor = Danger)
                ) { Text("Delete", fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) { Text("Cancel") }
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StaffCard(
    staff: StaffDto,
    roles: List<StaffRoleSettingDto>,
    canManage: Boolean,
    onEdit: () -> Unit,
    onToggleLogin: () -> Unit,
    onDelete: () -> Unit
) {
    val initials = staff.name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")

    val roleSetting = roles.find { it.code == staff.role }
    val displayRole = roleSetting?.label ?: staff.role.replaceFirstChar { it.uppercaseChar() }
    val hasLogin = staff.enableLogin

    val (avatarGradient, roleColor, roleBg) = when (staff.role) {
        "admin", "owner", "superadmin" -> Triple(
            listOf(Primary, PrimaryLight), Primary, Primary.copy(alpha = 0.12f)
        )
        else -> Triple(
            listOf(Color(0xFF6B7280), Color(0xFF9CA3AF)), TextSecondary, Border
        )
    }

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Avatar
                Box(
                    Modifier.size(46.dp).clip(CircleShape)
                        .background(remember(staff.role) { Brush.linearGradient(avatarGradient) }),
                    Alignment.Center
                ) {
                    Text(initials.ifEmpty { "?" }, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }

                Spacer(Modifier.width(12.dp))

                // Name & Contact
                Column(Modifier.weight(1f)) {
                    Text(staff.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!staff.designation.isNullOrEmpty()) {
                        Text(staff.designation, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Primary)
                    }
                    Spacer(Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("📞", fontSize = 12.sp)
                        Spacer(Modifier.width(4.dp))
                        Text(staff.contactNumber, fontSize = 13.sp, color = TextSecondary)
                    }
                }

                // Actions (Edit & Delete)
                if (canManage && staff.role != "owner") {
                    Row {
                        IconButton(onClick = onEdit) {
                            Text("✏️", fontSize = 16.sp)
                        }
                        IconButton(onClick = onDelete) {
                            Text("🗑️", fontSize = 16.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            // Badges Row
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Role Badge
                Surface(shape = RoundedCornerShape(6.dp), color = roleBg) {
                    Text(
                        displayRole.uppercase(),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = roleColor,
                        letterSpacing = 0.8.sp
                    )
                }

                // Login Status Badge
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable { if (canManage) onToggleLogin() },
                    shape = RoundedCornerShape(6.dp),
                    color = if (hasLogin) Success.copy(alpha = 0.12f) else TextMuted.copy(alpha = 0.12f)
                ) {
                    Text(
                        if (hasLogin) "🔑 Login Enabled" else "🔒 No Login",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontSize = 10.sp, fontWeight = FontWeight.Bold,
                        color = if (hasLogin) Success else TextMuted
                    )
                }

                // Salary Badge if available
                staff.monthlySalary?.let { sal ->
                    val salStr = if (sal % 1.0 == 0.0) sal.toLong().toString() else sal.toString()
                    Surface(shape = RoundedCornerShape(6.dp), color = Success.copy(alpha = 0.08f)) {
                        Text(
                            "💰 ₹$salStr / mo",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Success
                        )
                    }
                }
            }

            // Qualifications Chips (FlowRow)
            if (staff.qualifications.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    staff.qualifications.forEach { q ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Primary.copy(alpha = 0.08f),
                            border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))
                        ) {
                            Text(
                                "🎓 $q",
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Primary
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
private fun StaffFormSheet(
    vm: StaffViewModel,
    roles: List<StaffRoleSettingDto>,
    onDismiss: () -> Unit
) {
    val editId by vm.editingStaffId.collectAsState()
    val isEditing = editId != null

    val name by vm.name.collectAsState()
    val contact by vm.contactNumber.collectAsState()
    val role by vm.selectedRole.collectAsState()
    val designation by vm.designation.collectAsState()
    val qualificationsInput by vm.qualificationsInput.collectAsState()
    val monthlySalary by vm.monthlySalary.collectAsState()
    val joiningDate by vm.joiningDate.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    val context = LocalContext.current
    fun showDatePicker() {
        val cal = Calendar.getInstance()
        DatePickerDialog(context, { _, y, m, d ->
            vm.joiningDate.value = String.format("%04d-%02d-%02d", y, m + 1, d)
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        tonalElevation = 0.dp
    ) {
        LazyColumn(Modifier.padding(horizontal = 20.dp).padding(bottom = 32.dp)) {
            item {
                Text(if (isEditing) "Edit Staff Profile" else "Add New Staff", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text(if (isEditing) "Update employee details & HR records" else "Create a new team member record", fontSize = 13.sp, color = TextSecondary)
                Spacer(Modifier.height(20.dp))

                // Name Field
                Text("Full Name *", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                OutlinedTextField(
                    value = name, onValueChange = { vm.name.value = it },
                    modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. John Doe") },
                    singleLine = true, shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(12.dp))

                // Contact Field
                Text("Contact Number *", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                OutlinedTextField(
                    value = contact,
                    onValueChange = { input ->
                        if (input.isEmpty() || input.all { it.isDigit() }) vm.contactNumber.value = input
                    },
                    modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. 9876543210") },
                    singleLine = true, shape = RoundedCornerShape(8.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(12.dp))

                // Designation Field
                Text("Designation", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                OutlinedTextField(
                    value = designation, onValueChange = { vm.designation.value = it },
                    modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. Senior Fitness Coach") },
                    singleLine = true, shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(12.dp))

                // Monthly Salary Field
                Text("Monthly Salary (₹)", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                OutlinedTextField(
                    value = monthlySalary,
                    onValueChange = { input ->
                        if (input.isEmpty() || input.matches(Regex("^\\d*\\.?\\d{0,2}$"))) vm.monthlySalary.value = input
                    },
                    modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. 35000") },
                    singleLine = true, shape = RoundedCornerShape(8.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(12.dp))

                // Qualifications Input
                Text("Qualifications (Comma separated)", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                OutlinedTextField(
                    value = qualificationsInput, onValueChange = { vm.qualificationsInput.value = it },
                    modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. B.Sc Sports Science, ACE Certified") },
                    singleLine = true, shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                )
                Spacer(Modifier.height(12.dp))

                // Joining Date Picker
                Text("Joining Date", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                Box(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                    OutlinedTextField(
                        value = joiningDate, onValueChange = {},
                        modifier = Modifier.fillMaxWidth(), placeholder = { Text("YYYY-MM-DD") },
                        readOnly = true, singleLine = true, shape = RoundedCornerShape(8.dp),
                        trailingIcon = { Text("📅", fontSize = 16.sp) },
                        colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
                    )
                    Box(Modifier.matchParentSize().clickable { showDatePicker() })
                }

                // Role Selector
                Text("Assign Role *", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    roles.forEach { r ->
                        val isSelected = role == r.code
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { vm.selectedRole.value = r.code },
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) Primary else Background,
                            border = if (!isSelected) BorderStroke(1.dp, Border) else null
                        ) {
                            Column(
                                Modifier.padding(vertical = 10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    r.label,
                                    fontSize = 13.sp, fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else TextSecondary,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    if (r.enable_login) "🔑 App Login" else "🔒 No Login",
                                    fontSize = 10.sp,
                                    color = if (isSelected) Color.White.copy(alpha = 0.8f) else TextMuted
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))

                // Submit Button
                Button(
                    onClick = { vm.saveStaff() },
                    enabled = !isSubmitting,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                    } else {
                        Text(if (isEditing) "Save Profile Changes" else "👤 Create Staff Member", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}
