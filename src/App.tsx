import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TopBar } from './components/TopBar';
import { Footer } from './components/Footer';
import { WalletModal } from './components/WalletModal';
import { ToastContainer } from './components/Toast';
import { Landing } from './pages/Landing';
import { Explore } from './pages/Explore';
import { PollDetail } from './pages/PollDetail';
import { CreatePoll } from './pages/CreatePoll';
import { Profile } from './pages/Profile';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';
import { COLORS } from './lib/constants';

function AnimatedRoutes() {
  const location = useLocation();
  // Don't show TopBar on landing
  const isLanding = location.pathname === '/';

  return (
    <>
      {!isLanding && <TopBar />}
      <WalletModal />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/poll/:id" element={<PollDetail />} />
          <Route path="/create" element={<CreatePoll />} />
          <Route path="/u/:name" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh' }}>
        <AnimatedRoutes />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}
