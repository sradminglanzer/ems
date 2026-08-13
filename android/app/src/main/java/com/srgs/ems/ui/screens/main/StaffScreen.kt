package com.srgs.ems.ui.screens.main

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffScreen(vm: StaffViewModel = viewModel()) {
    val session = SessionManager.session
    val canManage = session?.role == "admin" || session?.role == "owner" || session?.role == "superadmin"

    val staffList by vm.staffList.collectAsState()
    val staffRoles by vm.staffRoles.collectAsState()
    val isLoading by vm.isLoading.collectAsState()

    val snackbar = remember { SnackbarHostState() }

    var showAddSheet by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<StaffDto?>(null) }

    // Collect snackbar events
    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
            if (showAddSheet && msg.startsWith("✅")) showAddSheet = false
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
                    onClick = { showAddSheet = true },
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
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Text(
                        "${staffList.size} active staff member${if (staffList.size != 1) "s" else ""}",
                        fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
                items(staffList, key = { it._id }) { staff ->
                    StaffCard(
                        staff = staff,
                        roles = staffRoles,
                        canDelete = canManage && staff.role != "owner",
                        onToggleLogin = { vm.toggleStaffLogin(staff._id) },
                        onDelete = { deleteTarget = staff }
                    )
                }
            }
        }
    }

    // ── Add Staff Bottom Sheet ─────────────────────────────────────────────────
    if (showAddSheet) {
        AddStaffSheet(
            vm = vm,
            roles = staffRoles,
            onDismiss = { showAddSheet = false }
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

@Composable
private fun StaffCard(
    staff: StaffDto,
    roles: List<StaffRoleSettingDto>,
    canDelete: Boolean,
    onToggleLogin: () -> Unit,
    onDelete: () -> Unit
) {
    val initials = staff.name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")

    val roleSetting = roles.find { it.code == staff.role }
    val displayRole = roleSetting?.label ?: staff.role.replaceFirstChar { it.uppercaseChar() }
    val hasLogin = staff.enableLogin

    val (avatarGradient, roleColor, roleBg) = when (staff.role) {
        "admin", "owner", "superadmin" -> Triple(
            listOf(Primary, PrimaryLight), Primary, Primary.copy(alpha = 0.1f)
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
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            // Avatar
            Box(
                Modifier.size(46.dp).clip(CircleShape)
                    .background(remember(staff.role) { Brush.linearGradient(avatarGradient) }),
                Alignment.Center
            ) {
                Text(initials.ifEmpty { "?" }, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            Spacer(Modifier.width(14.dp))

            // Info
            Column(Modifier.weight(1f)) {
                Text(staff.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("📞", fontSize = 12.sp)
                    Spacer(Modifier.width(4.dp))
                    Text(staff.contactNumber, fontSize = 13.sp, color = TextSecondary)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    // Role badge
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = roleBg
                    ) {
                        Text(
                            displayRole.uppercase(),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = roleColor,
                            letterSpacing = 0.8.sp
                        )
                    }

                    // Login status badge
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .clickable { if (canDelete) onToggleLogin() },
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
                }
            }

            // Delete button
            if (canDelete) {
                IconButton(onClick = onDelete) {
                    Text("🗑️", fontSize = 18.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddStaffSheet(
    vm: StaffViewModel,
    roles: List<StaffRoleSettingDto>,
    onDismiss: () -> Unit
) {
    val name by vm.name.collectAsState()
    val contact by vm.contactNumber.collectAsState()
    val role by vm.selectedRole.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        tonalElevation = 0.dp
    ) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 32.dp)) {
            Text("Add New Staff", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text("Create a new team member account", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(24.dp))

            // Name Field
            Text("Full Name *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = name, onValueChange = { vm.name.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. John Doe") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(16.dp))

            // Contact Field
            Text("Contact Number *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = contact,
                onValueChange = { input ->
                    if (input.isEmpty() || input.all { it.isDigit() }) vm.contactNumber.value = input
                },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. 9876543210") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(16.dp))

            // Role Selector
            Text("Assign Role *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 8.dp))
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
                            Modifier.padding(vertical = 12.dp),
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
            Spacer(Modifier.height(28.dp))

            // Submit Button
            Button(
                onClick = { vm.addStaff() },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                } else {
                    Text("👤 Create Staff Member", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}
