import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance, { baseUrl } from "../../Axiosinstance";
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
  const [deletingSalonId, setDeletingSalonId] = useState(null);

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
        const res = await fetch(`${baseUrl}/salons/`);
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

  const handleDeleteSalon = async (salon) => {
    const confirmed = window.confirm(
      `Delete ${salon.salon_name}? This also permanently deletes its services and bookings.`
    );
    if (!confirmed) return;

    setDeletingSalonId(salon.id);
    try {
      await axiosInstance.delete(`/salons/${salon.id}/`);
      setSalons((currentSalons) => currentSalons.filter((item) => item.id !== salon.id));
    } catch (err) {
      console.error(err);
      alert("Could not delete this salon. Please try again.");
    } finally {
      setDeletingSalonId(null);
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
    <main className="WelcomeMessage dashboard-shell">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-kicker">OWNER DASHBOARD</span>
          <h1>Welcome, {firstname || "there"}</h1>
          <p>Keep your salon and appointments in order.</p>
        </div>
        <span className="dashboard-date">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
      </header>

      {userSalons.length > 0 && (
        <section className="UserSalonInfo dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-kicker">YOUR BUSINESS</span>
              <h2>Registered salons</h2>
            </div>
            <span className="dashboard-count">{userSalons.length} {userSalons.length === 1 ? "salon" : "salons"}</span>
          </div>

          <div className="salon-management-grid">
            {userSalons.map((salon) => (
              <article
                key={salon.id}
                className="salon-management-card"
              >
                {salon.gallery?.[0] && (
                  <img
                    src={salon.gallery[0]}
                    alt={salon.salon_name}
                    className="salon-management-image"
                  />
                )}
                <div className="salon-management-details">
                  <div>
                    <h3>{salon.salon_name}</h3>
                    <p>{salon.location}</p>
                  </div>
                  <div className="salon-management-actions">
                    <button
                      type="button"
                      className="salon-edit-button"
                      onClick={() => navigate('/RegSalon', { state: { salon } })}
                    >
                      Edit salon
                    </button>
                    <button
                      type="button"
                      className="salon-delete-button"
                      onClick={() => handleDeleteSalon(salon)}
                      disabled={deletingSalonId === salon.id}
                    >
                      {deletingSalonId === salon.id ? "Deleting..." : "Delete salon"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="booking-summary">
            <h3>Booking summary</h3>
            <div className="booking-summary-grid">
              <div className="summary-stat"><strong>{bookingSummary.approved || 0}</strong><span>Approved</span></div>
              <div className="summary-stat"><strong>{bookingSummary.pending || 0}</strong><span>Pending</span></div>
              <div className="summary-stat"><strong>{bookingSummary.completed || 0}</strong><span>Completed</span></div>
              <div className="summary-stat"><strong>{bookingSummary.incomplete || 0}</strong><span>Incomplete</span></div>
              <div className="summary-stat"><strong>{bookingSummary.cancelled || 0}</strong><span>Cancelled</span></div>
              <div className="summary-stat"><strong>{bookingSummary.declined || 0}</strong><span>Declined</span></div>
            </div>
          </div>
          {approvedToday && (
            <p className="dashboard-reminder">You have an approved booking today.</p>
          )}
        </section>
      )}
      

      <section className="dashboard-section dashboard-bookings-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-kicker">APPOINTMENTS</span>
            <h2>Booking activity</h2>
          </div>
        </div>
        <div className="dashboard-toggle-row">
        <LoadingButton
          onClick={() => setShowMyBookings(!showMyBookings)}
          className="dashboard-toggle-button"
        >
          {showMyBookings ? "Hide My Bookings" : "Show My Bookings"}
        </LoadingButton>

        {userSalons.length > 0 && (
          <LoadingButton
            onClick={() => setShowCustomerBookings(!showCustomerBookings)}
            className="dashboard-toggle-button"
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

     

      </section>

      <footer className="dashboard-footer-actions">
        <h2>What would you like to do next?</h2>
        <div>
        <label onClick={() => navigate("/RegSalon")}>REGISTER</label> your salon
        <br /> OR <br />
        <label onClick={() => navigate("/Book")}>BOOK</label> your next
        appointment
        </div>
      </footer>
    </main>
  );
};

export default Dashboard;
