import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MsalAuthenticationTemplate } from "@azure/msal-react";
import { InteractionType } from "@azure/msal-browser";

import Navbar from "./navbar/navbar";
import Home from "./pages/home";
import StorageDashboard from "./pages/StorageDashboard";
import AzureDetails from "./pages/AzureDetails";
import S3Details from "./pages/S3Details";

function App() {
  // The loginRequest can be imported from your authConfig.js
  const authRequest = {
    scopes: ["User.Read"]
  };

  return (
    // This Template wraps your entire app. 
    // If not logged in, it triggers 'Redirect' automatically.
    <MsalAuthenticationTemplate 
      interactionType={InteractionType.Redirect} 
      authenticationRequest={authRequest}
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