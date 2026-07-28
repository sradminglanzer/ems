package com.srgs.ems.data

import com.srgs.ems.data.models.UserSession

object SessionManager {
    private var _session: UserSession? = null

    val session: UserSession? get() = _session
    val isLoggedIn: Boolean  get() = _session != null

    fun setSession(session: UserSession) { _session = session }
    fun clearSession() { _session = null }
}
