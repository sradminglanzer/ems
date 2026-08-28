package com.srgs.ems.ui.screens.main

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.TokenManager
import com.srgs.ems.data.models.UserSession
import com.srgs.ems.ui.LocalDrawerState
import com.srgs.ems.ui.theme.*
import kotlinx.coroutines.launch

// ─── Route constants ────────────────────────────────────────────────────────────
object MainRoute {
    const val Dashboard     = "main_dashboard"
    const val Members       = "main_members"
    const val Attendance    = "main_attendance"
    const val Reports       = "main_reports"
    const val Expenses      = "main_expenses"
    const val Staff         = "main_staff"
    const val FeeGroups     = "main_fee_groups"
    const val FeeStructures = "main_fee_structures"
    const val Exams         = "main_exams"
    const val AcademicYears = "main_academic_years"
    const val Settings      = "main_settings"
}

private data class DrawerItem(
    val route: String,
    val title: String,
    val emoji: String,
    val visible: Boolean = true
)

private data class DrawerSection(
    val heading: String?,
    val items: List<DrawerItem>
)

// ─── MainAppScreen ─────────────────────────────────────────────────────────────
@Composable
fun MainAppScreen(onSignOut: () -> Unit) {
    val drawerState   = rememberDrawerState(DrawerValue.Closed)
    val navController = rememberNavController()
    val scope         = rememberCoroutineScope()
    val context       = LocalContext.current
    val session       = SessionManager.session

    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute  = currentEntry?.destination?.route ?: MainRoute.Dashboard

    val sections = buildDrawerSections(session)
    val allItems = sections.flatMap { it.items }

    LaunchedEffect(session) {
        if (session?.hasAcademicYears == true) {
            val repo = com.srgs.ems.data.repository.AcademicYearRepository(context)
            val years = repo.getYears()
            com.srgs.ems.data.AcademicYearManager.setAvailableYears(years, context)
        }
    }

    CompositionLocalProvider(LocalDrawerState provides drawerState) {
        ModalNavigationDrawer(
            drawerState   = drawerState,
            scrimColor    = Color.Black.copy(alpha = 0.4f),
            drawerContent = {
                ModalDrawerSheet(
                    modifier             = Modifier.width(300.dp),
                    drawerContainerColor = Background
                ) {
                    // ── Premium Header ─────────────────────────────────────────
                    DrawerHeader(session)

                    // ── Grouped Nav items ─────────────────────────────────────
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        sections.forEach { section ->
                            if (section.heading != null) {
                                item {
                                    Text(
                                        section.heading,
                                        modifier = Modifier.padding(start = 20.dp, top = 16.dp, bottom = 4.dp),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = TextMuted,
                                        letterSpacing = 1.2.sp
                                    )
                                }
                            }
                            items(section.items.filter { it.visible }) { item ->
                                val isSelected = currentRoute == item.route
                                val bgColor by animateColorAsState(
                                    if (isSelected) Primary.copy(alpha = 0.1f) else Color.Transparent,
                                    animationSpec = tween(200), label = "navItemBg"
                                )
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp, vertical = 2.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(bgColor)
                                        .clickable {
                                            scope.launch {
                                                drawerState.close()
                                                navController.navigate(item.route) {
                                                    popUpTo(MainRoute.Dashboard) { saveState = true }
                                                    launchSingleTop = true
                                                    restoreState    = true
                                                }
                                            }
                                        }
                                        .padding(horizontal = 12.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Accent left bar
                                    if (isSelected) {
                                        Box(
                                            Modifier
                                                .width(3.dp).height(22.dp)
                                                .clip(CircleShape)
                                                .background(Primary)
                                        )
                                        Spacer(Modifier.width(10.dp))
                                    } else {
                                        Spacer(Modifier.width(13.dp))
                                    }
                                    Text(item.emoji, fontSize = 18.sp)
                                    Spacer(Modifier.width(12.dp))
                                    Text(
                                        item.title,
                                        fontSize = 14.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                        color = if (isSelected) Primary else TextSecondary
                                    )
                                }
                            }
                        }
                    }

                    // ── Footer sign out ────────────────────────────────────────
                    HorizontalDivider(color = Border)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .clickable {
                                scope.launch {
                                    drawerState.close()
                                    TokenManager.getInstance(context).clearAll()
                                    SessionManager.clearSession()
                                    onSignOut()
                                }
                            }
                            .padding(horizontal = 20.dp, vertical = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier.size(36.dp).clip(CircleShape).background(DangerLight),
                            Alignment.Center
                        ) { Text("🚪", fontSize = 16.sp) }
                        Spacer(Modifier.width(14.dp))
                        Text("Sign Out", color = Danger, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        ) {
            MainNavHost(navController, onSignOut)
        }
    }
}

// ─── Premium Drawer Header ─────────────────────────────────────────────────────
@Composable
private fun DrawerHeader(session: UserSession?) {
    val gradient = remember {
        Brush.linearGradient(
            listOf(GradientStart, GradientEnd),
            start = Offset(0f, 0f),
            end   = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
        )
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(gradient)
            .statusBarsPadding()
            .padding(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 28.dp)
    ) {
        Column {
            // Avatar with glowing ring
            Box(contentAlignment = Alignment.Center) {
                // Glow ring
                Box(
                    Modifier.size(72.dp).clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f))
                )
                Box(
                    Modifier.size(64.dp).clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.25f)),
                    Alignment.Center
                ) {
                    Text(
                        text       = session?.initials ?: "?",
                        fontSize   = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color      = Color.White
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            Text(
                text       = session?.entityName ?: "EMS Portal",
                fontSize   = 18.sp,
                fontWeight = FontWeight.ExtraBold,
                color      = Color.White,
                letterSpacing = 0.3.sp
            )
            Text(
                text     = session?.name ?: "",
                fontSize = 13.sp,
                color    = Color.White.copy(alpha = 0.8f),
                modifier = Modifier.padding(top = 2.dp)
            )
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // Role badge
                Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.2f)) {
                    Text(
                        text     = (session?.role ?: "User").replaceFirstChar { it.uppercase() },
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White,
                        letterSpacing = 0.5.sp
                    )
                }
                // Entity type badge
                session?.entityType?.let { type ->
                    Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.12f)) {
                        Text(
                            text = type.replaceFirstChar { it.uppercase() },
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }
        }
    }
}

