package com.srgs.ems.data

import com.srgs.ems.data.api.ParentChildDto
import com.srgs.ems.data.models.UserSession

object SessionManager {
    private var _session: UserSession? = null
    private var _parentChildren: List<ParentChildDto> = emptyList()

    val session: UserSession? get() = _session
    val parentChildren: List<ParentChildDto> get() = _parentChildren
    val isLoggedIn: Boolean  get() = _session != null
    val isParent: Boolean get() = _session?.isParent == true

    fun setSession(session: UserSession) { _session = session }
    fun setParentChildren(children: List<ParentChildDto>) { _parentChildren = children }
    fun clearSession() { 
        _session = null 
        _parentChildren = emptyList()
    }
}

