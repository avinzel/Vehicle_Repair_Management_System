import './App.css'
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router"
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { ServiceAdvisorPage } from './pages/ServiceAdvisorPage/ServiceAdvisorPage';
import { NotFoundPage } from './pages/NotFoundPage/NotFoundPage';
import {Loading} from "./components/Loading"
function App() {
  const [user, setUser] = useState([])
  const [loading, setLoading] = useState(true);
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

  // async function logout() {
  //   const response = await fetch("http://localhost:8000/api.php?action=logout&", {
  //     credentials: "include"
  //   });
  //   const data = await response.json();

  //   if (!response.ok) {
  //     alert(data.error);//taost notification
  //   } else {
  //     setUser(null)
  //     navigate("/")
  //   }
  //   setLoading(false);
  // }


  useEffect(() => {
    // login()
    // // logout();
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
        <Route path="/" element={<LoginPage authenticateUser={authenticateUser}/>} />
        <Route path="/register" element={<h1>Register</h1>} />

        <Route
          path="/service-advisor"
          element={
            user && Number(user.role_id) === 3 ? (
              <ServiceAdvisorPage user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
