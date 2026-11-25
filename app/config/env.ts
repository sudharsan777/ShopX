const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is Missing')
}

export const env = {
    API_BASE_URL,
} as const;