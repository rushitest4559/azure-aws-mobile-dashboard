import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();

import {Amplify} from 'aws-amplify'
import awsExports from './aws-exports.js'
import '@aws-amplify/ui-react/styles.css';

const awsExports = import.meta.env.VITE_AWS_EXPORTS 
  ? JSON.parse(import.meta.env.VITE_AWS_EXPORTS) 
  : null;

if (!awsExports) {
  console.error("Missing VITE_AWS_EXPORTS env var");
} else {
  Amplify.configure(awsExports);
}

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  // </StrictMode>,
)
