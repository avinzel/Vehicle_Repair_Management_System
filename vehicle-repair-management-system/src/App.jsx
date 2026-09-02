import './App.css'
import {useEffect, useState} from "react";
import {Routes, Route} from "react-router"
import {LoginPage} from "./pages/LoginPage/LoginPage";
function App() {
  const [user, setUser] = useState([])
  
  async function authenticateUser(){
    const response = await fetch("http://localhost:8000/api.php?action=check-auth&",{
      credentials:"include"
    });
    const data =  await response.json();

    if (!response.ok) {
      alert(data.error);//taost notification
    }
    setUser(data.user);
  }

    async function login(){
    const response = await fetch("http://localhost:8000/api.php?action=login&",{
      method : "POST",
      headers: {"Content-Type" : "application/json"},
      body: JSON.stringify({
          "username" : "ko",
          "password" : "5555"
      }),
      credentials : "include"
    });
     const data = await response.json();

    if(!response.ok){
      alert(data.error);//toast notification
      return;
    }
    alert(data.message); //toast notification
  }

  useEffect(()=>{
      authenticateUser();
  },[]);
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage/>}/>
        <Route path="/register" element={<h1>Register</h1>}/>
      </Routes>
    </>
  )
}

export default App
