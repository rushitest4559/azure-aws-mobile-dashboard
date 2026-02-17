import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "./main"; // You'll need to export msalInstance from main.jsx
import { apiConfig, loginRequest } from "./authConfig";

export const getAccessToken = async () => {
    try {
        // 1. Try to get the token silently (from cache)
        const response = await msalInstance.acquireTokenSilent({
            scopes: apiConfig.scopes,
            account: msalInstance.getActiveAccount()
        });
        return response.accessToken;
    } catch (error) {
        // 2. If silent fails (e.g., token expired), force a re-login
        if (error instanceof InteractionRequiredAuthError) {
            msalInstance.acquireTokenRedirect({ scopes: apiConfig.scopes });
        }
        throw error;
    }
};

// Example of how to use it with fetch
export const secureFetch = async (url, options = {}) => {
    const token = await getAccessToken();
    
    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    return fetch(url, { ...options, headers });
};