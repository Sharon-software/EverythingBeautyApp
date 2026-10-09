# 💇‍♀️ Everything Beauty — Salon Booking App

A booking platform for salon services, allowing clients to schedule appointments, view available time slots, and manage bookings. Built to make life easier for both clients booking a service and salon staff managing their day.

🔗 Deployment link:https://everythingbeauty-web.onrender.com

## ✨ Features

**For Clients**
- Browse available salon services with pricing and duration
- View available time slots and book appointments online
- Create an account, view booking history, and reschedule/cancel appointments
- Receive booking confirmations and reminders

**For Salon Staff/Admins**
- Manage the service catalog (add/edit/remove services, pricing, duration)
- Manage staff schedules and availability
- View and manage all bookings from a central dashboard
- Manage client records and booking history

## 🛠️ Tech Stack

- **Frontend:** React
- **Backend:** Django (Django REST Framework)
- **Database:** PostgreSQL
- **Authentication:** Django auth / JWT

## 📁 Project Structure

```
EverythingBeautyApp/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/          # API calls
│   │   └── App.js
│   └── package.json
├── server/                    # Django backend
│   ├── config/                # Project settings, urls.py, wsgi/asgi
│   ├── bookings/               # Booking logic
│   ├── services/                # Salon services catalog
│   ├── accounts/                # User/auth management
│   ├── manage.py
│   └── requirements.txt
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL

### Installation

```bash
# Clone the repo
git clone https://github.com/sharon-software/EverythingBeautyApp.git
cd EverythingBeautyApp

# Backend setup
cd server
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../client
npm install
```

Set up your environment variables:
```bash
cp .env.example .env
```

Run database migrations:
```bash
cd ../server
python manage.py migrate
python manage.py createsuperuser   # optional, for admin access
```

Start the app:
```bash
# Terminal 1 — Django backend
cd server && python manage.py runserver

# Terminal 2 — React frontend
cd client && npm start
```

Visit `http://localhost:3000` — API runs on `http://localhost:8000`

## Deploying to Render

The repository includes a `render.yaml` Blueprint for the React static site, Django API, and PostgreSQL database. In Render, create a new Blueprint instance from this repository and select the repository root containing `render.yaml`. The Blueprint builds both services and runs database migrations when the API starts.

Set `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and `DEFAULT_FROM_EMAIL` in the API service to enable account verification and password-reset email. Rotate the Gmail app password previously present in source before deploying. Without SMTP credentials, Django uses its console email backend and email workflows will not reach users.

Salon photos use Cloudinary in production because Render's local filesystem is ephemeral. Before deploying, set `CLOUDINARY_URL` on the `everythingbeauty-api` service in Render to the Cloudinary URL from your Cloudinary dashboard (`cloudinary://API_KEY:API_SECRET@CLOUD_NAME`). The API now refuses to start without this setting rather than accepting uploads that can disappear after a restart. Local development continues to use the local media folder. Photos uploaded to an earlier ephemeral deployment are not recoverable from this change and must be uploaded again.

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/services` | List all available services |
| `GET` | `/api/availability?date=` | Get available time slots for a date |
| `POST` | `/api/bookings` | Create a new booking |
| `GET` | `/api/bookings/:id` | Get details of a specific booking |
| `PUT` | `/api/bookings/:id` | Update/reschedule a booking |
| `DELETE` | `/api/bookings/:id` | Cancel a booking |
| `POST` | `/api/auth/register` | Register a new client account |
| `POST` | `/api/auth/login` | Log in |

## 🧪 Testing

```bash
# Backend
cd server && python manage.py test

# Frontend
cd client && npm test
```

## 🗺️ Roadmap

- [ ] Payment integration (deposits/full payment at booking)
- [ ] Staff-specific booking (choose a preferred stylist)
- [ ] Loyalty/rewards program
- [ ] Admin analytics dashboard

