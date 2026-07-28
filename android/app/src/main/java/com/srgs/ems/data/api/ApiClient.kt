package com.srgs.ems.data.api

import android.content.Context
import com.srgs.ems.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    @Volatile private var apiService: ApiService? = null

    fun getApiService(context: Context): ApiService =
        apiService ?: synchronized(this) {
            apiService ?: build(context).also { apiService = it }
        }

    private fun build(context: Context): ApiService {
        // Use the shared singleton TokenManager so the interceptor always sees the latest token
        val tokenManager = TokenManager.getInstance(context)

        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                    else HttpLoggingInterceptor.Level.NONE
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl("${BuildConfig.API_URL}/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
