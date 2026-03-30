import './App.css'
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/account/LoginPage";
import RegisterPage from "./pages/account/RegisterPage";
import UserHomePage from "./pages/user/UserHomePage";
import NotFoundPage from "./pages/common/NotFoundPage";

function App() {

  return (
    <>
        <Routes>
            <Route path="/" element={<UserHomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    </>
  )
}

export default App
