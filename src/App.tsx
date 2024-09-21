import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import Footer from "@/components/Footer";
import { Etherspot, Home, Wagmi } from "@/pages";
import YieldTrading from "@/components/YieldTrading";

function App() {
  return (
    <Router>
      <main className="min-h-screen flex flex-col justify-between">
        <Navbar />
        <Routes>
          <Route path="/" element={<YieldTrading />} />
          <Route path="/home" element={<Home />} />
          <Route path="/aa" element={<Etherspot />} />
          <Route path="/wagmi" element={<Wagmi />} />
          <Route path="/yield-trading" element={<YieldTrading />} />
        </Routes>
        <Footer />
        <Toaster />
      </main>
    </Router>
  );
}

export default App;
