import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { baseUrl } from "../../Axiosinstance";

const ViewMore = () => {
  const { salonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [salon, setSalon] = useState(location.state?.salon || null);
  const [loading, setLoading] = useState(!location.state?.salon);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    fetch(`${baseUrl}/salons/${salonId}/`)
      .then((response) => {
        if (!response.ok) throw new Error("Salon details could not be loaded.");
        return response.json();
      })
      .then((data) => {
        if (isActive) setSalon(data);
      })
      .catch(() => {
        if (isActive && !location.state?.salon) {
          setError("Salon details could not be loaded. Please try again.");
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [salonId, location.state]);

  if (loading) return <main className="salon-detail-page">Loading salon details...</main>;
  if (error) return <main className="salon-detail-page" role="alert">{error}</main>;
  if (!salon) return <main className="salon-detail-page">Salon not found.</main>;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.location)}`;

  return (
    <main className="salon-detail-page">
      <button className="salon-detail-back" type="button" onClick={() => navigate(-1)}>
        Back to salons
      </button>

      <header className="salon-detail-header">
        <h1>{salon.salon_name}</h1>
        <p>{salon.location}</p>
        <a href={mapUrl} target="_blank" rel="noreferrer">View address on map</a>
      </header>

      <section className="salon-detail-owner" aria-label="Salon and owner details">
        <div>
          <span>Salon owner</span>
          <strong>{salon.owner_name || "Owner details unavailable"}</strong>
        </div>
        {salon.owner && (
          <div>
            <span>Contact</span>
            <a href={`mailto:${salon.owner}`}>{salon.owner}</a>
          </div>
        )}
        <div>
          <span>Working hours</span>
          <strong>{salon.startT || "Not set"} to {salon.endT || "Not set"}</strong>
        </div>
      </section>

      <section className="salon-detail-section">
        <h2>Salon photos</h2>
        {salon.gallery?.length ? (
          <div className="salon-detail-gallery">
            {salon.gallery.map((image, index) => (
              <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer">
                <img src={image} alt={`${salon.salon_name}, ${index + 1}`} loading="lazy" />
              </a>
            ))}
          </div>
        ) : <p>No photos have been added yet.</p>}
      </section>

      <section className="salon-detail-section">
        <h2>Services and prices</h2>
        {salon.services_list?.length ? (
          <ul className="salon-detail-services">
            {salon.services_list.map((service) => (
              <li key={service.id}>
                <span>{service.service_name}</span>
                <strong>R{service.price}</strong>
              </li>
            ))}
          </ul>
        ) : <p>No services have been listed yet.</p>}
      </section>
    </main>
  );
};

export default ViewMore;