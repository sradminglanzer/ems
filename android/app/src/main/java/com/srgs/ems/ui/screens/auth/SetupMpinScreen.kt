package com.srgs.ems.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srgs.ems.data.repository.AuthRepository
import com.srgs.ems.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SetupMpinScreen(
    contactNumber: String,
    entityId: String,
    onNavigateToDashboard: () -> Unit
) {
    val context  = LocalContext.current
    val scope    = rememberCoroutineScope()
    val repo     = remember { AuthRepository(context) }

    var mpin        by remember { mutableStateOf("") }
    var confirmMpin by remember { mutableStateOf("") }
    var isLoading   by remember { mutableStateOf(false) }
    var errorMsg    by remember { mutableStateOf<String?>(null) }

    fun validate(): String? = when {
        mpin.length != 4    -> "MPIN must be exactly 4 digits."
        mpin != confirmMpin -> "MPINs do not match. Please re-enter."
        else                -> null
    }

    fun handleSetup() {
        val err = validate(); if (err != null) { errorMsg = err; return }
        scope.launch {
            isLoading = true; errorMsg = null
            when (val r = repo.setupMpin(contactNumber, mpin, entityId)) {
                is AuthRepository.AuthResult.Success  -> onNavigateToDashboard()
                is AuthRepository.AuthResult.Failure  -> errorMsg = r.message
                else -> {}
            }
            isLoading = false
        }
    }

    // Error dialog
    if (errorMsg != null) {
        AlertDialog(
            onDismissRequest = { errorMsg = null },
            title = { Text("Setup Error", fontWeight = FontWeight.Bold) },
            text  = { Text(errorMsg ?: "") },
            confirmButton = { TextButton(onClick = { errorMsg = null }) { Text("OK", color = Primary) } }
        )
    }

    Box(modifier = Modifier.fillMaxSize().background(Background)) {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Shield icon
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .shadow(8.dp, CircleShape)
                    .background(Surface, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Lock, null, Modifier.size(52.dp), tint = Primary)
            }

            Spacer(Modifier.height(28.dp))
            Text("Secure Your Account", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, letterSpacing = (-0.5).sp)
            Text("Set up a 4-digit MPIN for quick access", fontSize = 15.sp, color = TextSecondary, modifier = Modifier.padding(top = 6.dp))

            Spacer(Modifier.height(36.dp))

            Card(
                modifier  = Modifier.fillMaxWidth(),
                shape     = RoundedCornerShape(24.dp),
                colors    = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {

                    // New MPIN
                    Text("NEW MPIN", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 0.8.sp)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value         = mpin,
                        onValueChange = { if (it.length <= 4) mpin = it.filter(Char::isDigit) },
                        modifier      = Modifier.fillMaxWidth(),
                        placeholder   = { Text("Enter 4 digits", color = TextMuted) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        visualTransformation = PasswordVisualTransformation(),
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

                    // Confirm MPIN
                    Text("CONFIRM MPIN", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 0.8.sp)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value         = confirmMpin,
                        onValueChange = { if (it.length <= 4) confirmMpin = it.filter(Char::isDigit) },
                        modifier      = Modifier.fillMaxWidth(),
                        placeholder   = { Text("Re-enter 4-digit MPIN", color = TextMuted) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine    = true,
                        shape         = RoundedCornerShape(12.dp),
                        colors        = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor    = Border,
                            focusedBorderColor      = Primary,
                            unfocusedContainerColor = Background,
                            focusedContainerColor   = Background
                        )
                    )

                    Spacer(Modifier.height(24.dp))

                    Button(
                        onClick  = { handleSetup() },
                        enabled  = !isLoading,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape    = RoundedCornerShape(12.dp),
                        colors   = ButtonDefaults.buttonColors(
                            containerColor        = Primary,
                            disabledContainerColor = PrimaryLight
                        )
                    ) {
                        if (isLoading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        else Text("Complete Setup", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
