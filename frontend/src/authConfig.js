export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

export const loginRequest = {
    scopes: ["User.Read"]
};

export const apiConfig = {
    functionEndpoint: import.meta.env.VITE_FUNCTION_ENDPOINT,
    // The scope usually looks like "api://<client-id>/user_impersonation"
    scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/user_impersonation`]
};