// ─── Build grouped drawer sections ─────────────────────────────────────────────
private fun buildDrawerSections(session: UserSession?): List<DrawerSection> {
    val labels = session?.labels ?: com.srgs.ems.data.api.EntityLabelsDto()
    val isBusiness = session?.isBusinessMode ?: true
    val isTeacher  = session?.isTeacher ?: false
    val isAdmin    = session?.isAdmin   ?: false

    return listOf(
        DrawerSection("OVERVIEW", listOf(
            DrawerItem(MainRoute.Dashboard,  "Dashboard",            "🏠"),
            DrawerItem(MainRoute.Attendance, "Daily Attendance",     "📋", visible = !isBusiness),
            DrawerItem(MainRoute.Members,    labels.memberPlural,    labels.memberIcon),
        )),
        DrawerSection("FINANCE", listOf(
            DrawerItem(MainRoute.Expenses,      "Expenses",          "💰", visible = !isTeacher),
            DrawerItem(MainRoute.FeeStructures, labels.planPlural,   "💳", visible = !isTeacher),
            DrawerItem(MainRoute.Reports,       "Business Reports",  "📊"),
        )),
        DrawerSection("MANAGEMENT", listOf(
            DrawerItem(MainRoute.Staff,         "Staff Management",  "👤", visible = !isTeacher),
            DrawerItem(MainRoute.FeeGroups,     labels.groupPlural,  labels.groupIcon, visible = !(session?.isGym ?: false)),
            DrawerItem(MainRoute.Exams,         "Exams & Results",   "📝", visible = !isBusiness),
            DrawerItem(MainRoute.AcademicYears, "Academic Years",    "📅", visible = !isBusiness && isAdmin),
            DrawerItem(MainRoute.Settings,      "Settings",          "⚙️",  visible = isAdmin),
        )),
    )
}

