import { useContext } from "react"
import {AuthProvider} from  "./AuthContext"
import {Navigate} from "react-router-dom"


const PrivateRoute = ({children}) => {
  const {isLoggedIn} = useContext(AuthProvider)

  return isLoggedIn ? children : <Navigate to="/Login" />;
    

}

export default PrivateRoute;