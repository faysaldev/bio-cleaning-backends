# 🦷 Bright Smile API (Backends)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

A premium, highly-optimized, and enterprise-ready backend engine for **Bright Smile Dental Clinic**. This project follows a Domain-Driven Design (DDD) architecture, providing robust APIs for appointment management, real-time activity auditing, advanced analytics, and automated communication.

---

## 🔗 Live Links & Access

- **🌐 Live URL:** [https://bright-smile-fm.vercel.app/](https://bright-smile-fm.vercel.app/)
- **🔐 Admin Access:** [https://bright-smile-fm.vercel.app/admin-access](https://bright-smile-fm.vercel.app/admin-access)

### 🔑 Admin Credentials

```json
{
  "admin_credentials": {
    "email": "faysaladmin@gmail.com",
    "password": "Password123@"
  }
}
```

---

### Video Overview

[![Bright Smile Video Overview](https://img.youtube.com/vi/SQETaWhGN3Y/maxresdefault.jpg)](https://www.youtube.com/watch?v=SQETaWhGN3Y)

---

## 🚀 Key Features

- **🛡️ Secure Authentication**: JWT-based auth with refresh token logic and role-based access control (RBAC).
- **📅 Smart Appointments**: Real-time availability checking, booking management, and automated email notifications (Confirmed/Cancelled).
- **📊 Admin Analytics**: Comprehensive dashboard providing revenue trends, patient growth, and service performance.
- **📜 Audit Logs**: Real-time activity logging system that tracks every action performed on the platform.
- **✉️ Communication Engine**: Automated email system for status updates and direct inquiry replies.
- **⚡ Real-time Updates**: Socket.io integration for instant data synchronization.
- **☁️ Asset Management**: Cloudinary-powered media uploads and management.
- **💳 Payment Ready**: Integrated Stripe support for future billing features.

---

## 🛠️ Tech Stack

- **Core:** Node.js, Express.js, TypeScript
- **Database:** MongoDB (Mongoose)
- **Caching & Pub/Sub:** Redis
- **Real-time:** Socket.io
- **Security:** JWT, Bcrypt, CryptoJS
- **Validation:** Zod
- **Logging:** Winston, Winston Daily Rotate File
- **Media:** Cloudinary, Multer
- **Email:** Nodemailer

---

## 📂 Project Structure

```bash
src/
├── config/             # Configuration files (DB, Socket, Redis, ENV)
├── domains/            # Domain-Driven Modules
│   ├── ActivityLog/    # Platform auditing & logs
│   ├── Appointment/    # Booking & availability logic
│   ├── Auth/           # User authentication
│   ├── Admin-Auth/     # Admin-specific authentication
│   ├── Blog/           # Content management (CMS)
│   ├── Contact/        # Inquiries & Admin replies
│   ├── Dashboard/      # Analytics & Statistics
│   ├── Doctor/         # Medical staff management
│   ├── Service/        # Clinic services management
│   └── Testimonial/    # Patient feedback
├── lib/                # Shared utilities (Mail, Response, Errors)
├── middlewares/        # Express middlewares (Auth, Logger, File Upload)
├── routes/             # Main route registrations
├── server.ts           # Express app configuration
└── index.ts            # Entry point & Server initialization
```

---

## ⚙️ Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/faysaldev/bright-smile-backends.git
   cd bright-smile-backends
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following:

   ```env
   PORT=9500
   SOCKET_PORT=6100
   DATABASE_URL=your_mongodb_url
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   EMAIL_USERNAME=your_gmail
   EMAIL_PASSWORD=your_app_password
   CLOUDINARY_CLOUD_NAME=your_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   STRIPE_SECRET_KEY=your_stripe_key
   ```

4. **Run in development mode:**

   ```bash
   pnpm run dev
   ```

5. **Build for production:**
   ```bash
   pnpm run build
   pnpm start
   ```

---

## 📖 API Documentation Overview

### Core Endpoints

| Method | Endpoint                          | Description                                 | Auth   |
| :----- | :-------------------------------- | :------------------------------------------ | :----- |
| `GET`  | `/api/v1/dashboard`               | High-level analytics & recent activity      | Admin  |
| `GET`  | `/api/v1/activity-logs`           | Platform audit history                      | Admin  |
| `POST` | `/api/v1/appointments`            | Book a new appointment                      | Public |
| `PUT`  | `/api/v1/appointments/:id/status` | Confirm/Cancel appointment (triggers email) | Admin  |
| `PUT`  | `/api/v1/contact/:id/reply`       | Send email reply to user inquiry            | Admin  |
| `GET`  | `/api/v1/doctors`                 | Retrieve medical staff                      | Public |

_For full API details, refer to the [API Documentation](bright-smile-api-docs.md)._

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Faysal Mridha**

- GitHub: [@faysaldev](https://github.com/faysaldev)
- Website: [faysalmridha.com](https://faysalmridha.com)
