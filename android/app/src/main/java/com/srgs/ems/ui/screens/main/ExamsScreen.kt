package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
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

    val snackbar       = remember { SnackbarHostState() }
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()
    var showCreateSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { snackbar.showSnackbar(it) }
    }

    // ── Detail view (exam selected) ───────────────────────────────────────────
    if (selectedExam != null) {
        ExamDetailPane(
            exam         = selectedExam!!,
            results      = results,
            rankSheet    = rankSheet,
            isLoading    = isLoadingRes,
            onBack       = { vm.clearSelectedExam() }
        )
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
                    Text("Tap + to create an exam", fontSize = 13.sp, color = TextSecondary)
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
                        "${exams.size} exam(s) this year",
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
                Text(exam.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
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
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Subjects", "Results", "Rank Sheet")

    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Text(exam.name, fontWeight = FontWeight.Bold, color = Color.White,
                        maxLines = 1)
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 22.sp, color = Color.White)
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
                                fontSize   = 13.sp)
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
                    1 -> ResultsTab(results)
                    2 -> RankSheetTab(rankSheet)
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
                elevation = CardDefaults.cardElevation(1.dp)
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier.size(36.dp).clip(CircleShape).background(SecondaryLight.copy(.3f)),
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
                }
            }
        }
    }
}

// ── Results Tab ───────────────────────────────────────────────────────────────
@Composable
private fun ResultsTab(results: List<ExamResultDto>) {
    if (results.isEmpty()) {
        Box(Modifier.fillMaxSize(), Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("📊", fontSize = 48.sp)
                Spacer(Modifier.height(8.dp))
                Text("No results recorded yet.", color = TextSecondary)
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
            ResultCard(r)
        }
    }
}

@Composable
private fun ResultCard(r: ExamResultDto) {
    val gradeColor = when (r.grade) {
        "A+" -> Color(0xFF059669)
        "A"  -> Color(0xFF10B981)
        "B"  -> Color(0xFF3B82F6)
        "C"  -> Color(0xFFF59E0B)
        "D"  -> Color(0xFFEF4444)
        else -> Color(0xFF6B7280)
    }
    Card(
        Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(12.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text(r.memberName ?: "Student", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Surface(shape = RoundedCornerShape(8.dp), color = gradeColor.copy(.15f)) {
                    Text(r.grade, Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = gradeColor)
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth()) {
                ScorePill("Marks", "${r.totalMarks.toInt()}/${r.maxMarks.toInt()}", TextPrimary, Modifier.weight(1f))
                ScorePill("Percentage", "${"%.1f".format(r.percentage)}%",
                    if (r.percentage >= 33) Color(0xFF059669) else Color(0xFFEF4444), Modifier.weight(1f))
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
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = vc)
    }
}

// ── Rank Sheet Tab ────────────────────────────────────────────────────────────
@Composable
private fun RankSheetTab(rankSheet: List<RankSheetEntryDto>) {
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
            RankRow(e)
        }
    }
}

@Composable
private fun RankRow(e: RankSheetEntryDto) {
    val medalEmoji = when (e.rank) { 1 -> "🥇"; 2 -> "🥈"; 3 -> "🥉"; else -> null }
    val gradeColor = when (e.grade) {
        "A+" -> Color(0xFF059669); "A" -> Color(0xFF10B981); "B" -> Color(0xFF3B82F6)
        "C"  -> Color(0xFFF59E0B); "D" -> Color(0xFFEF4444); else -> Color(0xFF6B7280)
    }
    Card(
        Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(10.dp),
        colors    = CardDefaults.cardColors(if (e.rank <= 3) Primary.copy(.04f) else Surface),
        elevation = CardDefaults.cardElevation(if (e.rank <= 3) 2.dp else 0.dp)
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

// ── Create Exam Bottom Sheet ──────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateExamSheet(vm: ExamsViewModel, onDismiss: () -> Unit) {
    val createName      by vm.createName.collectAsState()
    val createStartDate by vm.createStartDate.collectAsState()
    val createEndDate   by vm.createEndDate.collectAsState()
    val subjects        by vm.subjectEntries.collectAsState()
    val isCreating      by vm.isCreating.collectAsState()

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
            modifier            = Modifier.fillMaxWidth().padding(bottom = 32.dp)
        ) {
            item {
                Text("Create New Exam", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Fill in the details below", fontSize = 13.sp, color = TextSecondary)
                Spacer(Modifier.height(8.dp))
            }

            item {
                SheetField("Exam Name *", createName) { vm.createName.value = it }
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
                    Text("Subjects", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
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
                    else Text("Create Exam", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
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
            SheetField("Subject Name *", entry.name) { onChange(entry.copy(name = it)) }
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
private fun SheetField(label: String, value: String, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value         = value,
        onValueChange = onValueChange,
        label         = { Text(label, fontSize = 12.sp) },
        modifier      = Modifier.fillMaxWidth(),
        singleLine    = true,
        shape         = RoundedCornerShape(8.dp),
        colors        = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = Border,
            focusedBorderColor   = Primary
        )
    )
}
