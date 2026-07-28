package com.srgs.ems.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srgs.ems.ui.LocalDrawerState
import com.srgs.ems.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Reusable app top bar used by all main screens.
 * Uses enterAlwaysScrollBehavior — hides on scroll down, reappears on scroll up.
 * Title text is always white on a gradient background.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmsTopBar(
    title: String,
    scrollBehavior: TopAppBarScrollBehavior,
    actions: @Composable RowScope.() -> Unit = {}
) {
    val drawerState = LocalDrawerState.current
    val scope = rememberCoroutineScope()

    Box {
        // Gradient background layer
        Box(
            Modifier
                .matchParentSize()
                .background(
                    Brush.linearGradient(
                        listOf(GradientStart, GradientEnd),
                        start = Offset(0f, 0f),
                        end   = Offset(Float.POSITIVE_INFINITY, 0f)
                    )
                )
        )
        TopAppBar(
            title = {
                Text(
                    title,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    fontSize = 18.sp
                )
            },
            navigationIcon = {
                IconButton(onClick = { scope.launch { drawerState.open() } }) {
                    Text("☰", fontSize = 22.sp, color = Color.White)
                }
            },
            actions = actions,
            scrollBehavior = scrollBehavior,
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor           = Color.Transparent,
                scrolledContainerColor   = Color.Transparent,
                titleContentColor        = Color.White,
                navigationIconContentColor = Color.White,
                actionIconContentColor   = Color.White
            )
        )
    }
}

/**
 * A hero banner that sits as the first item in a LazyColumn.
 * Shows icon + title + subtitle — scrolls with content so the
 * screen feels expansive.
 */
@Composable
fun ScreenHeroBanner(
    emoji: String,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier
            .fillMaxWidth()
            .background(
                Brush.linearGradient(
                    listOf(GradientStart, GradientEnd),
                    start = Offset(0f, 0f),
                    end   = Offset(Float.POSITIVE_INFINITY, 0f)
                )
            )
            .padding(horizontal = 20.dp, vertical = 24.dp)
    ) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier.size(56.dp).clip(CircleShape)
                    .background(Color.White.copy(.2f)),
                Alignment.Center
            ) {
                Text(emoji, fontSize = 26.sp)
            }
            Spacer(Modifier.width(16.dp))
            Column {
                Text(
                    title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )
                Text(
                    subtitle,
                    fontSize = 13.sp,
                    color = Color.White.copy(.75f),
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
