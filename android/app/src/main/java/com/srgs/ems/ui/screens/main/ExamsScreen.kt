package com.srgs.ems.ui.screens.main

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.ExamDto
import com.srgs.ems.data.api.ExamResultDto
import com.srgs.ems.data.api.ExamSubjectDto
import com.srgs.ems.data.api.RankSheetEntryDto
import com.srgs.ems.ui.components.EmsDateField
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.ExamsViewModel
import java.net.URLEncoder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExamsScreen(vm: ExamsViewModel = viewModel()) {
    val session      = SessionManager.session
    val isAdmin      = session?.isAdmin ?: false
    val isTeacher    = session?.isTeacher ?: false
    val canManage    = isAdmin || isTeacher

    val exams          by vm.exams.collectAsState()
    val isLoading      by vm.isLoading.collectAsState()
    val selectedExam   by vm.selectedExam.collectAsState()
    val results        by vm.results.collectAsState()
    val rankSheet      by vm.rankSheet.collectAsState()
    val isLoadingRes   by vm.isLoadingResults.collectAsState()
    val activeReportCard by vm.activeReportCard.collectAsState()

    val snackbar       = remember { SnackbarHostState() }
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()
    var showCreateSheet by remember { mutableStateOf(false) }
    var isGradingMode   by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect {
            if (it.startsWith("✅")) showCreateSheet = false
            snackbar.showSnackbar(it)
        }
    }

    // ── Report Card Dialog ────────────────────────────────────────────────────
    activeReportCard?.let { result ->
        StudentReportCardDialog(
            result     = result,
            exam       = selectedExam,
            schoolName = session?.entityName?.takeIf { it.isNotBlank() } ?: session?.name ?: "School",
            onDismiss  = { vm.closeReportCard() }
        )
    }

    // ── Detail view or Full-Screen Grading view (exam selected) ───────────────
    if (selectedExam != null) {
        if (isGradingMode) {
            EnterMarksScreen(
                exam     = selectedExam!!,
                vm       = vm,
                snackbar = snackbar,
                onBack   = { isGradingMode = false }
            )
        } else {
            ExamDetailPane(
                exam         = selectedExam!!,
                results      = results,
                rankSheet    = rankSheet,
                isLoading    = isLoadingRes,
                canManage    = canManage,
                snackbar     = snackbar,
                onBack       = { vm.clearSelectedExam() },
                onEnterMarks = {
                    vm.loadMarksEntry(selectedExam!!)
                    isGradingMode = true
                },
                onNotifyTimetable = { vm.notifyTimetable(selectedExam!!._id) },
                onPublishResults = { vm.publishResults(selectedExam!!._id) },
                onViewReport = { vm.openReportCard(it) }
            )
        }
        return
    }

    // ── List view ─────────────────────────────────────────────────────────────
    Scaffold(
        snackbarHost   = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar         = { EmsTopBar("Exams & Results", scrollBehavior) },
        floatingActionButton = {
            if (canManage) {
                FloatingActionButton(
                    onClick        = { showCreateSheet = true },
                    containerColor = Primary,
                    contentColor   = Color.White,
                    shape          = CircleShape
                ) { Text("+", fontSize = 28.sp, modifier = Modifier.padding(bottom = 4.dp)) }
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        when {
            isLoading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
            exams.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📝", fontSize = 56.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("No exams scheduled yet", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Tap + to schedule an exam", fontSize = 13.sp, color = TextSecondary)
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(
                    top    = padding.calculateTopPadding() + 12.dp,
                    start  = 16.dp, end = 16.dp, bottom = 80.dp
                ),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Text(
                        "${exams.size} exam(s) this academic year",
                        fontSize = 13.sp, color = TextSecondary,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }
                items(exams, key = { it._id }) { exam ->
                    ExamCard(exam = exam, onClick = { vm.selectExam(exam) })
                }
            }
        }

        // Create exam sheet
        if (showCreateSheet) {
            CreateExamSheet(vm = vm, onDismiss = { showCreateSheet = false })
        }
    }
}

// ── Exam Card ─────────────────────────────────────────────────────────────────
@Composable
private fun ExamCard(exam: ExamDto, onClick: () -> Unit) {
    Card(
        Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape     = RoundedCornerShape(14.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        border    = BorderStroke(1.dp, Border)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier.size(48.dp).clip(CircleShape).background(Primary.copy(.12f)),
                Alignment.Center
            ) { Text("📝", fontSize = 22.sp) }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(exam.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!exam.feeGroupName.isNullOrEmpty()) {
                        Spacer(Modifier.width(6.dp))
                        Surface(shape = RoundedCornerShape(6.dp), color = Primary.copy(.1f)) {
                            Text(
                                exam.feeGroupName,
                                Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Primary
                            )
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DateChip("📅 ${exam.startDate.take(10)}")
                    DateChip("→ ${exam.endDate.take(10)}")
                }
                if (exam.subjects.isNotEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "${exam.subjects.size} subject(s): ${exam.subjects.take(3).joinToString(", ") { it.name }}${if (exam.subjects.size > 3) "…" else ""}",
                        fontSize = 12.sp, color = TextSecondary
                    )
                }
            }
            Text("›", fontSize = 22.sp, color = Border)
        }
    }
}

@Composable
private fun DateChip(text: String) {
    Surface(shape = RoundedCornerShape(6.dp), color = Background) {
        Text(
            text, fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
        )
    }
}

