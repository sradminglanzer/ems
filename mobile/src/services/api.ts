import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In development, this should be your local machine's IP address if testing on a physical device,
// or 10.0.2.2 if testing on an Android Emulator, or localhost for iOS simulator.
// TODO: Replace with environment variable strategy later
const API_URL = 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject the JWT token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
