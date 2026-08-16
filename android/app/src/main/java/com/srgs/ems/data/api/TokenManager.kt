package com.srgs.ems.data.api

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.srgs.ems.data.models.UserSession
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "ems_auth")

class TokenManager private constructor(private val context: Context) {

    companion object {
        @Volatile private var instance: TokenManager? = null

        fun getInstance(context: Context): TokenManager =
            instance ?: synchronized(this) {
                instance ?: TokenManager(context.applicationContext).also { instance = it }
            }

        private val KEY_TOKEN   = stringPreferencesKey("token")
        private val KEY_CONTACT = stringPreferencesKey("contact")
        private val KEY_ENTITY  = stringPreferencesKey("entity_id")
        private val KEY_USER    = stringPreferencesKey("user_session")
    }

    private val gson = Gson()

    // Synchronous — called from OkHttp interceptor on background thread
    fun getToken(): String? = runBlocking {
        context.dataStore.data.map { it[KEY_TOKEN] }.first()
    }

    suspend fun saveToken(token: String)  = context.dataStore.edit { it[KEY_TOKEN] = token }
    suspend fun clearToken()              = context.dataStore.edit { it.remove(KEY_TOKEN) }

    suspend fun saveContact(v: String)    = context.dataStore.edit { it[KEY_CONTACT] = v }
    suspend fun getContact(): String?     = context.dataStore.data.map { it[KEY_CONTACT] }.first()

    suspend fun saveEntityId(v: String)   = context.dataStore.edit { it[KEY_ENTITY] = v }
    suspend fun getEntityId(): String?    = context.dataStore.data.map { it[KEY_ENTITY] }.first()

    suspend fun saveUser(dto: UserDto) {
        context.dataStore.edit { it[KEY_USER] = gson.toJson(dto) }
    }

    suspend fun getUser(): UserDto? {
        return try {
            val json = context.dataStore.data.map { it[KEY_USER] }.first()
                ?: return null
            gson.fromJson(json, UserDto::class.java)
        } catch (_: Exception) { null }
    }

    suspend fun clearAll() = context.dataStore.edit { it.clear() }
}

// ── Extension: UserDto → UserSession ─────────────────────────────────────────
fun UserDto.toUserSession() = UserSession(
    id           = _id,
    name         = name,
    phone        = phone,
    role         = role,
    entityId     = entityId,
    entityType   = entityType,
    entityName   = entityName,
    entityLogoUrl = entityLogoUrl
)
