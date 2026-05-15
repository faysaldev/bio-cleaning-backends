# BIO Cleaning - Frontend & Proposed Backend Documentation

This repository contains the frontend for BIO Cleaning, a professional cleaning service platform. Below is the documentation for the proposed backend API, data models, and types required to support the current frontend implementation.

---

## 🛠 Tech Stack (Proposed)

- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL / MongoDB (Prisma ORM recommended)
- **Validation**: Zod
- **Authentication**: NextAuth.js or Clerk

---

## 📊 Data Models (Database Schema)

### 1. `Booking`

Stores all information related to a cleaning service request.

| Field           | Type     | Description                                              |
| :-------------- | :------- | :------------------------------------------------------- |
| `id`            | UUID     | Primary Key                                              |
| `reference`     | String   | Unique human-readable ID (e.g., `BIO-54210`)             |
| `serviceType`   | Enum     | `RESIDENTIAL`, `COMMERCIAL`, `DEEP_CLEAN`, `MOVE_IN_OUT` |
| `propertySize`  | String   | e.g., `Studio`, `1BR`, `2BR`, `3BR`, `4BR+`, `Office`    |
| `date`          | DateTime | Scheduled date for cleaning                              |
| `timeSlot`      | String   | `Morning 8-12`, `Afternoon 12-5`, `Evening 5-8`          |
| `frequency`     | Enum     | `ONE_TIME`, `WEEKLY`, `BI_WEEKLY`, `MONTHLY`             |
| `customerName`  | String   | Full name of the client                                  |
| `customerEmail` | String   | Contact email                                            |
| `customerPhone` | String   | Contact phone number                                     |
| `addressLine1`  | String   | Primary address                                          |
| `addressLine2`  | String?  | Apartment, suite, etc. (Optional)                        |
| `city`          | String   | City                                                     |
| `zipCode`       | String   | Postal code                                              |
| `notes`         | Text?    | Special instructions or notes (Optional)                 |
| `totalAmount`   | Float    | Final estimated price                                    |
| `status`        | Enum     | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`         |
| `createdAt`     | DateTime | Auto-generated timestamp                                 |

### 2. `ContactSubmission`

Stores messages from the contact form.

| Field       | Type     | Description                    |
| :---------- | :------- | :----------------------------- |
| `id`        | UUID     | Primary Key                    |
| `fullName`  | String   | Sender's name                  |
| `email`     | String   | Sender's email                 |
| `phone`     | String   | Sender's phone                 |
| `service`   | String   | Service they are interested in |
| `message`   | Text     | The actual message content     |
| `createdAt` | DateTime | Timestamp                      |

### 3. `Service` (Dynamic Services)

Allows the admin to update service offerings and pricing.

| Field         | Type     | Description                    |
| :------------ | :------- | :----------------------------- |
| `id`          | UUID     | Primary Key                    |
| `name`        | String   | Service name                   |
| `description` | Text     | Short description              |
| `basePrice`   | Float    | Starting price                 |
| `includes`    | String[] | List of features included      |
| `image`       | String   | Image URL                      |
| `isActive`    | Boolean  | Whether to show on site        |
| `duration`    | String   | Duration of the service        |
| `tags`        | String[] | Tags for the service           |
| `publish`     | Boolean  | Whether to publish the service |

`

---

## 🚀 API Documentation (Proposed Endpoints)

### Bookings API

- **`POST /api/bookings`**
  - **Description**: Create a new booking.
  - **Body**: `BookingCreateInput` (See types below).
  - **Access**: Public.
- **`GET /api/bookings`**
  - **Description**: Retrieve all bookings. Supports filtering by status and date.
  - **Access**: Admin Only.
- **`GET /api/bookings/:id`**
  - **Description**: Get details for a specific booking.
  - **Access**: Admin / Customer (with ref).
- **`PATCH /api/bookings/:id`**
  - **Description**: Update booking status (e.g., Mark as Confirmed).
  - **Access**: Admin Only.

### Contact API

- **`POST /api/contact`**
  - **Description**: Submit the contact form.
  - **Body**: `ContactSubmissionInput`.
  - **Access**: Public.
- **`GET /api/contact`**
  - **Description**: View all contact messages.
  - **Access**: Admin Only.

### Services API

- **`GET /api/services`**
  - **Description**: Fetch all active services for the Services page.
  - **Access**: Public.

---

## ⌨️ TypeScript Types

```typescript
// Shared Types
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface Booking {
  id: string;
  reference: string;
  serviceType: "RESIDENTIAL" | "COMMERCIAL" | "DEEP_CLEAN" | "MOVE_IN_OUT";
  propertySize: string;
  date: string;
  timeSlot: string;
  frequency: "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      zip: string;
    };
  };
  notes?: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
}

export interface ContactSubmission {
  fullName: string;
  email: string;
  phone: string;
  serviceInterest: string;
  message: string;
}
```

---

## 🛠 Getting Started (Frontend)

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
