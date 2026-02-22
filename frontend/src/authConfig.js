export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
        // Optional: Ensures the user stays logged in across multiple tabs
        navigateToLoginRequestUrl: true,
    },
    cache: {
        // localStorage is critical for mobile; sessionStorage dies on page redirects
        cacheLocation: "localStorage", 
        // true is required for Safari (iOS) and browsers with strict tracking prevention
        storeAuthStateInCookie: true, 
    }
};

export const loginRequest = {
    // Adding the API scope here ensures the user consents to both at once
    scopes: [
        "User.Read", 
        `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/user_impersonation`
    ]
};

export const apiConfig = {
    functionEndpoint: import.meta.env.VITE_API_URL,
    scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/user_impersonation`]
};