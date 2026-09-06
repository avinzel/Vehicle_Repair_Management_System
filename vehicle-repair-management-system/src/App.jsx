import './App.css'
import { useEffect, useState } from "react";
import { Routes, Route, Navigate , useNavigate} from "react-router"
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { ServiceAdvisorPage } from './pages/ServiceAdvisorPage/ServiceAdvisorPage';
import { NotFoundPage } from './pages/NotFoundPage/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import { ManagerPage } from './pages/ManagerPage/ManagerPage';
import {MechanicPage} from "./pages/MechanicPage/MechanicPage"
import { CashierPage } from './pages/CashierPage/CashierPage';
import {Loading} from "./components/Loading"
import { AdminPage } from './pages/AdminPage/AdminPage';
function App() {
  const [user, setUser] = useState([])
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); 
  async function authenticateUser() {
    const response = await fetch("http://localhost:8000/api.php?action=check-auth", {
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
    // logout();
    authenticateUser();
  }, []);
  if (loading) {
    return (
      <Loading/>
    )
  }
  return (
    <>
      <Routes>
        <Route path="/register" element={<RegisterPage/>} />

        <Route path="/" element={
          <LoginPage authenticateUser={authenticateUser}/>
        }/>
        
        <Route
          path="/admin"
          element={
            user && Number(user.role_id) === 1 ? (
              <AdminPage user={user} />
            ) : (
              <Navigate to="*" replace />
            )
          } 
        />

        <Route
          path="/manager"
          element={
            user && Number(user.role_id) === 2 ? (
              <ManagerPage user={user} />
            ) : (
              <Navigate to="*" replace />
            )
          } 
        />

        <Route
          path="/service-advisor"
          element={
            user && Number(user.role_id) === 3 ? (
              <ServiceAdvisorPage user={user} />
            ) : (
              <Navigate to="*" replace />
            )
          } 
        />

        <Route
          path="/mechanic"
          element={
            user && Number(user.role_id) === 4 ? (
              <MechanicPage user={user} />
            ) : (
              <Navigate to="*" replace />
            )
          } 
        />

        <Route
          path="/cashier"
          element={
            user && Number(user.role_id) === 5 ? (
              <CashierPage user={user} />
            ) : (
              <Navigate to="*" replace />
            )
          } 
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
