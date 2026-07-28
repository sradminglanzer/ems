package com.srgs.ems.ui

import androidx.compose.material3.DrawerState
import androidx.compose.runtime.compositionLocalOf

/** Provides the [DrawerState] to any child composable without prop drilling. */
val LocalDrawerState = compositionLocalOf<DrawerState> {
    error("No DrawerState provided — wrap with MainAppScreen")
}
