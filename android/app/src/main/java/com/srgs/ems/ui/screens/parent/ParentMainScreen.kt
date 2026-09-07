package com.srgs.ems.ui.screens.parent

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.animation.core.*
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.srgs.ems.data.api.*
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ParentViewModel
import java.text.SimpleDateFormat
import java.util.*

enum class ParentTab(val title: String, val icon: ImageVector) {
    HOME("Home", Icons.Filled.Home),
    DIARY("Diary", Icons.Filled.DateRange),
    ACADEMICS("Academics", Icons.Filled.CheckCircle),
    FEES("Fees", Icons.Filled.ShoppingCart)
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
    val context = LocalContext.current

    Scaffold(
        topBar = {
            Surface(
                color = Surface,
                tonalElevation = 3.dp,
                shadowElevation = 3.dp
            ) {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(
                                            listOf(GradientStart, GradientEnd)
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("🎓", fontSize = 18.sp)
                            }
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = dashboardData?.schoolName ?: activeChild?.schoolName ?: "Parent Portal",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TextPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "Family & Student Hub",
                                    fontSize = 11.sp,
                                    color = TextSecondary,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    },
                    actions = {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(end = 12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(PrimaryLight.copy(alpha = 0.15f))
                                    .clickable { viewModel.refreshCurrentChild() },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Filled.Refresh,
                                    contentDescription = "Refresh",
                                    tint = PrimaryDark,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(DangerLight.copy(alpha = 0.6f))
                                    .clickable { onSignOut() },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Filled.ExitToApp,
                                    contentDescription = "Sign Out",
                                    tint = Danger,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
                )
            }
        },
        bottomBar = {
            Surface(
                color = Surface,
                tonalElevation = 8.dp,
                shadowElevation = 12.dp
            ) {
                NavigationBar(
                    containerColor = Surface,
                    tonalElevation = 0.dp
                ) {
                    ParentTab.values().forEach { tab ->
                        val selected = currentTab == tab
                        NavigationBarItem(
                            selected = selected,
                            onClick = { currentTab = tab },
                            icon = {
                                Icon(
                                    imageVector = tab.icon,
                                    contentDescription = tab.title,
                                    modifier = Modifier.size(22.dp)
                                )
                            },
                            label = {
                                Text(
                                    tab.title,
                                    fontSize = 12.sp,
                                    fontWeight = if (selected) FontWeight.ExtraBold else FontWeight.Medium
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = PrimaryDark,
                                selectedTextColor = PrimaryDark,
                                indicatorColor = PrimaryLight.copy(alpha = 0.25f),
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted
                            )
                        )
                    }
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
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                        Spacer(Modifier.height(14.dp))
                        Text("Loading student records...", fontSize = 13.sp, color = TextSecondary)
                    }
                }
            } else if (dashboardData != null) {
                val data = dashboardData!!
                when (currentTab) {
                    ParentTab.HOME -> ParentHomeTab(
                        data = data,
                        childrenList = childrenList,
                        activeChild = activeChild,
                        onSwitchChild = { viewModel.switchChild(it) },
                        onCallTeacher = { phone ->
                            if (!phone.isNullOrBlank()) {
                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                                context.startActivity(intent)
                            }
                        },
                        onNavigateToDiary = { currentTab = ParentTab.DIARY },
                        onNavigateToAcademics = { currentTab = ParentTab.ACADEMICS },
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
                    Card(
                        modifier = Modifier.padding(24.dp),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface),
                        elevation = CardDefaults.cardElevation(4.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("⚠️", fontSize = 36.sp)
                            Spacer(Modifier.height(10.dp))
                            Text("Unable to Load Records", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Spacer(Modifier.height(6.dp))
                            Text(errorMsg ?: "No data found for this student. Please pull down to retry.", color = TextSecondary, textAlign = TextAlign.Center, fontSize = 13.sp)
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { viewModel.refreshCurrentChild() },
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Retry", fontWeight = FontWeight.Bold)
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
// TAB 1: 🏠 DASHBOARD / HOME (Lush Gradient & Quick Actions)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ParentHomeTab(
    data: ParentDashboardDto,
    childrenList: List<ParentChildDto>,
    activeChild: ParentChildDto?,
    onSwitchChild: (ParentChildDto) -> Unit,
    onCallTeacher: (String?) -> Unit,
    onNavigateToDiary: () -> Unit,
    onNavigateToAcademics: () -> Unit,
    onNavigateToFees: () -> Unit
) {
    val student = data.student
    val attendance = data.attendance
    val fees = data.fees
    val notices = data.notices

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Sibling Switcher Bar (if more than 1 child)
        if (childrenList.size > 1) {
            item {
                Column {
                    Text(
                        "SWITCH STUDENT / CHILD",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextMuted,
                        letterSpacing = 0.8.sp
                    )
                    Spacer(Modifier.height(6.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(childrenList) { child ->
                            val isSelected = child.memberId == activeChild?.memberId
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) PrimaryDark else Surface,
                                border = BorderStroke(1.dp, if (isSelected) PrimaryDark else Border),
                                shadowElevation = if (isSelected) 3.dp else 1.dp,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { onSwitchChild(child) }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(if (isSelected) Color.White else Primary),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = (child.firstName.firstOrNull() ?: 'S').toString(),
                                            color = if (isSelected) PrimaryDark else Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }
                                    Spacer(Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            child.fullName.ifBlank { child.firstName },
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) Color.White else TextPrimary
                                        )
                                        Text(
                                            child.groupName.ifBlank { "Class" },
                                            fontSize = 10.sp,
                                            color = if (isSelected) Color.White.copy(alpha = 0.8f) else TextSecondary
                                        )
                                    }
                                    if (isSelected) {
                                        Spacer(Modifier.width(6.dp))
                                        Icon(
                                            Icons.Filled.CheckCircle,
                                            contentDescription = "Active",
                                            tint = Color.White,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. 🌟 HERO GRADIENT STUDENT PROFILE CARD
        item {
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFF4F46E5), Color(0xFF6366F1), Color(0xFF0EA5E9))
                            )
                        )
                        .padding(20.dp)
                ) {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            // Avatar with glowing ring
                            Box(
                                modifier = Modifier
                                    .size(68.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.25f))
                                    .border(2.5.dp, Color.White, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = (student.name.firstOrNull() ?: 'S').toString().uppercase(),
                                    color = Color.White,
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                            Spacer(Modifier.width(16.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    student.name,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White,
                                    letterSpacing = (-0.3).sp
                                )
                                Spacer(Modifier.height(3.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = Color.White.copy(alpha = 0.22f)
                                    ) {
                                        Text(
                                            "Class: ${student.className.ifBlank { "N/A" }}",
                                            color = Color.White,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }
                                    if (student.rollNo.isNotBlank()) {
                                        Spacer(Modifier.width(6.dp))
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = Color.White.copy(alpha = 0.22f)
                                        ) {
                                            Text(
                                                "Roll #${student.rollNo}",
                                                color = Color.White,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Adm No: ${student.admissionNo.ifBlank { student.knownId.ifBlank { "N/A" } }}",
                                    fontSize = 11.sp,
                                    color = Color.White.copy(alpha = 0.85f)
                                )
                            }
                        }

                        Spacer(Modifier.height(16.dp))
                        HorizontalDivider(color = Color.White.copy(alpha = 0.2f), thickness = 1.dp)
                        Spacer(Modifier.height(12.dp))

                        // Quick stat pills inside hero
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            HeroStatBadge("Attendance", "${attendance.thisMonth.percentage}%", "📊")
                            HeroStatBadge("Today", attendance.todayStatus.ifBlank { "Active" }, "🟢")
                            HeroStatBadge("Fee Dues", if (fees.pendingDues > 0) "₹${"%.0f".format(fees.pendingDues)}" else "Cleared", "💳")
                        }
                    }
                }
            }
        }

        // 3. ⚡ QUICK ACTION SHORTCUTS
        item {
            Column {
                Text(
                    "QUICK ACTIONS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    letterSpacing = 0.8.sp
                )
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    QuickActionTile(
                        title = "Diary",
                        subtitle = "Homework",
                        icon = Icons.Filled.DateRange,
                        color = Color(0xFF6366F1),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToDiary
                    )
                    QuickActionTile(
                        title = "Exams",
                        subtitle = "Report Card",
                        icon = Icons.Filled.CheckCircle,
                        color = Color(0xFF0EA5E9),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToAcademics
                    )
                    QuickActionTile(
                        title = "Fees",
                        subtitle = "Receipts",
                        icon = Icons.Filled.ShoppingCart,
                        color = Color(0xFF10B981),
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToFees
                    )
                }
            }
        }

        // 4. 👨‍🏫 CLASS TEACHER & 1-TAP CALL CONNECT
        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(CircleShape)
                                .background(PrimaryLight.copy(alpha = 0.18f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Person, contentDescription = null, tint = Primary, modifier = Modifier.size(26.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("CLASS TEACHER", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
                            Text(
                                student.classTeacherName ?: "Not Assigned",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            if (!student.classTeacherPhone.isNullOrBlank()) {
                                Text(student.classTeacherPhone, fontSize = 12.sp, color = TextSecondary)
                            }
                        }
                    }
                    if (!student.classTeacherPhone.isNullOrBlank()) {
                        Button(
                            onClick = { onCallTeacher(student.classTeacherPhone) },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Success),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                        ) {
                            Icon(Icons.Filled.Phone, contentDescription = "Call", modifier = Modifier.size(16.dp), tint = Color.White)
                            Spacer(Modifier.width(6.dp))
                            Text("Call", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }

        // 5. 💳 PENDING FEE ALERT (High-Impact Banner if dues > 0)
        if (fees.pendingDues > 0) {
            item {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFFFF7ED),
                    border = BorderStroke(1.2.dp, Color(0xFFFDBA74)),
                    shadowElevation = 2.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { onNavigateToFees() }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFFFEDD5)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("💳", fontSize = 20.sp)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("Fee Balance Due", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFC2410C))
                                Text("₹${"%.0f".format(fees.pendingDues)} pending • Tap to view breakdown", fontSize = 12.sp, color = Color(0xFF9A3412))
                            }
                        }
                        Icon(Icons.Filled.ArrowForward, contentDescription = null, tint = Color(0xFFC2410C), modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // 6. 📢 SCHOOL NOTICES & ANNOUNCEMENTS
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
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface),
                        elevation = CardDefaults.cardElevation(1.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("✨", fontSize = 22.sp)
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "No new announcements today. You are all caught up!",
                                fontSize = 13.sp,
                                color = TextSecondary
                            )
                        }
                    }
                } else {
                    notices.forEach { notice ->
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Surface),
                            elevation = CardDefaults.cardElevation(2.dp),
                            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    val (catBg, catColor) = when (notice.category.lowercase()) {
                                        "urgent" -> Pair(DangerLight, Danger)
                                        "event" -> Pair(SecondaryLight, Secondary)
                                        "exam" -> Pair(WarningLight, Warning)
                                        else -> Pair(PrimaryLight.copy(alpha = 0.2f), Primary)
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = catBg
                                    ) {
                                        Text(
                                            notice.category.uppercase(),
                                            fontSize = 10.sp,
                                            color = catColor,
                                            fontWeight = FontWeight.ExtraBold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }
                                    Text(notice.date, fontSize = 11.sp, color = TextMuted)
                                }
                                Spacer(Modifier.height(8.dp))
                                Text(notice.title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Spacer(Modifier.height(4.dp))
                                Text(notice.content, fontSize = 13.sp, color = TextSecondary, maxLines = 3, overflow = TextOverflow.Ellipsis, lineHeight = 18.sp)
                            }
                        }
                    }
                }
            }
        }

        // 7. 📖 TODAY'S DIARY / HOMEWORK PREVIEW
        item {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("📖 Today's Diary & Homework", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    TextButton(onClick = onNavigateToDiary) {
                        Text("View All >", color = Primary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(4.dp))
                if (data.diary.isEmpty()) {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface),
                        elevation = CardDefaults.cardElevation(1.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("🎉", fontSize = 22.sp)
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "No homework tasks assigned for today",
                                fontSize = 13.sp,
                                color = TextSecondary
                            )
                        }
                    }
                } else {
                    data.diary.take(2).forEach { item ->
                        DiaryCardItem(item)
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun HeroStatBadge(label: String, value: String, emoji: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(emoji, fontSize = 12.sp)
            Spacer(Modifier.width(4.dp))
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
        }
        Text(label, fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f))
    }
}

