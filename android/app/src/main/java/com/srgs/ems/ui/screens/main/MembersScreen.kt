package com.srgs.ems.ui.screens.main

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.api.MemberDto
import com.srgs.ems.ui.components.EmsTopBar
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.MembersViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MembersScreen(
    vm: MembersViewModel = viewModel(),
    onMemberClick: (String) -> Unit = {},
    onAddMember: () -> Unit = {}
) {
    val members      by vm.filteredMembers.collectAsState()
    val isLoading    by vm.isLoading.collectAsState()
    val searchQuery  by vm.searchQuery.collectAsState()
    val statusFilter by vm.statusFilter.collectAsState()
    val session       = SessionManager.session
    val labels       = session?.labels ?: com.srgs.ems.data.api.EntityLabelsDto()
    val isGym        = session?.isGym ?: false
    val memberLabel  = labels.memberPlural

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    LaunchedEffect(Unit) { vm.loadMembers() }

    Scaffold(
        containerColor = Background,
        topBar = { EmsTopBar(title = "$memberLabel Directory", scrollBehavior = scrollBehavior) },
        floatingActionButton = {
            if (session?.isAdmin == true) {
                FloatingActionButton(
                    onClick = onAddMember,
                    containerColor = Primary, contentColor = Color.White, shape = CircleShape,
                    elevation = FloatingActionButtonDefaults.elevation(6.dp)
                ) {
                    Text("+", fontSize = 28.sp, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(top = padding.calculateTopPadding())
        ) {
            // Sticky search + filters
            Column(Modifier.fillMaxWidth().background(Background)) {
                // Search bar
                Box(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)
                        .shadow(3.dp, RoundedCornerShape(28.dp), clip = false)
                        .clip(RoundedCornerShape(28.dp))
                        .background(Surface)
                ) {
                    OutlinedTextField(
                        value = searchQuery, onValueChange = { vm.searchQuery.value = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Search name, ID, phone…", color = TextMuted, fontSize = 14.sp) },
                        leadingIcon = { Text("🔍", fontSize = 16.sp, modifier = Modifier.padding(start = 4.dp)) },
                        trailingIcon = if (searchQuery.isNotEmpty()) ({
                            IconButton(onClick = { vm.searchQuery.value = "" }) {
                                Text("✕", fontSize = 13.sp, color = TextMuted)
                            }
                        }) else null,
                        singleLine = true, shape = RoundedCornerShape(28.dp),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.Transparent, focusedBorderColor = Primary.copy(.4f),
                            unfocusedContainerColor = Color.Transparent, focusedContainerColor = Color.Transparent
                        )
                    )
                }

                // Filter pills
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        "all"         to "All",
                        "due_soon"    to "⚠️ Due Soon",
                        "overdue"     to "🔴 Overdue",
                        "active"      to "● Active",
                        "on_hold"     to "⏸ On Hold",
                        "checked_out" to "🚪 Vacated"
                    ).forEach { (key, label) ->
                        AnimatedPill(label, key == statusFilter) { vm.statusFilter.value = key }
                    }
                }
                Spacer(Modifier.height(4.dp))
            }

            // List
            if (isLoading) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
                }
            } else {
                val context = androidx.compose.ui.platform.LocalContext.current
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    if (members.isEmpty()) {
                        item {
                            Column(
                                Modifier.fillParentMaxWidth().padding(top = 56.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Box(Modifier.size(90.dp).clip(CircleShape).background(Primary.copy(.08f)), Alignment.Center) {
                                    Text("👥", fontSize = 42.sp)
                                }
                                Spacer(Modifier.height(16.dp))
                                Text("No $memberLabel found", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("Try adjusting your search or filters", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
                            }
                        }
                    } else {
                        items(members, key = { it._id }) { m ->
                            ModernMemberCard(
                                m = m,
                                isGym = isGym,
                                onClick = { onMemberClick(m._id) },
                                onRemind = { sendRentReminderWhatsApp(context, session, m) }
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun sendRentReminderWhatsApp(
    context: android.content.Context,
    session: com.srgs.ems.data.models.UserSession?,
    member: MemberDto
) {
    val entityName = session?.name ?: "PG / Hostel"
    val roomOrPlan = if (session?.isBusinessMode == true && session?.isGym != true) {
        "Room: ${member.groupName ?: "Assigned Room"}"
    } else {
        "Plan: ${member.addonNames?.firstOrNull() ?: "Membership"}"
    }

    val dateFormatted = member.nextPaymentDate?.let { dStr ->
        for (fmt in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd")) {
            try {
                val d = java.text.SimpleDateFormat(fmt, java.util.Locale.US).parse(dStr)
                if (d != null) return@let java.text.SimpleDateFormat("dd MMM yyyy", java.util.Locale.ENGLISH).format(d)
            } catch (_: Exception) {}
        }
        dStr.take(10)
    } ?: "soon"

    val sb = StringBuilder()
    sb.append("👋 Hi *${member.firstName}*,\n\n")
    sb.append("Friendly reminder from *${entityName.trim()}* that your rent/fee for *${roomOrPlan}* is due on *${dateFormatted}*.\n\n")
    sb.append("Please clear the dues at your earliest convenience.\n")
    sb.append("Thank you! 🙏")

    val message = sb.toString()
    val phone = member.contact?.filter { it.isDigit() } ?: ""
    val formattedPhone = if (phone.length == 10) "91$phone" else phone

    val url = if (formattedPhone.isNotEmpty()) {
        "https://api.whatsapp.com/send?phone=$formattedPhone&text=${java.net.URLEncoder.encode(message, "UTF-8")}"
    } else {
        "https://api.whatsapp.com/send?text=${java.net.URLEncoder.encode(message, "UTF-8")}"
    }

    try {
        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
            data = android.net.Uri.parse(url)
        }
        context.startActivity(intent)
    } catch (_: Exception) {
        try {
            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(android.content.Intent.EXTRA_TEXT, message)
            }
            context.startActivity(android.content.Intent.createChooser(shareIntent, "Send Reminder"))
        } catch (_: Exception) {}
    }
}

@Composable
private fun AnimatedPill(label: String, active: Boolean, onClick: () -> Unit) {
    val bg   by animateColorAsState(if (active) Primary else Surface, tween(200), label = "pillBg")
    val text by animateColorAsState(if (active) Color.White else TextSecondary, tween(200), label = "pillText")
    Box(
        Modifier.shadow(if (active) 3.dp else 1.dp, RoundedCornerShape(20.dp), clip = false)
            .clip(RoundedCornerShape(20.dp)).background(bg).clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = text)
    }
}

@Composable
private fun ModernMemberCard(
    m: MemberDto,
    isGym: Boolean,
    onClick: () -> Unit,
    onRemind: () -> Unit = {}
) {
    val isOnHold     = m.status == "on_hold"
    val isCheckedOut = m.status == "checked_out"
    val brush        = remember(isOnHold, isCheckedOut) {
        if (isCheckedOut) Brush.linearGradient(listOf(Color(0xFF6B7280), Color(0xFF4B5563)))
        else if (isOnHold) Brush.linearGradient(listOf(Color(0xFFF97316), Color(0xFFF59E0B)))
        else              Brush.linearGradient(listOf(GradientStart, GradientEnd))
    }

    val (isOverdue, isDueSoon, formattedDate) = remember(m.nextPaymentDate, isCheckedOut) {
        if (isCheckedOut || m.nextPaymentDate.isNullOrEmpty()) {
            Triple(false, false, null)
        } else {
            var date: java.util.Date? = null
            for (fmt in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd")) {
                try { date = java.text.SimpleDateFormat(fmt, java.util.Locale.US).parse(m.nextPaymentDate); break } catch (_: Exception) {}
            }
            if (date == null) {
                Triple(false, false, null)
            } else {
                val todayCal = java.util.Calendar.getInstance().apply {
                    set(java.util.Calendar.HOUR_OF_DAY, 0); set(java.util.Calendar.MINUTE, 0); set(java.util.Calendar.SECOND, 0); set(java.util.Calendar.MILLISECOND, 0)
                }
                val today = todayCal.time
                val fiveDaysLater = java.util.Calendar.getInstance().apply {
                    time = today; add(java.util.Calendar.DAY_OF_YEAR, 5); set(java.util.Calendar.HOUR_OF_DAY, 23); set(java.util.Calendar.MINUTE, 59)
                }.time

                val overdue = date.before(today)
                val dueSoon = !overdue && !date.after(fiveDaysLater)
                val displayStr = java.text.SimpleDateFormat("dd MMM", java.util.Locale.ENGLISH).format(date)
                Triple(overdue, dueSoon, displayStr)
            }
        }
    }

    Box(
        Modifier.fillMaxWidth().shadow(3.dp, RoundedCornerShape(16.dp), clip = false)
            .clip(RoundedCornerShape(16.dp)).background(Surface).clickable(onClick = onClick)
    ) {
        Box(
            Modifier.width(4.dp).height(54.dp).align(Alignment.CenterStart)
                .background(if (isCheckedOut) Color(0xFF6B7280) else if (isOnHold) Warning else if (isOverdue) Danger else if (isDueSoon) Color(0xFFF59E0B) else Primary)
        )
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 14.dp, top = 12.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(46.dp).clip(CircleShape).background(brush), Alignment.Center) {
                Text(
                    "${m.firstName.firstOrNull()?.uppercaseChar() ?: ""}${m.lastName.firstOrNull()?.uppercaseChar() ?: ""}",
                    fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Color.White
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("${m.firstName} ${m.lastName}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.horizontalScroll(rememberScrollState())
                ) {
                    val groupText = if (isGym) m.addonNames?.joinToString(", ")?.ifEmpty { "No Plan" } ?: "No Plan"
                                    else m.groupName ?: "Unassigned"
                    Surface(shape = RoundedCornerShape(6.dp), color = if (groupText == "No Plan" || groupText == "Unassigned") SurfaceLight else Primary.copy(.08f)) {
                        Text(groupText, Modifier.padding(horizontal = 7.dp, vertical = 3.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold,
                            color = if (groupText == "No Plan" || groupText == "Unassigned") TextMuted else Primary)
                    }

                    if (isCheckedOut) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF3F4F6)) {
                            Text("🚪 Vacated", Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4B5563))
                        }
                    } else if (isOnHold) {
                        Surface(shape = RoundedCornerShape(6.dp), color = WarningLight) {
                            Text("⏸ Hold", Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Warning)
                        }
                    } else if (isOverdue && formattedDate != null) {
                        Surface(shape = RoundedCornerShape(6.dp), color = DangerLight) {
                            Text("🔴 Overdue ($formattedDate)", Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Danger)
                        }
                    } else if (isDueSoon && formattedDate != null) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFEF3C7)) {
                            Text("⚠️ Due $formattedDate", Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD97706))
                        }
                    }
                    m.knownId?.let { Text("#$it", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold) }
                }
            }

            // Quick reminder button for overdue / due soon members
            if (!isOnHold && !isCheckedOut && (isOverdue || isDueSoon)) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFF25D366).copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, Color(0xFF25D366).copy(alpha = 0.4f)),
                    modifier = Modifier.clickable(onClick = onRemind)
                ) {
                    Row(
                        Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("💬 Remind", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF128C7E))
                    }
                }
            } else {
                Text("›", fontSize = 24.sp, color = Border)
            }
        }
    }
}
