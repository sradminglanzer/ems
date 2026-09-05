package com.srgs.ems.ui.screens.parent

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.api.*
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ParentViewModel
import java.text.SimpleDateFormat
import java.util.*

enum class ParentTab(val title: String) {
    HOME("Home"),
    DIARY("Diary"),
    ACADEMICS("Exams"),
    FEES("Fees")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentMainScreen(
    initialChildren: List<ParentChildDto>,
    onSignOut: () -> Unit,
    viewModel: ParentViewModel = viewModel()
) {
    LaunchedEffect(initialChildren) {
        viewModel.init(initialChildren)
    }

    val activeChild by viewModel.activeChild.collectAsState()
    val childrenList by viewModel.childrenList.collectAsState()
    val dashboardData by viewModel.dashboardData.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMsg by viewModel.errorMessage.collectAsState()
    val selectedReportCard by viewModel.selectedReportCard.collectAsState()
    val selectedReceipt by viewModel.selectedReceipt.collectAsState()

    var currentTab by remember { mutableStateOf(ParentTab.HOME) }
    var showChildDropdown by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = dashboardData?.schoolName ?: activeChild?.schoolName ?: "School Parent Portal",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        // Child switcher trigger
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { if (childrenList.size > 1) showChildDropdown = true }
                                .padding(vertical = 2.dp, horizontal = 4.dp)
                        ) {
                            Text(
                                text = "👤 ${activeChild?.fullName?.ifBlank { activeChild?.firstName } ?: "Student"} (${activeChild?.groupName ?: "Class"})",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Primary
                            )
                            if (childrenList.size > 1) {
                                Icon(Icons.Filled.ArrowDropDown, contentDescription = "Switch child", tint = Primary, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refreshCurrentChild() }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Refresh", tint = Primary)
                    }
                    IconButton(onClick = onSignOut) {
                        Icon(Icons.Filled.ExitToApp, contentDescription = "Sign Out", tint = TextMuted)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = Surface, tonalElevation = 8.dp) {
                ParentTab.values().forEach { tab ->
                    val selected = currentTab == tab
                    NavigationBarItem(
                        selected = selected,
                        onClick = { currentTab = tab },
                        icon = {
                            when (tab) {
                                ParentTab.HOME -> Icon(Icons.Filled.Home, contentDescription = tab.title)
                                ParentTab.DIARY -> Icon(Icons.Filled.DateRange, contentDescription = tab.title)
                                ParentTab.ACADEMICS -> Icon(Icons.Filled.CheckCircle, contentDescription = tab.title)
                                ParentTab.FEES -> Icon(Icons.Filled.Info, contentDescription = tab.title)
                            }
                        },
                        label = { Text(tab.title, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Primary,
                            selectedTextColor = Primary,
                            indicatorColor = PrimaryLight.copy(alpha = 0.2f),
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted
                        )
                    )
                }
            }
        },
        containerColor = Background
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading && dashboardData == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            } else if (dashboardData != null) {
                val data = dashboardData!!
                when (currentTab) {
                    ParentTab.HOME -> ParentHomeTab(
                        data = data,
                        onCallTeacher = { phone ->
                            if (!phone.isNullOrBlank()) {
                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                                context.startActivity(intent)
                            }
                        },
                        onNavigateToDiary = { currentTab = ParentTab.DIARY },
                        onNavigateToFees = { currentTab = ParentTab.FEES }
                    )
                    ParentTab.DIARY -> ParentDiaryTab(
                        diaryItems = data.diary,
                        selectedDate = viewModel.selectedDiaryDate.collectAsState().value,
                        onSelectDate = { viewModel.selectDiaryDate(it) }
                    )
                    ParentTab.ACADEMICS -> ParentAcademicsTab(
                        attendance = data.attendance,
                        exams = data.exams,
                        onViewReportCard = { viewModel.showReportCard(it) }
                    )
                    ParentTab.FEES -> ParentFeesTab(
                        fees = data.fees,
                        onViewReceipt = { viewModel.showReceipt(it) }
                    )
                }
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(errorMsg ?: "No data found for this student", color = TextSecondary)
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = { viewModel.refreshCurrentChild() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                            Text("Retry")
                        }
                    }
                }
            }

            // Sibling Switcher Dropdown Modal
            if (showChildDropdown) {
                Dialog(onDismissRequest = { showChildDropdown = false }) {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface),
                        modifier = Modifier.fillMaxWidth().padding(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Select Student / Child", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Spacer(Modifier.height(12.dp))
                            childrenList.forEach { child ->
                                val isSelected = child.memberId == activeChild?.memberId
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable {
                                            viewModel.switchChild(child)
                                            showChildDropdown = false
                                        },
                                    color = if (isSelected) PrimaryLight.copy(alpha = 0.2f) else Background,
                                    border = BorderStroke(1.dp, if (isSelected) Primary else Border)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(40.dp)
                                                .clip(CircleShape)
                                                .background(Primary),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = (child.firstName.firstOrNull() ?: 'S').toString(),
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 18.sp
                                            )
                                        }
                                        Spacer(Modifier.width(12.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(child.fullName.ifBlank { child.firstName }, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TextPrimary)
                                            Text("Class: ${child.groupName.ifBlank { "N/A" }}  •  Roll: ${child.rollNo.ifBlank { "N/A" }}", fontSize = 12.sp, color = TextSecondary)
                                        }
                                        if (isSelected) {
                                            Icon(Icons.Filled.CheckCircle, contentDescription = "Active", tint = Primary, modifier = Modifier.size(20.dp))
                                        }
                                    }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            TextButton(
                                onClick = { showChildDropdown = false },
                                modifier = Modifier.align(Alignment.End)
                            ) {
                                Text("Close", color = Primary)
                            }
                        }
                    }
                }
            }

            // Report Card Dialog
            selectedReportCard?.let { rc ->
                ReportCardDialog(
                    reportCard = rc,
                    student = dashboardData?.student,
                    onDismiss = { viewModel.showReportCard(null) }
                )
            }

            // Payment Receipt Dialog
            selectedReceipt?.let { receipt ->
                PaymentReceiptDialog(
                    receipt = receipt,
                    student = dashboardData?.student,
                    schoolName = dashboardData?.schoolName ?: "",
                    onDismiss = { viewModel.showReceipt(null) }
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: 🏠 DASHBOARD / HOME
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ParentHomeTab(
    data: ParentDashboardDto,
    onCallTeacher: (String?) -> Unit,
    onNavigateToDiary: () -> Unit,
    onNavigateToFees: () -> Unit
) {
    val student = data.student
    val attendance = data.attendance
    val fees = data.fees
    val notices = data.notices

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Student Identity Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (student.name.firstOrNull() ?: 'S').toString(),
                            color = Color.White,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text(student.name, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Class: ${student.className.ifBlank { "N/A" }}", fontSize = 14.sp, color = TextSecondary)
                        Row(modifier = Modifier.padding(top = 4.dp)) {
                            Text("Roll: ${student.rollNo.ifBlank { "N/A" }}", fontSize = 12.sp, color = TextMuted)
                            Spacer(Modifier.width(12.dp))
                            Text("Adm No: ${student.admissionNo.ifBlank { student.knownId.ifBlank { "N/A" } }}", fontSize = 12.sp, color = TextMuted)
                        }
                    }
                }
            }
        }

        // 2. Today's Attendance Badge
        item {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("Today's Attendance", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text(
                                SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault()).format(Date()),
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }
                    val (statusText, statusBg, statusColor) = when (attendance.todayStatus.lowercase()) {
                        "present" -> Triple("🟢 Present", Color(0xFFE8F5E9), Color(0xFF2E7D32))
                        "absent" -> Triple("🔴 Absent", Color(0xFFFFEBEE), Color(0xFFC62828))
                        "late" -> Triple("🟡 Late", Color(0xFFFFF8E1), Color(0xFFF57F17))
                        else -> Triple("⚪ Not Marked", Color(0xFFF5F5F5), Color(0xFF757575))
                    }
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = statusBg,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    ) {
                        Text(
                            text = statusText,
                            color = statusColor,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }

        // 3. Class Teacher Card
        item {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier.size(42.dp).clip(CircleShape).background(PrimaryLight.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Person, contentDescription = null, tint = Primary)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("Class Teacher", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextMuted)
                            Text(
                                student.classTeacherName ?: "Not Assigned",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                    }
                    if (!student.classTeacherPhone.isNullOrBlank()) {
                        Button(
                            onClick = { onCallTeacher(student.classTeacherPhone) },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Icon(Icons.Filled.Phone, contentDescription = "Call", modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Call", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 4. Pending Fee Alert (if dues > 0)
        if (fees.pendingDues > 0) {
            item {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFFFF3E0),
                    border = BorderStroke(1.dp, Color(0xFFFFB74D)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { onNavigateToFees() }
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Filled.Info, contentDescription = null, tint = Color(0xFFE65100), modifier = Modifier.size(28.dp))
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("Fee Balance Due", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFBF360C))
                                Text("₹${"%.0f".format(fees.pendingDues)} outstanding", fontSize = 13.sp, color = Color(0xFFD84315))
                            }
                        }
                        Text("View >", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFBF360C))
                    }
                }
            }
        }

        // 5. 📢 School Notices & Announcements
        item {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("📢 School Announcements", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                Spacer(Modifier.height(8.dp))

                if (notices.isEmpty()) {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "No new announcements today",
                            fontSize = 13.sp,
                            color = TextSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                } else {
                    notices.forEach { notice ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Surface),
                            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = PrimaryLight.copy(alpha = 0.2f)
                                    ) {
                                        Text(
                                            notice.category,
                                            fontSize = 11.sp,
                                            color = Primary,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }
                                    Text(notice.date, fontSize = 11.sp, color = TextMuted)
                                }
                                Spacer(Modifier.height(6.dp))
                                Text(notice.title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Spacer(Modifier.height(4.dp))
                                Text(notice.content, fontSize = 13.sp, color = TextSecondary, maxLines = 3, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }

        // 6. Today's Diary / Homework Preview
        item {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("📖 Today's Diary & Homework", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    TextButton(onClick = onNavigateToDiary) {
                        Text("View All >", color = Primary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
                Spacer(Modifier.height(4.dp))
                if (data.diary.isEmpty()) {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "No homework assigned for today",
                            fontSize = 13.sp,
                            color = TextSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                } else {
                    data.diary.take(2).forEach { item ->
                        DiaryCardItem(item)
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: 📖 CLASS DIARY
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ParentDiaryTab(
    diaryItems: List<ParentDiaryItemDto>,
    selectedDate: String,
    onSelectDate: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Class Diary & Homework", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text("Daily homework, assignments and class notes", fontSize = 13.sp, color = TextSecondary)
        Spacer(Modifier.height(16.dp))

        if (diaryItems.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.DateRange, contentDescription = null, tint = TextMuted, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("No diary entries recorded for this date", color = TextSecondary, fontSize = 14.sp)
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(diaryItems) { item ->
                    DiaryCardItem(item)
                }
            }
        }
    }
}

@Composable
fun DiaryCardItem(item: ParentDiaryItemDto) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = PrimaryLight.copy(alpha = 0.2f)
                ) {
                    Text(
                        item.subjectName,
                        color = Primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
                Text(item.assignedDate, fontSize = 11.sp, color = TextMuted)
            }
            Spacer(Modifier.height(8.dp))
            Text(item.content, fontSize = 14.sp, color = TextPrimary, lineHeight = 20.sp)
            Spacer(Modifier.height(8.dp))
            Text("Assigned by: ${item.authorName}", fontSize = 12.sp, color = TextMuted)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: 📊 EXAMS & ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ParentAcademicsTab(
    attendance: ParentAttendanceDto,
    exams: ParentExamsDto,
    onViewReportCard: (ParentExamResultDto) -> Unit
) {
    var subTab by remember { mutableStateOf(0) } // 0: Attendance, 1: Exam Results, 2: Timetable

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Academics & Attendance", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(Modifier.height(12.dp))

        // Tab Selector Row
        TabRow(selectedTabIndex = subTab, containerColor = Surface) {
            Tab(selected = subTab == 0, onClick = { subTab = 0 }, text = { Text("Attendance") })
            Tab(selected = subTab == 1, onClick = { subTab = 1 }, text = { Text("Report Cards") })
            Tab(selected = subTab == 2, onClick = { subTab = 2 }, text = { Text("Timetable") })
        }
        Spacer(Modifier.height(16.dp))

        when (subTab) {
            0 -> {
                // Monthly Attendance Summary & Stats
                val m = attendance.thisMonth
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("This Month Attendance", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StatBox("Attendance", "${m.percentage}%", Primary)
                            StatBox("Present", "${m.presentDays} Days", Color(0xFF2E7D32))
                            StatBox("Absent", "${m.absentDays} Days", Color(0xFFC62828))
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))

                // Daily Calendar breakdown
                Text("Recent Activity Log", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(Modifier.height(8.dp))
                if (m.calendar.isEmpty()) {
                    Text("No attendance records logged this month", color = TextSecondary, fontSize = 13.sp)
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(m.calendar.take(15)) { day ->
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Surface,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(day.date, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                                    val (color, text) = when (day.status.lowercase()) {
                                        "present" -> Pair(Color(0xFF2E7D32), "Present")
                                        "absent" -> Pair(Color(0xFFC62828), "Absent")
                                        "late" -> Pair(Color(0xFFF57F17), "Late")
                                        else -> Pair(TextMuted, "N/A")
                                    }
                                    Text(text, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = color)
                                }
                            }
                        }
                    }
                }
            }
            1 -> {
                // Exam Results & Report Cards
                if (exams.results.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No exam results published yet", color = TextSecondary, fontSize = 14.sp)
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(exams.results) { res ->
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(res.examName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = PrimaryLight.copy(alpha = 0.2f)
                                        ) {
                                            Text(
                                                "Grade: ${res.grade}",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Primary,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Text("Score: ${"%.0f".format(res.totalMarks)} / ${"%.0f".format(res.maxMarks)} (${"%.1f".format(res.percentage)}%)", fontSize = 14.sp, color = TextSecondary)
                                    Spacer(Modifier.height(12.dp))
                                    Button(
                                        onClick = { onViewReportCard(res) },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Filled.Info, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("📄 View Official Report Card", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            2 -> {
                // Upcoming Timetable
                if (exams.upcoming.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No upcoming exams scheduled", color = TextSecondary, fontSize = 14.sp)
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(exams.upcoming) { ex ->
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(ex.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                    if (ex.startDate.isNotBlank() || ex.endDate.isNotBlank()) {
                                        Text("${ex.startDate} - ${ex.endDate}", fontSize = 12.sp, color = TextMuted)
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    ex.subjects.forEach { item ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(item.name.ifBlank { "Subject" }, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                                            Text("${item.date} ${item.startTime}".trim(), fontSize = 12.sp, color = TextSecondary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatBox(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = color)
        Text(label, fontSize = 11.sp, color = TextMuted)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: 💳 FEE DUES & RECEIPTS
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ParentFeesTab(
    fees: ParentFeesDto,
    onViewReceipt: (ParentPaymentReceiptDto) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Summary Cards
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(fees.planName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        StatBox("Total Plan", "₹${"%.0f".format(fees.totalPlanAmount)}", TextPrimary)
                        StatBox("Paid So Far", "₹${"%.0f".format(fees.totalPaid)}", Color(0xFF2E7D32))
                        StatBox("Remaining Due", "₹${"%.0f".format(fees.pendingDues)}", if (fees.pendingDues > 0) Color(0xFFC62828) else Color(0xFF2E7D32))
                    }
                    if (!fees.nextPaymentDate.isNullOrBlank()) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "Next Payment Due: ${fees.nextPaymentDate}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFD84315)
                        )
                    }
                }
            }
        }

        // Past Payment Receipts
        item {
            Text("🧾 Past Payment Receipts", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }

        if (fees.payments.isEmpty()) {
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("No payment receipts recorded yet", color = TextSecondary, fontSize = 13.sp, modifier = Modifier.padding(16.dp))
                }
            }
        } else {
            items(fees.payments) { p ->
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Receipt #${p.receiptNo.ifBlank { "N/A" }}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("${p.paymentDate} • ${p.paymentMethod.uppercase()}", fontSize = 12.sp, color = TextSecondary)
                            Text("₹${"%.0f".format(p.amount)}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                        }
                        Button(
                            onClick = { onViewReceipt(p) },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryLight.copy(alpha = 0.2f)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("View", color = Primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG: 📄 OFFICIAL REPORT CARD MODAL
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ReportCardDialog(
    reportCard: ParentExamResultDto,
    student: ParentStudentProfileDto?,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header
                Text(
                    text = "ACADEMIC REPORT CARD",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Primary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    text = reportCard.examName,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(8.dp))

                // Student Info Grid
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Student: ${student?.name ?: "Student"}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Text("Class: ${student?.className ?: "N/A"}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Roll No: ${student?.rollNo ?: "N/A"}", fontSize = 12.sp, color = TextSecondary)
                    Text("Adm No: ${student?.admissionNo ?: student?.knownId ?: "N/A"}", fontSize = 12.sp, color = TextSecondary)
                }
                Spacer(Modifier.height(12.dp))

                // Subject Scores Table
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Background,
                    border = BorderStroke(1.dp, Border)
                ) {
                    Column(Modifier.padding(8.dp)) {
                        Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subject", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(2f))
                            Text("Max", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                            Text("Scored", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                        }
                        reportCard.subjectScores.forEach { sc ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(sc.subject.ifBlank { "Subject" }, fontSize = 12.sp, color = TextPrimary, modifier = Modifier.weight(2f))
                                Text("${sc.maxMarks.toInt()}", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                                Text("${sc.marks.toInt()}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
                // Summary Block
                Row(
                    Modifier.fillMaxWidth().background(PrimaryLight.copy(alpha = 0.2f), RoundedCornerShape(8.dp)).padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Total: ${"%.0f".format(reportCard.totalMarks)} / ${"%.0f".format(reportCard.maxMarks)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Percentage: ${"%.1f".format(reportCard.percentage)}%", fontSize = 12.sp, color = TextSecondary)
                    }
                    Surface(shape = RoundedCornerShape(6.dp), color = Primary) {
                        Text("Grade: ${reportCard.grade}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                }

                if (!reportCard.remarks.isNullOrBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Text("Remarks: ${reportCard.remarks}", fontSize = 12.sp, color = TextSecondary)
                }

                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Close", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG: 🧾 PAYMENT RECEIPT DIALOG
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun PaymentReceiptDialog(
    receipt: ParentPaymentReceiptDto,
    student: ParentStudentProfileDto?,
    schoolName: String,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(schoolName.ifBlank { "School Fee Receipt" }, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, textAlign = TextAlign.Center)
                Text("OFFICIAL PAYMENT RECEIPT", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary, letterSpacing = 1.sp)
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(12.dp))

                ReceiptRow("Receipt No", "#${receipt.receiptNo.ifBlank { "N/A" }}")
                ReceiptRow("Date", receipt.paymentDate)
                ReceiptRow("Student", student?.name ?: "Student")
                ReceiptRow("Class", student?.className ?: "N/A")
                ReceiptRow("Payment Mode", receipt.paymentMethod.uppercase())
                if (!receipt.notes.isNullOrBlank()) {
                    ReceiptRow("Notes", receipt.notes)
                }
                Spacer(Modifier.height(8.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(8.dp))

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Total Paid Amount", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("₹${"%.0f".format(receipt.amount)}", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF2E7D32))
                }

                Spacer(Modifier.height(20.dp))
                Button(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Done", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun ReceiptRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 13.sp, color = TextSecondary)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
    }
}
