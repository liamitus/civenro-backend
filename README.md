# 🇺🇸 Civenro Backend

The **Civenro Backend** provides the server-side logic, database interactions, and API endpoints for the Civenro civic engagement platform. It works in tandem with the [Civenro Frontend](https://github.com/liamitus/civenro) to offer a complete, transparent, and interactive legislative tracking experience.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Makefile Commands](#makefile-commands)
- [Contributing](#contributing)
- [License](#license)

## Features

- **API for Bills:** Serve data on government bills, their statuses, and summaries.
- **Voting and Comments:** Handle user voting logic, threaded comment storage, and vote counts.
- **Representative Data Integration:** Fetch and store representatives’ voting records.
- **Authentication and Authorization:** Manage user accounts, sessions, and secure actions.

## Tech Stack

### Back-End

- **Node.js** and **Express.js** with TypeScript for the server.
- **Prisma ORM** to simplify database queries and ensure type safety.
- **PostgreSQL** as the relational database.
- **Integration with GovTrack API** to fetch and update legislative data.

### Deployment

- **Backend:** Hosted on Railway.app for scalability, ease of deployment, and modern infrastructure.
- **Database:** Railway Postgres or another managed Postgres service.

## Installation

### Prerequisites

- **Node.js** and **npm** installed.
- **Git** installed.
- **PostgreSQL** database with a valid `DATABASE_URL` environment variable.
- **.env file:** Create an `.env` file containing secrets like `DATABASE_URL`, `JWT_SECRET`, etc.

### Clone the Repository

```bash
git clone https://github.com/liamitus/civenro-backend.git
cd civenro-backend
```

### Install Dependencies and Initialize the Database

```bash
make install
make init
```

## Usage

1. Run the Database:

   ```bash
   make db
   ```

2. Run the Development Server:

   ```
   make start
   ```

3. Fetch some data from GovTrack:

   ```
   make fetch
   ```

4. API Endpoints:

   - `/bills` for fetching bills data.
   - `/comments` for managing comments.
   - `/users` for user profile and settings updates.
   - `/auth` for registration, login, and token management.

5. See the Makefile for all development scripts

## Contributing

We welcome community contributions! To get started:

1. **Fork the Repository**
2. **Create a Feature Branch**

```bash
git checkout -b feature/YourFeature
```

3. **Commit Your Changes**

```bash
git commit -m "Add some feature"
```

4. **Push to the Branch**

```bash
git push origin feature/YourFeature
```

5. **Open a Pull Request**

Please ensure your code adheres to the project's coding standards and includes relevant tests.

## License

This project is licensed under the [MIT License](LICENSE).
