package com.srgs.ems.ui.screens.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srgs.ems.ui.theme.Background
import com.srgs.ems.ui.theme.TextMuted
import com.srgs.ems.ui.theme.TextSecondary

@Composable
fun PlaceholderScreen(title: String, emoji: String = "🚧") {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(emoji, fontSize = 56.sp)
            Spacer(Modifier.height(16.dp))
            Text(title, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(8.dp))
            Surface(
                shape  = RoundedCornerShape(20.dp),
                color  = Color(0xFF10B981).copy(alpha = 0.12f)
            ) {
                Text(
                    "Coming in Phase 3",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF059669)
                )
            }
            Spacer(Modifier.height(8.dp))
            Text("This section is under construction.", fontSize = 14.sp, color = TextSecondary)
        }
    }
}
