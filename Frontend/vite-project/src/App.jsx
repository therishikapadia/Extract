import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
// import OtherPage from './pages/OtherPage'; // add other pages here

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route path="/other" element={<OtherPage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
