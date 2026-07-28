package com.srgs.ems.ui.screens.auth

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.api.EntityDto
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.AuthEvent
import com.srgs.ems.viewmodel.AuthViewModel
import com.srgs.ems.viewmodel.LoginUiState
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    viewModel: AuthViewModel = viewModel(),
    onNavigateToDashboard: () -> Unit,
    onNavigateToSetupMpin: (contactNumber: String, entityId: String) -> Unit
) {
    val uiState     by viewModel.uiState.collectAsState()
    val isLoading   by viewModel.isLoading.collectAsState()
    val errorMsg    by viewModel.errorMessage.collectAsState()
    val shakeCount  by viewModel.shakeCount.collectAsState()
    val context     = LocalContext.current

    // One-time navigation events
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is AuthEvent.NavigateToDashboard    -> onNavigateToDashboard()
                is AuthEvent.NavigateToSetupMpin    -> onNavigateToSetupMpin(event.contactNumber, event.entityId)
            }
        }
    }

    // Error dialog
    if (errorMsg != null) {
        AlertDialog(
            onDismissRequest  = { viewModel.dismissError() },
            title  = { Text("Authentication Error", fontWeight = FontWeight.Bold) },
            text   = { Text(errorMsg ?: "") },
            confirmButton = {
                TextButton(onClick = { viewModel.dismissError() }) { Text("OK", color = Primary) }
            }
        )
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Background)
    ) {
        when (val state = uiState) {
            is LoginUiState.Checking -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = Primary)
            }
            is LoginUiState.EnterNumber -> {
                EnterNumberContent(isLoading = isLoading, onContinue = { viewModel.initiateLogin(it) })
            }
            is LoginUiState.EnterMpin -> {
                EnterMpinContent(
                    contactNumber = state.contactNumber,
                    entityId      = state.entityId,
                    isLoading     = isLoading,
                    shakeCount    = shakeCount,
                    onMpinComplete = { mpin -> viewModel.verifyMpin(state.contactNumber, mpin, state.entityId) },
                    onSwitchAccount = { viewModel.switchAccount() },
                    context = context
                )
            }
            is LoginUiState.EntityPicker -> {
                EnterNumberContent(isLoading = isLoading, onContinue = {})
                EntityPickerSheet(
                    entities        = state.entities,
                    onEntitySelected = { entity -> viewModel.initiateLoginForEntity(state.contactNumber, entity) },
                    onDismiss       = { viewModel.switchAccount() }
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTER NUMBER
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun EnterNumberContent(isLoading: Boolean, onContinue: (String) -> Unit) {
    var phone   by remember { mutableStateOf("") }
    val keyboard = LocalSoftwareKeyboardController.current

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Logo circle
        Box(
            modifier = Modifier
                .size(100.dp)
                .shadow(8.dp, CircleShape)
                .background(Surface, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Person, null, modifier = Modifier.size(52.dp), tint = Primary)
        }

        Spacer(Modifier.height(28.dp))
        Text("Welcome", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, letterSpacing = (-0.5).sp)
        Text("Enter your contact number to begin", fontSize = 15.sp, color = TextSecondary, modifier = Modifier.padding(top = 6.dp))
        Spacer(Modifier.height(36.dp))

        // Form card
        Card(
            modifier   = Modifier.fillMaxWidth(),
            shape      = RoundedCornerShape(24.dp),
            colors     = CardDefaults.cardColors(containerColor = Surface),
            elevation  = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("CONTACT NUMBER", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 0.8.sp)
                Spacer(Modifier.height(8.dp))

                OutlinedTextField(
                    value         = phone,
                    onValueChange = { if (it.length <= 10) phone = it.filter(Char::isDigit) },
                    modifier      = Modifier.fillMaxWidth(),
                    placeholder   = { Text("e.g. 9876543210", color = TextMuted) },
                    leadingIcon   = { Icon(Icons.Filled.Phone, null, tint = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    keyboardActions = KeyboardActions(onDone = { keyboard?.hide(); onContinue(phone) }),
                    singleLine    = true,
                    shape         = RoundedCornerShape(12.dp),
                    colors        = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor    = Border,
                        focusedBorderColor      = Primary,
                        unfocusedContainerColor = Background,
                        focusedContainerColor   = Background
                    )
                )

                Spacer(Modifier.height(20.dp))

                Button(
                    onClick  = { keyboard?.hide(); onContinue(phone) },
                    enabled  = !isLoading,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape    = RoundedCornerShape(12.dp),
                    colors   = ButtonDefaults.buttonColors(
                        containerColor        = Primary,
                        disabledContainerColor = PrimaryLight
                    )
                ) {
                    if (isLoading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTER MPIN (lock screen)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun EnterMpinContent(
    contactNumber: String,
    entityId: String?,
    isLoading: Boolean,
    shakeCount: Int,
    onMpinComplete: (String) -> Unit,
    onSwitchAccount: () -> Unit,
    context: Context
) {
    var mpin        by remember { mutableStateOf("") }
    val shakeOffset  = remember { Animatable(0f) }

    // Animated dot targets (using animateFloatAsState — handles rapid changes smoothly)
    val dot0 by animateFloatAsState(if (mpin.length > 0) 1f else 0f, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessHigh), label = "d0")
    val dot1 by animateFloatAsState(if (mpin.length > 1) 1f else 0f, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessHigh), label = "d1")
    val dot2 by animateFloatAsState(if (mpin.length > 2) 1f else 0f, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessHigh), label = "d2")
    val dot3 by animateFloatAsState(if (mpin.length > 3) 1f else 0f, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessHigh), label = "d3")
    val dotScales = listOf(dot0, dot1, dot2, dot3)

    // Shake animation + reset on wrong MPIN
    LaunchedEffect(shakeCount) {
        if (shakeCount > 0) {
            repeat(3) {
                shakeOffset.animateTo(12f, tween(50))
                shakeOffset.animateTo(-12f, tween(50))
            }
            shakeOffset.animateTo(0f, tween(50))
            mpin = ""
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(64.dp)
                .shadow(4.dp, CircleShape)
                .background(Surface, CircleShape)
                .border(1.dp, PrimaryLight.copy(alpha = 0.5f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Person, null, Modifier.size(32.dp), tint = Primary)
        }

        Spacer(Modifier.height(16.dp))
        Text("Welcome Back", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, letterSpacing = (-0.5).sp)
        Text(contactNumber, fontSize = 16.sp, color = TextSecondary, fontWeight = FontWeight.Medium, letterSpacing = 1.sp, modifier = Modifier.padding(top = 4.dp))

        Spacer(Modifier.height(44.dp))

        // MPIN dots
        Text("Enter 4-Digit MPIN", fontSize = 14.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(20.dp))

        Row(
            modifier = Modifier.offset(x = shakeOffset.value.dp),
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            repeat(4) { idx ->
                val scale  = dotScales[idx]
                val filled = mpin.length > idx
                Box(
                    modifier = Modifier.size(16.dp).border(2.dp, if (filled) Primary else Border, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Box(modifier = Modifier.size((10f * scale).dp).background(Primary, CircleShape))
                }
            }
        }

        // Loading indicator row
        Box(Modifier.height(40.dp), contentAlignment = Alignment.Center) {
            if (isLoading) CircularProgressIndicator(Modifier.size(24.dp), color = Primary, strokeWidth = 2.dp)
        }

        Spacer(Modifier.height(4.dp))

        // ── Keypad ──────────────────────────────────────────────────────────
        Column(
            verticalArrangement   = Arrangement.spacedBy(16.dp),
            horizontalAlignment   = Alignment.CenterHorizontally
        ) {
            listOf(listOf("1","2","3"), listOf("4","5","6"), listOf("7","8","9")).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    row.forEach { digit ->
                        NumKey(digit) {
                            if (!isLoading && mpin.length < 4) {
                                vibrate(context)
                                val next = mpin + digit
                                mpin = next
                                if (next.length == 4) onMpinComplete(next)
                            }
                        }
                    }
                }
            }
            // Bottom row: Switch Account | 0 | Backspace
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                FuncKey(onSwitchAccount) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Change", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Primary)
                        Text("User",   fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Primary)
                    }
                }
                NumKey("0") {
                    if (!isLoading && mpin.length < 4) {
                        vibrate(context)
                        val next = mpin + "0"
                        mpin = next
                        if (next.length == 4) onMpinComplete(next)
                    }
                }
                FuncKey(onClick = {
                    if (!isLoading && mpin.isNotEmpty()) {
                        vibrate(context)
                        mpin = mpin.dropLast(1)
                    }
                }) {
                    Text("⌫", fontSize = 26.sp, color = TextSecondary)
                }
            }
        }
    }
}

