import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./navbar/navbar";

import Home from "./pages/home";
import EC2DashboardHub from "./pages/EC2/EC2Dashboard";

function App() {
  return (
    <div className="pt-14">
      <Router>
        <Navbar/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ec2" element={<EC2DashboardHub />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
