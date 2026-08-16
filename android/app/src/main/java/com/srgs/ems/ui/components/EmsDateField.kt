package com.srgs.ems.ui.components

import android.app.DatePickerDialog
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srgs.ems.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * A tappable date field that opens the system DatePickerDialog.
 * Displays the selected date formatted as "dd MMM yyyy" (e.g. "14 Aug 2025").
 * Internally stores and returns dates in "yyyy-MM-dd" format for API compatibility.
 *
 * @param label       Label shown above the field
 * @param value       Current date value in "yyyy-MM-dd" or empty string
 * @param onValueChange Called with new date in "yyyy-MM-dd" format
 * @param modifier    Optional modifier
 * @param placeholder Text shown when no date is selected (defaults to "Tap to select date")
 */
@Composable
fun EmsDateField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Tap to select date"
) {
    val context = LocalContext.current

    // Parse existing value into Calendar so the picker opens at the right month
    val initialCal = remember(value) {
        Calendar.getInstance().apply {
            if (value.isNotBlank()) {
                try {
                    val parsed = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(value)
                    if (parsed != null) time = parsed
                } catch (_: Exception) { /* ignore malformed dates */ }
            }
        }
    }

    // Display-friendly format
    val displayText = remember(value) {
        if (value.isBlank()) ""
        else {
            try {
                val d = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(value)
                if (d != null) SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(d)
                else value
            } catch (_: Exception) { value }
        }
    }

    fun openPicker() {
        DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                val picked = Calendar.getInstance().apply { set(year, month, dayOfMonth) }
                val formatted = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(picked.time)
                onValueChange(formatted)
            },
            initialCal.get(Calendar.YEAR),
            initialCal.get(Calendar.MONTH),
            initialCal.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    Column(modifier) {
        // Label
        Text(
            label,
            fontSize   = 12.sp,
            color      = TextSecondary,
            fontWeight = FontWeight.Medium,
            modifier   = Modifier.padding(bottom = 6.dp)
        )

        // Tappable field
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .clickable { openPicker() },
            shape  = RoundedCornerShape(8.dp),
            color  = Background,
            border = BorderStroke(1.dp, if (value.isNotBlank()) Primary.copy(.6f) else Border)
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 14.dp),
                verticalAlignment    = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text     = displayText.ifBlank { placeholder },
                    fontSize = 14.sp,
                    color    = if (displayText.isBlank()) TextMuted else TextPrimary,
                    fontWeight = if (displayText.isBlank()) FontWeight.Normal else FontWeight.Medium
                )
                Text("📅", fontSize = 16.sp)
            }
        }
    }
}