@Composable
private fun NumKey(label: String, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    Box(
        modifier = Modifier
            .size(70.dp)
            .shadow(if (isPressed) 0.dp else 2.dp, CircleShape)
            .background(if (isPressed) PrimaryLight.copy(alpha = 0.2f) else Surface, CircleShape)
            .border(1.5.dp, Border, CircleShape)
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(label, fontSize = 28.sp, fontWeight = FontWeight.W400, color = TextPrimary)
    }
}

@Composable
private fun FuncKey(onClick: () -> Unit, content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier = Modifier.size(70.dp).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY PICKER (VitaDesk / shared mode)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun EntityPickerSheet(
    entities: List<EntityDto>,
    onEntitySelected: (EntityDto) -> Unit,
    onDismiss: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .clickable(onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = false) {},     // absorb clicks — prevent dismiss bleed-through
            shape  = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            colors = CardDefaults.cardColors(containerColor = Surface)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Select Your Gym", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text("Your number is registered with multiple businesses", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
                Spacer(Modifier.height(16.dp))

                LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                    items(entities) { entity ->
                        Surface(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp).clickable { onEntitySelected(entity) },
                            shape    = RoundedCornerShape(12.dp),
                            color    = Background,
                            border   = BorderStroke(1.dp, Border)
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier.size(48.dp).background(PrimaryLight.copy(alpha = 0.2f), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("🏋️", fontSize = 22.sp)
                                }
                                Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                                    Text(entity.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                    Text((entity.type ?: "GYM").uppercase(), fontSize = 12.sp, color = TextSecondary)
                                }
                            }
                        }
                    }
                }

                TextButton(modifier = Modifier.fillMaxWidth(), onClick = onDismiss) {
                    Text("Cancel", color = TextSecondary, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Haptic feedback
// ─────────────────────────────────────────────────────────────────────────────

private fun vibrate(context: Context) {
    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(28, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            (context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
                .vibrate(VibrationEffect.createOneShot(28, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    } catch (_: Exception) { /* vibration is non-critical */ }
}
