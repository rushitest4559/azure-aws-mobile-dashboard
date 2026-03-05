import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MsalAuthenticationTemplate } from "@azure/msal-react";
import { InteractionType } from "@azure/msal-browser";

import { loginRequest } from "./authConfig";

import Navbar from "./navbar/navbar";
import Home from "./pages/home";
import S3Details from "./pages/S3Details";
import AzureFunctionsList from "./pages/AzureFunctionList";
import EksList from "./pages/EksList";
import AzureFunctionDetails from "./pages/AzureFunctionDetails";
import EksDetails from "./pages/EksDetalis";
import S3List from "./pages/S3List";
import AzureStorageList from "./pages/AzureStorageList";
import AzureStorageDetails from "./pages/AzureStorageDetails";
import EC2List from "./pages/Ec2List";
import EC2Details from "./pages/Ec2Details";
import RDSList from "./pages/RdsList";
import RDSDetails from "./pages/RdsDetails";

function App() {
  return (
    <MsalAuthenticationTemplate
      interactionType={InteractionType.Redirect}
      authenticationRequest={loginRequest}
      errorComponent={({ error }) => {
        if (error?.errorCode === "no_token_request_cache_error") {
          return <div className="p-4">Loading...</div>;
        }
        return (
          <div className="p-4 text-red-500">
            Authentication Error: {error?.message}
          </div>
        );
      }}
      loadingComponent={() => <div className="p-4">Loading session...</div>}
    >
      <Router>
        <Navbar />
        <div className="pt-14">
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Azure Storage Routes */}
            <Route path="/azure/storage/list" element={<AzureStorageList />} /> 
            <Route path="/azure/storage/details/:accountName" element={<AzureStorageDetails />} />
            
            {/* Azure Functions Routes */}
            <Route path="/azure/functions" element={<AzureFunctionsList />} />
            <Route path="/azure/functions/:functionName/*" element={<AzureFunctionDetails />} />
            
            {/* AWS S3 Routes */}
            <Route path="/aws/s3/list" element={<S3List />} />
            <Route path="/aws/s3/details/:bucketName" element={<S3Details />} />
            
            {/* AWS EC2 Routes */}
            <Route path="/aws/ec2/list" element={<EC2List />} />
            <Route path="/aws/ec2/details/:instanceId" element={<EC2Details />} />
            
            {/* AWS RDS Routes - NEW */}
            <Route path="/aws/rds/list" element={<RDSList />} />
            <Route path="/aws/rds/details/:instanceId/:region" element={<RDSDetails />} />
            
            {/* AWS EKS Routes */}
            <Route path="/aws/eks/list" element={<EksList />} />
            <Route path="/aws/eks/details/:clusterName/*" element={<EksDetails />} />
          </Routes>
        </div>
      </Router>
    </MsalAuthenticationTemplate>
  );
}

export default App;
