import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "./main"; 
import { apiConfig, loginRequest } from "./authConfig";

export const getAccessToken = async () => {
    let account = msalInstance.getActiveAccount();

    if (!account) {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
            account = accounts[0];
        }
    }

    if (!account) {
        await msalInstance.loginRedirect(loginRequest);
        return null; 
    }

    try {
        const response = await msalInstance.acquireTokenSilent({
            scopes: apiConfig.scopes,
            account: account
        });
        return response.accessToken;
    } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
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
    
    if (!token) return;

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    return fetch(url, { ...options, headers });
};