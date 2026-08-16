package com.srgs.ems.data.models

data class UserSession(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val role: String = "",              // "admin", "owner", "teacher", "staff"
    val entityId: String? = null,
    val entityType: String? = null,    // "gym", "school", "coaching"
    val entityName: String? = null,
    val entityLogoUrl: String? = null
) {
    val isGym: Boolean    get() = entityType == "gym"
    val isAdmin: Boolean  get() = role == "admin" || role == "owner"
    val isTeacher: Boolean get() = role == "teacher"
    val initials: String  get() = name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
}
