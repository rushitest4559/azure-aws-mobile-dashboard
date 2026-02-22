export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}/v2.0`,
        redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "localStorage", 
        storeAuthStateInCookie: true, 
    }
};

export const loginRequest = {
    scopes: ["User.Read"],
    extraScopesToConsent: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/user_impersonation`]
};

export const apiConfig = {
    functionEndpoint: import.meta.env.VITE_API_URL,
    scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/user_impersonation`]
};