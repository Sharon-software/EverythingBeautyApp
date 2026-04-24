import logo from './logo.svg';
import './App.css';
import React from 'react';
import './index.css';
import {Routes,Route, BrowserRouter} from 'react-router-dom'; 
import Navbar from './pages/Navbar';
import { FaHouseChimney } from "react-icons/fa6";
import Home from './pages/Home';
import Bookings from './pages/Bookings';
import Contact from './pages/Contact';
import About from './pages/About';
import {useNavigate} from 'react-router-dom';
import Register from './pages/Register';
import AuthContext from './AuthContext';
import Dashboard from './pages/dashboard/Dashboard';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import Login from './pages/Login';
import Book from  './pages/dashboard/Book';
import Regsalon from './pages/dashboard/Regsalon';
import BookService from './pages/dashboard/BookService';
import ViewMore from './pages/dashboard/ViewMore';
import DeclineModal from './pages/dashboard/DeclineModal';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  return (
    <>
    <AuthContext>
      
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/register" element={<Register />}></Route>
        
        <Route path="/Dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}/>
        <Route path="/login" element={<Login />}></Route>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/Book" element={<PrivateRoute><Book /></PrivateRoute>}></Route>
        <Route path="/Regsalon" element={<PrivateRoute><Regsalon /></PrivateRoute>}></Route>
        <Route path="/BookService" element={<PrivateRoute><BookService /></PrivateRoute>}></Route>
        <Route path ="/ViewMore" element={<ViewMore />}></Route>
        <Route path="/decline/:bookingId" element={<DeclineModal />} />
        
        <Route path="/bookings" element={<Bookings/> } />

        <Route path="/about" element={<PublicRoute><About /></PublicRoute>} />
        
        
      </Routes>
      
    </AuthContext>
    </>
  );
}

export default App;
