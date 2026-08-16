package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.repository.AttendanceRecord
import com.srgs.ems.ui.LocalDrawerState
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.AttendanceViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val dayFmt = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy", Locale.ENGLISH)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceScreen(vm: AttendanceViewModel = viewModel()) {
    val feeGroups       by vm.feeGroups.collectAsState()
    val selectedGroupId by vm.selectedGroupId.collectAsState()
    val selectedDate    by vm.selectedDate.collectAsState()
    val isLoadingGroups by vm.isLoadingGroups.collectAsState()
    val isLoading       by vm.isLoadingAttendance.collectAsState()
    val isSaving        by vm.isSaving.collectAsState()
    val isNew           by vm.isNew.collectAsState()
    val records          = vm.records

    val drawerState = LocalDrawerState.current
    val scope       = rememberCoroutineScope()

    // Snackbar for save result
    val snackbarHost = remember { SnackbarHostState() }
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    LaunchedEffect(Unit) {
        vm.saveResult.collect { success ->
            snackbarHost.showSnackbar(
                if (success) "✅ Attendance saved!" else "❌ Failed to save. Try again."
            )
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHost) },
        containerColor = Background,
        topBar = { EmsTopBar("Attendance Portal", scrollBehavior) },
        bottomBar = {
            if (records.isNotEmpty() && !isLoading) {
                Surface(
                    tonalElevation = 4.dp,
                    shadowElevation = 8.dp,
                    color = Surface
                ) {
                    Row(
                        Modifier.fillMaxWidth().navigationBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Present / absent counts
                        val presentCount = records.count { it.status == "present" }
                        val absentCount  = records.count { it.status == "absent" }
                        val lateCount    = records.count { it.status == "late" }
                        Column(Modifier.weight(1f)) {
                            Text("P: $presentCount  A: $absentCount  L: $lateCount",
                                fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                            Text("${records.size} students", fontSize = 12.sp, color = TextMuted)
                        }
                        Button(
                            onClick   = { vm.saveAttendance() },
                            enabled   = !isSaving,
                            shape     = RoundedCornerShape(12.dp),
                            colors    = ButtonDefaults.buttonColors(containerColor = Primary),
                            modifier  = Modifier.height(44.dp)
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(Modifier.size(18.dp), Color.White, 2.dp)
                            } else {
                                Text(if (isNew) "💾  Save Attendance" else "✔  Update Attendance",
                                    fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    ) { innerPad ->
        Column(Modifier.fillMaxSize().padding(innerPad)) {

            // ── Filter bar (class selector + date flipper) ─────────────────
            Surface(color = Surface, shadowElevation = 2.dp) {
                Column(Modifier.fillMaxWidth().padding(16.dp)) {

                    // Class pills
                    if (isLoadingGroups) {
                        CircularProgressIndicator(Modifier.size(20.dp), color = Primary)
                    } else {
                        Text("SELECT CLASS", fontSize = 11.sp, fontWeight = FontWeight.Bold,
                            color = TextSecondary, letterSpacing = 0.8.sp)
                        Spacer(Modifier.height(8.dp))
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            feeGroups.forEach { group ->
                                ClassPill(group, group._id == selectedGroupId) { vm.selectGroup(group._id) }
                            }
                        }
                    }

                    Spacer(Modifier.height(14.dp))

                    // Date flipper
                    val parsedDate = try { LocalDate.parse(selectedDate) } catch (_: Exception) { LocalDate.now() }
                    val isToday = parsedDate == LocalDate.now()

                    Row(
                        Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Background)
                            .padding(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        IconButton(onClick = { vm.shiftDate(-1) }) {
                            Text("‹", fontSize = 26.sp, color = Primary, fontWeight = FontWeight.Bold)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                parsedDate.format(dayFmt),
                                fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary
                            )
                            if (isToday) Text("Today", fontSize = 12.sp, color = Primary, fontWeight = FontWeight.SemiBold)
                        }
                        IconButton(
                            onClick  = { vm.shiftDate(1) },
                            enabled  = !isToday
                        ) {
                            Text("›", fontSize = 26.sp,
                                color = if (!isToday) Primary else Border,
                                fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // ── Student list ──────────────────────────────────────────────────
            when {
                isLoading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
                records.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("👥", fontSize = 52.sp)
                        Spacer(Modifier.height(12.dp))
                        Text("No students in this class.", fontSize = 16.sp, color = TextSecondary)
                    }
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(records, key = { it.memberId }) { record ->
                        StudentCard(record) { vm.toggleStatus(it) }
                    }
                    item { Spacer(Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
private fun ClassPill(group: FeeGroupDto, selected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.clip(RoundedCornerShape(20.dp)).clickable(onClick = onClick),
        shape  = RoundedCornerShape(20.dp),
        color  = if (selected) Primary else Background,
        border = if (!selected) BorderStroke(1.dp, Border) else null
    ) {
        Text(
            group.name,
            Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
            color = if (selected) Color.White else TextSecondary
        )
    }
}

@Composable
private fun StudentCard(record: AttendanceRecord, onToggle: (String) -> Unit) {
    val (bgColor, borderColor, icon, iconColor) = when (record.status) {
        "absent" -> Quad(Danger.copy(.08f),  Danger,               "✗", Danger)
        "late"   -> Quad(Warning.copy(.08f), Warning,              "⏱", Warning)
        else     -> Quad(Color.Transparent,  Border, "✓", Success)
    }

    Card(
        modifier = Modifier.fillMaxWidth()
            .border(1.5.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable { onToggle(record.memberId) },
        shape  = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Initials avatar
            Box(
                Modifier.size(46.dp).clip(CircleShape).background(TextSecondary.copy(.15f)),
                Alignment.Center
            ) {
                Text(
                    "${record.firstName.firstOrNull()?.uppercaseChar() ?: ""}${record.lastName.firstOrNull()?.uppercaseChar() ?: ""}",
                    fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary
                )
            }
            Spacer(Modifier.width(12.dp))

            // Name + roll
            Column(Modifier.weight(1f)) {
                Text("${record.firstName} ${record.lastName}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text("Roll: ${record.knownId ?: "N/A"}", fontSize = 12.sp, color = TextSecondary)
            }

            // Status indicator
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(56.dp)) {
                Text(icon, fontSize = 28.sp, color = iconColor, fontWeight = FontWeight.Black)
                Text(
                    record.status.uppercase(),
                    fontSize = 9.sp, fontWeight = FontWeight.Bold, color = iconColor, letterSpacing = 0.5.sp
                )
            }
        }
    }
}

/** Convenience data class for destructuring in StudentCard */
private data class Quad(
    val bg: Color, val border: Color, val icon: String, val iconColor: Color
)

// Expose theme colours so AttendanceScreen can use Warning
private val Warning = Color(0xFFF59E0B)
