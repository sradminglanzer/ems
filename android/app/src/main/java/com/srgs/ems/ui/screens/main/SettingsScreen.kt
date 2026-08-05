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
