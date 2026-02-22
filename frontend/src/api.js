import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "./main";
import { apiConfig, loginRequest } from "./authConfig";

export const getAccessToken = async () => {
    let account = msalInstance.getActiveAccount();

    // 1. Fallback: If active account is null, check cache
    if (!account) {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
            account = accounts[0];
        }
    }

    // 2. If no account, trigger full login redirect
    if (!account) {
        console.warn("No active account found, redirecting to login...");
        // Use loginRequest (User.Read) for the initial login
        await msalInstance.loginRedirect(loginRequest);
        return null;
    }

    try {
        // 3. Try silent token acquisition for the API scope specifically
        // Change this line in getAccessToken.js
        const response = await msalInstance.acquireTokenSilent({
            scopes: apiRequest.scopes, // Use apiRequest.scopes instead of apiConfig.scopes
            account: account
        });
        return response.accessToken;
    } catch (error) {
        // 4. Handle expired tokens or interaction requirements
        if (error instanceof InteractionRequiredAuthError) {
            console.log("Token expired or interaction required, redirecting...");
            await msalInstance.acquireTokenRedirect({
                scopes: apiConfig.scopes,
                account: account
            });
        }
        throw error;
    }
};

/**
 * Wrapper for fetch that automatically injects the Bearer token
 */
export const secureFetch = async (url, options = {}) => {
    const token = await getAccessToken();

    // If the browser is redirecting for login, token will be null
    if (!token) return;

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    return fetch(url, { ...options, headers });
};