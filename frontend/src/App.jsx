import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MsalAuthenticationTemplate } from "@azure/msal-react";
import { InteractionType } from "@azure/msal-browser";

// Import from your central config
import { loginRequest } from "./authConfig";

import Navbar from "./navbar/navbar";
import Home from "./pages/home";
import StorageDashboard from "./pages/StorageDashboard";
import AzureDetails from "./pages/AzureDetails";
import S3Details from "./pages/S3Details";

function App() {
  return (
    <MsalAuthenticationTemplate 
      interactionType={InteractionType.Redirect} 
      authenticationRequest={loginRequest}
      errorComponent={({error}) => (
        <div className="p-4 text-red-500">
          Authentication Error: {error?.message}. Please refresh the page.
        </div>
      )}
      loadingComponent={() => <div className="p-4">Loading session...</div>}
    >
      <div className="pt-14">
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/storage" element={<StorageDashboard />} />
            <Route path="/azure/details/:accountName" element={<AzureDetails />} />
            <Route path="/aws/details/:bucketName" element={<S3Details />} />
          </Routes>
        </Router>
      </div>
    </MsalAuthenticationTemplate>
  );
}

export default App;