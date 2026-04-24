import React from 'react'
import { useState,useContext,createContext } from 'react'

const AuthProvider = createContext();

const AuthContext = ({children}) => {

    const [isLoggedIn,setIsLoggedIn]=useState(
        !!localStorage.getItem('accessToken')

    );
    const login = (token) => {
    localStorage.setItem('accessToken', token);
    setIsLoggedIn(true);
  };

 

  return (
    <AuthProvider.Provider value={{ isLoggedIn, setIsLoggedIn, login }}>
      {children}
    </AuthProvider.Provider>
  )
}

export default AuthContext
export {AuthProvider};