import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "./main"; 
import { apiConfig, loginRequest } from "./authConfig";

export const getAccessToken = async () => {
    let account = msalInstance.getActiveAccount();

    // 1. Fallback: If active account is null, try to retrieve from cache
    if (!account) {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
            account = accounts[0];
        }
    }

    // 2. If still no account, mobile session is lost -> trigger login
    if (!account) {
        console.warn("No active account found, redirecting to login...");
        await msalInstance.loginRedirect(loginRequest);
        return null; 
    }

    try {
        // 3. Try silent token acquisition
        const response = await msalInstance.acquireTokenSilent({
            scopes: apiConfig.scopes,
            account: account
        });
        return response.accessToken;
    } catch (error) {
        // 4. Handle token expiration or interaction requirements
        if (error instanceof InteractionRequiredAuthError) {
            console.log("Interaction required, redirecting...");
            await msalInstance.acquireTokenRedirect({ 
                scopes: apiConfig.scopes,
                account: account 
            });
        }
        throw error;
    }
};

export const secureFetch = async (url, options = {}) => {
    const token = await getAccessToken();
    
    // If redirecting, token will be null; stop execution
    if (!token) return;

    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    return fetch(url, { ...options, headers });
};