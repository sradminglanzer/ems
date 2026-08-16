package com.srgs.ems.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import com.srgs.ems.R

private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage   = "com.google.android.gms",
    certificates      = R.array.com_google_android_gms_fonts_certs
)

private val nunitoFont = GoogleFont("Nunito")

val NunitoFamily = FontFamily(
    Font(googleFont = nunitoFont, fontProvider = provider, weight = FontWeight.Normal),
    Font(googleFont = nunitoFont, fontProvider = provider, weight = FontWeight.Medium),
    Font(googleFont = nunitoFont, fontProvider = provider, weight = FontWeight.SemiBold),
    Font(googleFont = nunitoFont, fontProvider = provider, weight = FontWeight.Bold),
    Font(googleFont = nunitoFont, fontProvider = provider, weight = FontWeight.ExtraBold),
)

val Typography = Typography(
    displayLarge   = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.ExtraBold, fontSize = 34.sp),
    displayMedium  = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Bold,       fontSize = 28.sp),
    headlineLarge  = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Bold,       fontSize = 24.sp),
    headlineMedium = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Bold,       fontSize = 20.sp),
    titleLarge     = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Bold,       fontSize = 18.sp, letterSpacing = 0.1.sp),
    titleMedium    = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.SemiBold,   fontSize = 16.sp, letterSpacing = 0.1.sp),
    titleSmall     = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.SemiBold,   fontSize = 14.sp),
    bodyLarge      = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Normal,     fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium     = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Normal,     fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall      = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Normal,     fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge     = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.SemiBold,   fontSize = 14.sp, letterSpacing = 0.2.sp),
    labelMedium    = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Medium,     fontSize = 12.sp, letterSpacing = 0.4.sp),
    labelSmall     = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Medium,     fontSize = 11.sp, letterSpacing = 0.5.sp),
)
