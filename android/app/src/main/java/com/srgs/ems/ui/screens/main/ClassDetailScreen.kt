package com.srgs.ems.ui.screens.main

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.DiaryDto
import com.srgs.ems.data.api.MemberDto
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ClassDetailTab
import com.srgs.ems.viewmodel.ClassDetailViewModel
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Calendar
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
    onNavigateToAttendance: () -> Unit,
    onNavigateToSubjects: () -> Unit = {}
) {
    val session = SessionManager.session
    val isAdmin = session?.isAdmin == true
    val context = LocalContext.current
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner, classId) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                vm.initClass(classId)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val details by vm.details.collectAsState()
    val diaryFeed by vm.diaryFeed.collectAsState()
    val subjects by vm.subjects.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val activeTab by vm.activeTab.collectAsState()
    val searchQuery by vm.searchQuery.collectAsState()

    val snackbar = remember { SnackbarHostState() }
    var showPostSheet by remember { mutableStateOf(false) }
    var showPostSaveBroadcastPrompt by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
        }
    }

    if (showPostSaveBroadcastPrompt) {
        AlertDialog(
            onDismissRequest = { showPostSaveBroadcastPrompt = false },
            title = {
                Text("📢 Broadcast Diary to Parents?", fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    "Diary entry saved successfully!\n\n" +
                    "Would you like to send today's updated diary push notification to all parents of this class right now?"
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showPostSaveBroadcastPrompt = false
                        vm.broadcastDailyDiary()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("📢 Broadcast Now", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showPostSaveBroadcastPrompt = false }) {
                    Text("Save Only", color = TextSecondary)
                }
            }
        )
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
                    Column {
                        Text(
                            text = group?.name ?: "Class Details",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = TextPrimary
                        )
                        if (group != null) {
                            val teacher = group.classTeacher?.fullName
                            val teacherText = if (!teacher.isNullOrBlank()) "Teacher: $teacher • " else ""
                            Text(
                                text = "$teacherText${group.occupiedCount}/${group.capacity} Enrolled",
                                fontSize = 11.sp,
                                color = TextSecondary,
                                fontWeight = FontWeight.Normal
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 22.sp, color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToAttendance) {
                        Icon(Icons.Filled.DateRange, contentDescription = "Attendance", tint = Primary)
                    }
                    IconButton(onClick = onNavigateToSubjects) {
                        Text("📚", fontSize = 16.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        },
        floatingActionButton = {
            if (activeTab == ClassDetailTab.DIARY) {
                ExtendedFloatingActionButton(
                    onClick = {
                        vm.startPostDiary()
                        showPostSheet = true
                    },
                    icon = { Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White) },
                    text = { Text("Add Entry", fontWeight = FontWeight.Bold, color = Color.White) },
                    containerColor = Primary,
                    shape = RoundedCornerShape(16.dp)
                )
            }
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
                        val selectedDiaryDate by vm.selectedDiaryDate.collectAsState()
                        ClassDiaryTab(
                            feed = diaryFeed,
                            selectedDate = selectedDiaryDate,
                            subjects = subjects,
                            isBroadcasting = vm.isBroadcasting.collectAsState().value,
                            onDateSelect = { vm.selectDate(it) },
                            onPrevDay = { vm.goToPreviousDay() },
                            onNextDay = { vm.goToNextDay() },
                            onToday = { vm.goToToday() },
                            onBroadcastClick = { vm.broadcastDailyDiary() },
                            onPostClick = { subjectId ->
                                vm.startPostDiary(subjectId)
                                showPostSheet = true
                            },
                            onEditClick = { diary ->
                                vm.startEditDiary(diary)
                                showPostSheet = true
                            },
                            onDeleteClick = { diary ->
                                vm.deleteDiaryEntry(diary._id)
                            },
                            onUpdateTracking = { diaryId, studentId, status ->
                                vm.updateStudentTracking(diaryId, studentId, status)
                            },
                            onNavigateToSubjects = onNavigateToSubjects
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
                selectedDate = vm.selectedDiaryDate.collectAsState().value,
                onDismiss = { showPostSheet = false },
                onNavigateToSubjects = onNavigateToSubjects,
                onEntrySaved = { isNew ->
                    if (isNew) {
                        showPostSaveBroadcastPrompt = true
                    }
                }
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
//  TAB 2: CLASS DIARY & HOMEWORK (DATE-CENTRIC DAILY SHEET)
// ═══════════════════════════════════════════════════════════════════════════════

@Composable
private fun ClassDiaryTab(
    feed: List<DiaryDto>,
    selectedDate: String,
    subjects: List<com.srgs.ems.data.api.SubjectDto>,
    isBroadcasting: Boolean,
    onDateSelect: (String) -> Unit,
    onPrevDay: () -> Unit,
    onNextDay: () -> Unit,
    onToday: () -> Unit,
    onBroadcastClick: () -> Unit,
    onPostClick: (subjectId: String?) -> Unit,
    onEditClick: (DiaryDto) -> Unit,
    onDeleteClick: (DiaryDto) -> Unit,
    onUpdateTracking: (diaryId: String, studentId: String, status: String) -> Unit,
    onNavigateToSubjects: () -> Unit = {}
) {
    val context = LocalContext.current
    var showBroadcastConfirmDialog by remember { mutableStateOf(false) }
    var previewImageUri by remember { mutableStateOf<String?>(null) }
    var entryToDelete by remember { mutableStateOf<DiaryDto?>(null) }

    val todayStr = LocalDate.now().toString()
    val isToday = selectedDate == todayStr

    val formattedDate = try {
        val parsed = LocalDate.parse(selectedDate)
        val pattern = if (isToday) "'Today' • EEE, dd MMM" else "EEE, dd MMM yyyy"
        parsed.format(DateTimeFormatter.ofPattern(pattern, Locale.getDefault()))
    } catch (_: Exception) {
        selectedDate
    }

    val dayEntries = remember(feed, selectedDate) {
        feed.filter { entry ->
            val d = entry.date?.take(10) ?: entry.createdAt?.take(10)
            d == selectedDate
        }
    }

    // Image preview dialog
    if (previewImageUri != null) {
        Dialog(onDismissRequest = { previewImageUri = null }) {
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
                        IconButton(onClick = { previewImageUri = null }) {
                            Icon(Icons.Filled.Close, contentDescription = "Close")
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    AsyncImage(
                        model = previewImageUri,
                        contentDescription = "Full Attachment",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 380.dp)
                            .clip(RoundedCornerShape(12.dp))
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    if (entryToDelete != null) {
        val diary = entryToDelete!!
        AlertDialog(
            onDismissRequest = { entryToDelete = null },
            title = { Text("Delete Diary Entry", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to delete '${diary.title}'? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteClick(diary)
                        entryToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger)
                ) {
                    Text("Delete", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { entryToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showBroadcastConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showBroadcastConfirmDialog = false },
            title = {
                Text("📢 Broadcast Daily Diary?", fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    "Compile all ${dayEntries.size} subject task(s) for $formattedDate into 1 notification and send to all parents of this class?"
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showBroadcastConfirmDialog = false
                        onBroadcastClick()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Broadcast Now", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showBroadcastConfirmDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // ── 1. Consolidated Date Navigation & Broadcast Strip ────────────────
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Surface,
                border = BorderStroke(1.dp, Border),
                tonalElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        IconButton(
                            onClick = onPrevDay,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = "Previous Day", tint = TextPrimary, modifier = Modifier.size(18.dp))
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Primary.copy(alpha = 0.08f),
                            border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f)),
                            modifier = Modifier.clickable {
                                val cal = Calendar.getInstance()
                                try {
                                    val p = LocalDate.parse(selectedDate)
                                    cal.set(p.year, p.monthValue - 1, p.dayOfMonth)
                                } catch (_: Exception) {}
                                android.app.DatePickerDialog(
                                    context,
                                    { _, year, month, dayOfMonth ->
                                        val picked = String.format(Locale.getDefault(), "%04d-%02d-%02d", year, month + 1, dayOfMonth)
                                        onDateSelect(picked)
                                    },
                                    cal.get(Calendar.YEAR),
                                    cal.get(Calendar.MONTH),
                                    cal.get(Calendar.DAY_OF_MONTH)
                                ).show()
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = formattedDate,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                            }
                        }

                        IconButton(
                            onClick = onNextDay,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Filled.ArrowForward, contentDescription = "Next Day", tint = TextPrimary, modifier = Modifier.size(18.dp))
                        }

                        if (!isToday) {
                            TextButton(
                                onClick = onToday,
                                contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("Today", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Primary)
                            }
                        }
                    }

                    if (dayEntries.isNotEmpty()) {
                        Button(
                            onClick = { showBroadcastConfirmDialog = true },
                            enabled = !isBroadcasting,
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            if (isBroadcasting) {
                                CircularProgressIndicator(Modifier.size(12.dp), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Filled.Send, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Broadcast (${dayEntries.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // ── 2. Authentic Two-Column School Diary Ledger Sheet ────────────────
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Surface,
                border = BorderStroke(1.dp, Border),
                tonalElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Ledger Header Row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Primary.copy(alpha = 0.05f))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "SUBJECT",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Primary,
                            modifier = Modifier.width(105.dp)
                        )
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(14.dp)
                                .background(Border)
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            text = "HOMEWORK / CLASSWORK DETAILS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Primary,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = "${dayEntries.size} Task(s)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextMuted
                        )
                    }

                    HorizontalDivider(color = Border)

                    if (dayEntries.isEmpty()) {
                        // Empty Notebook Placeholder Rows
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 28.dp, horizontal = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("📖", fontSize = 36.sp)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                text = "Diary is empty for $formattedDate",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextSecondary
                            )
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = { onPostClick(null) },
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Write Entry", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    } else {
                        dayEntries.forEachIndexed { index, diary ->
                            val (subjEmoji, subjColor) = getSubjectStyle(diary.subjectName)
                            var showRowMenu by remember { mutableStateOf(false) }

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onEditClick(diary) }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                // Column 1: Subject Pill
                                Box(
                                    modifier = Modifier.width(105.dp),
                                    contentAlignment = Alignment.CenterStart
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = subjColor.copy(alpha = 0.12f),
                                        border = BorderStroke(0.5.dp, subjColor.copy(alpha = 0.35f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(subjEmoji, fontSize = 11.sp)
                                            Spacer(Modifier.width(3.dp))
                                            Text(
                                                text = diary.subjectName,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = subjColor,
                                                maxLines = 1
                                            )
                                        }
                                    }
                                }

                                // Vertical Divider Line between columns
                                Box(
                                    modifier = Modifier
                                        .width(1.dp)
                                        .height(36.dp)
                                        .background(Border.copy(alpha = 0.6f))
                                )

                                Spacer(Modifier.width(10.dp))

                                // Column 2: Homework Content + Actions
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = diary.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary,
                                        lineHeight = 17.sp
                                    )

                                    if (diary.description.isNotBlank()) {
                                        Spacer(Modifier.height(2.dp))
                                        Text(
                                            text = diary.description,
                                            fontSize = 12.sp,
                                            color = TextSecondary,
                                            lineHeight = 16.sp
                                        )
                                    }

                                    // Attachment thumbnails (if any)
                                    if (diary.attachments.isNotEmpty()) {
                                        Spacer(Modifier.height(6.dp))
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier.horizontalScroll(rememberScrollState())
                                        ) {
                                            diary.attachments.forEach { imgUrl ->
                                                AsyncImage(
                                                    model = imgUrl,
                                                    contentDescription = "Attachment",
                                                    contentScale = ContentScale.Crop,
                                                    modifier = Modifier
                                                        .size(54.dp, 40.dp)
                                                        .clip(RoundedCornerShape(6.dp))
                                                        .border(1.dp, Border, RoundedCornerShape(6.dp))
                                                        .clickable { previewImageUri = imgUrl }
                                                )
                                            }
                                        }
                                    }
                                }

                                // Edit / Delete Menu trigger
                                Box {
                                    IconButton(
                                        onClick = { showRowMenu = true },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(
                                            Icons.Filled.MoreVert,
                                            contentDescription = "Options",
                                            tint = TextMuted,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }

                                    DropdownMenu(
                                        expanded = showRowMenu,
                                        onDismissRequest = { showRowMenu = false }
                                    ) {
                                        DropdownMenuItem(
                                            text = { Text("Edit Entry", fontSize = 13.sp) },
                                            leadingIcon = { Icon(Icons.Filled.Edit, contentDescription = null, tint = Primary, modifier = Modifier.size(16.dp)) },
                                            onClick = {
                                                showRowMenu = false
                                                onEditClick(diary)
                                            }
                                        )
                                        DropdownMenuItem(
                                            text = { Text("Delete", fontSize = 13.sp, color = Danger) },
                                            leadingIcon = { Icon(Icons.Filled.Delete, contentDescription = null, tint = Danger, modifier = Modifier.size(16.dp)) },
                                            onClick = {
                                                showRowMenu = false
                                                entryToDelete = diary
                                            }
                                        )
                                    }
                                }
                            }

                            // Ruled line separator between rows (except last)
                            if (index < dayEntries.lastIndex) {
                                HorizontalDivider(
                                    color = Border.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(start = 12.dp)
                                )
                            }
                        }
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
                            text = "₹${currencyFmt.format(plan.amount)}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Success
                        )
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POST / EDIT DIARY BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════════

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PostDiaryBottomSheet(
    vm: ClassDetailViewModel,
    subjects: List<com.srgs.ems.data.api.SubjectDto>,
    selectedDate: String,
    onDismiss: () -> Unit,
    onNavigateToSubjects: () -> Unit = {},
    onEntrySaved: (isNew: Boolean) -> Unit = {}
) {
    val context = LocalContext.current
    val editingId by vm.editingDiaryId.collectAsState()
    val postType by vm.postType.collectAsState()
    val postSubjectId by vm.postSubjectId.collectAsState()
    val postTitle by vm.postTitle.collectAsState()
    val postDescription by vm.postDescription.collectAsState()
    val postAttachments by vm.postAttachments.collectAsState()
    val isUploadingImage by vm.isUploadingImage.collectAsState()
    val isPosting by vm.isPosting.collectAsState()

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { vm.uploadPhotoFromUri(context, it) }
    }

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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        if (editingId != null) "Edit Diary Entry" else "Post Class Diary Entry",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary
                    )
                    Text(
                        if (editingId != null) "Update homework or class notice" else "Assign homework, test alerts, or class notices",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Primary.copy(alpha = 0.1f),
                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.25f))
                ) {
                    Text(
                        text = "📅 $selectedDate",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Primary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            Spacer(Modifier.height(16.dp))

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

            // Subject Selector with Manage Subjects link
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Subject", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text(
                    text = "⚙️ Manage Subjects",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Primary,
                    modifier = Modifier.clickable {
                        onDismiss()
                        onNavigateToSubjects()
                    }
                )
            }
            Spacer(Modifier.height(6.dp))

            if (subjects.isNotEmpty()) {
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Option for General / No Subject
                    val isNoneSel = postSubjectId == null
                    FilterChip(
                        selected = isNoneSel,
                        onClick = { vm.postSubjectId.value = null },
                        label = { Text("📢 General / All", fontSize = 12.sp, fontWeight = if (isNoneSel) FontWeight.Bold else FontWeight.Normal) },
                        shape = RoundedCornerShape(8.dp)
                    )

                    subjects.forEach { s ->
                        val isSel = postSubjectId == s._id
                        val (subjEmoji, subjColor) = getSubjectStyle(s.name)
                        FilterChip(
                            selected = isSel,
                            onClick = { vm.postSubjectId.value = s._id },
                            label = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(subjEmoji, fontSize = 12.sp)
                                    Spacer(Modifier.width(4.dp))
                                    Text(s.name, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal)
                                }
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = subjColor.copy(alpha = 0.2f),
                                selectedLabelColor = subjColor,
                                containerColor = Surface,
                                labelColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFEF3C7),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("No subjects created yet", fontSize = 12.sp, color = Color(0xFF92400E))
                        Text(
                            "+ Add Subjects",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF92400E),
                            modifier = Modifier.clickable {
                                onDismiss()
                                onNavigateToSubjects()
                            }
                        )
                    }
                }
            }
            Spacer(Modifier.height(14.dp))

            // Title / Topic (Mandatory)
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

            // Instructions / Description (Optional)
            Text("Instructions / Details (Optional)", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = postDescription,
                onValueChange = { vm.postDescription.value = it },
                modifier = Modifier.fillMaxWidth().height(90.dp),
                placeholder = { Text("Optional instructions, page numbers, or questions...", fontSize = 13.sp) },
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(16.dp))

            // Image Attachments Section
            Text("Attach Photos / Images (Optional)", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))

            // Photo picker button and loader
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = { photoPickerLauncher.launch("image/*") },
                    enabled = !isUploadingImage && !isPosting,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    modifier = Modifier.height(42.dp)
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("📸 Choose Photo", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }

                if (isUploadingImage) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Primary)
                    Text("Uploading...", fontSize = 12.sp, color = TextSecondary)
                }
            }

            if (postAttachments.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    postAttachments.forEachIndexed { idx, url ->
                        Box(modifier = Modifier.size(80.dp, 60.dp)) {
                            AsyncImage(
                                model = url,
                                contentDescription = "Attachment $idx",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(1.dp, Border, RoundedCornerShape(8.dp))
                            )
                            IconButton(
                                onClick = { vm.removeAttachment(idx) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(20.dp)
                                    .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                            ) {
                                Icon(Icons.Filled.Close, contentDescription = "Remove", tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    val isNew = editingId == null
                    vm.submitDiaryEntry(
                        onSuccess = {
                            onDismiss()
                            onEntrySaved(isNew)
                        }
                    )
                },
                enabled = !isPosting && !isUploadingImage,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isPosting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text(
                    if (editingId != null) "💾  Update Diary Entry" else "💾  Save Subject Entry",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
