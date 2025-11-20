import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./navbar/navbar";
import { InstancesPage } from "./pages/instances";

function Home() {
  return (
    <div className="pt-14">
      <h1 className="text-3xl font-bold underline">घर (Home Page)</h1>
    </div>
  );
}

function App() {
  return (
    <div className="pt-14">
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/instances" element={<InstancesPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
