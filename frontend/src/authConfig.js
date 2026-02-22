export const msalConfig = {
    auth: {
        // Who is logging in? (The Frontend App)
        clientId: import.meta.env.VITE_AZURE_CLIENT_APP_ID, 
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}/v2.0`,
        redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "localStorage", 
        storeAuthStateInCookie: true, 
    }
};

// The Unique ID for your Backend API
const API_RESOURCE_ID = import.meta.env.VITE_AZURE_API_RESOURCE_ID;
const API_SCOPE = `api://${API_RESOURCE_ID}/user_impersonation`;

export const loginRequest = {
    // We request User.Read (from Graph) AND our custom API scope
    scopes: ["User.Read", API_SCOPE] 
};

export const apiConfig = {
    serverEndpoint: import.meta.env.VITE_API_URL,
    scopes: [API_SCOPE]
};