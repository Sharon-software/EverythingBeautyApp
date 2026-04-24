import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "../../Axiosinstance";
import { AuthProvider } from "../../AuthContext";
import axiosInstance from "../../Axiosinstance";
import DeclineModal from "../dashboard/DeclineModal";
import RatingForm from "./RatingForm";
import LoadingButton from "../Loading";

const Dashboard = () => {
  const [firstname, setFirstname] = useState("");
  const [email, setEmail] = useState("");
  const { isLoggedIn } = useContext(AuthProvider);
  const navigate = useNavigate();

  const [salons, setSalons] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingBooking, setEditingBooking] = useState(null);
  const [editData, setEditData] = useState({ service_name: "", date_time: "" });
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [showCustomerBookings, setShowCustomerBookings] = useState(false);
  const [declineBookingId, setDeclineBookingId] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(null);

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await AxiosInstance.get("/details/");
        setFirstname(response.data.first_name || "");
        setEmail(response.data.email || "");
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // Fetch salons
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/salons/");
        if (!res.ok) throw new Error("Failed to fetch salons");
        const data = await res.json();
        setSalons(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    if (email) fetchSalons();
  }, [email]);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const res = await axiosInstance.get("/bookings/");
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (email) fetchBookings();
  }, [email]);

  // Approve booking
  const handleApprove = async (bookingId) => {
    try {
      await axiosInstance.patch(`/bookings/${bookingId}/`, { status: "approved" });
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel booking
  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await axiosInstance.patch(`/bookings/${bookingId}/`, { status: "cancelled" });
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel booking. Try again later.");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  //sort bookings by date
  const userSalons = salons.filter((salon) => salon.owner === email);
  const myBookings = bookings
    .filter((b) => b.customer_email === email)
    .sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
  const salonCustomerBookings = bookings
    .filter((b) => userSalons.some((salon) => salon.salon_name === b.salon_name))
    .sort((a, b) => new Date(a.date_time) - new Date(b.date_time));

    // Mark a booking as completed
const handleComplete = async (bookingId) => {
  try {
    await axiosInstance.patch(`/bookings/${bookingId}/`, { status: "completed" });
    await fetchBookings(); // refresh list
    alert("Service marked as completed!");
  } catch (err) {
    console.error(err);
    alert("Failed to complete service. Please try again.");
  }
};

// Mark a booking as incomplete
const handleIncomplete = async (bookingId) => {
  try {
    await axiosInstance.patch(`/bookings/${bookingId}/`, { status: "incomplete" });
    await fetchBookings(); // refresh list
    alert("Service marked as incomplete.");
  } catch (err) {
    console.error(err);
    alert("Failed to mark as incomplete. Please try again.");
  }
};

// count booking by status
const bookingSummary = salonCustomerBookings.reduce((acc, b) => {
  acc[b.status] = (acc[b.status] || 0) + 1;
  return acc;
}, {});

// Approved bookings today
const today = new Date().toISOString().split("T")[0]; 
const approvedToday = salonCustomerBookings.some(b => {
  const bookingDate = b.date_time.split("T")[0];
  return b.status === "approved" && bookingDate === today;
});


  return (
    <div className="WelcomeMessage">
      <label>Welcome {firstname}</label>

      {userSalons.length > 0 && (
        <div className="UserSalonInfo">
          <h4
            style={{
              fontSize: "1.5rem",
              color: "#b2c0b2ff",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            You have {userSalons.length} salon(s) registered.
          </h4>

         
    <p> 
     
    Booking summary:
    <span style={{color:"orange"}}> Approved: {bookingSummary.approved || 0}</span>
    <span style={{color:"orange"}}> Pending: {bookingSummary.pending || 0}</span>
    <span> Completed: {bookingSummary.completed || 0}</span>
    <span> Incomplete: {bookingSummary.incomplete || 0}</span>
    <span> Cancelled: {bookingSummary.cancelled || 0}</span>
    <span> Declined: {bookingSummary.declined || 0}</span>
  </p>
  {approvedToday && (
    <p style={{fontSize: "1.2rem",
        color: "#84da72ff",
        fontWeight: "bold",}}>

         Reminder: You have an approved booking today! 
        </p>
       
      )}
        </div>
      )}
      

      <div style={{ marginBottom: "12px" }}>
        <LoadingButton
          onClick={() => setShowMyBookings(!showMyBookings)}
          style={{
            padding: "8px 16px",
            borderRadius: "5px",
            backgroundColor: "#dcc5dfff",
            border: "none",
            cursor: "pointer",
            color: "purple",
            marginRight: "10px",
          }}
        >
          {showMyBookings ? "Hide My Bookings" : "Show My Bookings"}
        </LoadingButton>

        {userSalons.length > 0 && (
          <LoadingButton
            onClick={() => setShowCustomerBookings(!showCustomerBookings)}
            style={{
              padding: "8px 16px",
              borderRadius: "5px",
              backgroundColor: "#dcc5dfff",
              border: "none",
              cursor: "pointer",
              color: "purple",
            }}
          >
            {showCustomerBookings
              ? "Hide Customer Bookings"
              : "Show Customer Bookings"}
          </LoadingButton>
        )}
      </div>

      {/* MY BOOKINGS */}
      {showMyBookings && (
        <div className="booking-list">

           {myBookings.filter(b => b.status === "pending" || b.status === "approved"||(b.status === "completed" && !b.rating)).length === 0 ? (
            <p>You have no upcoming booking, make your booking below for your next appointment.</p>
          ) : (
          myBookings
            .filter(b => b.status === "pending" || b.status === "approved"||(b.status === "completed" && !b.rating))
            .map((b, i) => (
              <div
                key={i}
                className="book-card"
                style={{
                  backgroundColor: "rgb(235, 147, 213)",
                  borderRadius: "10px",
                  width: "30%",
                  padding: "15px",
                  marginBottom: "10px",
                }}
              >
                <p><strong>Salon:</strong> {b.salon_name}</p>
                <p><strong>Service:</strong> {b.service_name}</p>
                <p><strong>Date:</strong> {new Date(b.date_time).toLocaleString()}</p>
                <p><strong>Price:</strong> R{b.price}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      color:
                        b.status === "approved"
                          ? "green"
                          : b.status === "declined"
                          ? "red"
                          : "purple",
                      fontWeight: "bold",
                    }}
                  >
                    {b.status
                      ? b.status.charAt(0).toUpperCase() + b.status.slice(1)
                      : "Pending"}
                  </span>
                </p>

                <div className="Customer">
                  <LoadingButton onClick={() => handleCancel(b.id)}>Cancel</LoadingButton>

                </div>
                {b.status === "completed" && (
  <>
    {!b.rating ? (
      <>
        <LoadingButton
          onClick={() => setShowRatingForm(b.id)}
          style={{
            marginTop: "8px",
            padding: "6px 12px",
            border: "none",
            borderRadius: "5px",
            backgroundColor: "#e9a21eff",
            color: "black",
            cursor: "pointer",
          }}
        >
          Rate Service
        </LoadingButton>

        {/* Modal popup for rating */}
        {showRatingForm === b.id && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                position: "relative",
                background: "#fff",
                padding: "20px",
                borderRadius: "10px",
                width: "400px",
                maxWidth: "90%",
              }}
            >
              <LoadingButton
                onClick={() => setShowRatingForm(null)}
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✖
              </LoadingButton>
              <RatingForm
                bookingId={b.id}
                onClose={() => {
                  setShowRatingForm(null);
                  fetchBookings(); // refresh after submitting rating
                }}
              />
            </div>
          </div>
        )}
      </>
    ) : (
      <>
        <p>
          <strong>Your Rating:</strong> {b.rating} ⭐
        </p>
        {b.review && (
          <p>
            <strong>Your Review:</strong> {b.review}
          </p>
        )}
      </>
    )}
  </>
)}

              </div>
            ))
          )}
        </div>
      )}

      {/* CUSTOMER BOOKINGS */}
      {showCustomerBookings && (
        <div className="booking-list">
          {salonCustomerBookings.filter(b => b.status === "pending" || b.status === "approved").length === 0 ? (
            <p>No customer bookings yet.</p>
          ) : (
            salonCustomerBookings
              .filter(b => b.status === "pending" || b.status === "approved")
              .map((b, i) => (
              <div
                key={i}
                className="book-card"
                style={{
                  backgroundColor: "rgb(235, 147, 213)",
                  borderRadius: "10px",
                  width: "30%",
                  padding: "15px",
                  marginBottom: "10px",
                }}
              >
                <p><strong>Salon:</strong> {b.salon_name}</p>
                <p><strong>Service:</strong> {b.service_name}</p>
                <p><strong>Date:</strong> {new Date(b.date_time).toLocaleString()}</p>
                <p><strong>Price:</strong> R{b.price}</p>
                <p><strong>Customer Name:</strong> {b.customer_name}</p>
                <p><strong>Customer Email:</strong> {b.customer_email}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      color:
                        b.status === "approved"
                          ? "green"
                          : b.status === "declined"
                          ? "red"
                          : "purple",
                      fontWeight: "bold",
                    }}
                  >
                    {b.status
                      ? b.status.charAt(0).toUpperCase() + b.status.slice(1)
                      : "Pending"}
                  </span>
                </p>

                <div className="BookingApproval">
                  {b.status === "pending" && (
                    <>
                      <LoadingButton onClick={() => handleApprove(b.id)}>Accept</LoadingButton>
                      <LoadingButton onClick={() => navigate(`/decline/${b.id}`)}>Decline</LoadingButton>
                    </>
                  )}
                </div>

  {/* Show "Complete" and "Incomplete" buttons only if the date/time has passed and booking is approved */}
{b.status === "approved" && new Date(b.date_time) < new Date() && (
  
  <div className="completeStatus">
    <LoadingButton
      onClick={() => handleComplete(b.id)}
      style={{
        backgroundColor: "#4caf50",
        color: "white",
        border: "none",
        cursor: "pointer"
      }}
    >
      Complete Service
    </LoadingButton>

    <LoadingButton
      onClick={() => handleIncomplete(b.id)}
      style={{
        backgroundColor: "#f44336",
        color: "white",
        border: "none",
        cursor: "pointer"
      }}
    >
      Incomplete Service
    </LoadingButton>
  </div>
)}
              </div>
            ))
          )}
        </div>
      )}

     

      <h3>
        <label onClick={() => navigate("/RegSalon")}>REGISTER</label> your salon
        <br /> OR <br />
        <label onClick={() => navigate("/Book")}>BOOK</label> your next
        appointment
      </h3>
    </div>
  );
};

export default Dashboard;
