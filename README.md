# Authentication REST API Documentation

## Introduction

Welcome to the Authentication REST API documentation. This API allows users to register, log in, logout, and list protected posts. The API implements secure authentication practices with HTTP-only cookies for refresh tokens.


## Tech Stack

The Authentication REST API is built using the following technologies:

- **Nest.js**: A fast and minimalist web framework for Node.js.
- **MongoDB**: NoSQL database.
- **JWT (JSON Web Tokens)**: For secure authentication and authorization.
- **HTTP-only Cookies**: For secure storage of refresh tokens to prevent XSS attacks.
- **Swagger**: For API documentation.
- **Bcrypt**: For hashing and securing user passwords.
- **Class-Validator & Class-Transformer**: Used for request validation and data transformation.
- **Mongoose**: ODM for MongoDB to structure and manage database interactions.
- **Cookie-Parser**: For parsing and handling HTTP cookies.



## Features

- **User Registration**: Securely create an account with hashed passwords.
- **User Login**: Authenticate users and issue access tokens in response body and refresh tokens in HTTP-only cookies.
- **Secure Token Handling**: Access tokens delivered in response body for client-side usage, while refresh tokens are stored in HTTP-only cookies to prevent XSS attacks.
- **Token Refreshing**: Refresh expired access tokens using secure HTTP-only cookie refresh tokens.
- **User Logout**: Securely invalidate refresh tokens and clear cookies upon logout.
- **Protected Routes**: Access control based on authentication status.


## Getting Started

Follow these instructions to run the project locally using Node js:

1. Clone the project repository to your local machine:

   ```bash
   git clone <repository_url>
   cd <project_directory>
   ```

1. Create a .env file in the project root and configure the following environment variables:

```bash
DATABASE_URL=mongodb://localhost:27017/auth # MongoDB connection URL
JWT_SECRET=your_jwt_secret_key # Secret for access token
RT_SECRET=your_refresh_token_secret_key # Secret for refresh token
PORT=3000 # Optional: Application port (default: 3000)
CORS_ORIGIN=http://localhost:5173 # Frontend URL for CORS configuration
```

2. Install dependencies:

```bash
yarn install
```

4. Start the development server:

```bash
yarn start:dev
```

Now you can see your API docs at: `http://localhost:port or 3000/docs/#/`

## live preview

you can see the live preview . Please note that the initial launch of the documentation may be a bit slow as it is hosted on a free hosting plan.


## Security Implementation

This API implements enhanced security features to protect user authentication:

- **HTTP-only Cookies**: Refresh tokens are stored in HTTP-only cookies, which cannot be accessed by JavaScript. This helps prevent Cross-Site Scripting (XSS) attacks.
- **Access Token Security**: Access tokens are short-lived and delivered in response bodies for client-side usage.
- **Secure Cookie Configuration**: In production environments, cookies are configured with secure flag (HTTPS only) and SameSite policy to prevent CSRF attacks.
- **Session Management**: Each user session is tracked and can be invalidated server-side.

## API Authentication Flow

1. **Registration/Login**: User receives access token in response body and refresh token in HTTP-only cookie.
2. **Accessing Protected Routes**: Client includes access token in Authorization header.
3. **Token Expiration**: When access token expires, client calls refresh endpoint (no need to send refresh token as it's in the cookie).
4. **Logout**: Refresh token cookie is cleared and the token is invalidated server-side.

## At the end

Please refer to the Swagger documentation for detailed information on each endpoint and how to use them.

If you have any questions or encounter issues, feel free to reach out for assistance. Happy coding!
