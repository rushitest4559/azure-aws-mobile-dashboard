import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 1. MSAL Imports
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './authConfig'

// 2. React Query Imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

/**
 * MSAL Initialization
 */
export const msalInstance = new PublicClientApplication(msalConfig);

// CRITICAL FOR MOBILE: Handle the redirect response when the page reloads
msalInstance.handleRedirectPromise()
  .then((response) => {
    if (response && response.account) {
      msalInstance.setActiveAccount(response.account);
    } else {
      // Fallback: If no redirect response, check if we already have accounts in cache
      const currentAccounts = msalInstance.getAllAccounts();
      if (currentAccounts.length > 0 && !msalInstance.getActiveAccount()) {
        msalInstance.setActiveAccount(currentAccounts[0]);
      }
    }
  })
  .catch((error) => {
    console.error("MSAL Redirect Error:", error);
  });

// Listen for successful login events
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});

/**
 * React Query Setup
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 365,
      retry: 1, // Only retry once to avoid infinite loops on 401s
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 365,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MsalProvider>
  </StrictMode>
)