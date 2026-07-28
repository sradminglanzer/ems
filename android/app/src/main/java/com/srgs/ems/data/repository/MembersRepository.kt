package com.srgs.ems.data.repository

import android.content.Context
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.MemberDto

class MembersRepository(context: Context) {
    private val api = ApiClient.getApiService(context)

    suspend fun getMembers(): List<MemberDto> {
        return try {
            val r = api.getMembers()
            if (r.isSuccessful) r.body() ?: emptyList() else emptyList()
        } catch (_: Exception) { emptyList() }
    }
}
