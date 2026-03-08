import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import CustomerPage from './pages/CustomerPage';
import HotelPage from './pages/HotelPage';
import NgoPage from './pages/NgoPage';

function App() {
  const location = useLocation();
  const hideNavRoutes = ['/hotel', '/customer'];
  const showGlobalNav = !hideNavRoutes.includes(location.pathname);

  return (
    <>
      {showGlobalNav ? <NavBar /> : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/hotel" element={<HotelPage />} />
        <Route path="/ngo" element={<NgoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
