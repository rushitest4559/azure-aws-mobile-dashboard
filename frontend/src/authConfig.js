export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        // Added /v2.0 - essential for modern OIDC/Managed Identity flows
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}/v2.0`,
        redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "localStorage", 
        storeAuthStateInCookie: true, 
    }
};

// Best Practice: Keep login and API requests separate
export const loginRequest = {
    scopes: ["User.Read"], // Basic identity scope
    // Use this to pre-ask for permission without getting the token yet
    extraScopesToConsent: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/user_impersonation`]
};

export const apiRequest = {
    scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/user_impersonation`]
};

export const apiConfig = {
    functionEndpoint: import.meta.env.VITE_API_URL,
};