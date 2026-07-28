package com.srgs.ems.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.srgs.ems.ui.screens.auth.LoginScreen
import com.srgs.ems.ui.screens.auth.SetupMpinScreen
import com.srgs.ems.ui.screens.main.MainAppScreen

sealed class Screen(val route: String) {
    object Login    : Screen("login")
    object SetupMpin: Screen("setup_mpin/{contactNumber}/{entityId}") {
        fun createRoute(c: String, e: String) = "setup_mpin/$c/$e"
    }
    object MainApp  : Screen("main_app")
}

@Composable
fun AppNavigation(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Login.route
) {
    NavHost(navController = navController, startDestination = startDestination, modifier = modifier) {

        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToDashboard = {
                    navController.navigate(Screen.MainApp.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToSetupMpin = { contactNumber, entityId ->
                    navController.navigate(Screen.SetupMpin.createRoute(contactNumber, entityId))
                }
            )
        }

        composable(
            route = Screen.SetupMpin.route,
            arguments = listOf(
                navArgument("contactNumber") { type = NavType.StringType },
                navArgument("entityId")     { type = NavType.StringType }
            )
        ) { back ->
            SetupMpinScreen(
                contactNumber         = back.arguments?.getString("contactNumber") ?: "",
                entityId              = back.arguments?.getString("entityId") ?: "",
                onNavigateToDashboard = {
                    navController.navigate(Screen.MainApp.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.MainApp.route) {
            MainAppScreen(
                onSignOut = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
