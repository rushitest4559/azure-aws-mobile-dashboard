import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./navbar/navbar";
import { InstancesPage } from "./pages/instances";
import Home from "./pages/home";

function App() {
  return (
    <div className="pt-14">
      <Router>
        <Navbar/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/instances" element={<InstancesPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
