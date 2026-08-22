package com.srgs.ems.data.models

import com.srgs.ems.data.api.EntityLabelsDto

data class UserSession(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val role: String = "",              // "admin", "owner", "teacher", "staff"
    val entityId: String? = null,
    val entityType: String? = null,    // "gym", "school", "coaching", "pg", "hostel"
    val entityName: String? = null,
    val entityLogoUrl: String? = null,
    val labels: EntityLabelsDto = EntityLabelsDto()
) {
    val isGym: Boolean      get() = entityType == "gym"
    val isPg: Boolean       get() = entityType == "pg" || entityType == "hostel"
    val isBusinessMode: Boolean get() = labels.isBusinessMode || isGym || isPg
    val isAdmin: Boolean    get() = role == "admin" || role == "owner"
    val isTeacher: Boolean  get() = role == "teacher"
    val initials: String    get() = name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
}
