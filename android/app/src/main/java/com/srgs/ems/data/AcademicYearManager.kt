package com.srgs.ems.data

import android.content.Context
import com.srgs.ems.data.api.AcademicYearDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Universal reactive manager for the active Academic Year session.
 * Emits updates to all observing ViewModels when the year changes.
 */
object AcademicYearManager {
    private const val PREFS_NAME = "ems_academic_year_prefs"
    private const val KEY_YEAR_ID = "selected_academic_year_id"

    private val _selectedYear = MutableStateFlow<AcademicYearDto?>(null)
    val selectedYear: StateFlow<AcademicYearDto?> = _selectedYear.asStateFlow()

    private val _availableYears = MutableStateFlow<List<AcademicYearDto>>(emptyList())
    val availableYears: StateFlow<List<AcademicYearDto>> = _availableYears.asStateFlow()

    val selectedYearId: String? get() = _selectedYear.value?._id

    fun initFromStorage(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedId = prefs.getString(KEY_YEAR_ID, null)
        if (savedId != null && _availableYears.value.isNotEmpty()) {
            val matched = _availableYears.value.firstOrNull { it._id == savedId }
            if (matched != null) {
                _selectedYear.value = matched
            }
        }
    }

    fun setAvailableYears(years: List<AcademicYearDto>, context: Context? = null) {
        _availableYears.value = years
        val currentId = _selectedYear.value?._id

        // Auto-select priority:
        // 1. Saved preference if exists
        val savedId = context?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)?.getString(KEY_YEAR_ID, null)
        val matchedSaved = if (savedId != null) years.firstOrNull { it._id == savedId } else null

        // 2. Currently selected if still valid
        val matchedCurrent = if (currentId != null) years.firstOrNull { it._id == currentId } else null

        // 3. Mark active year in database
        val activeYear = years.firstOrNull { it.isActive }

        // 4. First available
        val fallback = years.firstOrNull()

        val toSelect = matchedSaved ?: matchedCurrent ?: activeYear ?: fallback
        setYear(toSelect, context)
    }

    fun setYear(year: AcademicYearDto?, context: Context? = null) {
        _selectedYear.value = year
        if (context != null && year != null) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_YEAR_ID, year._id).apply()
        }
    }

    fun setYearById(id: String?, context: Context? = null) {
        val year = _availableYears.value.firstOrNull { it._id == id }
        if (year != null) {
            setYear(year, context)
        } else if (id == null) {
            setYear(null, context)
        }
    }

    fun clear(context: Context? = null) {
        _selectedYear.value = null
        _availableYears.value = emptyList()
        context?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)?.edit()?.remove(KEY_YEAR_ID)?.apply()
    }
}
