package com.srgs.ems.ui.screens.main

import android.app.DatePickerDialog
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.AcademicYearDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.AcademicYearsViewModel
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademicYearsScreen(vm: AcademicYearsViewModel = viewModel()) {
    val session = SessionManager.session
    val isAdmin = session?.role == "admin" || session?.role == "owner" || session?.role == "superadmin"

    val years by vm.years.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val selectedYearId by vm.selectedYearId.collectAsState()

    val snackbar = remember { SnackbarHostState() }
    var showSheet by remember { mutableStateOf(false) }
    var yearToDelete by remember { mutableStateOf<AcademicYearDto?>(null) }

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg ->
            snackbar.showSnackbar(msg)
            if (showSheet && msg.startsWith("✅")) showSheet = false
        }
    }

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            EmsTopBar(
                title = "Academic Years",
                scrollBehavior = scrollBehavior,
                actions = {
                    if (isAdmin) {
                        FilledTonalIconButton(
                            onClick = { showSheet = true },
                            colors = IconButtonDefaults.filledTonalIconButtonColors(
                                containerColor = Surface.copy(alpha = 0.2f),
                                contentColor = Color.White
                            )
                        ) {
                            Icon(Icons.Filled.Add, contentDescription = "Add Year", modifier = Modifier.size(22.dp))
                        }
                    }
                }
            )
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        when {
            isLoading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
            years.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Surface,
                    border = BorderStroke(1.dp, Border),
                    modifier = Modifier.padding(24.dp).fillMaxWidth()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Primary.copy(alpha = 0.1f),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Box(Modifier.fillMaxSize(), Alignment.Center) {
                                Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(36.dp))
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Text("No Academic Years Configured", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(Modifier.height(6.dp))
                        Text("Set up your school's first academic session to manage classes, fees, and exams.", fontSize = 13.sp, color = TextSecondary, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        if (isAdmin) {
                            Spacer(Modifier.height(20.dp))
                            Button(
                                onClick = { showSheet = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
                            ) {
                                Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Add First Year", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(top = padding.calculateTopPadding() + 12.dp, start = 16.dp, end = 16.dp, bottom = 90.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(years, key = { it._id }) { year ->
                    AcademicYearCard(
                        year = year,
                        isSelectedView = year._id == selectedYearId,
                        isAdmin = isAdmin,
                        onSwitchView = { vm.selectView(year._id) },
                        onSetDefault = { vm.setActive(year._id) },
                        onDelete = { yearToDelete = year }
                    )
                }
            }
        }
    }

    if (showSheet) {
        CreateAcademicYearSheet(vm = vm, onDismiss = { showSheet = false })
    }

    yearToDelete?.let { targetYear ->
        AlertDialog(
            onDismissRequest = { yearToDelete = null },
            icon = {
                Surface(shape = CircleShape, color = Danger.copy(alpha = 0.12f), modifier = Modifier.size(48.dp)) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Icon(Icons.Filled.Delete, contentDescription = null, tint = Danger, modifier = Modifier.size(24.dp))
                    }
                }
            },
            title = { Text("Delete Academic Year", fontWeight = FontWeight.Bold, fontSize = 19.sp) },
            text = {
                Text(
                    "Are you sure you want to delete '${targetYear.name}'?\n\nDeletion will be blocked if any exams, diary entries, fee payments, or student rosters are linked to this academic year.",
                    fontSize = 14.sp, color = TextSecondary
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val id = targetYear._id
                        yearToDelete = null
                        vm.deleteYear(id)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Delete Year", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { yearToDelete = null },
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, Border)
                ) {
                    Text("Cancel", color = TextPrimary)
                }
            },
            containerColor = Surface,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

@Composable
private fun AcademicYearCard(
    year: AcademicYearDto,
    isSelectedView: Boolean,
    isAdmin: Boolean,
    onSwitchView: () -> Unit,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit
) {
    val borderColor = when {
        isSelectedView -> Success.copy(alpha = 0.5f)
        year.isActive -> Warning.copy(alpha = 0.4f)
        else -> Border
    }
    val bgColor = when {
        isSelectedView -> Success.copy(alpha = 0.03f)
        else -> Surface
    }

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(bgColor),
        elevation = CardDefaults.cardElevation(if (isSelectedView) 4.dp else 1.dp),
        border = BorderStroke(if (isSelectedView) 1.5.dp else 1.dp, borderColor)
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Calendar Avatar Icon
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isSelectedView) Success.copy(alpha = 0.12f) else Primary.copy(alpha = 0.08f),
                    border = BorderStroke(1.dp, if (isSelectedView) Success.copy(alpha = 0.3f) else Primary.copy(alpha = 0.15f)),
                    modifier = Modifier.size(44.dp)
                ) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Icon(
                            imageVector = if (isSelectedView) Icons.Filled.CheckCircle else Icons.Filled.DateRange,
                            contentDescription = null,
                            tint = if (isSelectedView) Success else Primary,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(year.name, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                    Spacer(Modifier.height(3.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.DateRange, contentDescription = null, tint = TextMuted, modifier = Modifier.size(13.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("${year.startDate}  →  ${year.endDate}", fontSize = 13.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                    }
                }

                if (year.isActive) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = WarningLight,
                        border = BorderStroke(1.dp, Warning.copy(alpha = 0.3f))
                    ) {
                        Row(
                            Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.Star, contentDescription = null, tint = Warning, modifier = Modifier.size(12.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("CURRENT", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Warning)
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = Border.copy(alpha = 0.6f))
            Spacer(Modifier.height(14.dp))

            // Action Buttons Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSelectedView) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = SuccessLight,
                        border = BorderStroke(1.dp, Success.copy(alpha = 0.3f))
                    ) {
                        Row(
                            Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.Check, contentDescription = null, tint = Success, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Active View", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Success)
                        }
                    }
                } else {
                    Button(
                        onClick = onSwitchView,
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Icon(Icons.Filled.DateRange, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Switch View", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                Spacer(Modifier.weight(1f))

                if (!year.isActive && isAdmin) {
                    OutlinedButton(
                        onClick = onSetDefault,
                        shape = RoundedCornerShape(20.dp),
                        border = BorderStroke(1.dp, Primary.copy(alpha = 0.4f)),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Primary, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Set Default", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Primary)
                    }

                    OutlinedButton(
                        onClick = onDelete,
                        shape = RoundedCornerShape(20.dp),
                        border = BorderStroke(1.dp, Danger.copy(alpha = 0.3f)),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Danger),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Icon(Icons.Filled.Delete, contentDescription = null, tint = Danger, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Delete", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Danger)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateAcademicYearSheet(vm: AcademicYearsViewModel, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val yearName by vm.yearName.collectAsState()
    val startDate by vm.startDate.collectAsState()
    val endDate by vm.endDate.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    fun showDatePicker(initial: Date, onPicked: (Date) -> Unit) {
        val cal = Calendar.getInstance().apply { time = initial }
        DatePickerDialog(context, { _, y, m, d ->
            onPicked(Calendar.getInstance().apply { set(y, m, d) }.time)
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        tonalElevation = 6.dp,
        dragHandle = {
            Box(
                modifier = Modifier.padding(vertical = 10.dp).width(40.dp).height(4.dp)
                    .clip(CircleShape).background(Border)
            )
        }
    ) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 28.dp)
        ) {
            Text("New Academic Year", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text("Configure a new academic session or term", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(20.dp))

            // Year Name Input
            Text("Year Name *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = yearName,
                onValueChange = { vm.yearName.value = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g. 2026 - 2027") },
                leadingIcon = { Icon(Icons.Filled.Edit, contentDescription = null, tint = TextMuted, modifier = Modifier.size(18.dp)) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Border,
                    focusedBorderColor = Primary,
                    focusedContainerColor = SurfaceLight
                )
            )
            Spacer(Modifier.height(18.dp))

            // Start & End Date Pickers
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Start Date *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = SurfaceLight,
                        border = BorderStroke(1.dp, Border),
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                            .clickable { showDatePicker(startDate) { vm.startDate.value = it } }
                    ) {
                        Row(
                            Modifier.padding(horizontal = 14.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(vm.formatDate(startDate), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text("End Date *", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.padding(bottom = 6.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = SurfaceLight,
                        border = BorderStroke(1.dp, Border),
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                            .clickable { showDatePicker(endDate) { vm.endDate.value = it } }
                    ) {
                        Row(
                            Modifier.padding(horizontal = 14.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.DateRange, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(vm.formatDate(endDate), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                }
            }
            Spacer(Modifier.height(26.dp))

            Button(
                onClick = { vm.createYear() },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(22.dp), Color.White, 2.5.dp)
                else {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Create Academic Year", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}
