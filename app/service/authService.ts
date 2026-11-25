
import apiClient from '../api/apiClient';
import API_ENDPOINTS from '../../constants/apiEndpoints';
import { tokenStorage } from './tokenStorage';

import type {
    RegisterRequest,
    RegisterResponse, LoginRequest, LoginResponse
} from '../../types/auth.types'

// REGISTER API
export const registerUser = async (
    payload: RegisterRequest,
): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        payload,
    );

    return response.data;
};

// LOGIN API
export const loginUser = async (
    payload: LoginRequest,
): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        payload,
    );

    const data = response.data;

    // Save JWT tokens securely
    await tokenStorage.saveTokens(data.access, data.refresh);

    return data;
};