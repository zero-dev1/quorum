import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/Toast';
import { Landing } from './pages/Landing';
import { Explore } from './pages/Explore';
import { PollDetail } from './pages/PollDetail';
import { CreatePoll } from './pages/CreatePoll';
import { Profile } from './pages/Profile';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';
import { COLORS } from './lib/constants';
import { useState } from 'react';

function App() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <Router>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.background,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TopBar />
        
        <main style={{ flex: 1 }}>
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
        </main>

        <Footer />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </Router>
  );
}

export default App;
