package com.srgs.ems.data

/** In-memory store for the currently selected Academic Year ID. */
object AcademicYearManager {
    private var _selectedYearId: String? = null

    val selectedYearId: String? get() = _selectedYearId

    fun setYear(id: String?) { _selectedYearId = id }
    fun clear() { _selectedYearId = null }
}
