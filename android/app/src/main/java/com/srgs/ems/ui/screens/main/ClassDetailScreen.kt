package com.srgs.ems.ui.screens.main

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.DiaryDto
import com.srgs.ems.data.api.MemberDto
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ClassDetailTab
import com.srgs.ems.viewmodel.ClassDetailViewModel
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val currencyFmt = NumberFormat.getNumberInstance(Locale("en", "IN"))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClassDetailScreen(
    classId: String,
    vm: ClassDetailViewModel = viewModel(),
    onBack: () -> Unit,
    onNavigateToMemberDetail: (memberId: String) -> Unit,
    onNavigateToMemberAdd: (groupId: String) -> Unit,
    onNavigateToAttendance: () -> Unit
) {
    val session = SessionManager.session
    val isAdmin = session?.isAdmin == true
    val context = LocalContext.current

    LaunchedEffect(classId) {
        vm.initClass(classId)
    }

    val details by vm.details.collectAsState()
    val diaryFeed by vm.diaryFeed.collectAsState()
    val subjects by vm.subjects.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val activeTab by vm.activeTab.collectAsState()
    val searchQuery by vm.searchQuery.collectAsState()

    val snackbar = remember { SnackbarHostState() }
    var showPostSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
        }
    }

    val group = details?.group
    val members = details?.members ?: emptyList()
    val feeStructures = details?.feeStructures ?: emptyList()

    val filteredMembers = remember(members, searchQuery) {
        if (searchQuery.isBlank()) members
        else {
            val q = searchQuery.trim().lowercase()
            members.filter {
                it.fullName.lowercase().contains(q) ||
                it.firstName.lowercase().contains(q) ||
                (it.knownId?.lowercase()?.contains(q) == true) ||
                (it.admissionNo?.lowercase()?.contains(q) == true)
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = group?.name ?: "Class Details",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = TextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 22.sp, color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        }
    ) { padding ->
        if (isLoading && details == null) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
        } else if (group == null) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Text("Class details not found", color = TextSecondary)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // ── Hero Header ───────────────────────────────────────────
                Surface(
                    color = Surface,
                    shadowElevation = 2.dp
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = group.name,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TextPrimary
                                )
                                if (!group.description.isNullOrBlank()) {
                                    Spacer(Modifier.height(2.dp))
                                    Text(
                                        text = group.description,
                                        fontSize = 13.sp,
                                        color = TextSecondary
                                    )
                                }

                                if (group.classTeacher != null) {
                                    Spacer(Modifier.height(6.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Filled.Person,
                                            contentDescription = null,
                                            tint = Primary,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Spacer(Modifier.width(4.dp))
                                        Text(
                                            text = "Teacher: ${group.classTeacher.fullName}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Primary
                                        )
                                    }
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Primary.copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f))
                            ) {
                                Text(
                                    text = "${group.occupiedCount}/${group.capacity} Enrolled",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }

                        Spacer(Modifier.height(14.dp))

                        // Quick Navigation Action Badges
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = onNavigateToAttendance,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f).height(38.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp)
                            ) {
                                Icon(Icons.Filled.DateRange, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Attendance", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = {
                                    vm.startPostDiary()
                                    showPostSheet = true
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                modifier = Modifier.weight(1f).height(38.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp)
                            ) {
                                Icon(Icons.Filled.Edit, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Post Diary", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }

                // ── Segmented Tabs ────────────────────────────────────────
                TabRow(
                    selectedTabIndex = activeTab.ordinal,
                    containerColor = Surface,
                    contentColor = Primary
                ) {
                    Tab(
                        selected = activeTab == ClassDetailTab.ROSTER,
                        onClick = { vm.activeTab.value = ClassDetailTab.ROSTER },
                        text = { Text("Students (${members.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
                    )
                    Tab(
                        selected = activeTab == ClassDetailTab.DIARY,
                        onClick = { vm.activeTab.value = ClassDetailTab.DIARY },
                        text = { Text("Class Diary (${diaryFeed.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
                    )
                    if (isAdmin) {
                        Tab(
                            selected = activeTab == ClassDetailTab.FEES,
                            onClick = { vm.activeTab.value = ClassDetailTab.FEES },
                            text = { Text("Fee Plans (${feeStructures.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp) }
                        )
                    }
                }

                // ── Tab Content ───────────────────────────────────────────
                when (activeTab) {
                    ClassDetailTab.ROSTER -> {
                        ClassRosterTab(
                            members = filteredMembers,
                            searchQuery = searchQuery,
                            onSearchChange = { vm.searchQuery.value = it },
                            onMemberClick = onNavigateToMemberDetail,
                            onAddMember = { onNavigateToMemberAdd(group._id) },
                            onCallParent = { phone ->
                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                                context.startActivity(intent)
                            }
                        )
                    }
                    ClassDetailTab.DIARY -> {
                        ClassDiaryTab(
                            feed = diaryFeed,
                            onPostClick = {
                                vm.startPostDiary()
                                showPostSheet = true
                            },
                            onUpdateTracking = { diaryId, studentId, status ->
                                vm.updateStudentTracking(diaryId, studentId, status)
                            }
                        )
                    }
                    ClassDetailTab.FEES -> {
                        if (isAdmin) {
                            ClassFeesTab(feeStructures = feeStructures)
                        }
                    }
                }
            }
        }

        // ── Post Diary Sheet ──────────────────────────────────────────────
        if (showPostSheet) {
            PostDiaryBottomSheet(
                vm = vm,
                subjects = subjects,
                onDismiss = { showPostSheet = false }
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 1: STUDENTS ROSTER
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
private fun ClassRosterTab(
    members: List<MemberDto>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onMemberClick: (String) -> Unit,
    onAddMember: () -> Unit,
    onCallParent: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            // Search Box
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search students by name or roll number...", fontSize = 13.sp) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Surface,
                    focusedContainerColor = Surface,
                    unfocusedBorderColor = Border,
                    focusedBorderColor = Primary
                )
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${members.size} Enrolled Students",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary
                )

                TextButton(onClick = onAddMember) {
                    Text("+ Enroll Student", fontWeight = FontWeight.Bold, color = Primary)
                }
            }
        }

        if (members.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🎓", fontSize = 40.sp)
                        Spacer(Modifier.height(10.dp))
                        Text("No students found", fontWeight = FontWeight.SemiBold, color = TextSecondary)
                    }
                }
            }
        } else {
            items(members, key = { it._id }) { student ->
                StudentRosterCard(
                    student = student,
                    onClick = { onMemberClick(student._id) },
                    onCall = { phone -> onCallParent(phone) }
                )
            }
        }
    }
}

@Composable
private fun StudentRosterCard(
    student: MemberDto,
    onClick: () -> Unit,
    onCall: (String) -> Unit
) {
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
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Student Avatar
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = student.fullName.take(2).uppercase(),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Primary
                )
            }

            Spacer(Modifier.width(12.dp))

            Column(Modifier.weight(1f)) {
                Text(
                    text = student.fullName,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (!student.admissionNo.isNullOrBlank()) {
                        Text(
                            text = "Adm #${student.admissionNo}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                        Text(text = " • ", fontSize = 11.sp, color = TextMuted)
                    }
                    Text(
                        text = if (!student.fatherName.isNullOrBlank()) "Parent: ${student.fatherName}" else student.phone,
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }

            Spacer(Modifier.width(8.dp))

            // Phone action button
            if (student.phone.isNotBlank()) {
                IconButton(
                    onClick = { onCall(student.phone) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Phone,
                        contentDescription = "Call Parent",
                        tint = Success,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 2: CLASS DIARY & HOMEWORK
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
private fun ClassDiaryTab(
    feed: List<DiaryDto>,
    onPostClick: () -> Unit,
    onUpdateTracking: (diaryId: String, studentId: String, status: String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Daily Class Feed",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Button(
                    onClick = onPostClick,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Post Entry", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }

        if (feed.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("📖", fontSize = 40.sp)
                        Spacer(Modifier.height(10.dp))
                        Text("No diary entries posted yet.", fontWeight = FontWeight.SemiBold, color = TextSecondary)
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(onClick = onPostClick) {
                            Text("+ Post Today's First Entry")
                        }
                    }
                }
            }
        } else {
            items(feed, key = { it._id }) { diary ->
                DiaryEntryCard(diary = diary)
            }
        }
    }
}

@Composable
private fun DiaryEntryCard(diary: DiaryDto) {
    val typeColor = when (diary.type) {
        "homework"     -> Primary
        "announcement" -> AccentOrange
        "test"         -> Danger
        else           -> AccentBlue
    }

    val typeLabel = when (diary.type) {
        "homework"     -> "HOMEWORK"
        "announcement" -> "ANNOUNCEMENT"
        "test"         -> "TEST ALERT"
        else           -> "REMINDER"
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Surface,
        border = BorderStroke(1.dp, Border),
        tonalElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(16.dp)) {
            // Header Row: Category Badge + Subject + Date
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = typeColor.copy(alpha = 0.1f),
                        border = BorderStroke(0.5.dp, typeColor.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = typeLabel,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = typeColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Primary.copy(alpha = 0.08f)
                    ) {
                        Text(
                            text = diary.subjectName,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                if (!diary.dueDate.isNullOrBlank()) {
                    Text(
                        text = "Due: ${diary.dueDate.take(10)}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Danger
                    )
                }
            }

            Spacer(Modifier.height(10.dp))

            // Title
            Text(
                text = diary.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )

            Spacer(Modifier.height(4.dp))

            // Description
            Text(
                text = diary.description,
                fontSize = 13.sp,
                color = TextSecondary,
                lineHeight = 18.sp
            )

            // Author stamp
            if (diary.createdBy != null) {
                Spacer(Modifier.height(10.dp))
                HorizontalDivider(color = Border.copy(alpha = 0.5f))
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "✍️ Posted by: ${diary.createdBy.name}",
                        fontSize = 11.sp,
                        color = TextMuted,
                        fontWeight = FontWeight.Medium
                    )

                    if (diary.studentTracking.isNotEmpty()) {
                        val completedCount = diary.studentTracking.count { it.status == "completed" }
                        Text(
                            text = "$completedCount/${diary.studentTracking.size} Completed",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Success
                        )
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 3: CLASS FEES (ADMIN ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
private fun ClassFeesTab(feeStructures: List<com.srgs.ems.data.api.FeeStructureDto>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text(
                text = "Fee Packages Assigned to this Class",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary
            )
        }

        if (feeStructures.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("💰", fontSize = 40.sp)
                        Spacer(Modifier.height(10.dp))
                        Text("No fee plans linked to this class.", fontWeight = FontWeight.SemiBold, color = TextSecondary)
                    }
                }
            }
        } else {
            items(feeStructures, key = { it._id }) { plan ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Surface,
                    border = BorderStroke(1.dp, Border),
                    tonalElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(plan.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Spacer(Modifier.height(2.dp))
                            Text(plan.frequency.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Primary)
                        }
                        Text(
                            text = "₹${currencyFmt.format(plan.amount.toLong())}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextPrimary
                        )
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POST DIARY ENTRY BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════════

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PostDiaryBottomSheet(
    vm: ClassDetailViewModel,
    subjects: List<com.srgs.ems.data.api.SubjectDto>,
    onDismiss: () -> Unit
) {
    val postType by vm.postType.collectAsState()
    val postSubjectId by vm.postSubjectId.collectAsState()
    val postTitle by vm.postTitle.collectAsState()
    val postDescription by vm.postDescription.collectAsState()
    val isPosting by vm.isPosting.collectAsState()

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
            Text("Post Class Diary Entry", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text("Assign homework, test alerts, or class notices", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(18.dp))

            // Category Selector
            Text("Entry Type *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
            val types = listOf("homework" to "📝 Homework", "announcement" to "📢 Notice", "test" to "🧪 Test Alert", "reminder" to "⏰ Reminder")
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                types.forEach { (tKey, tLabel) ->
                    val isSel = postType == tKey
                    FilterChip(
                        selected = isSel,
                        onClick = { vm.postType.value = tKey },
                        label = { Text(tLabel, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
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

            // Subject Selector
            if (subjects.isNotEmpty()) {
                Text("Subject *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    subjects.forEach { s ->
                        val isSel = postSubjectId == s._id
                        FilterChip(
                            selected = isSel,
                            onClick = { vm.postSubjectId.value = s._id },
                            label = { Text(s.name, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
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

            // Title
            Text("Title / Topic *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = postTitle,
                onValueChange = { vm.postTitle.value = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g. Chapter 4 Exercise 4.2", fontSize = 13.sp) },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(14.dp))

            // Instructions / Description
            Text("Instructions / Homework Details *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = postDescription,
                onValueChange = { vm.postDescription.value = it },
                modifier = Modifier.fillMaxWidth().height(100.dp),
                placeholder = { Text("Write detailed instructions, page numbers, or questions...", fontSize = 13.sp) },
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { vm.submitDiaryEntry(onSuccess = onDismiss) },
                enabled = !isPosting,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isPosting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text("✓  Post to Class Diary", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