// ─── Inner NavHost ─────────────────────────────────────────────────────────────
@Composable
private fun MainNavHost(navController: NavHostController, onSignOut: () -> Unit) {
    NavHost(
        navController    = navController,
        startDestination = MainRoute.Dashboard,
        enterTransition    = { fadeIn(animationSpec  = tween(200)) },
        exitTransition     = { fadeOut(animationSpec = tween(150)) },
        popEnterTransition = { fadeIn(animationSpec  = tween(200)) },
        popExitTransition  = { fadeOut(animationSpec = tween(150)) }
    ) {
        composable(MainRoute.Dashboard) {
            DashboardScreen(
                onNavigateToMembers      = { navController.navigate(MainRoute.Members) },
                onNavigateToPlans        = { navController.navigate(MainRoute.FeeStructures) },
                onNavigateToReports      = { navController.navigate(MainRoute.Reports) },
                onNavigateToExpenses     = { navController.navigate(MainRoute.Expenses) },
                onNavigateToMemberDetail = { id -> navController.navigate("main_member_detail/$id") },
                onSignOut                = onSignOut
            )
        }
        composable(MainRoute.Members) {
            MembersScreen(
                onMemberClick = { id -> navController.navigate("main_member_detail/$id") },
                onAddMember   = { navController.navigate("main_add_member") }
            )
        }
        composable(
            route = "main_member_detail/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { back ->
            val id = back.arguments?.getString("id") ?: return@composable
            MemberDetailScreen(
                memberId = id,
                onBack   = { navController.popBackStack() },
                onEdit   = { navController.navigate("main_add_member?memberId=$it") }
            )
        }
        composable(
            route = "main_add_member?memberId={memberId}&feeGroupId={feeGroupId}",
            arguments = listOf(
                navArgument("memberId")  { type = NavType.StringType; nullable = true },
                navArgument("feeGroupId"){ type = NavType.StringType; nullable = true }
            )
        ) { back ->
            AddMemberScreen(
                memberId       = back.arguments?.getString("memberId"),
                feeGroupIdParam= back.arguments?.getString("feeGroupId"),
                onBack         = { navController.popBackStack() }
            )
        }
        composable(MainRoute.Attendance) { AttendanceScreen() }
        composable(MainRoute.Reports) {
            ReportsScreen(
                onNavigateToMemberDetail = { id -> navController.navigate("main_member_detail/$id") },
                onNavigateToMembers      = { navController.navigate(MainRoute.Members) },
                onNavigateToExpenses     = { navController.navigate(MainRoute.Expenses) }
            )
        }
        composable(MainRoute.Expenses) {
            ExpensesScreen(
                onAddExpense = { id ->
                    val route = if (id != null) "main_add_expense?expenseId=$id" else "main_add_expense"
                    navController.navigate(route)
                }
            )
        }
        composable(
            route = "main_add_expense?expenseId={expenseId}",
            arguments = listOf(navArgument("expenseId") { type = NavType.StringType; nullable = true })
        ) { back ->
            AddExpenseScreen(
                expenseId = back.arguments?.getString("expenseId"),
                onBack    = { navController.popBackStack() }
            )
        }
        composable(MainRoute.Staff)         { StaffScreen() }
        composable(MainRoute.FeeGroups)     { FeeGroupsScreen() }
        composable(MainRoute.FeeStructures) {
            FeeStructuresScreen(
                onNavigateToMembers = { navController.navigate(MainRoute.Members) }
            )
        }
        composable(MainRoute.Exams)         { ExamsScreen() }
        composable(MainRoute.AcademicYears) { AcademicYearsScreen() }
        composable(MainRoute.Settings)      { SettingsScreen() }
    }
}
