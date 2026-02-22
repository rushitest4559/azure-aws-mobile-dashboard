import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './authConfig'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const msalInstance = new PublicClientApplication(msalConfig);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 365,
      retry: 1, 
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

/**
 * Initialize MSAL and Handle Redirects before Rendering
 */
const initializeApp = async () => {
  try {
    // Required for MSAL v3+
    await msalInstance.initialize();

    // Handle the redirect flow (Critical for Mobile)
    const response = await msalInstance.handleRedirectPromise();
    
    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
    } else {
      const currentAccounts = msalInstance.getAllAccounts();
      if (currentAccounts.length > 0) {
        msalInstance.setActiveAccount(currentAccounts[0]);
      }
    }

    // Event listener for login successes
    msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
        msalInstance.setActiveAccount(event.payload.account);
      }
    });

    // Render the app only after initialization is complete
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </MsalProvider>
      </StrictMode>
    );
  } catch (error) {
    console.error("Initialization Error:", error);
  }
};

initializeApp();