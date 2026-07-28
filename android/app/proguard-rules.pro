# Add project specific ProGuard rules here.
# By default, the flags in this file are applied to release builds.

# Keep Retrofit/Gson models
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.srgs.ems.data.** { *; }
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
