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
    val isGym        = session?.isGym ?: false
    val memberLabel  = if (isGym) "Members" else "Students"

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

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
                    listOf("all" to "All", "active" to "● Active", "on_hold" to "⏸ On Hold").forEach { (key, label) ->
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
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp, bottom = 80.dp),
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
                            ModernMemberCard(m, isGym, onClick = { onMemberClick(m._id) })
                        }
                    }
                }
            }
        }
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
private fun ModernMemberCard(m: MemberDto, isGym: Boolean, onClick: () -> Unit) {
    val isOnHold = m.status == "on_hold"
    val brush    = if (isOnHold) Brush.linearGradient(listOf(Color(0xFFF97316), Color(0xFFF59E0B)))
                   else Brush.linearGradient(listOf(GradientStart, GradientEnd))
    Box(
        Modifier.fillMaxWidth().shadow(3.dp, RoundedCornerShape(16.dp), clip = false)
            .clip(RoundedCornerShape(16.dp)).background(Surface).clickable(onClick = onClick)
    ) {
        Box(Modifier.width(4.dp).height(54.dp).align(Alignment.CenterStart).background(if (isOnHold) Warning else Primary))
        Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 14.dp, top = 14.dp, bottom = 14.dp), verticalAlignment = Alignment.CenterVertically) {
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
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    val groupText = if (isGym) m.addonNames?.joinToString(", ")?.ifEmpty { "No Plan" } ?: "No Plan"
                                    else m.groupName ?: "Unassigned"
                    Surface(shape = RoundedCornerShape(6.dp), color = if (groupText == "No Plan" || groupText == "Unassigned") SurfaceLight else Primary.copy(.08f)) {
                        Text(groupText, Modifier.padding(horizontal = 7.dp, vertical = 3.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold,
                            color = if (groupText == "No Plan" || groupText == "Unassigned") TextMuted else Primary)
                    }
                    m.knownId?.let { Text("#$it", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold) }
                    if (isOnHold) {
                        Surface(shape = RoundedCornerShape(6.dp), color = WarningLight) {
                            Text("⏸ Hold", Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Warning)
                        }
                    }
                }
            }
            Text("›", fontSize = 24.sp, color = Border)
        }
    }
}
