package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.srgs.ems.data.SessionManager
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(vm: SettingsViewModel = viewModel()) {
    val session = SessionManager.session
    val logoUrl = session?.entityLogoUrl

    val sequence    by vm.sequence.collectAsState()
    val isSubmitting by vm.isSubmitting.collectAsState()

    val admPrefix       by vm.admPrefix.collectAsState()
    val admIncludeYear  by vm.admIncludeYear.collectAsState()
    val admStartingNo   by vm.admStartingNo.collectAsState()
    val admPadding      by vm.admPadding.collectAsState()
    val isSubmittingAdm by vm.isSubmittingAdm.collectAsState()

    val isSchool = session?.entityType == "school" || session?.isBusinessMode == false

    val snackbar      = remember { SnackbarHostState() }
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    LaunchedEffect(Unit) {
        vm.snackbarEvent.collect { msg -> snackbar.showSnackbar(msg) }
    }

    Scaffold(
        snackbarHost   = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar         = { EmsTopBar("Business Settings", scrollBehavior) }
    ) { pad ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(pad)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // ── Business Logo Card ─────────────────────────────────────────────
            SettingsCard(
                icon        = "🏢",
                iconBg      = SecondaryLight.copy(.3f),
                title       = "Business Logo",
                description = "Your logo appears on the login screen and navigation menu."
            ) {
                Column(
                    Modifier.padding(top = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        Modifier
                            .size(110.dp)
                            .clip(CircleShape)
                            .background(Background)
                            .border(2.dp, Border, CircleShape),
                        Alignment.Center
                    ) {
                        if (!logoUrl.isNullOrBlank()) {
                            AsyncImage(
                                model              = logoUrl,
                                contentDescription = "Business Logo",
                                modifier           = Modifier.size(106.dp).clip(CircleShape),
                                contentScale       = ContentScale.Crop
                            )
                        } else {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("🏢", fontSize = 36.sp)
                                Spacer(Modifier.height(4.dp))
                                Text("No logo set", fontSize = 11.sp, color = TextMuted)
                            }
                        }
                    }
                }
            }

            // ── Admission Number Sequence Configuration (School) ───────────────
            if (isSchool) {
                SettingsCard(
                    icon        = "🏷️",
                    iconBg      = PrimaryLight.copy(.25f),
                    title       = "Student Admission / SR Numbering",
                    description = "Configure the automatic sequence pattern for new student admissions."
                ) {
                    Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        // Live Preview Banner
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = PrimaryLight.copy(.2f),
                            border = BorderStroke(1.dp, Primary.copy(.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Next Sequence Preview:", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                                Text(vm.getAdmissionPreview(), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Primary)
                            }
                        }

                        OutlinedTextField(
                            value         = admPrefix,
                            onValueChange = { vm.admPrefix.value = it },
                            label         = { Text("Prefix (e.g. ADM-, DPS-, SCH-)") },
                            modifier      = Modifier.fillMaxWidth(),
                            singleLine    = true,
                            shape         = RoundedCornerShape(10.dp),
                            colors        = OutlinedTextFieldDefaults.colors(
                                unfocusedBorderColor = Border, focusedBorderColor = Primary
                            )
                        )

                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text("Include Current Year", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("Inserts year e.g. 2025- into the ID", fontSize = 11.sp, color = TextSecondary)
                            }
                            Switch(
                                checked = admIncludeYear,
                                onCheckedChange = { vm.admIncludeYear.value = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = Primary)
                            )
                        }

                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value         = admStartingNo,
                                onValueChange = { vm.admStartingNo.value = it.filter { c -> c.isDigit() } },
                                label         = { Text("Starting No") },
                                modifier      = Modifier.weight(1f),
                                singleLine    = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                placeholder   = { Text("1") },
                                shape         = RoundedCornerShape(10.dp),
                                colors        = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = Border, focusedBorderColor = Primary
                                )
                            )

                            OutlinedTextField(
                                value         = admPadding,
                                onValueChange = { vm.admPadding.value = it.filter { c -> c.isDigit() } },
                                label         = { Text("Digit Padding") },
                                modifier      = Modifier.weight(1f),
                                singleLine    = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                placeholder   = { Text("4 (e.g. 0001)") },
                                shape         = RoundedCornerShape(10.dp),
                                colors        = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = Border, focusedBorderColor = Primary
                                )
                            )
                        }

                        Button(
                            onClick  = { vm.updateAdmissionConfig() },
                            enabled  = !isSubmittingAdm,
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape    = RoundedCornerShape(10.dp),
                            colors   = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) {
                            if (isSubmittingAdm) {
                                CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Text("Save Admission Number Settings", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // ── Receipt Sequence Card ──────────────────────────────────────────
            SettingsCard(
                icon        = "🔢",
                iconBg      = PrimaryLight.copy(.2f),
                title       = "Invoice Sequence",
                description = "Set the next invoice/receipt number to be generated."
            ) {
                Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    OutlinedTextField(
                        value         = sequence,
                        onValueChange = { vm.sequence.value = it },
                        label         = { Text("Next Receipt Number") },
                        modifier      = Modifier.fillMaxWidth(),
                        singleLine    = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        placeholder   = { Text("e.g. 1001") },
                        shape         = RoundedCornerShape(10.dp),
                        colors        = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Border, focusedBorderColor = Primary
                        )
                    )

                    Button(
                        onClick  = { vm.updateSequence() },
                        enabled  = !isSubmitting,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape    = RoundedCornerShape(10.dp),
                        colors   = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text("Save Sequence Settings", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsCard(
    icon: String,
    iconBg: Color,
    title: String,
    description: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(16.dp),
        colors    = CardDefaults.cardColors(Surface),
        elevation = CardDefaults.cardElevation(2.dp),
        border    = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(44.dp).clip(CircleShape).background(iconBg),
                    Alignment.Center
                ) { Text(icon, fontSize = 22.sp) }

                Spacer(Modifier.width(14.dp))

                Column(Modifier.weight(1f)) {
                    Text(title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(description, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))
                }
            }
            content()
        }
    }
}
