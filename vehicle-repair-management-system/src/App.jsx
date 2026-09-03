import './App.css'
import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router"
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { ServiceProviderPage } from './pages/ServiceProviderPage/ServiceProviderPage';
import { NotFoundPage } from './pages/NotFoundPage/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
function App() {
  const [user, setUser] = useState([])
  const [loading,setLoading] =useState(true);
  const navigate = useNavigate();
  async function authenticateUser() {
    const response = await fetch("http://localhost:8000/api.php?action=check-auth&", {
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      setUser(null);
    } else {
      setUser(data.user);
    }
    setLoading(false);
  }

  async function login() {
    const response = await fetch("http://localhost:8000/api.php?action=login&", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "username": "vinzel",
        "password": "123"
      }),
      credentials: "include"
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error);//toast notification
      return;
    }
    alert(data.message); //toast notification

    authenticateUser();
  }

  async function logout() {
    const response = await fetch("http://localhost:8000/api.php?action=logout&", {
      credentials: "include"
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error);//taost notification
    } else {
      setUser(null)
      navigate("/")
    }
    setLoading(false);
  }


  useEffect(() => {
    // login()
    // // logout();
    authenticateUser();
  }, []);
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<h1>Register</h1>} />

        <Route element={<ProtectedRoute user={user} loading={loading} allowedRole={3} />}>
          <Route path="/service-provider" element={<ServiceProviderPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