// ── Exam Detail Pane ──────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExamDetailPane(
    exam: ExamDto,
    results: List<ExamResultDto>,
    rankSheet: List<RankSheetEntryDto>,
    isLoading: Boolean,
    canManage: Boolean,
    snackbar: SnackbarHostState,
    onBack: () -> Unit,
    onEnterMarks: () -> Unit,
    onNotifyTimetable: () -> Unit,
    onPublishResults: () -> Unit,
    onViewReport: (ExamResultDto) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Timetable (${exam.subjects.size})", "Results (${results.size})", "🏆 Rank Sheet")
    var showTimetableConfirm by remember { mutableStateOf(false) }
    var showPublishResultsConfirm by remember { mutableStateOf(false) }

    if (showTimetableConfirm) {
        AlertDialog(
            onDismissRequest = { showTimetableConfirm = false },
            title = { Text("📢 Send Timetable Notification?") },
            text = {
                Text("Send push notification with the exam timetable to parents of students in ${exam.feeGroupName ?: "this exam"}?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        showTimetableConfirm = false
                        onNotifyTimetable()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Send Push Notification")
                }
            },
            dismissButton = {
                TextButton(onClick = { showTimetableConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showPublishResultsConfirm) {
        AlertDialog(
            onDismissRequest = { showPublishResultsConfirm = false },
            title = { Text("📊 Publish & Notify Parents?") },
            text = {
                Text("Publish exam results and send individual report card summary push notifications to parents for ${results.size} students?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        showPublishResultsConfirm = false
                        onPublishResults()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Publish & Send Push")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPublishResultsConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        snackbarHost   = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(exam.name, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1, fontSize = 16.sp)
                        Text(exam.feeGroupName ?: "All Classes", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 22.sp, color = Color.White)
                    }
                },
                actions = {
                    if (canManage) {
                        Button(
                            onClick = onEnterMarks,
                            colors  = ButtonDefaults.buttonColors(containerColor = Color.White),
                            shape   = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                            modifier= Modifier.padding(end = 8.dp)
                        ) {
                            Text("📝 Enter Marks", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Primary)
            )
        }
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad)) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor   = Surface,
                contentColor     = Primary
            ) {
                tabs.forEachIndexed { i, title ->
                    Tab(
                        selected = selectedTab == i,
                        onClick  = { selectedTab = i },
                        text     = {
                            Text(title,
                                fontWeight = if (selectedTab == i) FontWeight.Bold else FontWeight.Normal,
                                fontSize   = 12.sp)
                        }
                    )
                }
            }

            if (isLoading) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                }
            } else {
                when (selectedTab) {
                    0 -> SubjectsTab(
                        subjects = exam.subjects,
                        canManage = canManage,
                        onNotifyTimetableClick = { showTimetableConfirm = true }
                    )
                    1 -> ResultsTab(
                        results = results,
                        canManage = canManage,
                        onPublishResultsClick = { showPublishResultsConfirm = true },
                        onViewReport = onViewReport
                    )
                    2 -> RankSheetTab(rankSheet, results, onViewReport)
                }
            }
        }
    }
}

// ── Subjects Tab ──────────────────────────────────────────────────────────────
@Composable
private fun SubjectsTab(
    subjects: List<ExamSubjectDto>,
    canManage: Boolean = false,
    onNotifyTimetableClick: () -> Unit = {}
) {
    if (subjects.isEmpty()) {
        Box(Modifier.fillMaxSize(), Alignment.Center) {
            Text("No subjects listed for this exam.", color = TextSecondary)
        }
        return
    }
    LazyColumn(
        contentPadding       = PaddingValues(16.dp),
        verticalArrangement  = Arrangement.spacedBy(8.dp),
        modifier             = Modifier.fillMaxSize()
    ) {
        if (canManage) {
            item {
                Button(
                    onClick = onNotifyTimetableClick,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("📢 Notify Timetable to Parents", fontWeight = FontWeight.SemiBold)
                }
            }
        }
        itemsIndexed(subjects) { idx, sub ->
            Card(
                Modifier.fillMaxWidth(),
                shape  = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(Surface),
                elevation = CardDefaults.cardElevation(1.dp),
                border = BorderStroke(1.dp, Border)
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier.size(36.dp).clip(CircleShape).background(Primary.copy(.1f)),
                        Alignment.Center
                    ) {
                        Text("${idx + 1}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Primary)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(sub.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        if (sub.date.isNotBlank()) {
                            Text("📅 ${sub.date}  🕐 ${sub.startTime}–${sub.endTime}",
                                fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                    Surface(shape = RoundedCornerShape(6.dp), color = Background) {
                        Text("Max: ${sub.maxMarks.toInt()}M", Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    }
                }
            }
        }
    }
}

// ── Results Tab ───────────────────────────────────────────────────────────────
@Composable
private fun ResultsTab(
    results: List<ExamResultDto>,
    canManage: Boolean = false,
    onPublishResultsClick: () -> Unit = {},
    onViewReport: (ExamResultDto) -> Unit
) {
    if (results.isEmpty()) {
        Box(Modifier.fillMaxSize(), Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("📊", fontSize = 48.sp)
                Spacer(Modifier.height(8.dp))
                Text("No marks recorded yet.", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text("Tap '📝 Enter Marks' above to enter class marks", fontSize = 13.sp, color = TextSecondary)
            }
        }
        return
    }
    LazyColumn(
        contentPadding      = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier            = Modifier.fillMaxSize()
    ) {
        if (canManage) {
            item {
                Button(
                    onClick = onPublishResultsClick,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("📊 Publish Results & Notify Parents", fontWeight = FontWeight.SemiBold)
                }
            }
        }
        items(results, key = { it._id }) { r ->
            ResultCard(r, onClick = { onViewReport(r) })
        }
    }
}

@Composable
private fun ResultCard(r: ExamResultDto, onClick: () -> Unit) {
    val gradeColor = when (r.grade) {
        "A+" -> Color(0xFF059669)
        "A"  -> Color(0xFF10B981)
        "B"  -> Color(0xFF3B82F6)
        "C"  -> Color(0xFFF59E0B)
        "D"  -> Color(0xFFEF4444)
        else -> Color(0xFF6B7280)
    }
    Card(
        Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp),
        border    = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Column {
                    Text(r.memberName ?: "Student", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (!r.knownId.isNullOrBlank()) Text("ID: ${r.knownId}", fontSize = 11.sp, color = TextMuted)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(8.dp), color = gradeColor.copy(.15f)) {
                        Text(r.grade, Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = gradeColor)
                    }
                    Spacer(Modifier.width(8.dp))
                    Text("📄", fontSize = 16.sp)
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth()) {
                ScorePill("Total Marks", "${r.totalMarks.toInt()}/${r.maxMarks.toInt()}", TextPrimary, Modifier.weight(1f))
                ScorePill("Percentage", "${"%.1f".format(r.percentage)}%",
                    if (r.percentage >= 33) Color(0xFF059669) else Color(0xFFEF4444), Modifier.weight(1f))
                ScorePill("Status", if (r.percentage >= 33) "PASS" else "FAIL",
                    if (r.percentage >= 33) Success else Danger, Modifier.weight(1f))
            }
            if (r.subjectScores.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(8.dp))
                r.subjectScores.forEach { s ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 2.dp),
                        Arrangement.SpaceBetween
                    ) {
                        Text(s.subject, fontSize = 12.sp, color = TextSecondary)
                        Text("${s.marks.toInt()}/${s.maxMarks.toInt()}", fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    }
                }
            }
        }
    }
}

