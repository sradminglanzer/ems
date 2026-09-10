package com.srgs.ems.ui.screens.main

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.data.api.SubjectDto
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.SubjectsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubjectsScreen(
    onBack: () -> Unit,
    vm: SubjectsViewModel = viewModel()
) {
    val subjects by vm.subjects.collectAsState()
    val classes by vm.classes.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val searchQuery by vm.searchQuery.collectAsState()

    val showDialog by vm.showDialog.collectAsState()
    val editingSubject by vm.editingSubject.collectAsState()
    val formName by vm.formName.collectAsState()
    val formCode by vm.formCode.collectAsState()
    val formSelectedClassIds by vm.formSelectedClassIds.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    val deleteTarget by vm.deleteTarget.collectAsState()
    val isDeleting by vm.isDeleting.collectAsState()

    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
        }
    }

    val classMap = remember(classes) {
        classes.associateBy({ it._id }, { it.name })
    }

    val filteredSubjects = remember(subjects, searchQuery) {
        if (searchQuery.isBlank()) subjects
        else {
            val q = searchQuery.trim().lowercase()
            subjects.filter {
                it.name.lowercase().contains(q) || (it.code?.lowercase()?.contains(q) == true)
            }
        }
    }

    Scaffold(
        topBar = {
            Surface(
                color = Surface,
                tonalElevation = 2.dp,
                shadowElevation = 2.dp
            ) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                "Subjects Directory",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                "${subjects.size} subjects configured",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                        }
                    },
                    actions = {
                        IconButton(onClick = { vm.loadData() }) {
                            Icon(Icons.Filled.Refresh, contentDescription = "Refresh", tint = TextPrimary)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
                )
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { vm.startAdd() },
                containerColor = Primary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.Add, contentDescription = "Add Subject")
                    Spacer(Modifier.width(8.dp))
                    Text("Add Subject", fontWeight = FontWeight.Bold)
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Search Bar
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { vm.searchQuery.value = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Search subjects (e.g. Math, Science)...", fontSize = 13.sp) },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = TextMuted) },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { vm.searchQuery.value = "" }) {
                                    Icon(Icons.Filled.Clear, contentDescription = "Clear", tint = TextMuted)
                                }
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Surface,
                            unfocusedContainerColor = Surface,
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = Border
                        )
                    )

                    Spacer(Modifier.height(12.dp))

                    if (subjects.isEmpty()) {
                        // Empty State with Starter Pack Button
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            Card(
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(64.dp)
                                            .clip(CircleShape)
                                            .background(PrimaryLight.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("📚", fontSize = 32.sp)
                                    }
                                    Spacer(Modifier.height(14.dp))
                                    Text(
                                        "No Subjects Added Yet",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        "Configure school subjects to use in Class Diary homework and Exam timetables.",
                                        fontSize = 13.sp,
                                        color = TextSecondary,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                    Spacer(Modifier.height(20.dp))
                                    Button(
                                        onClick = { vm.addStandardSubjects() },
                                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("✨ Add Standard School Subjects", fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    OutlinedButton(
                                        onClick = { vm.startAdd() },
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("+ Add Custom Subject", color = Primary, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            item {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        "${filteredSubjects.size} SUBJECTS",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextMuted,
                                        letterSpacing = 0.8.sp
                                    )
                                    TextButton(onClick = { vm.addStandardSubjects() }) {
                                        Text("+ Standard Pack", fontSize = 12.sp, color = Primary, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            items(filteredSubjects, key = { it._id }) { subject ->
                                SubjectCardItem(
                                    subject = subject,
                                    classMap = classMap,
                                    onEdit = { vm.startEdit(subject) },
                                    onDelete = { vm.deleteTarget.value = subject }
                                )
                            }
                        }
                    }
                }
            }

            // Add / Edit Subject Dialog
            if (showDialog) {
                AddEditSubjectDialog(
                    isEditing = editingSubject != null,
                    name = formName,
                    code = formCode,
                    selectedClassIds = formSelectedClassIds,
                    classes = classes,
                    isSubmitting = isSubmitting,
                    onNameChange = { vm.formName.value = it },
                    onCodeChange = { vm.formCode.value = it },
                    onToggleClass = { vm.toggleClassSelection(it) },
                    onSelectAllClasses = { vm.formSelectedClassIds.value = emptySet() },
                    onDismiss = { vm.showDialog.value = false },
                    onSave = { vm.saveSubject() }
                )
            }

            // Delete Confirmation Dialog
            deleteTarget?.let { target ->
                AlertDialog(
                    onDismissRequest = { vm.deleteTarget.value = null },
                    title = { Text("Delete Subject", fontWeight = FontWeight.Bold) },
                    text = {
                        Text("Are you sure you want to delete '${target.name}'? This will remove it from the school's subject list.")
                    },
                    confirmButton = {
                        Button(
                            onClick = { vm.confirmDelete() },
                            colors = ButtonDefaults.buttonColors(containerColor = Danger),
                            enabled = !isDeleting
                        ) {
                            if (isDeleting) {
                                CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { vm.deleteTarget.value = null }) {
                            Text("Cancel", color = TextSecondary)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun SubjectCardItem(
    subject: SubjectDto,
    classMap: Map<String, String>,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val (icon, color) = getSubjectStyle(subject.name)

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(color.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(icon, fontSize = 22.sp)
                }

                Spacer(Modifier.width(14.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            subject.name,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        if (!subject.code.isNullOrBlank()) {
                            Spacer(Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Border.copy(alpha = 0.6f)
                            ) {
                                Text(
                                    subject.code,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TextSecondary,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(4.dp))

                    val assignedText = if (subject.assignedClasses.isEmpty()) {
                        "🌐 All Classes"
                    } else {
                        "🎒 " + subject.assignedClasses.mapNotNull { classMap[it] }.joinToString(", ")
                            .ifEmpty { "${subject.assignedClasses.size} classes" }
                    }

                    Text(
                        assignedText,
                        fontSize = 12.sp,
                        color = if (subject.assignedClasses.isEmpty()) Primary else Color(0xFFD97706),
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(onClick = onEdit, modifier = Modifier.size(34.dp)) {
                    Icon(Icons.Filled.Edit, contentDescription = "Edit", tint = TextSecondary, modifier = Modifier.size(18.dp))
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(34.dp)) {
                    Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = Danger.copy(alpha = 0.8f), modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddEditSubjectDialog(
    isEditing: Boolean,
    name: String,
    code: String,
    selectedClassIds: Set<String>,
    classes: List<FeeGroupDto>,
    isSubmitting: Boolean,
    onNameChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onToggleClass: (String) -> Unit,
    onSelectAllClasses: () -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Surface,
            tonalElevation = 6.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        if (isEditing) "Edit Subject" else "Add New Subject",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = TextMuted)
                    }
                }

                Spacer(Modifier.height(16.dp))

                Text("SUBJECT NAME *", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = onNameChange,
                    placeholder = { Text("e.g. Mathematics, Science, Art & Craft", fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(Modifier.height(14.dp))

                Text("SUBJECT CODE (OPTIONAL)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = code,
                    onValueChange = onCodeChange,
                    placeholder = { Text("e.g. MATH, SCI, ENG", fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(Modifier.height(16.dp))

                Text("ASSIGN TO CLASSES", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 0.6.sp)
                Text("Select specific classes or leave as 'All Classes'", fontSize = 12.sp, color = TextSecondary)
                Spacer(Modifier.height(8.dp))

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val isAllSelected = selectedClassIds.isEmpty()
                    FilterChip(
                        selected = isAllSelected,
                        onClick = onSelectAllClasses,
                        label = { Text("🌐 All Classes", fontWeight = if (isAllSelected) FontWeight.Bold else FontWeight.Normal) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = PrimaryLight.copy(alpha = 0.3f),
                            selectedLabelColor = PrimaryDark
                        )
                    )

                    classes.forEach { cls ->
                        val isSelected = selectedClassIds.contains(cls._id)
                        FilterChip(
                            selected = isSelected,
                            onClick = { onToggleClass(cls._id) },
                            label = { Text(cls.name, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFFEF3C7),
                                selectedLabelColor = Color(0xFF92400E)
                            )
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = TextSecondary)
                    }
                    Spacer(Modifier.width(10.dp))
                    Button(
                        onClick = onSave,
                        enabled = !isSubmitting && name.isNotBlank(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text(if (isEditing) "Save Changes" else "Create Subject", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

fun getSubjectStyle(name: String): Pair<String, Color> {
    val lower = name.lowercase()
    return when {
        lower.contains("math") -> Pair("🔢", Color(0xFF6366F1))
        lower.contains("sci") || lower.contains("evs") || lower.contains("bio") -> Pair("🔬", Color(0xFF10B981))
        lower.contains("eng") -> Pair("📚", Color(0xFFEC4899))
        lower.contains("hin") || lower.contains("lang") || lower.contains("sansk") -> Pair("✍️", Color(0xFF8B5CF6))
        lower.contains("soc") || lower.contains("hist") || lower.contains("geo") -> Pair("🌍", Color(0xFFF59E0B))
        lower.contains("comp") || lower.contains("it") || lower.contains("tech") -> Pair("💻", Color(0xFF0EA5E9))
        lower.contains("art") || lower.contains("draw") || lower.contains("craft") -> Pair("🎨", Color(0xFFF43F5E))
        lower.contains("rhym") || lower.contains("song") || lower.contains("music") -> Pair("🎵", Color(0xFF14B8A6))
        lower.contains("physic") -> Pair("⚡", Color(0xFF3B82F6))
        lower.contains("chem") -> Pair("🧪", Color(0xFF84CC16))
        else -> Pair("📝", Color(0xFF6B7280))
    }
}
