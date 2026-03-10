import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import DiscoveryFeed from './pages/DiscoveryFeed';
import FeedDetail from './pages/FeedDetail';
import Library from './pages/Library';
import Reader from './pages/Reader';
import AIChat from './pages/AIChat';
import Profile from './pages/Profile';

export default function App() {
  useEffect(() => {
    if (!localStorage.getItem('firstUseDate')) {
      localStorage.setItem('firstUseDate', new Date().toISOString());
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<DiscoveryFeed />} />
        <Route path="/feed/:id" element={<FeedDetail />} />
        <Route path="/library" element={<Library />} />
        <Route path="/reader/:id" element={<Reader />} />
        <Route path="/chat/:id" element={<AIChat />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}
