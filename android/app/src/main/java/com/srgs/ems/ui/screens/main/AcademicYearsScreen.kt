package com.srgs.ems.ui.screens.main

import android.app.DatePickerDialog
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
                        IconButton(onClick = { showSheet = true }) {
                            Text("+", fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Bold)
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
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📅", fontSize = 48.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("No academic years configured.", color = TextSecondary)
                    if (isAdmin) {
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = { showSheet = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("+ Add First Year", fontWeight = FontWeight.Bold, color = Color.White) }
                    }
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(top = padding.calculateTopPadding() + 8.dp, start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(years, key = { it._id }) { year ->
                    AcademicYearCard(
                        year = year,
                        isSelectedView = year._id == selectedYearId,
                        isAdmin = isAdmin,
                        onSwitchView = { vm.selectView(year._id) },
                        onSetDefault = { vm.setActive(year._id) }
                    )
                }
            }
        }
    }

    if (showSheet) {
        CreateAcademicYearSheet(vm = vm, onDismiss = { showSheet = false })
    }
}

@Composable
private fun AcademicYearCard(
    year: AcademicYearDto,
    isSelectedView: Boolean,
    isAdmin: Boolean,
    onSwitchView: () -> Unit,
    onSetDefault: () -> Unit
) {
    val borderColor = when {
        isSelectedView -> Success.copy(.5f)
        else -> Border
    }
    val bgColor = when {
        isSelectedView -> Success.copy(.04f)
        else -> Surface
    }

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(bgColor),
        elevation = CardDefaults.cardElevation(if (isSelectedView) 3.dp else 1.dp),
        border = BorderStroke(if (isSelectedView) 1.5.dp else 1.dp, borderColor)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Calendar icon
                Surface(shape = CircleShape, color = if (isSelectedView) Success.copy(.1f) else Background,
                    border = BorderStroke(1.dp, if (isSelectedView) Success.copy(.3f) else Border),
                    modifier = Modifier.size(40.dp)) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text(if (isSelectedView) "✅" else "📅", fontSize = 18.sp)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(year.name, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(2.dp))
                    Text("${year.startDate} – ${year.endDate}", fontSize = 13.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                }
                if (year.isActive) {
                    Surface(shape = RoundedCornerShape(10.dp), color = Warning.copy(.12f),
                        border = BorderStroke(1.dp, Warning.copy(.3f))) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Text("⭐", fontSize = 11.sp)
                            Spacer(Modifier.width(4.dp))
                            Text("CURRENT", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Warning)
                        }
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            HorizontalDivider(color = Border.copy(.5f))
            Spacer(Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (isSelectedView) {
                    Surface(shape = RoundedCornerShape(20.dp), color = Success.copy(.1f),
                        border = BorderStroke(1.dp, Success.copy(.3f))) {
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Text("✓ ", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Success)
                            Text("Active View", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Success)
                        }
                    }
                } else {
                    Surface(shape = RoundedCornerShape(20.dp), color = Primary,
                        modifier = Modifier.clip(RoundedCornerShape(20.dp)).clickable { onSwitchView() }) {
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Text("👁 ", fontSize = 13.sp, color = Color.White)
                            Text("Switch View", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }

                if (!year.isActive && isAdmin) {
                    Surface(shape = RoundedCornerShape(20.dp), color = Background,
                        border = BorderStroke(1.dp, Border),
                        modifier = Modifier.clip(RoundedCornerShape(20.dp)).clickable { onSetDefault() }) {
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Text("⭐ ", fontSize = 13.sp, color = Primary)
                            Text("Set Default", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Primary)
                        }
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

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface, tonalElevation = 0.dp) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
        ) {
            Text("New Academic Year", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text("Add a new session or term", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(24.dp))

            // Name
            Text("Year Name *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(value = yearName, onValueChange = { vm.yearName.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. 2026-2027") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary))
            Spacer(Modifier.height(20.dp))

            // Date pickers
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Start Date", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                    Surface(
                        shape = RoundedCornerShape(10.dp), color = Background,
                        border = BorderStroke(1.dp, Border),
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                            .clickable { showDatePicker(startDate) { vm.startDate.value = it } }
                    ) {
                        Text(vm.formatDate(startDate), modifier = Modifier.padding(14.dp),
                            fontSize = 15.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text("End Date", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                    Surface(
                        shape = RoundedCornerShape(10.dp), color = Background,
                        border = BorderStroke(1.dp, Border),
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                            .clickable { showDatePicker(endDate) { vm.endDate.value = it } }
                    ) {
                        Text(vm.formatDate(endDate), modifier = Modifier.padding(14.dp),
                            fontSize = 15.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                    }
                }
            }
            Spacer(Modifier.height(28.dp))

            Button(
                onClick = { vm.createYear() }, enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text("📅  Create Year", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
