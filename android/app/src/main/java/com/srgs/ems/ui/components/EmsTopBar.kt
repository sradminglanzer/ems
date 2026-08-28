package com.srgs.ems.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
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
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.SessionManager
import com.srgs.ems.ui.LocalDrawerState
import com.srgs.ems.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Reusable app top bar used by all main screens.
 * Uses enterAlwaysScrollBehavior — hides on scroll down, reappears on scroll up.
 * Includes universal Academic Year switcher for school tenants.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmsTopBar(
    title: String,
    scrollBehavior: TopAppBarScrollBehavior,
    showYearSwitcher: Boolean = true,
    actions: @Composable RowScope.() -> Unit = {}
) {
    val drawerState = LocalDrawerState.current
    val scope = rememberCoroutineScope()
    val session = SessionManager.session
    val hasAcademicYears = session?.hasAcademicYears ?: false
    val selectedYear by AcademicYearManager.selectedYear.collectAsState()
    var showYearSheet by remember { mutableStateOf(false) }

    // Hoist gradient out of recomposition
    val gradient = remember {
        Brush.linearGradient(
            listOf(GradientStart, GradientEnd),
            start = Offset(0f, 0f),
            end = Offset(Float.POSITIVE_INFINITY, 0f)
        )
    }

    Box {
        Box(Modifier.matchParentSize().background(gradient))
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
            actions = {
                if (hasAcademicYears && showYearSwitcher) {
                    val yearLabel = selectedYear?.name ?: "Select Year"
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color.White.copy(alpha = 0.18f),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .clickable { showYearSheet = true }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Filled.DateRange,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(Modifier.width(5.dp))
                            Text(
                                text = yearLabel,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = "▾",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    }
                    Spacer(Modifier.width(6.dp))
                }
                actions()
            },
            scrollBehavior = scrollBehavior,
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.Transparent,
                scrolledContainerColor = Color.Transparent,
                titleContentColor = Color.White,
                navigationIconContentColor = Color.White,
                actionIconContentColor = Color.White
            )
        )
    }

    if (showYearSheet) {
        AcademicYearPickerSheet(onDismiss = { showYearSheet = false })
    }
}

/**
 * A hero banner that sits as the first item in a LazyColumn.
 */
@Composable
fun ScreenHeroBanner(
    emoji: String,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    val gradient = remember {
        Brush.linearGradient(
            listOf(GradientStart, GradientEnd),
            start = Offset(0f, 0f),
            end = Offset(Float.POSITIVE_INFINITY, 0f)
        )
    }

    Box(
        modifier
            .fillMaxWidth()
            .background(gradient)
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
