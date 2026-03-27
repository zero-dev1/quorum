import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
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

export default function App() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([]);

  return (
    <BrowserRouter>
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh' }}>
        <TopBar />
        <WalletModal />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/poll/:id" element={<PollDetail />} />
          <Route path="/create" element={<CreatePoll />} />
          <Route path="/u/:name.qf" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    </BrowserRouter>
  );
}
