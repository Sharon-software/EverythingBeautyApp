import { useContext } from "react"
import {AuthProvider} from  "./AuthContext"
import {Navigate,NavLink} from "react-router-dom"


const PublicRoute = ({children}) => {
  const {isLoggedIn} = useContext(AuthProvider)

  return isLoggedIn ? children : <Navigate to="/Dashboard" />;
    

}

export default PublicRoute;