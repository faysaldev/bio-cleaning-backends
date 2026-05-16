# BIO Cleaning LLC - Backend API Infrastructure

![BIO Cleaning LLC Banner](https://bio-cleaning-llc.vercel.app/og-image.jpg)

This is the core API engine powering **BIO Cleaning LLC**, a professional, eco-friendly cleaning service platform. This backend provides a secure, scalable RESTful API built with Node.js, Express, and MongoDB to manage bookings, services, and administrative operations.

---

## 🚀 Live Ecosystem
- **Production API**: [https://bio-cleaning-backends.vercel.app/](https://bio-cleaning-backends.vercel.app/)
- **Frontend (Live)**: [https://bio-cleaning-llc.vercel.app/](https://bio-cleaning-llc.vercel.app/)
- **Frontend Source**: [https://github.com/faysaldev/bio-cleaning-client](https://github.com/faysaldev/bio-cleaning-client)

---

## 🔐 Administrative Credentials
For testing and management purposes, use the following admin credentials at the `/admin/login` portal:

```json
{
  "admin_credentials": {
    "email": "faysaladmin@gmail.com",
    "password": "Password123@"
  }
}
```

---

## 🛠 Problem Solved
BIO Cleaning LLC solves the friction in the traditional cleaning industry:
- **Automation**: Replaces manual scheduling with a real-time booking engine.
- **Transparency**: Provides instant quotes based on property size and service type.
- **Efficiency**: Automates customer notifications and admin orchestration.
- **Data-Driven**: Offers a comprehensive dashboard for tracking revenue and growth.

---

## 📖 Backend Features & Modules

### 1. Booking Engine (`/api/v1/bookings`)
- **Automated Reference Generation**: Unique `BIO-XXXXX` tracking numbers.
- **Availability Logic**: Prevents double-booking of time slots.
- **Status Workflow**: Tracks lifecycle from `PENDING` -> `CONFIRMED` -> `COMPLETED`/`CANCELLED`.

### 2. Service Management (`/api/v1/services`)
- **Dynamic Catalog**: CRUD operations for cleaning services.
- **Short Details API**: Optimized endpoint for high-performance frontend listing.
- **Status Toggles**: Instantly publish/unpublish services from the client view.

### 3. Admin Dashboard (`/api/v1/dashboard`)
- **Growth Metrics**: Real-time revenue and booking stats compared to the previous 30 days.
- **Client Analytics**: Unique client tracking and growth percentages.
- **Recent Activity**: Live feed of incoming reservations.

### 4. Contact & Communication (`/api/v1/contact`)
- **Inquiry Management**: Centralized list of customer messages.
- **Professional Reply System**: Integrated email responses sent directly to customers via Nodemailer.

---

## 🛠 Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Validation**: Zod (Schema-level validation)
- **Security**: JWT Authentication & Role-Based Access Control (RBAC)
- **Email**: Nodemailer (SMTP integration)

---

## 📈 Search Engine Optimization (SEO) Plan
*Implemented on the frontend to ensure maximum visibility.*

| Page | Title Tag | Meta Description |
| :--- | :--- | :--- |
| **Home** | Professional Eco-Friendly Cleaning | Book residential/commercial cleaning in 60s. Insured teams & eco-safe products. |
| **Services** | Our Cleaning Packages & Pricing | Explore Deep, Residential, and Move-In/Out cleaning packages with instant pricing. |
| **Booking** | Book Your Professional Clean | Instant online booking engine. Pick your date, time, and service in a few clicks. |
| **Contact** | Contact BIO Cleaning LLC | Have questions or need a custom commercial quote? Our team is available 7 days a week. |

---

## 🛠 Local Setup & Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/faysaldev/bio-cleaning-backends.git
   cd bio-cleaning-backends
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root and configure:
   ```env
   PORT=9500
   DATABASE_URL=your_mongodb_url
   JWT_SECRET=your_secret
   EMAIL_USERNAME=your_smtp_user
   EMAIL_PASSWORD=your_smtp_pass
   ```

4. **Run Development Server**:
   ```bash
   pnpm run dev
   ```

---

## 📄 License
This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
