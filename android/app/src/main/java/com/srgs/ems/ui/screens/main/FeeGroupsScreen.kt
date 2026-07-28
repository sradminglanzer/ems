package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.FeeGroupDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.FeeGroupsViewModel


/** Returns the entity-aware label for a "class" (singular) */
private fun classLabel(entityType: String?): String = when (entityType) {
    "gym"      -> "Plan"
    "coaching" -> "Batch"
    else       -> "Class"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeeGroupsScreen(vm: FeeGroupsViewModel = viewModel()) {
    val session = SessionManager.session
    val entityType = session?.entityType
    val label = classLabel(entityType)
    val labelPlural = when (entityType) {
        "gym"      -> "Plans"
        "coaching" -> "Batches"
        else       -> "Classes"
    }

    val groups by vm.groups.collectAsState()
    val isLoading by vm.isLoading.collectAsState()

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
        topBar = { EmsTopBar("Manage $labelPlural", scrollBehavior) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showSheet = true },
                containerColor = Primary, contentColor = Color.White, shape = CircleShape
            ) {
                Text("+", fontSize = 28.sp, modifier = Modifier.padding(bottom = 4.dp))
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        when {
            isLoading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
            groups.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📚", fontSize = 48.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("No $labelPlural configured yet.", color = TextSecondary)
                }
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(top = padding.calculateTopPadding() + 8.dp, start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Text("${groups.size} active $labelPlural", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 4.dp))
                }
                items(groups, key = { it._id }) { group -> FeeGroupCard(group = group) }
            }
        }

        // ── Add Group Bottom Sheet ────────────────────────────────────────────────
        if (showSheet) {
            AddFeeGroupSheet(vm = vm, label = label, onDismiss = { showSheet = false })
        }
    }
}

@Composable
private fun FeeGroupCard(group: FeeGroupDto) {
    val initials = group.name.take(2).uppercase()
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            // Gradient avatar
            Box(
                Modifier.size(44.dp).clip(CircleShape)
                    .background(Brush.linearGradient(listOf(Primary, PrimaryLight))),
                Alignment.Center
            ) {
                Text(initials, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(group.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                if (!group.description.isNullOrBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(group.description, fontSize = 13.sp, color = TextSecondary, maxLines = 1)
                }
            }
            Text("›", fontSize = 22.sp, color = Border, modifier = Modifier.padding(start = 8.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFeeGroupSheet(vm: FeeGroupsViewModel, label: String, onDismiss: () -> Unit) {
    val name by vm.name.collectAsState()
    val description by vm.description.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface, tonalElevation = 0.dp) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 32.dp)) {
            Text("Add New $label", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Text("Create a new student group", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(24.dp))

            Text("$label Name *", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = name, onValueChange = { vm.name.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. Grade 10A") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(16.dp))

            Text("Description (Optional)", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
            OutlinedTextField(
                value = description, onValueChange = { vm.description.value = it },
                modifier = Modifier.fillMaxWidth(), placeholder = { Text("e.g. Senior Year – Section A") },
                singleLine = true, shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Border, focusedBorderColor = Primary)
            )
            Spacer(Modifier.height(28.dp))

            Button(
                onClick = { vm.addGroup() },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                else Text("✓  Create $label", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
