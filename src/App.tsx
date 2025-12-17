import { Routes, Route } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import Home from './pages/Home';
import Platform from './pages/Platform';
import Status from './pages/Status';

const App = () => {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/status" element={<Status />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
