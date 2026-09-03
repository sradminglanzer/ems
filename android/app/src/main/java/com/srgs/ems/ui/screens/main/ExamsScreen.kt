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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
    var showEnterMarksSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { snackbar.showSnackbar(it) }
    }

    // ── Report Card Dialog ────────────────────────────────────────────────────
    activeReportCard?.let { result ->
        StudentReportCardDialog(
            result     = result,
            exam       = selectedExam,
            schoolName = session?.name ?: "School",
            onDismiss  = { vm.closeReportCard() }
        )
    }

    // ── Detail view (exam selected) ───────────────────────────────────────────
    if (selectedExam != null) {
        ExamDetailPane(
            exam         = selectedExam!!,
            results      = results,
            rankSheet    = rankSheet,
            isLoading    = isLoadingRes,
            canManage    = canManage,
            onBack       = { vm.clearSelectedExam() },
            onEnterMarks = {
                vm.loadMarksEntry(selectedExam!!)
                showEnterMarksSheet = true
            },
            onViewReport = { vm.openReportCard(it) }
        )

        if (showEnterMarksSheet) {
            EnterMarksBottomSheet(
                exam      = selectedExam!!,
                vm        = vm,
                onDismiss = { showEnterMarksSheet = false }
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
    onBack: () -> Unit,
    onEnterMarks: () -> Unit,
    onViewReport: (ExamResultDto) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Timetable (${exam.subjects.size})", "Results (${results.size})", "🏆 Rank Sheet")

    Scaffold(
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
                    0 -> SubjectsTab(exam.subjects)
                    1 -> ResultsTab(results, onViewReport)
                    2 -> RankSheetTab(rankSheet, results, onViewReport)
                }
            }
        }
    }
}

