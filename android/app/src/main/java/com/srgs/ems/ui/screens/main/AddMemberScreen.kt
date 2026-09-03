package com.srgs.ems.ui.screens.main

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.srgs.ems.data.SessionManager
import com.srgs.ems.data.repository.SaveResult
import com.srgs.ems.ui.components.EmsDateField
import com.srgs.ems.ui.theme.*
import com.srgs.ems.viewmodel.AddMemberViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMemberScreen(
    memberId: String?,
    feeGroupIdParam: String?,
    onBack: () -> Unit,
    vm: AddMemberViewModel = viewModel()
) {
    LaunchedEffect(memberId, feeGroupIdParam) { vm.initialize(memberId, feeGroupIdParam) }

    val session = SessionManager.session
    val isSchool = session?.isSchool ?: true
    val isPg = session?.isPg ?: false
    val isGym = session?.isGym ?: false
    val isBusiness = session?.isBusinessMode ?: true
    val isAdmin = session?.isAdmin ?: true

    val isSubmitting  by vm.isSubmitting.collectAsState()
    val isLoadingData by vm.isLoadingData.collectAsState()

    // ── Identity ──────────────────────────────────────────────────────────────
    val fName          by vm.firstName.collectAsState()
    val mName          by vm.middleName.collectAsState()
    val lName          by vm.lastName.collectAsState()
    val kId            by vm.knownId.collectAsState()
    val admNo          by vm.admissionNo.collectAsState()
    val rollNo         by vm.rollNo.collectAsState()
    val apaarId        by vm.apaarId.collectAsState()
    val aadhaarNo      by vm.aadhaarNo.collectAsState()
    val dob            by vm.dob.collectAsState()
    val gender         by vm.gender.collectAsState()
    val placeOfBirth   by vm.placeOfBirth.collectAsState()
    val nationality    by vm.nationality.collectAsState()
    val motherTongue   by vm.motherTongue.collectAsState()
    val religion       by vm.religion.collectAsState()
    val casteCat       by vm.casteCategory.collectAsState()
    val subCaste       by vm.subCaste.collectAsState()
    val bloodGroup     by vm.bloodGroup.collectAsState()
    val medNotes       by vm.medicalNotes.collectAsState()
    val idMarks        by vm.identificationMarks.collectAsState()

    // ── Contacts & Parents ────────────────────────────────────────────────────
    val contact        by vm.contact.collectAsState()
    val altContact     by vm.altContact.collectAsState()
    val email          by vm.email.collectAsState()
    val joiningDate    by vm.joiningDate.collectAsState()

    val fNameParent    by vm.fatherName.collectAsState()
    val fAadhaar       by vm.fatherAadhaar.collectAsState()
    val fQual          by vm.fatherQualification.collectAsState()
    val fOcc           by vm.fatherOccupation.collectAsState()
    val fIncome        by vm.fatherIncome.collectAsState()
    val fPhone         by vm.fatherPhone.collectAsState()
    val fEmail         by vm.fatherEmail.collectAsState()

    val mNameParent    by vm.motherName.collectAsState()
    val mAadhaar       by vm.motherAadhaar.collectAsState()
    val mQual          by vm.motherQualification.collectAsState()
    val mOcc           by vm.motherOccupation.collectAsState()
    val mIncome        by vm.motherIncome.collectAsState()
    val mPhone         by vm.motherPhone.collectAsState()
    val mEmail         by vm.motherEmail.collectAsState()

    val gName          by vm.guardianName.collectAsState()
    val gRel           by vm.guardianRelation.collectAsState()
    val gPhone         by vm.guardianPhone.collectAsState()
    val gAddr          by vm.guardianAddress.collectAsState()

    // ── Address ───────────────────────────────────────────────────────────────
    val presentAddr    by vm.presentAddress.collectAsState()
    val permAddr       by vm.permanentAddress.collectAsState()
    val sameAddr       by vm.sameAddress.collectAsState()
    val city           by vm.city.collectAsState()
    val district       by vm.district.collectAsState()
    val state          by vm.state.collectAsState()
    val pincode        by vm.pincode.collectAsState()
    val emName         by vm.emergencyName.collectAsState()
    val emPhone        by vm.emergencyPhone.collectAsState()
    val emRel          by vm.emergencyRelation.collectAsState()

    // ── Previous School ───────────────────────────────────────────────────────
    val prevSchool     by vm.previousSchoolName.collectAsState()
    val prevBoard      by vm.previousBoard.collectAsState()
    val prevClass      by vm.previousClassPassed.collectAsState()
    val tcNo           by vm.tcNumber.collectAsState()
    val tcDate         by vm.tcDate.collectAsState()
    val prevPct        by vm.previousPercentage.collectAsState()

    // ── Fees & Group ──────────────────────────────────────────────────────────
    val selGroupId     by vm.feeGroupId.collectAsState()
    val isGroupLocked  by vm.isGroupLocked.collectAsState()
    val primaryStructs by vm.primaryStructures.collectAsState()
    val addonStructs   by vm.addonStructures.collectAsState()
    val selectedPlanId by vm.selectedPlanId.collectAsState()
    val selAddons      by vm.addonFeeIds.collectAsState()
    val concType       by vm.concessionType.collectAsState()
    val concVal        by vm.concessionValue.collectAsState()
    val concReason     by vm.concessionReason.collectAsState()
    val documents      by vm.documents.collectAsState()

    var showAddDocDialog by remember { mutableStateOf(false) }
    var newDocTitle by remember { mutableStateOf("") }
    var newDocUrl by remember { mutableStateOf("") }
    var newDocType by remember { mutableStateOf("birth_certificate") }

    val posAmount        by vm.posAmount.collectAsState()
    val posPaymentMethod by vm.posPaymentMethod.collectAsState()
    val posPaymentDate   by vm.posPaymentDateStr.collectAsState()
    val posNextDateStr   by vm.posNextDateStr.collectAsState()

    val groups by vm.feeGroups.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        vm.saveResult.collect { res ->
            when (res) {
                is SaveResult.Success -> { snackbar.showSnackbar("✅ Student saved successfully!"); onBack() }
                is SaveResult.Error   -> snackbar.showSnackbar("❌ ${res.message}")
            }
        }
    }

    if (showAddDocDialog) {
        AlertDialog(
            onDismissRequest = { showAddDocDialog = false },
            title = { Text("Attach Document", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TField("Document Title *", newDocTitle, { newDocTitle = it }, "e.g. Birth Certificate")
                    TField("File / Document URL *", newDocUrl, { newDocUrl = it }, "https://... or S3 file link")

                    Text("Document Type", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            "birth_certificate" to "📜 Birth",
                            "aadhaar" to "🆔 Aadhaar",
                            "tc" to "🏫 TC",
                            "marksheet" to "📊 Marks",
                            "caste_certificate" to "🏷️ Caste",
                            "photo" to "📸 Photo",
                            "other" to "📄 Other"
                        ).forEach { (dType, dLabel) ->
                            val isSel = newDocType == dType
                            FilterChip(
                                selected = isSel,
                                onClick = { newDocType = dType },
                                label = { Text(dLabel, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Primary,
                                    selectedLabelColor = Color.White,
                                    containerColor = Surface,
                                    labelColor = TextPrimary
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newDocTitle.isNotBlank()) {
                            vm.addDocument(newDocTitle, newDocUrl, newDocType)
                            showAddDocDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Attach Document", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDocDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            }
        )
    }

    Scaffold(
        snackbarHost   = { SnackbarHost(snackbar) },
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (vm.isEditing) "Edit ${if (isSchool) "Student" else session?.labels?.memberSingle ?: "Member"}"
                        else "New ${if (isSchool) "Student Admission" else session?.labels?.memberSingle ?: "Member"}",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Primary)
            )
        }
    ) { pad ->
        if (isLoadingData) {
            Box(Modifier.fillMaxSize().padding(pad), Alignment.Center) {
                CircularProgressIndicator(color = Primary, strokeWidth = 3.dp)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(
                    top    = pad.calculateTopPadding() + 8.dp,
                    bottom = 80.dp
                ),
                modifier = Modifier.fillMaxSize()
            ) {
                // ══════════════════════════════════════════════════════════════
                //  SECTION 1: STUDENT IDENTITY & DEMOGRAPHICS
                // ══════════════════════════════════════════════════════════════
                item {
                    Card(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                        RoundedCornerShape(14.dp),
                        CardDefaults.cardColors(Surface),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🎓", fontSize = 18.sp)
                                Spacer(Modifier.width(8.dp))
                                Text(if (isSchool) "Student Identity & Demographics" else "Personal Details", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                            Spacer(Modifier.height(16.dp))

                            TField("First Name *", fName, { vm.firstName.value = it })
                            TField("Middle Name", mName, { vm.middleName.value = it })
                            TField("Last Name *", lName, { vm.lastName.value = it })

                            if (isSchool) {
                                TField("Admission / SR No *", admNo, { vm.admissionNo.value = it }, "e.g. ADM-2025-0042")
                                TField("Class Roll Number", rollNo, { vm.rollNo.value = it }, "e.g. 14")
                                TField("Student Aadhaar Card No (12 Digits)", aadhaarNo, { vm.aadhaarNo.value = it.filter { c -> c.isDigit() } }, "12-digit Aadhaar UID", KeyboardType.Number)
                                TField("APAAR / PEN / National Student ID", apaarId, { vm.apaarId.value = it })
                            } else {
                                TField(if (isBusiness) "${session?.labels?.memberSingle ?: "Tenant"} ID (Optional)" else "Roll / Student ID *", kId, { vm.knownId.value = it })
                            }

                            EmsDateField(
                                label         = "Date of Birth",
                                value         = dob,
                                onValueChange = { vm.dob.value = it },
                                modifier      = Modifier.padding(bottom = 12.dp)
                            )

                            if (isSchool) {
                                // Gender Selector
                                Text("Gender *", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf("male" to "👦 Male", "female" to "👧 Female", "other" to "Other").forEach { (gVal, gLabel) ->
                                        val isSel = gender == gVal
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { vm.gender.value = gVal },
                                            label = { Text(gLabel, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White, containerColor = Surface, labelColor = TextPrimary),
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(12.dp))

                                // Blood Group Selector
                                Text("Blood Group", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf("A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-").forEach { bg ->
                                        val isSel = bloodGroup == bg
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { vm.bloodGroup.value = bg },
                                            label = { Text(bg, fontSize = 11.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White, containerColor = Surface, labelColor = TextPrimary),
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(12.dp))

                                // Religion & Social Category
                                Text("Social Category / Caste", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf("General", "OBC", "SC", "ST", "EWS").forEach { cat ->
                                        val isSel = casteCat == cat
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { vm.casteCategory.value = cat },
                                            label = { Text(cat, fontSize = 11.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White, containerColor = Surface, labelColor = TextPrimary),
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(12.dp))

                                TField("Sub-Caste (Optional)", subCaste, { vm.subCaste.value = it })
                                TField("Religion", religion, { vm.religion.value = it }, "e.g. Hindu, Muslim, Christian, Sikh")
                                TField("Mother Tongue", motherTongue, { vm.motherTongue.value = it }, "e.g. Telugu, Hindi, Tamil, English")
                                TField("Place of Birth", placeOfBirth, { vm.placeOfBirth.value = it }, "City / Town, State")
                                TField("Identification Marks", idMarks, { vm.identificationMarks.value = it }, "e.g. Mole on left cheek")
                                TField("Medical Conditions / Allergies", medNotes, { vm.medicalNotes.value = it }, "e.g. Asthma, Peanut Allergy, None")
                            }

                            EmsDateField(
                                label         = if (isSchool) "Admission / Joining Date" else "Move-In Date",
                                value         = joiningDate,
                                onValueChange = { vm.joiningDate.value = it },
                                modifier      = Modifier.padding(bottom = 12.dp)
                            )
                        }
                    }
                }

                // ══════════════════════════════════════════════════════════════
                //  SECTION 2: PARENTS & GUARDIAN DETAILS
                // ══════════════════════════════════════════════════════════════
                if (isSchool) {
                    item {
                        Card(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                            RoundedCornerShape(14.dp),
                            CardDefaults.cardColors(Surface),
                            border = BorderStroke(1.dp, Border)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("👨‍👩‍👧", fontSize = 18.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("Parents & Guardian Details", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                }
                                Spacer(Modifier.height(16.dp))

                                // Father Details
                                Text("FATHER'S PROFILE", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
                                Spacer(Modifier.height(8.dp))
                                TField("Father's Full Name *", fNameParent, { vm.fatherName.value = it })
                                TField("Father's Mobile Number (WhatsApp) *", fPhone, { vm.fatherPhone.value = it }, "10-digit phone", KeyboardType.Phone)
                                TField("Father's Occupation", fOcc, { vm.fatherOccupation.value = it }, "e.g. Business, Engineer, Govt Service")
                                TField("Father's Qualification", fQual, { vm.fatherQualification.value = it }, "e.g. B.Tech, M.Com, 10th")
                                TField("Father's Aadhaar No", fAadhaar, { vm.fatherAadhaar.value = it.filter { c -> c.isDigit() } }, "12-digit Aadhaar", KeyboardType.Number)
                                TField("Father's Email", fEmail, { vm.fatherEmail.value = it }, "e.g. parent@gmail.com", KeyboardType.Email)
                                TField("Father's Annual Income", fIncome, { vm.fatherIncome.value = it }, "e.g. ₹5,00,000")

                                Spacer(Modifier.height(16.dp))
                                HorizontalDivider(color = Border.copy(alpha = 0.6f))
                                Spacer(Modifier.height(16.dp))

                                // Mother Details
                                Text("MOTHER'S PROFILE", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Primary, letterSpacing = 0.5.sp)
                                Spacer(Modifier.height(8.dp))
                                TField("Mother's Full Name", mNameParent, { vm.motherName.value = it })
                                TField("Mother's Mobile Number", mPhone, { vm.motherPhone.value = it }, "10-digit phone", KeyboardType.Phone)
                                TField("Mother's Occupation", mOcc, { vm.motherOccupation.value = it }, "e.g. Homemaker, Teacher, Doctor")
                                TField("Mother's Qualification", mQual, { vm.motherQualification.value = it })
                                TField("Mother's Aadhaar No", mAadhaar, { vm.motherAadhaar.value = it.filter { c -> c.isDigit() } }, "12-digit Aadhaar", KeyboardType.Number)
                                TField("Mother's Email", mEmail, { vm.motherEmail.value = it }, "", KeyboardType.Email)

                                Spacer(Modifier.height(16.dp))
                                HorizontalDivider(color = Border.copy(alpha = 0.6f))
                                Spacer(Modifier.height(16.dp))

                                // Local Guardian
                                Text("LOCAL GUARDIAN (OPTIONAL)", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.5.sp)
                                Spacer(Modifier.height(8.dp))
                                TField("Guardian Name", gName, { vm.guardianName.value = it })
                                TField("Relationship with Student", gRel, { vm.guardianRelation.value = it }, "e.g. Uncle, Grandfather")
                                TField("Guardian Phone Number", gPhone, { vm.guardianPhone.value = it }, "", KeyboardType.Phone)
                            }
                        }
                    }
                } else {
                    item {
                        Card(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                            RoundedCornerShape(14.dp),
                            CardDefaults.cardColors(Surface),
                            border = BorderStroke(1.dp, Border)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text("📞 Contact Details", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Spacer(Modifier.height(12.dp))
                                TField("Primary Phone Number *", contact, { vm.contact.value = it }, "", KeyboardType.Phone)
                                TField("Parent / Emergency Contact", altContact, { vm.altContact.value = it }, "", KeyboardType.Phone)
                                TField("Email Address", email, { vm.email.value = it }, "", KeyboardType.Email)
                            }
                        }
                    }
                }

                // ══════════════════════════════════════════════════════════════
                //  SECTION 3: ADDRESS & EMERGENCY CONTACTS
                // ══════════════════════════════════════════════════════════════
                item {
                    Card(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                        RoundedCornerShape(14.dp),
                        CardDefaults.cardColors(Surface),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🏠", fontSize = 18.sp)
                                Spacer(Modifier.width(8.dp))
                                Text("Address & Emergency Contacts", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                            Spacer(Modifier.height(16.dp))

                            TField("Present / Residential Address *", presentAddr, { vm.presentAddress.value = it }, "House No, Street, Landmark")
                            TField("City / Town", city, { vm.city.value = it })
                            TField("District", district, { vm.district.value = it })
                            TField("State", state, { vm.state.value = it }, "e.g. Telangana, Maharashtra, Karnataka")
                            TField("PIN Code", pincode, { vm.pincode.value = it.filter { c -> c.isDigit() } }, "6-digit PIN Code", KeyboardType.Number)

                            if (isSchool) {
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable { vm.sameAddress.value = !sameAddr },
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = sameAddr,
                                        onCheckedChange = { vm.sameAddress.value = it },
                                        colors = CheckboxDefaults.colors(checkedColor = Primary)
                                    )
                                    Text("Permanent Address is same as Present Address", fontSize = 13.sp, color = TextPrimary)
                                }

                                if (!sameAddr) {
                                    Spacer(Modifier.height(8.dp))
                                    TField("Permanent Address *", permAddr, { vm.permanentAddress.value = it })
                                }

                                Spacer(Modifier.height(12.dp))
                                HorizontalDivider(color = Border.copy(alpha = 0.6f))
                                Spacer(Modifier.height(12.dp))

                                Text("EMERGENCY CONTACT", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Danger, letterSpacing = 0.5.sp)
                                Spacer(Modifier.height(8.dp))
                                TField("Emergency Contact Name", emName, { vm.emergencyName.value = it })
                                TField("Emergency Phone Number", emPhone, { vm.emergencyPhone.value = it }, "", KeyboardType.Phone)
                                TField("Relationship with Student", emRel, { vm.emergencyRelation.value = it }, "e.g. Father, Mother, Neighbor")
                            }
                        }
                    }
                }

                // ══════════════════════════════════════════════════════════════
                //  SECTION 4: PREVIOUS ACADEMIC HISTORY
                // ══════════════════════════════════════════════════════════════
                if (isSchool) {
                    item {
                        Card(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                            RoundedCornerShape(14.dp),
                            CardDefaults.cardColors(Surface),
                            border = BorderStroke(1.dp, Border)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("🏫", fontSize = 18.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("Previous School & Transfer Certificate", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                }
                                Spacer(Modifier.height(16.dp))

                                TField("Previous School Name", prevSchool, { vm.previousSchoolName.value = it }, "e.g. St. Joseph High School")
                                TField("Affiliated Board", prevBoard, { vm.previousBoard.value = it }, "e.g. CBSE, ICSE, State Board")
                                TField("Last Class / Grade Passed", prevClass, { vm.previousClassPassed.value = it }, "e.g. Grade 9th")
                                TField("Previous Year Marks / Percentage", prevPct, { vm.previousPercentage.value = it }, "e.g. 88.5%")
                                TField("Transfer Certificate (TC) Number", tcNo, { vm.tcNumber.value = it })
                                EmsDateField(
                                    label         = "TC Issue Date",
                                    value         = tcDate,
                                    onValueChange = { vm.tcDate.value = it },
                                    modifier      = Modifier.padding(bottom = 12.dp)
                                )
                            }
                        }
                    }
                }

                // ══════════════════════════════════════════════════════════════
                //  SECTION 5: CLASS ALLOCATION & FEES
                // ══════════════════════════════════════════════════════════════
                item {
                    Card(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                        RoundedCornerShape(14.dp),
                        CardDefaults.cardColors(Surface),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("💰", fontSize = 18.sp)
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    if (isSchool) "Class & Fee Package" else "Room & Tariff Allocation",
                                    fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary
                                )
                            }
                            Spacer(Modifier.height(16.dp))

                            // Group / Class Selection
                            if (isGroupLocked) {
                                val lockedGroup = groups.firstOrNull { it._id == selGroupId }
                                val groupName = lockedGroup?.name ?: (if (isSchool) "Assigned Class" else "Assigned Room")
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Primary.copy(alpha = 0.08f),
                                    border = BorderStroke(1.dp, Primary.copy(alpha = 0.3f)),
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text("🔒", fontSize = 16.sp)
                                            Spacer(Modifier.width(8.dp))
                                            Column {
                                                Text(
                                                    if (isSchool) "Class: $groupName" else "Room: $groupName",
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = TextPrimary
                                                )
                                                Text(
                                                    if (isSchool) "Locked for this class enrollment" else "Locked for this room",
                                                    fontSize = 11.sp,
                                                    color = TextSecondary
                                                )
                                            }
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = Primary.copy(alpha = 0.15f)
                                        ) {
                                            Text(
                                                "LOCKED",
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Primary,
                                                letterSpacing = 0.5.sp
                                            )
                                        }
                                    }
                                }
                            } else {
                                Text(
                                    if (isSchool) "Assign Class / Section *" else "Select ${session?.labels?.groupSingle ?: "Room"}",
                                    fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary
                                )
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    groups.forEach { g ->
                                        val isSel = selGroupId == g._id
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { vm.onGroupSelected(g._id) },
                                            label = { Text(g.name, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White, containerColor = Surface, labelColor = TextPrimary),
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(14.dp))
                            }

                            // Primary Fee Package
                            val relevantStructs = if (!selGroupId.isNullOrEmpty()) {
                                val matching = primaryStructs.filter { it.feeGroupId == selGroupId || it.feeGroupIds?.contains(selGroupId) == true }
                                if (matching.isNotEmpty()) matching else primaryStructs
                            } else primaryStructs

                            if (relevantStructs.isNotEmpty()) {
                                Text("Primary Fee Package", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    relevantStructs.forEach { s ->
                                        val isSel = selectedPlanId == s._id
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { vm.selectPrimaryPlan(s._id) },
                                            label = { Text("${s.name} (₹${s.amount.toInt()})", fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White, containerColor = Surface, labelColor = TextPrimary),
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(14.dp))
                            }

                            // Concessions & Scholarships for School
                            if (isSchool && isAdmin) {
                                Text("Scholarship / Fee Concession", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf("none" to "None", "staff" to "Staff Child", "sibling" to "Sibling", "merit" to "Merit", "custom" to "Custom").forEach { (cKey, cLabel) ->
                                        val isSel = concType == cKey
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { vm.concessionType.value = cKey },
                                            label = { Text(cLabel, fontSize = 11.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Primary, selectedLabelColor = Color.White, containerColor = Surface, labelColor = TextPrimary),
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                    }
                                }
                                if (concType != "none") {
                                    Spacer(Modifier.height(8.dp))
                                    TField("Concession Amount / Percentage", concVal, { vm.concessionValue.value = it }, "e.g. 10 for 10% or 5000", KeyboardType.Number)
                                    TField("Concession Reason / Notes", concReason, { vm.concessionReason.value = it })
                                }
                            }
                        }
                    }
                }

                // ══════════════════════════════════════════════════════════════
                //  SECTION 6: DOCUMENTS & CERTIFICATES
                // ══════════════════════════════════════════════════════════════
                item {
                    Card(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                        RoundedCornerShape(14.dp),
                        CardDefaults.cardColors(Surface),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("📁", fontSize = 18.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("Documents & Certificates", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                }
                                TextButton(
                                    onClick = {
                                        newDocTitle = ""
                                        newDocUrl = ""
                                        newDocType = "birth_certificate"
                                        showAddDocDialog = true
                                    }
                                ) {
                                    Text("+ Add Doc", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Primary)
                                }
                            }
                            Spacer(Modifier.height(8.dp))

                            // Quick add chips
                            Text("QUICK ATTACH STANDARD DOCUMENTS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 0.5.sp)
                            Spacer(Modifier.height(6.dp))
                            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf(
                                    Triple("Birth Certificate", "birth_certificate", "📜 Birth Cert"),
                                    Triple("Student Aadhaar", "aadhaar", "🆔 Aadhaar Card"),
                                    Triple("Transfer Certificate (TC)", "tc", "🏫 Transfer Cert"),
                                    Triple("Previous Marksheet", "marksheet", "📊 Marksheet"),
                                    Triple("Father Aadhaar", "aadhaar", "👨 Father Aadhaar"),
                                    Triple("Mother Aadhaar", "aadhaar", "👩 Mother Aadhaar")
                                ).forEach { (title, type, label) ->
                                    val isAlreadyAdded = documents.any { it.title.equals(title, ignoreCase = true) }
                                    FilterChip(
                                        selected = isAlreadyAdded,
                                        onClick = {
                                            if (!isAlreadyAdded) {
                                                newDocTitle = title
                                                newDocType = type
                                                newDocUrl = ""
                                                showAddDocDialog = true
                                            }
                                        },
                                        label = { Text(if (isAlreadyAdded) "✓ $label" else "+ $label", fontSize = 11.sp) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = Success.copy(alpha = 0.15f),
                                            selectedLabelColor = Success,
                                            containerColor = Surface,
                                            labelColor = TextPrimary
                                        ),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                }
                            }
                            Spacer(Modifier.height(12.dp))

                            // Attached documents list
                            if (documents.isEmpty()) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Background.copy(alpha = 0.5f),
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                                ) {
                                    Box(Modifier.padding(16.dp), Alignment.Center) {
                                        Text("No documents attached yet (Optional)", fontSize = 12.sp, color = TextMuted)
                                    }
                                }
                            } else {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    documents.forEachIndexed { index, doc ->
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Background.copy(alpha = 0.6f),
                                            border = BorderStroke(1.dp, Border),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth().padding(10.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(Modifier.weight(1f)) {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text(
                                                            when (doc.docType) {
                                                                "birth_certificate" -> "📜"
                                                                "aadhaar"           -> "🆔"
                                                                "tc"                -> "🏫"
                                                                "marksheet"         -> "📊"
                                                                "photo"             -> "📸"
                                                                else                -> "📄"
                                                            },
                                                            fontSize = 14.sp
                                                        )
                                                        Spacer(Modifier.width(6.dp))
                                                        Text(doc.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                                    }
                                                    if (doc.url.isNotBlank()) {
                                                        Spacer(Modifier.height(2.dp))
                                                        Text(doc.url, fontSize = 11.sp, color = Primary, maxLines = 1)
                                                    }
                                                }
                                                IconButton(
                                                    onClick = { vm.removeDocument(index) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Text("✕", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Danger)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ══════════════════════════════════════════════════════════════
                //  SUBMIT BUTTON
                // ══════════════════════════════════════════════════════════════
                item {
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { vm.submit(session) },
                        enabled = !isSubmitting,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        if (isSubmitting) CircularProgressIndicator(Modifier.size(20.dp), Color.White, 2.dp)
                        else Text(
                            if (vm.isEditing) "✓  Update Student Profile" else "✓  Complete Admission",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text
) {
    Column(Modifier.padding(bottom = 12.dp)) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = if (placeholder.isNotEmpty()) { { Text(placeholder, fontSize = 13.sp, color = TextMuted) } } else null,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(10.dp),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Border,
                focusedBorderColor = Primary,
                unfocusedContainerColor = Background.copy(alpha = 0.5f),
                focusedContainerColor = Surface
            )
        )
    }
}