@Composable
private fun ScorePill(label: String, value: String, vc: Color, modifier: Modifier) {
    Column(modifier.padding(4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = TextSecondary)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = vc)
    }
}

// ── Rank Sheet Tab ────────────────────────────────────────────────────────────
// ── Rank Sheet Tab ────────────────────────────────────────────────────────────
@Composable
private fun RankSheetTab(
    rankSheet: List<RankSheetEntryDto>,
    results: List<ExamResultDto>,
    onViewReport: (ExamResultDto) -> Unit
) {
    if (rankSheet.isEmpty()) {
        Box(Modifier.fillMaxSize(), Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🏆", fontSize = 48.sp)
                Spacer(Modifier.height(8.dp))
                Text("Rank sheet not available yet.", color = TextSecondary, fontSize = 14.sp)
                Text("Enter student marks to generate the leaderboard.", color = TextMuted, fontSize = 12.sp)
            }
        }
        return
    }

    var searchQuery by remember { mutableStateOf("") }

    val filteredRanks = remember(rankSheet, searchQuery) {
        if (searchQuery.isBlank()) rankSheet
        else {
            val q = searchQuery.trim().lowercase()
            rankSheet.filter {
                it.displayName.lowercase().contains(q) ||
                (it.knownId ?: "").lowercase().contains(q)
            }
        }
    }

    val totalStudents = rankSheet.size
    val avgPct = remember(rankSheet) {
        if (rankSheet.isNotEmpty()) rankSheet.map { it.percentage }.average() else 0.0
    }
    val topScorer = rankSheet.firstOrNull()

    LazyColumn(
        contentPadding      = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier            = Modifier.fillMaxSize()
    ) {
        // ── Summary KPI Cards ─────────────────────────────────────────────────
        item {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Surface,
                    border = BorderStroke(1.dp, Border),
                    shadowElevation = 1.dp,
                    modifier = Modifier.weight(1f)
                ) {
                    Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("STUDENTS", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.5.sp)
                        Spacer(Modifier.height(2.dp))
                        Text("$totalStudents", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Primary)
                    }
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Surface,
                    border = BorderStroke(1.dp, Border),
                    shadowElevation = 1.dp,
                    modifier = Modifier.weight(1f)
                ) {
                    Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("CLASS AVG", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.5.sp)
                        Spacer(Modifier.height(2.dp))
                        Text("${"%.1f".format(avgPct)}%", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF059669))
                    }
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Surface,
                    border = BorderStroke(1.dp, Border),
                    shadowElevation = 1.dp,
                    modifier = Modifier.weight(1.2f)
                ) {
                    Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("TOP SCORE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.5.sp)
                        Spacer(Modifier.height(2.dp))
                        Text(
                            "${topScorer?.displayTotalMarks?.toInt() ?: 0}/${topScorer?.displayMaxMarks?.toInt() ?: 0} (${"%.0f".format(topScorer?.percentage ?: 0.0)}%)",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFFD97706),
                            maxLines = 1
                        )
                    }
                }
            }
        }

        // ── Top 3 Podium Cards (when no search active) ────────────────────────
        if (searchQuery.isBlank() && rankSheet.size >= 3) {
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    // 2nd Place
                    val r2 = rankSheet.getOrNull(1)
                    if (r2 != null) {
                        val res2 = results.find { it.memberId == r2.memberId }
                        PodiumCard(
                            rank = 2,
                            entry = r2,
                            badgeColor = Color(0xFF64748B),
                            bgColor = Color(0xFFF8FAFC),
                            borderColor = Color(0xFFCBD5E1),
                            modifier = Modifier.weight(1f).clickable { res2?.let { onViewReport(it) } }
                        )
                    }

                    // 1st Place (Taller / Highlighted)
                    val r1 = rankSheet.firstOrNull()
                    if (r1 != null) {
                        val res1 = results.find { it.memberId == r1.memberId }
                        PodiumCard(
                            rank = 1,
                            entry = r1,
                            badgeColor = Color(0xFFD97706),
                            bgColor = Color(0xFFFFFBEB),
                            borderColor = Color(0xFFFDE68A),
                            isFirst = true,
                            modifier = Modifier.weight(1.1f).clickable { res1?.let { onViewReport(it) } }
                        )
                    }

                    // 3rd Place
                    val r3 = rankSheet.getOrNull(2)
                    if (r3 != null) {
                        val res3 = results.find { it.memberId == r3.memberId }
                        PodiumCard(
                            rank = 3,
                            entry = r3,
                            badgeColor = Color(0xFFB45309),
                            bgColor = Color(0xFFFFF7ED),
                            borderColor = Color(0xFFFED7AA),
                            modifier = Modifier.weight(1f).clickable { res3?.let { onViewReport(it) } }
                        )
                    }
                }
            }
        }

        // ── Search Input ──────────────────────────────────────────────────────
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("🔍 Search leaderboard by name, ID...", fontSize = 12.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(10.dp),
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Text("✕", fontSize = 13.sp, color = TextMuted)
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Surface,
                    focusedContainerColor = Surface,
                    unfocusedBorderColor = Border,
                    focusedBorderColor = Primary
                )
            )
        }

        // ── Unified White Table Card ──────────────────────────────────────────
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Surface,
                border = BorderStroke(1.dp, Border),
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.fillMaxWidth()) {
                    // Table Header
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF8FAFC))
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("#", Modifier.width(36.dp), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary)
                        Text("STUDENT", Modifier.weight(1f), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary)
                        Text("MARKS", Modifier.width(56.dp), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, textAlign = TextAlign.End)
                        Text("%", Modifier.width(46.dp), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, textAlign = TextAlign.End)
                        Text("GRADE", Modifier.width(48.dp), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, textAlign = TextAlign.Center)
                    }

                    HorizontalDivider(color = Border, thickness = 1.dp)

                    if (filteredRanks.isEmpty()) {
                        Box(Modifier.fillMaxWidth().padding(24.dp), Alignment.Center) {
                            Text("No students match \"$searchQuery\"", color = TextSecondary, fontSize = 13.sp)
                        }
                    } else {
                        filteredRanks.forEachIndexed { index, entry ->
                            val matchingResult = results.find { it.memberId == entry.memberId }
                            val isEven = index % 2 == 0

                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .background(if (isEven) Surface else Color(0xFFFAFAFA))
                                    .clickable { matchingResult?.let { onViewReport(it) } }
                            ) {
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Rank Badge
                                    Box(Modifier.width(36.dp), contentAlignment = Alignment.CenterStart) {
                                        when (entry.rank) {
                                            1 -> Text("🥇", fontSize = 17.sp)
                                            2 -> Text("🥈", fontSize = 17.sp)
                                            3 -> Text("🥉", fontSize = 17.sp)
                                            else -> {
                                                Surface(
                                                    shape = RoundedCornerShape(6.dp),
                                                    color = Primary.copy(0.08f),
                                                    modifier = Modifier.size(24.dp)
                                                ) {
                                                    Box(contentAlignment = Alignment.Center) {
                                                        Text(
                                                            "${entry.rank}",
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Primary
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Student Name & ID
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            entry.displayName,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary,
                                            maxLines = 1
                                        )
                                        if (!entry.knownId.isNullOrBlank()) {
                                            Text("ID: ${entry.knownId}", fontSize = 10.sp, color = TextMuted)
                                        }
                                    }

                                    // Marks Total
                                    Text(
                                        "${entry.displayTotalMarks.toInt()}/${entry.displayMaxMarks.toInt()}",
                                        Modifier.width(56.dp),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary,
                                        textAlign = TextAlign.End
                                    )

                                    // Percentage
                                    Text(
                                        "${"%.1f".format(entry.percentage)}%",
                                        Modifier.width(46.dp),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (entry.percentage >= 75) Color(0xFF059669) else if (entry.percentage >= 33) TextPrimary else Color(0xFFEF4444),
                                        textAlign = TextAlign.End
                                    )

                                    // Grade Pill
                                    val gradeColor = when (entry.grade) {
                                        "A+" -> Color(0xFF059669); "A" -> Color(0xFF10B981); "B" -> Color(0xFF3B82F6)
                                        "C"  -> Color(0xFFF59E0B); "D" -> Color(0xFFEF4444); else -> Color(0xFF6B7280)
                                    }
                                    Box(Modifier.width(48.dp), contentAlignment = Alignment.Center) {
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = gradeColor.copy(0.12f)
                                        ) {
                                            Text(
                                                entry.grade,
                                                Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = gradeColor,
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                    }
                                }

                                if (index < filteredRanks.size - 1) {
                                    HorizontalDivider(color = Color(0xFFF1F5F9), thickness = 1.dp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Top Podium Card ───────────────────────────────────────────────────────────
@Composable
private fun PodiumCard(
    rank: Int,
    entry: RankSheetEntryDto,
    badgeColor: Color,
    bgColor: Color,
    borderColor: Color,
    isFirst: Boolean = false,
    modifier: Modifier = Modifier
) {
    val medalEmoji = when (rank) { 1 -> "🥇"; 2 -> "🥈"; 3 -> "🥉"; else -> "#$rank" }
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = bgColor,
        border = BorderStroke(1.dp, borderColor),
        shadowElevation = if (isFirst) 3.dp else 1.dp,
        modifier = modifier
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = if (isFirst) 14.dp else 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(medalEmoji, fontSize = if (isFirst) 24.sp else 20.sp)
            Spacer(Modifier.height(4.dp))
            Text(
                entry.displayName,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                maxLines = 1,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(2.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = badgeColor.copy(0.15f)
            ) {
                Text(
                    "${"%.1f".format(entry.percentage)}% (${entry.grade})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = badgeColor,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

// ── Full-Screen Marks Entry Screen ────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EnterMarksScreen(
    exam: ExamDto,
    vm: ExamsViewModel,
    snackbar: SnackbarHostState,
    onBack: () -> Unit
) {
    val roster             by vm.classRoster.collectAsState()
    val marksMap           by vm.marksEntryMap.collectAsState()
    val selectedSubjectIdx by vm.selectedSubjectIndex.collectAsState()
    val selectedClassId    by vm.selectedMarksClassId.collectAsState()
    val searchQuery        by vm.marksSearchQuery.collectAsState()
    val feeGroups          by vm.feeGroups.collectAsState()
    val isLoadingRost      by vm.isLoadingRoster.collectAsState()
    val isSavingMarks      by vm.isSavingMarks.collectAsState()

    val focusManager = LocalFocusManager.current

    // Active Subject
    val currentSubject = exam.subjects.getOrNull(selectedSubjectIdx) ?: exam.subjects.firstOrNull()
    val currentSubName = currentSubject?.name ?: ""
    val currentMaxMarks = currentSubject?.maxMarks ?: 100.0

    // Filtered roster based on search query
    val filteredRoster = remember(roster, searchQuery) {
        if (searchQuery.isBlank()) roster
        else {
            val q = searchQuery.trim().lowercase()
            roster.filter { s ->
                s.fullName.lowercase().contains(q) ||
                (s.rollNo ?: "").lowercase().contains(q) ||
                (s.knownId ?: "").lowercase().contains(q) ||
                (s.admissionNo ?: "").lowercase().contains(q)
            }
        }
    }

    // Stats for active subject
    val totalStudents = roster.size
    val gradedCount = remember(roster, marksMap, currentSubName) {
        roster.count { s ->
            val score = marksMap[s._id]?.get(currentSubName)?.trim()
            !score.isNullOrEmpty()
        }
    }
    val progressPct = if (totalStudents > 0) (gradedCount.toFloat() / totalStudents.toFloat()) else 0f

    Scaffold(
        snackbarHost   = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "📝 Grade: ${exam.name}",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            maxLines = 1
                        )
                        Text(
                            exam.feeGroupName ?: (feeGroups.find { it._id == selectedClassId }?.name ?: "All Classes"),
                            fontSize = 12.sp,
                            color = TextSecondary,
                            maxLines = 1
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                },
                actions = {
                    Button(
                        onClick = { vm.saveAllMarks(exam, onDone = onBack) },
                        enabled = !isSavingMarks && roster.isNotEmpty(),
                        shape   = RoundedCornerShape(8.dp),
                        colors  = ButtonDefaults.buttonColors(containerColor = Primary),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        if (isSavingMarks) {
                            CircularProgressIndicator(Modifier.size(16.dp), Color.White, 2.dp)
                        } else {
                            Text("💾 Save All", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Class Selector (if school-wide or multi-class exam)
            if (exam.feeGroupId.isNullOrEmpty() && feeGroups.isNotEmpty()) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Class:", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                    feeGroups.forEach { g ->
                        val isSelected = g._id == selectedClassId
                        FilterChip(
                            selected = isSelected,
                            onClick = { vm.selectMarksClass(g._id) },
                            label = {
                                Text(
                                    g.name,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }
                Spacer(Modifier.height(4.dp))
            }

            // Subject Selector Pills (Horizontal Scroll)
            if (exam.subjects.isNotEmpty()) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    exam.subjects.forEachIndexed { idx, sub ->
                        val isSelected = idx == selectedSubjectIdx
                        val subGraded = roster.count { !marksMap[it._id]?.get(sub.name).isNullOrBlank() }
                        val isAllGraded = roster.isNotEmpty() && subGraded == roster.size

                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isSelected) Primary else Surface,
                            border = BorderStroke(1.dp, if (isSelected) Primary else Border),
                            modifier = Modifier.clickable { vm.selectSubjectIndex(idx) }
                        ) {
                            Row(
                                Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    sub.name,
                                    fontSize = 13.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else TextPrimary
                                )
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) Color.White.copy(0.25f) else (if (isAllGraded) Color(0xFF10B981).copy(0.15f) else Border)
                                ) {
                                    Text(
                                        "${subGraded}/${roster.size}",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) Color.White else (if (isAllGraded) Color(0xFF059669) else TextSecondary),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(6.dp))

            // Grading progress bar
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Grading $currentSubName (Max: ${currentMaxMarks.toInt()})",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Primary
                )
                Text(
                    "$gradedCount / $totalStudents Graded (${(progressPct * 100).toInt()}%)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (gradedCount == totalStudents && totalStudents > 0) Color(0xFF059669) else TextSecondary
                )
            }
            Spacer(Modifier.height(4.dp))
            LinearProgressIndicator(
                progress = { progressPct },
                modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color = if (gradedCount == totalStudents && totalStudents > 0) Color(0xFF059669) else Primary,
                trackColor = Border
            )

            Spacer(Modifier.height(8.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { vm.setMarksSearchQuery(it) },
                placeholder = { Text("🔍 Search student by name, roll no...", fontSize = 12.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(8.dp),
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { vm.setMarksSearchQuery("") }) {
                            Text("✕", fontSize = 13.sp, color = TextMuted)
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Surface,
                    focusedContainerColor = Surface,
                    unfocusedBorderColor = Border,
                    focusedBorderColor = Primary
                )
            )

            Spacer(Modifier.height(8.dp))

            // Student Roster
            if (isLoadingRost) {
                Box(Modifier.fillMaxWidth().weight(1f), Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            } else if (roster.isEmpty()) {
                Box(Modifier.fillMaxWidth().weight(1f), Alignment.Center) {
                    Text("No students enrolled in this class roster.", color = TextSecondary)
                }
            } else if (filteredRoster.isEmpty()) {
                Box(Modifier.fillMaxWidth().weight(1f), Alignment.Center) {
                    Text("No students match \"$searchQuery\"", color = TextSecondary)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 24.dp),
                    modifier = Modifier.fillMaxWidth().weight(1f)
                ) {
                    items(filteredRoster, key = { it._id }) { student ->
                        val currentScore = marksMap[student._id]?.get(currentSubName) ?: ""
                        val isAbsent = currentScore.equals("AB", ignoreCase = true)
                        val numScore = currentScore.toDoubleOrNull()
                        val isOverMax = numScore != null && numScore > currentMaxMarks

                        Card(
                            Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(if (isAbsent) Color(0xFFFEF2F2) else (if (currentScore.isNotBlank()) Primary.copy(0.03f) else Surface)),
                            border = BorderStroke(1.dp, if (isAbsent) Color(0xFFFCA5A5) else (if (isOverMax) Color(0xFFEF4444) else Border))
                        ) {
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 10.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Roll No badge
                                val rollDisplay = student.rollNo ?: student.knownId ?: student.admissionNo ?: "-"
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isAbsent) Color(0xFFFEE2E2) else Primary.copy(0.1f),
                                    modifier = Modifier.width(36.dp).height(36.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            rollDisplay,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = if (isAbsent) Color(0xFFDC2626) else Primary,
                                            maxLines = 1
                                        )
                                    }
                                }

                                Spacer(Modifier.width(10.dp))

                                // Student Name & Info
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        student.fullName,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary,
                                        maxLines = 1
                                    )
                                    val subInfo = student.admissionNo ?: student.knownId
                                    if (!subInfo.isNullOrBlank() && subInfo != rollDisplay) {
                                        Text("Adm: $subInfo", fontSize = 11.sp, color = TextMuted)
                                    }
                                }

                                Spacer(Modifier.width(8.dp))

                                // Absent Button
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = if (isAbsent) Color(0xFFDC2626) else Border.copy(0.5f),
                                    border = BorderStroke(1.dp, if (isAbsent) Color(0xFFDC2626) else Border),
                                    modifier = Modifier.clickable { vm.toggleStudentAbsent(student._id, currentSubName) }
                                ) {
                                    Text(
                                        text = "AB",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (isAbsent) Color.White else TextSecondary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                    )
                                }

                                Spacer(Modifier.width(8.dp))

                                // Marks Input Box
                                OutlinedTextField(
                                    value = if (isAbsent) "AB" else currentScore,
                                    onValueChange = {
                                        if (!isAbsent) {
                                            vm.updateStudentScore(
                                                student._id,
                                                currentSubName,
                                                it.filter { c -> c.isDigit() || c == '.' }
                                            )
                                        }
                                    },
                                    placeholder = { Text("0", fontSize = 12.sp, color = TextMuted) },
                                    singleLine = true,
                                    enabled = !isAbsent,
                                    keyboardOptions = KeyboardOptions(
                                        keyboardType = KeyboardType.Number,
                                        imeAction = ImeAction.Next
                                    ),
                                    keyboardActions = KeyboardActions(
                                        onNext = { focusManager.moveFocus(FocusDirection.Down) }
                                    ),
                                    isError = isOverMax,
                                    textStyle = androidx.compose.ui.text.TextStyle(
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center,
                                        color = if (isAbsent) Color(0xFFDC2626) else TextPrimary
                                    ),
                                    modifier = Modifier.width(72.dp).height(46.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedContainerColor = Background,
                                        focusedContainerColor = Background,
                                        disabledContainerColor = Color(0xFFFEE2E2),
                                        disabledTextColor = Color(0xFFDC2626),
                                        disabledBorderColor = Color(0xFFFCA5A5)
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Official Student Report Card Dialog ───────────────────────────────────────
// ── Official Student Report Card Dialog ───────────────────────────────────────
@Composable
private fun StudentReportCardDialog(
    result: ExamResultDto,
    exam: ExamDto?,
    schoolName: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val gradeColor = when (result.grade) {
        "A+" -> Color(0xFF059669); "A" -> Color(0xFF10B981); "B" -> Color(0xFF3B82F6)
        "C"  -> Color(0xFFF59E0B); "D" -> Color(0xFFEF4444); else -> Color(0xFF6B7280)
    }

    val isPassed = result.percentage >= 33.0
    val resultStatus = when {
        result.percentage >= 75.0 -> "PASSED WITH DISTINCTION"
        result.percentage >= 60.0 -> "FIRST CLASS"
        result.percentage >= 50.0 -> "SECOND CLASS"
        result.percentage >= 33.0 -> "PASSED"
        else -> "NEEDS IMPROVEMENT"
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(
                Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // School Header
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text("🏫", fontSize = 20.sp)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        schoolName.trim().ifEmpty { "School" },
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Primary,
                        textAlign = TextAlign.Center,
                        maxLines = 2
                    )
                }
                Text(
                    "OFFICIAL REPORT CARD",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TextSecondary,
                    letterSpacing = 1.5.sp,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Spacer(Modifier.height(8.dp))

                // Prominent Exam Banner
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Primary.copy(alpha = 0.1f),
                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.25f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        Modifier.padding(vertical = 8.dp, horizontal = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "🎓 ${exam?.name ?: "Academic Examination"}",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary,
                            textAlign = TextAlign.Center
                        )
                        if (!exam?.feeGroupName.isNullOrBlank()) {
                            Text(
                                "Class: ${exam?.feeGroupName}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }
        },
        text = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Student Profile Card
                Surface(
                    shape  = RoundedCornerShape(12.dp),
                    color  = Surface,
                    border = BorderStroke(1.dp, Border),
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Student Initial Circle
                        val initials = (result.memberName ?: "S").split(" ")
                            .take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
                        Surface(
                            shape = CircleShape,
                            color = Primary.copy(0.12f),
                            modifier = Modifier.size(42.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    initials.ifEmpty { "S" },
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 15.sp,
                                    color = Primary
                                )
                            }
                        }

                        Spacer(Modifier.width(12.dp))

                        Column(Modifier.weight(1f)) {
                            Text(
                                result.memberName ?: "Student",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            val idDisplay = result.rollNo ?: result.knownId
                            if (!idDisplay.isNullOrBlank()) {
                                Text("Roll / Adm ID: $idDisplay", fontSize = 12.sp, color = TextMuted)
                            }
                        }
                    }
                }

                // Subject-wise Marks Table
                Surface(
                    shape  = RoundedCornerShape(12.dp),
                    color  = Surface,
                    border = BorderStroke(1.dp, Border),
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.fillMaxWidth()) {
                        // Table Header
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF8FAFC))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("SUBJECT", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary)
                            Text("SCORE / MAX", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary)
                        }
                        HorizontalDivider(color = Border, thickness = 1.dp)

                        if (result.subjectScores.isEmpty()) {
                            Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) {
                                Text("No subject scores recorded.", color = TextMuted, fontSize = 12.sp)
                            }
                        } else {
                            result.subjectScores.forEachIndexed { idx, s ->
                                val isEven = idx % 2 == 0
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .background(if (isEven) Surface else Color(0xFFFAFAFA))
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(s.subject, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                                        val pct = if (s.maxMarks > 0) (s.marks / s.maxMarks) * 100 else 0.0
                                        Text("${"%.0f".format(pct)}%", fontSize = 10.sp, color = if (pct >= 33) Color(0xFF059669) else Color(0xFFEF4444))
                                    }
                                    Text(
                                        "${s.marks.toInt()} / ${s.maxMarks.toInt()}",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                }
                                if (idx < result.subjectScores.size - 1) {
                                    HorizontalDivider(color = Color(0xFFF1F5F9), thickness = 1.dp)
                                }
                            }
                        }
                    }
                }

                // Cumulative Performance Summary
                Surface(
                    shape  = RoundedCornerShape(12.dp),
                    color  = if (isPassed) Color(0xFFF0FDF4) else Color(0xFFFEF2F2),
                    border = BorderStroke(1.dp, if (isPassed) Color(0xFFBBF7D0) else Color(0xFFFECACA)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    "Total: ${result.totalMarks.toInt()} / ${result.maxMarks.toInt()}",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TextPrimary
                                )
                                Text(
                                    "Percentage: ${"%.1f".format(result.percentage)}%",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isPassed) Color(0xFF059669) else Color(0xFFDC2626)
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = gradeColor
                            ) {
                                Text(
                                    "Grade ${result.grade}",
                                    Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                            }
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "Status: $resultStatus",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (isPassed) Color(0xFF059669) else Color(0xFFDC2626),
                            letterSpacing = 0.5.sp
                        )
                    }
                }

                // Remarks section (if available)
                if (!result.remarks.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Surface,
                        border = BorderStroke(1.dp, Border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(10.dp)) {
                            Text("Teacher Remarks:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                            Text(result.remarks, fontSize = 12.sp, color = TextPrimary, modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                }

                // Dual Signature Block
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp, bottom = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("_______________", fontSize = 10.sp, color = TextMuted)
                        Text("Class Teacher", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("_______________", fontSize = 10.sp, color = TextMuted)
                        Text("Principal", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                    }
                }

                // WhatsApp share button
                Button(
                    onClick = { shareReportCardOnWhatsApp(context, schoolName, exam?.name, result) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                ) {
                    Text("💬 Share Report Card on WhatsApp", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", fontWeight = FontWeight.Bold, color = Primary, fontSize = 14.sp)
            }
        }
    )
}

private fun shareReportCardOnWhatsApp(
    context: Context,
    schoolName: String,
    examName: String?,
    result: ExamResultDto
) {
    val sb = StringBuilder()
    sb.append("🏫 *${schoolName.trim()}*\n")
    sb.append("📄 *STUDENT REPORT CARD*\n")
    sb.append("Exam: *${examName ?: "Examination"}*\n\n")
    sb.append("👤 *Student:* ${result.memberName ?: "Student"}\n")
    if (!result.knownId.isNullOrBlank()) sb.append("🆔 *Adm / Roll No:* ${result.knownId}\n\n")

    sb.append("📊 *Subject Scores:*\n")
    result.subjectScores.forEach { s ->
        sb.append("• ${s.subject}: *${s.marks.toInt()}/${s.maxMarks.toInt()}*\n")
    }

    sb.append("\n📈 *Summary:*\n")
    sb.append("• *Total Marks:* ${result.totalMarks.toInt()}/${result.maxMarks.toInt()}\n")
    sb.append("• *Percentage:* ${"%.1f".format(result.percentage)}%\n")
    sb.append("• *Grade:* *${result.grade}*\n")
    sb.append("• *Result:* *${if (result.percentage >= 33) "PASSED" else "NEEDS IMPROVEMENT"}*\n\n")
    sb.append("_Generated via School Portal_")

    val message = sb.toString()
    val url = "https://api.whatsapp.com/send?text=${URLEncoder.encode(message, "UTF-8")}"
    try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    } catch (_: Exception) {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, message)
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share Report Card"))
    }
}

// ── Create Exam Bottom Sheet ──────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateExamSheet(vm: ExamsViewModel, onDismiss: () -> Unit) {
    val createName      by vm.createName.collectAsState()
    val createClassId   by vm.createClassId.collectAsState()
    val createStartDate by vm.createStartDate.collectAsState()
    val createEndDate   by vm.createEndDate.collectAsState()
    val subjects        by vm.subjectEntries.collectAsState()
    val isCreating      by vm.isCreating.collectAsState()
    val feeGroups       by vm.feeGroups.collectAsState()

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            if (msg.startsWith("✅")) onDismiss()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor   = Surface
    ) {
        LazyColumn(
            contentPadding      = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier            = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 24.dp)
        ) {
            item {
                Text("Schedule New Exam", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Configure exam timetable & subject max marks", fontSize = 13.sp, color = TextSecondary)
                Spacer(Modifier.height(8.dp))
            }

            item {
                SheetField("Exam Name *", createName) { vm.createName.value = it }
            }

            // Target Class Selector
            if (feeGroups.isNotEmpty()) {
                item {
                    Text("Target Class (Optional)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(Modifier.height(6.dp))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(
                            selected = createClassId == null,
                            onClick  = { vm.createClassId.value = null },
                            label    = { Text("All Classes", fontSize = 11.sp) },
                            colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                            shape    = RoundedCornerShape(8.dp)
                        )
                        feeGroups.forEach { g ->
                            val isSel = createClassId == g._id
                            FilterChip(
                                selected = isSel,
                                onClick  = { vm.createClassId.value = g._id },
                                label    = { Text(g.name, fontSize = 11.sp) },
                                colors   = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White),
                                shape    = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    EmsDateField(
                        label         = "Start Date *",
                        value         = createStartDate,
                        onValueChange = { vm.createStartDate.value = it },
                        modifier      = Modifier.weight(1f)
                    )
                    EmsDateField(
                        label         = "End Date *",
                        value         = createEndDate,
                        onValueChange = { vm.createEndDate.value = it },
                        modifier      = Modifier.weight(1f)
                    )
                }
            }

            item {
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(4.dp))
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                    Text("Subjects & Max Marks", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    TextButton(onClick = { vm.addSubjectEntry() }) {
                        Text("+ Add Subject", fontSize = 13.sp, color = Primary, fontWeight = FontWeight.Bold)
                    }
                }
            }

            itemsIndexed(subjects) { idx, sub ->
                SubjectEntryRow(
                    index    = idx,
                    entry    = sub,
                    canRemove = subjects.size > 1,
                    onChange = { vm.updateSubjectEntry(idx, it) },
                    onRemove = { vm.removeSubjectEntry(idx) }
                )
            }

            item {
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick   = { vm.createExam() },
                    enabled   = !isCreating,
                    modifier  = Modifier.fillMaxWidth().height(50.dp),
                    shape     = RoundedCornerShape(12.dp),
                    colors    = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (isCreating) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                    else Text("✓ Schedule Exam", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun SubjectEntryRow(
    index: Int,
    entry: ExamSubjectDto,
    canRemove: Boolean,
    onChange: (ExamSubjectDto) -> Unit,
    onRemove: () -> Unit
) {
    Card(
        Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(Background),
        elevation = CardDefaults.cardElevation(0.dp),
        border    = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text("Subject ${index + 1}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Primary)
                if (canRemove) {
                    TextButton(
                        onClick      = onRemove,
                        contentPadding = PaddingValues(0.dp)
                    ) { Text("Remove", fontSize = 12.sp, color = Danger) }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(0.65f)) {
                    SheetField("Subject Name *", entry.name) { onChange(entry.copy(name = it)) }
                }
                Box(Modifier.weight(0.35f)) {
                    SheetField("Max Marks", if (entry.maxMarks > 0) entry.maxMarks.toInt().toString() else "100", KeyboardType.Number) {
                        onChange(entry.copy(maxMarks = it.toDoubleOrNull() ?: 100.0))
                    }
                }
            }
            EmsDateField(
                label         = "Exam Date",
                value         = entry.date,
                onValueChange = { onChange(entry.copy(date = it)) }
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f)) {
                    SheetField("Start (HH:MM)", entry.startTime) { onChange(entry.copy(startTime = it)) }
                }
                Box(Modifier.weight(1f)) {
                    SheetField("End (HH:MM)", entry.endTime) { onChange(entry.copy(endTime = it)) }
                }
            }
        }
    }
}

@Composable
private fun SheetField(
    label: String,
    value: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value         = value,
        onValueChange = onValueChange,
        label         = { Text(label, fontSize = 12.sp) },
        modifier      = Modifier.fillMaxWidth(),
        singleLine    = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape         = RoundedCornerShape(8.dp),
        colors        = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = Border,
            focusedBorderColor   = Primary,
            unfocusedContainerColor = Surface,
            focusedContainerColor   = Surface
        )
    )
}