// ── Subjects Tab ──────────────────────────────────────────────────────────────
@Composable
private fun SubjectsTab(subjects: List<ExamSubjectDto>) {
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
                Text("Rank sheet not available yet.", color = TextSecondary)
            }
        }
        return
    }
    LazyColumn(
        contentPadding      = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier            = Modifier.fillMaxSize()
    ) {
        item {
            // Table header
            Row(
                Modifier.fillMaxWidth()
                    .background(Primary.copy(.08f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("#", Modifier.width(32.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                Text("Student", Modifier.weight(1f), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                Text("Marks", Modifier.width(60.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold,
                    color = Primary, textAlign = TextAlign.End)
                Text("%", Modifier.width(48.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold,
                    color = Primary, textAlign = TextAlign.End)
                Text("Grade", Modifier.width(44.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold,
                    color = Primary, textAlign = TextAlign.Center)
            }
        }
        items(rankSheet, key = { it.memberId }) { e ->
            val matchingResult = results.find { it.memberId == e.memberId }
            RankRow(e, onClick = { matchingResult?.let { onViewReport(it) } })
        }
    }
}

@Composable
private fun RankRow(e: RankSheetEntryDto, onClick: () -> Unit) {
    val medalEmoji = when (e.rank) { 1 -> "🥇"; 2 -> "🥈"; 3 -> "🥉"; else -> null }
    val gradeColor = when (e.grade) {
        "A+" -> Color(0xFF059669); "A" -> Color(0xFF10B981); "B" -> Color(0xFF3B82F6)
        "C"  -> Color(0xFFF59E0B); "D" -> Color(0xFFEF4444); else -> Color(0xFF6B7280)
    }
    Card(
        Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape     = RoundedCornerShape(10.dp),
        colors    = CardDefaults.cardColors(if (e.rank <= 3) Primary.copy(.04f) else Surface),
        elevation = CardDefaults.cardElevation(if (e.rank <= 3) 2.dp else 0.dp),
        border    = BorderStroke(1.dp, Border)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.width(32.dp), contentAlignment = Alignment.Center) {
                if (medalEmoji != null) Text(medalEmoji, fontSize = 18.sp)
                else Text("${e.rank}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
            }
            Column(Modifier.weight(1f)) {
                Text(e.memberName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                e.knownId?.let { Text("ID: $it", fontSize = 11.sp, color = TextMuted) }
            }
            Text(
                "${e.totalMarks.toInt()}/${e.maxMarks.toInt()}",
                Modifier.width(60.dp), fontSize = 12.sp, color = TextPrimary,
                fontWeight = FontWeight.SemiBold, textAlign = TextAlign.End
            )
            Text(
                "${"%.1f".format(e.percentage)}%",
                Modifier.width(48.dp), fontSize = 12.sp, color = TextPrimary,
                textAlign = TextAlign.End
            )
            Box(Modifier.width(44.dp), contentAlignment = Alignment.Center) {
                Surface(shape = RoundedCornerShape(6.dp), color = gradeColor.copy(.15f)) {
                    Text(e.grade, Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = gradeColor,
                        textAlign = TextAlign.Center)
                }
            }
        }
    }
}

// ── Enter Marks Bottom Sheet ──────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EnterMarksBottomSheet(
    exam: ExamDto,
    vm: ExamsViewModel,
    onDismiss: () -> Unit
) {
    val roster        by vm.classRoster.collectAsState()
    val marksMap      by vm.marksEntryMap.collectAsState()
    val isLoadingRost by vm.isLoadingRoster.collectAsState()
    val isSavingMarks by vm.isSavingMarks.collectAsState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor   = Surface
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("📝 Enter Student Marks", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                    Text("${exam.name} • ${exam.feeGroupName ?: "Class Roster"}", fontSize = 12.sp, color = TextSecondary)
                }
                Button(
                    onClick = { vm.saveAllMarks(exam, onDone = onDismiss) },
                    enabled = !isSavingMarks && roster.isNotEmpty(),
                    shape   = RoundedCornerShape(8.dp),
                    colors  = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (isSavingMarks) CircularProgressIndicator(Modifier.size(16.dp), Color.White, 2.dp)
                    else Text("💾 Save All", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
            Spacer(Modifier.height(12.dp))

            if (isLoadingRost) {
                Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            } else if (roster.isEmpty()) {
                Box(Modifier.fillMaxWidth().height(150.dp), Alignment.Center) {
                    Text("No students enrolled in this class roster.", color = TextSecondary)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier            = Modifier.fillMaxWidth().weight(1f, fill = false)
                ) {
                    items(roster, key = { it._id }) { student ->
                        Card(
                            Modifier.fillMaxWidth(),
                            shape  = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(Background),
                            border = BorderStroke(1.dp, Border)
                        ) {
                            Column(Modifier.padding(12.dp)) {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    Arrangement.SpaceBetween,
                                    Alignment.CenterVertically
                                ) {
                                    Text(
                                        student.fullName,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    val idStr = student.rollNo ?: student.knownId ?: student.admissionNo
                                    if (!idStr.isNullOrBlank()) {
                                        Text("Roll #$idStr", fontSize = 11.sp, color = TextMuted)
                                    }
                                }
                                Spacer(Modifier.height(8.dp))

                                // Subject input rows
                                exam.subjects.forEach { subject ->
                                    val currentScore = marksMap[student._id]?.get(subject.name) ?: ""
                                    val isOverMax = (currentScore.toDoubleOrNull() ?: 0.0) > subject.maxMarks

                                    Row(
                                        Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                        Arrangement.SpaceBetween,
                                        Alignment.CenterVertically
                                    ) {
                                        Column(Modifier.weight(1f)) {
                                            Text(subject.name, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                                            Text("Max: ${subject.maxMarks.toInt()}", fontSize = 10.sp, color = TextSecondary)
                                        }
                                        OutlinedTextField(
                                            value         = currentScore,
                                            onValueChange = { vm.updateStudentScore(student._id, subject.name, it.filter { c -> c.isDigit() || c == '.' }) },
                                            placeholder   = { Text("0", fontSize = 12.sp) },
                                            singleLine    = true,
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            isError       = isOverMax,
                                            modifier      = Modifier.width(90.dp).height(50.dp),
                                            shape         = RoundedCornerShape(8.dp),
                                            colors        = OutlinedTextFieldDefaults.colors(
                                                unfocusedContainerColor = Surface,
                                                focusedContainerColor   = Surface
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
    }
}

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

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🏫 $schoolName", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Primary, textAlign = TextAlign.Center)
                Text("STUDENT REPORT CARD", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 1.sp)
                Text(exam?.name ?: "Academic Examination", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            }
        },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Student info card
                Surface(
                    shape  = RoundedCornerShape(8.dp),
                    color  = Background,
                    border = BorderStroke(1.dp, Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(10.dp)) {
                        Text("Student: ${result.memberName ?: "Student"}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        if (!result.knownId.isNullOrBlank()) Text("Roll / Adm ID: ${result.knownId}", fontSize = 12.sp, color = TextSecondary)
                        if (!exam?.feeGroupName.isNullOrBlank()) Text("Class: ${exam?.feeGroupName}", fontSize = 12.sp, color = TextSecondary)
                    }
                }

                // Marks Table
                Surface(
                    shape  = RoundedCornerShape(8.dp),
                    color  = Surface,
                    border = BorderStroke(1.dp, Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(8.dp)) {
                        Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), Arrangement.SpaceBetween) {
                            Text("Subject", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                            Text("Score / Max", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                        }
                        HorizontalDivider(color = Border)
                        result.subjectScores.forEach { s ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), Arrangement.SpaceBetween) {
                                Text(s.subject, fontSize = 12.sp, color = TextPrimary)
                                Text("${s.marks.toInt()} / ${s.maxMarks.toInt()}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            }
                        }
                    }
                }

                // Cumulative Performance
                Surface(
                    shape  = RoundedCornerShape(8.dp),
                    color  = Primary.copy(alpha = 0.07f),
                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.2f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(10.dp),
                        Arrangement.SpaceBetween,
                        Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Total: ${result.totalMarks.toInt()}/${result.maxMarks.toInt()} (${"%.1f".format(result.percentage)}%)",
                                fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("Result: ${if (result.percentage >= 33) "PASSED" else "NEEDS IMPROVEMENT"}",
                                fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                                color = if (result.percentage >= 33) Success else Danger)
                        }
                        Surface(shape = RoundedCornerShape(8.dp), color = gradeColor) {
                            Text(
                                "Grade ${result.grade}",
                                Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color.White
                            )
                        }
                    }
                }

                // WhatsApp share preview button
                OutlinedButton(
                    onClick = { shareReportCardOnWhatsApp(context, schoolName, exam?.name, result) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFF25D366))
                ) {
                    Text("💬 Share Report Card on WhatsApp", color = Color(0xFF128C7E), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", fontWeight = FontWeight.Bold, color = Primary)
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
