package com.srgs.ems.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.srgs.ems.BuildConfig
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.EntityDto
import com.srgs.ems.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// ── UI States ──────────────────────────────────────────────────────────────────
sealed class LoginUiState {
    object Checking : LoginUiState()
    object EnterNumber : LoginUiState()
    data class EnterMpin(
        val contactNumber: String,
        val entityId: String? = null,
        val brandingName: String? = null,
        val brandingLogo: String? = null
    ) : LoginUiState()
    data class EntityPicker(val entities: List<EntityDto>, val contactNumber: String) : LoginUiState()
}

// ── One-time navigation events ─────────────────────────────────────────────────
sealed class AuthEvent {
    object NavigateToDashboard : AuthEvent()
    data class NavigateToSetupMpin(val contactNumber: String, val entityId: String) : AuthEvent()
}

// ── ViewModel ──────────────────────────────────────────────────────────────────
class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AuthRepository(application.applicationContext)

    private val _uiState     = MutableStateFlow<LoginUiState>(LoginUiState.Checking)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<AuthEvent>()
    val events: SharedFlow<AuthEvent> = _events.asSharedFlow()

    private val _isLoading    = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _shakeCount   = MutableStateFlow(0)
    val shakeCount: StateFlow<Int> = _shakeCount.asStateFlow()

    init { checkSavedSession() }

    // ── Cold-start: check if a valid token + saved user exist ─────────────────
    private fun checkSavedSession() {
        viewModelScope.launch {
            if (repository.hasToken()) {
                // Restore user session into in-memory SessionManager
                val savedUser = repository.getSavedUser()
                if (savedUser != null) SessionManager.setSession(savedUser)
                _events.emit(AuthEvent.NavigateToDashboard)
                return@launch
            }
            val savedContact = repository.getSavedContact()
            if (!savedContact.isNullOrEmpty()) {
                _uiState.value = LoginUiState.EnterMpin(
                    contactNumber = savedContact,
                    entityId      = repository.getSavedEntityId()
                )
            } else {
                _uiState.value = LoginUiState.EnterNumber
            }
        }
    }

    // ── Step 1: Submit phone number ───────────────────────────────────────────
    fun initiateLogin(contactNumber: String) {
        if (contactNumber.length < 10) { _errorMessage.value = "Please enter a valid 10-digit contact number"; return }
        viewModelScope.launch {
            _isLoading.value = true; _errorMessage.value = null
            val entityId = BuildConfig.ENTITY_ID.ifEmpty { null }
            when (val r = repository.initiateLogin(contactNumber, entityId)) {
                is AuthRepository.AuthResult.RequiresEntitySelection ->
                    _uiState.value = LoginUiState.EntityPicker(r.entities, r.contactNumber)
                is AuthRepository.AuthResult.RequiresSetup ->
                    _events.emit(AuthEvent.NavigateToSetupMpin(r.contactNumber, r.entityId))
                is AuthRepository.AuthResult.RequiresMpin ->
                    _uiState.value = LoginUiState.EnterMpin(r.contactNumber, r.entityId, r.brandingName, r.brandingLogo)
                is AuthRepository.AuthResult.Failure -> _errorMessage.value = r.message
                else -> {}
            }
            _isLoading.value = false
        }
    }

    // ── Step 1b: Select entity (VitaDesk shared mode) ─────────────────────────
    fun initiateLoginForEntity(contactNumber: String, entity: EntityDto) {
        viewModelScope.launch {
            _isLoading.value = true; _errorMessage.value = null
            when (val r = repository.initiateLogin(contactNumber, entity.id)) {
                is AuthRepository.AuthResult.RequiresSetup ->
                    _events.emit(AuthEvent.NavigateToSetupMpin(r.contactNumber, r.entityId))
                is AuthRepository.AuthResult.RequiresMpin ->
                    _uiState.value = LoginUiState.EnterMpin(contactNumber, entity.id, entity.name, entity.logoUrl)
                is AuthRepository.AuthResult.Failure -> _errorMessage.value = r.message
                else -> {}
            }
            _isLoading.value = false
        }
    }

    // ── Step 2: Verify MPIN ───────────────────────────────────────────────────
    fun verifyMpin(contactNumber: String, mpin: String, entityId: String?) {
        viewModelScope.launch {
            _isLoading.value = true
            when (val r = repository.verifyMpin(contactNumber, mpin, entityId)) {
                is AuthRepository.AuthResult.Success  -> _events.emit(AuthEvent.NavigateToDashboard)
                is AuthRepository.AuthResult.Failure  -> { _shakeCount.value++; _errorMessage.value = r.message }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    // ── Setup MPIN (first-time) ───────────────────────────────────────────────
    fun setupMpin(contactNumber: String, mpin: String, entityId: String) {
        viewModelScope.launch {
            _isLoading.value = true; _errorMessage.value = null
            when (val r = repository.setupMpin(contactNumber, mpin, entityId)) {
                is AuthRepository.AuthResult.Success -> _events.emit(AuthEvent.NavigateToDashboard)
                is AuthRepository.AuthResult.Failure -> _errorMessage.value = r.message
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun switchAccount() {
        viewModelScope.launch {
            repository.clearSession()
            _uiState.value = LoginUiState.EnterNumber
        }
    }

    fun dismissError() { _errorMessage.value = null }
}
