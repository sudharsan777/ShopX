export interface RegisterRequest {
    username: string;
    email: string;
    password: string;

}
export interface RegisterResponse {
    access: string;
    refresh: string;
    [key: string]: unknown
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access: string;
    refresh: string;
}
export interface UserProfile {
    username: string;
    email?: string;
}
