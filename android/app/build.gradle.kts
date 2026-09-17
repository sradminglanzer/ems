plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

android {
    namespace = "com.srgs.ems"
    compileSdk = 35

    // Read active client config if switched for Android Studio IDE run
    val activeConfigFile = file("active-client.json")
    var defaultAppId     = "com.srgs.ems"
    var defaultAppName   = "EMS"
    var defaultApiUrl    = "https://smsapi.srglanzsoftware.com/api"
    var defaultEntityId  = ""
    var defaultVerCode   = 6
    var defaultVerName   = "1.0.6"

    if (activeConfigFile.exists()) {
        try {
            val json = groovy.json.JsonSlurper().parseText(activeConfigFile.readText()) as Map<*, *>
            defaultAppId     = (json["applicationId"] as? String) ?: defaultAppId
            defaultAppName   = (json["appName"] as? String) ?: defaultAppName
            defaultApiUrl    = (json["apiUrl"] as? String) ?: defaultApiUrl
            defaultEntityId  = (json["entityId"] as? String) ?: defaultEntityId
            defaultVerCode   = (json["versionCode"] as? Number)?.toInt() ?: defaultVerCode
            defaultVerName   = (json["versionName"] as? String) ?: defaultVerName
        } catch (_: Exception) {}
    }

    val clientAppId     = project.findProperty("clientAppId") as String? ?: defaultAppId
    val clientAppName   = project.findProperty("clientAppName") as String? ?: defaultAppName
    val clientApiUrl    = project.findProperty("clientApiUrl") as String? ?: defaultApiUrl
    val clientEntityId  = project.findProperty("clientEntityId") as String? ?: defaultEntityId
    val clientVerCode   = (project.findProperty("clientVersionCode") as String?)?.toIntOrNull() ?: defaultVerCode
    val clientVerName   = (project.findProperty("clientVersionName") as String?) ?: defaultVerName

    defaultConfig {
        applicationId = clientAppId
        minSdk = 26
        targetSdk = 36
        versionCode = clientVerCode
        versionName = clientVerName

        resValue("string", "app_name", clientAppName)
        buildConfigField("String", "API_URL", "\"$clientApiUrl\"")
        buildConfigField("String", "ENTITY_ID", "\"$clientEntityId\"")

        vectorDrawables { useSupportLibrary = true }
    }

    buildTypes {
        release {
            isMinifyEnabled   = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.14" }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.fragment:fragment-ktx:1.8.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.3")
    implementation("androidx.activity:activity-compose:1.9.0")

    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")
    implementation("androidx.compose.ui:ui-text-google-fonts")

    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Image loading
    implementation("io.coil-kt:coil-compose:2.6.0")

    // Local storage
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Firebase Cloud Messaging (Push Notifications)
    implementation("com.google.firebase:firebase-messaging:24.1.0")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.06.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
