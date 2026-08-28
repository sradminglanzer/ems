package com.srgs.ems.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srgs.ems.data.AcademicYearManager
import com.srgs.ems.data.api.AcademicYearDto
import com.srgs.ems.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademicYearPickerSheet(
    onDismiss: () -> Unit,
    onNavigateToSettings: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val selectedYear by AcademicYearManager.selectedYear.collectAsState()
    val availableYears by AcademicYearManager.availableYears.collectAsState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        tonalElevation = 6.dp,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(Border)
            )
        }
    ) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 28.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Select Academic Session",
                        fontSize = 19.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Switch active academic year context",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }
            }

            Spacer(Modifier.height(18.dp))

            if (availableYears.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Filled.DateRange,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(Modifier.height(10.dp))
                        Text(
                            text = "No academic years configured",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(availableYears, key = { it._id }) { year ->
                        val isSelected = selectedYear?._id == year._id
                        YearPickerItem(
                            year = year,
                            isSelected = isSelected,
                            onSelect = {
                                AcademicYearManager.setYear(year, context)
                                onDismiss()
                            }
                        )
                    }
                }
            }

            if (onNavigateToSettings != null) {
                Spacer(Modifier.height(16.dp))
                OutlinedButton(
                    onClick = {
                        onDismiss()
                        onNavigateToSettings()
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Border)
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp), tint = Primary)
                    Spacer(Modifier.width(8.dp))
                    Text("Manage All Academic Years", fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
        }
    }
}

@Composable
private fun YearPickerItem(
    year: AcademicYearDto,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isSelected) Primary.copy(alpha = 0.08f) else Background,
        border = BorderStroke(1.5.dp, if (isSelected) Primary else Border),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable { onSelect() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = CircleShape,
                    color = if (isSelected) Primary else TextMuted.copy(alpha = 0.2f),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Icon(
                            imageVector = if (isSelected) Icons.Filled.Check else Icons.Filled.DateRange,
                            contentDescription = null,
                            tint = if (isSelected) Color.White else TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(Modifier.width(12.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = year.name,
                            fontSize = 16.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                            color = if (isSelected) Primary else TextPrimary
                        )

                        if (year.isActive) {
                            Spacer(Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = WarningLight,
                                border = BorderStroke(1.dp, Warning.copy(alpha = 0.4f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Filled.Star, contentDescription = null, tint = Warning, modifier = Modifier.size(10.dp))
                                    Spacer(Modifier.width(3.dp))
                                    Text("DEFAULT", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Warning)
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "${year.startDate}  →  ${year.endDate}",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }

            if (isSelected) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Primary,
                    modifier = Modifier.padding(start = 8.dp)
                ) {
                    Text(
                        text = "ACTIVE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}