@Composable
fun QuickActionTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.height(8.dp))
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(subtitle, fontSize = 10.sp, color = TextMuted)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: 📖 CLASS DIARY (Interactive Calendar & Subject Badges)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ParentDiaryTab(
    diaryItems: List<ParentDiaryItemDto>,
    selectedDate: String,
    onSelectDate: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Class Diary & Homework", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Text("Daily assignments, class tasks and teacher notes", fontSize = 13.sp, color = TextSecondary)
        Spacer(Modifier.height(16.dp))

        if (diaryItems.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(PrimaryLight.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(32.dp))
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("No Diary Entries", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(4.dp))
                    Text("No homework logged for this period", color = TextSecondary, fontSize = 13.sp)
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
    val (subjectColor, emoji) = when {
        item.subjectName.contains("Math", ignoreCase = true) -> Pair(Color(0xFF6366F1), "🔢")
        item.subjectName.contains("Sci", ignoreCase = true) -> Pair(Color(0xFF10B981), "🔬")
        item.subjectName.contains("Eng", ignoreCase = true) -> Pair(Color(0xFFEC4899), "📚")
        item.subjectName.contains("Soc", ignoreCase = true) || item.subjectName.contains("Hist", ignoreCase = true) -> Pair(Color(0xFFF59E0B), "🌍")
        item.subjectName.contains("Hindi", ignoreCase = true) || item.subjectName.contains("Lang", ignoreCase = true) -> Pair(Color(0xFF8B5CF6), "✍️")
        else -> Pair(Primary, "📝")
    }

    var selectedImageToView by remember { mutableStateOf<String?>(null) }

    if (selectedImageToView != null) {
        Dialog(onDismissRequest = { selectedImageToView = null }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Surface,
                modifier = Modifier.fillMaxWidth().padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Attachment Preview", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        IconButton(onClick = { selectedImageToView = null }) {
                            Icon(Icons.Filled.Close, contentDescription = "Close")
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    AsyncImage(
                        model = selectedImageToView,
                        contentDescription = "Full Attachment",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 350.dp)
                            .clip(RoundedCornerShape(12.dp))
                    )
                }
            }
        }
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header Row: Subject Badge + Date
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = subjectColor.copy(alpha = 0.15f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(emoji, fontSize = 12.sp)
                        Spacer(Modifier.width(4.dp))
                        Text(
                            item.subjectName,
                            color = subjectColor,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp
                        )
                    }
                }
                Text(item.assignedDate, fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Medium)
            }

            Spacer(Modifier.height(10.dp))

            // Title / Topic
            if (item.title.isNotBlank() || item.topic.isNotBlank()) {
                Text(
                    text = item.title.ifBlank { item.topic },
                    fontSize = 15.sp,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(4.dp))
            }

            // Description / Content
            if (item.content.isNotBlank()) {
                Text(
                    text = item.content,
                    fontSize = 13.sp,
                    color = if (item.title.isNotBlank() || item.topic.isNotBlank()) TextSecondary else TextPrimary,
                    lineHeight = 19.sp,
                    fontWeight = FontWeight.Normal
                )
            }

            // Attached Images
            val allAttachments = if (item.attachments.isNotEmpty()) {
                item.attachments
            } else if (!item.imageUrl.isNullOrBlank()) {
                listOf(item.imageUrl)
            } else {
                emptyList()
            }

            if (allAttachments.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    allAttachments.forEach { imgUrl ->
                        AsyncImage(
                            model = imgUrl,
                            contentDescription = "Diary Attachment",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(110.dp, 80.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .border(1.dp, Border, RoundedCornerShape(10.dp))
                                .clickable { selectedImageToView = imgUrl }
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Person, contentDescription = null, tint = TextMuted, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text("Assigned by: ${item.authorName}", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Medium)
            }
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
        Text("Academics & Attendance", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Spacer(Modifier.height(12.dp))

        // Tab Selector Row
        TabRow(
            selectedTabIndex = subTab,
            containerColor = Surface,
            contentColor = Primary
        ) {
            Tab(selected = subTab == 0, onClick = { subTab = 0 }, text = { Text("Attendance", fontWeight = FontWeight.Bold) })
            Tab(selected = subTab == 1, onClick = { subTab = 1 }, text = { Text("Report Cards", fontWeight = FontWeight.Bold) })
            Tab(selected = subTab == 2, onClick = { subTab = 2 }, text = { Text("Timetable", fontWeight = FontWeight.Bold) })
        }
        Spacer(Modifier.height(16.dp))

        when (subTab) {
            0 -> {
                // Monthly Attendance Summary & Stats
                val m = attendance.thisMonth
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text("This Month Attendance", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StatBox("Attendance", "${m.percentage}%", Primary)
                            StatBox("Present", "${m.presentDays} Days", Success)
                            StatBox("Absent", "${m.absentDays} Days", Danger)
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
                                shape = RoundedCornerShape(12.dp),
                                color = Surface,
                                border = BorderStroke(1.dp, Border),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(day.date, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                                    val (badgeBg, badgeColor, text) = when (day.status.lowercase()) {
                                        "present" -> Triple(SuccessLight, Success, "Present")
                                        "absent" -> Triple(DangerLight, Danger, "Absent")
                                        "late" -> Triple(WarningLight, Warning, "Late")
                                        else -> Triple(Background, TextMuted, "N/A")
                                    }
                                    Surface(shape = RoundedCornerShape(6.dp), color = badgeBg) {
                                        Text(text, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = badgeColor, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                    }
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
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        items(exams.results) { res ->
                            Card(
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface),
                                elevation = CardDefaults.cardElevation(2.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(res.examName, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = PrimaryLight.copy(alpha = 0.2f)
                                        ) {
                                            Text(
                                                "Grade: ${res.grade}",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Primary,
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Text("Score: ${"%.0f".format(res.totalMarks)} / ${"%.0f".format(res.maxMarks)} (${"%.1f".format(res.percentage)}%)", fontSize = 14.sp, color = TextSecondary)
                                    Spacer(Modifier.height(14.dp))
                                    Button(
                                        onClick = { onViewReportCard(res) },
                                        shape = RoundedCornerShape(12.dp),
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
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        items(exams.upcoming) { ex ->
                            Card(
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface),
                                elevation = CardDefaults.cardElevation(2.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Text(ex.name, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                                    if (ex.startDate.isNotBlank() || ex.endDate.isNotBlank()) {
                                        Text("${ex.startDate} - ${ex.endDate}", fontSize = 12.sp, color = TextMuted)
                                    }
                                    Spacer(Modifier.height(12.dp))
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
        Text(value, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = color)
        Spacer(Modifier.height(2.dp))
        Text(label, fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Medium)
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
        // Summary Hero Card
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(3.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(fees.planName.ifBlank { "Academic Fee Plan" }, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (fees.pendingDues > 0) WarningLight else SuccessLight
                        ) {
                            Text(
                                if (fees.pendingDues > 0) "Dues Outstanding" else "Cleared",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (fees.pendingDues > 0) Warning else Success,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                    Spacer(Modifier.height(18.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        StatBox("Total Fee", "₹${"%.0f".format(fees.totalPlanAmount)}", TextPrimary)
                        StatBox("Total Paid", "₹${"%.0f".format(fees.totalPaid)}", Success)
                        StatBox("Remaining", "₹${"%.0f".format(fees.pendingDues)}", if (fees.pendingDues > 0) Danger else Success)
                    }
                    if (!fees.nextPaymentDate.isNullOrBlank()) {
                        Spacer(Modifier.height(14.dp))
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFFFF7ED),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("📅", fontSize = 14.sp)
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "Next Installment Due: ${fees.nextPaymentDate}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFC2410C)
                                )
                            }
                        }
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
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("No payment receipts recorded yet", color = TextSecondary, fontSize = 13.sp, modifier = Modifier.padding(18.dp))
                }
            }
        } else {
            items(fees.payments) { p ->
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Receipt #${p.receiptNo.ifBlank { "N/A" }}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("${p.paymentDate} • ${p.paymentMethod.uppercase()}", fontSize = 12.sp, color = TextSecondary)
                            Text("₹${"%.0f".format(p.amount)}", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Success)
                        }
                        Button(
                            onClick = { onViewReceipt(p) },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryLight.copy(alpha = 0.2f)),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text("View", color = PrimaryDark, fontWeight = FontWeight.Bold, fontSize = 12.sp)
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
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            elevation = CardDefaults.cardElevation(6.dp),
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
                    fontSize = 17.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = PrimaryDark,
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
                Spacer(Modifier.height(10.dp))

                // Student Info Grid
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Student: ${student?.name ?: "Student"}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Text("Class: ${student?.className ?: "N/A"}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Roll No: ${student?.rollNo ?: "N/A"}", fontSize = 12.sp, color = TextSecondary)
                    Text("Adm No: ${student?.admissionNo ?: student?.knownId ?: "N/A"}", fontSize = 12.sp, color = TextSecondary)
                }
                Spacer(Modifier.height(14.dp))

                // Subject Scores Table
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Background,
                    border = BorderStroke(1.dp, Border)
                ) {
                    Column(Modifier.padding(10.dp)) {
                        Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subject", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(2f))
                            Text("Max", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                            Text("Scored", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                        }
                        reportCard.subjectScores.forEach { sc ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(sc.subject.ifBlank { "Subject" }, fontSize = 12.sp, color = TextPrimary, modifier = Modifier.weight(2f))
                                Text("${sc.maxMarks.toInt()}", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                                Text("${sc.marks.toInt()}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryDark, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))
                // Summary Block
                Row(
                    Modifier.fillMaxWidth().background(PrimaryLight.copy(alpha = 0.18f), RoundedCornerShape(10.dp)).padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Total: ${"%.0f".format(reportCard.totalMarks)} / ${"%.0f".format(reportCard.maxMarks)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Percentage: ${"%.1f".format(reportCard.percentage)}%", fontSize = 12.sp, color = TextSecondary)
                    }
                    Surface(shape = RoundedCornerShape(8.dp), color = PrimaryDark) {
                        Text("Grade: ${reportCard.grade}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp))
                    }
                }

                if (!reportCard.remarks.isNullOrBlank()) {
                    Spacer(Modifier.height(10.dp))
                    Text("Teacher Remarks: ${reportCard.remarks}", fontSize = 12.sp, color = TextSecondary)
                }

                Spacer(Modifier.height(18.dp))
                Button(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Close", fontWeight = FontWeight.Bold, fontSize = 14.sp)
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
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            elevation = CardDefaults.cardElevation(6.dp),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(22.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(schoolName.ifBlank { "School Fee Receipt" }, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, textAlign = TextAlign.Center)
                Spacer(Modifier.height(2.dp))
                Text("OFFICIAL PAYMENT RECEIPT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = PrimaryDark, letterSpacing = 1.sp)
                Spacer(Modifier.height(14.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(14.dp))

                ReceiptRow("Receipt No", "#${receipt.receiptNo.ifBlank { "N/A" }}")
                ReceiptRow("Date", receipt.paymentDate)
                ReceiptRow("Student", student?.name ?: "Student")
                ReceiptRow("Class", student?.className ?: "N/A")
                ReceiptRow("Payment Mode", receipt.paymentMethod.uppercase())
                if (!receipt.notes.isNullOrBlank()) {
                    ReceiptRow("Notes", receipt.notes)
                }
                Spacer(Modifier.height(10.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(10.dp))

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Total Paid Amount", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("₹${"%.0f".format(receipt.amount)}", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Success)
                }

                Spacer(Modifier.height(22.dp))
                Button(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Done", fontWeight = FontWeight.Bold, fontSize = 14.sp)
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
