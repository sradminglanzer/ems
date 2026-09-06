package com.srgs.ems.data.repository

import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.ApiClient
import com.srgs.ems.data.api.EntityDto
import com.srgs.ems.data.api.LoginApiRequest
import com.srgs.ems.data.api.ParentChildDto
import com.srgs.ems.data.api.TokenManager
import com.srgs.ems.data.api.UserDto
import com.srgs.ems.data.api.toUserSession
import com.srgs.ems.data.models.UserSession

class AuthRepository(context: Context) {

    private val api = ApiClient.getApiService(context)
    private val tokenManager = TokenManager.getInstance(context)

    // ── Result types ───────────────────────────────────────────────────────────
    sealed class AuthResult {
        data class RequiresEntitySelection(
            val entities: List<EntityDto>,
            val contactNumber: String
        ) : AuthResult()

        data class RequiresSetup(
            val contactNumber: String,
            val entityId: String
        ) : AuthResult()

        data class RequiresMpin(
            val contactNumber: String,
            val entityId: String?,
            val brandingName: String? = null,
            val brandingLogo: String? = null,
            val isParent: Boolean = false,
            val isFirstTime: Boolean = false,
            val defaultPinHint: String? = null,
            val hasParentProfile: Boolean = false,
            val children: List<ParentChildDto> = emptyList()
        ) : AuthResult()

        data class Success(val user: UserDto) : AuthResult()
        data class Failure(val message: String) : AuthResult()
    }

    // ── Session helpers ────────────────────────────────────────────────────────
    fun hasToken(): Boolean = !tokenManager.getToken().isNullOrEmpty()

    suspend fun getSavedContact(): String? = tokenManager.getContact()
    suspend fun getSavedEntityId(): String? = tokenManager.getEntityId()

    suspend fun getSavedUser(): UserSession? =
        tokenManager.getUser()?.toUserSession()

    suspend fun clearSession() {
        tokenManager.clearAll()
        SessionManager.clearSession()
    }

    // ── Phase 1: Send phone number → determine next step (Auto-detects Staff vs Parent)
    suspend fun initiateLogin(contactNumber: String, entityId: String?): AuthResult {
        return try {
            val response = api.login(LoginApiRequest(contactNumber = contactNumber, entityId = entityId))
            if (response.isSuccessful) {
                val body = response.body()!!
                when {
                    body.requiresEntitySelection && !body.entities.isNullOrEmpty() ->
                        AuthResult.RequiresEntitySelection(body.entities, contactNumber)
                    body.requiresSetup -> {
                        val id = body.entity?.id ?: entityId ?: ""
                        tokenManager.saveContact(contactNumber)
                        if (id.isNotEmpty()) tokenManager.saveEntityId(id)
                        AuthResult.RequiresSetup(contactNumber, id)
                    }
                    else -> {
                        val id = body.entity?.id ?: entityId
                        tokenManager.saveContact(contactNumber)
                        if (!id.isNullOrEmpty()) tokenManager.saveEntityId(id)
                        AuthResult.RequiresMpin(
                            contactNumber = contactNumber,
                            entityId = id,
                            brandingName = body.entity?.name,
                            brandingLogo = body.entity?.logoUrl,
                            isParent = body.isParent,
                            isFirstTime = body.isFirstTime,
                            defaultPinHint = body.defaultPinHint,
                            hasParentProfile = body.hasParentProfile,
                            children = body.children
                        )
                    }
                }
            } else {
                AuthResult.Failure(parseError(response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            AuthResult.Failure(e.message ?: "Connection error. Please check your internet.")
        }
    }

    // ── Phase 2: Verify MPIN / Security PIN ─────────────────────────────────────
    suspend fun verifyMpin(contactNumber: String, mpin: String, entityId: String?): AuthResult {
        return try {
            val response = api.login(LoginApiRequest(contactNumber, mpin = mpin, entityId = entityId))
            if (response.isSuccessful) {
                val body = response.body()!!
                if (body.token != null && body.user != null) {
                    tokenManager.saveToken(body.token)
                    tokenManager.saveUser(body.user)
                    SessionManager.setSession(body.user.toUserSession())
                    if (!body.children.isNullOrEmpty()) {
                        SessionManager.setParentChildren(body.children)
                    }
                    AuthResult.Success(body.user)
                } else AuthResult.Failure("Authentication failed. Please check your PIN.")
            } else AuthResult.Failure(parseError(response.errorBody()?.string()))
        } catch (e: Exception) {
            AuthResult.Failure(e.message ?: "Connection error.")
        }
    }

    // ── First-time: Setup MPIN ────────────────────────────────────────────────
    suspend fun setupMpin(contactNumber: String, mpin: String, entityId: String): AuthResult {
        return try {
            val response = api.login(LoginApiRequest(contactNumber, mpin = mpin, entityId = entityId.ifEmpty { null }))
            if (response.isSuccessful) {
                val body = response.body()!!
                if (body.token != null && body.user != null) {
                    tokenManager.saveToken(body.token)
                    tokenManager.saveContact(contactNumber)
                    if (entityId.isNotEmpty()) tokenManager.saveEntityId(entityId)
                    tokenManager.saveUser(body.user)
                    SessionManager.setSession(body.user.toUserSession())
                    if (!body.children.isNullOrEmpty()) {
                        SessionManager.setParentChildren(body.children)
                    }
                    AuthResult.Success(body.user)
                } else AuthResult.Failure("Setup failed. Unexpected response.")
            } else AuthResult.Failure(parseError(response.errorBody()?.string()))
        } catch (e: Exception) {
            AuthResult.Failure(e.message ?: "Connection error.")
        }
    }

    // ── Error parser ──────────────────────────────────────────────────────────
    private fun parseError(errorBody: String?): String {
        if (errorBody.isNullOrEmpty()) return "Invalid credentials or user not registered."
        return try {
            Gson().fromJson(errorBody, JsonObject::class.java)?.get("message")?.asString
                ?: "Invalid credentials or user not registered."
        } catch (_: Exception) {
            "Invalid credentials or user not registered."
        }
    }
}
