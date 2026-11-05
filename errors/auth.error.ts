import { AppError } from "./base.error";

export class AuthenticationError extends AppError {
    constructor(message = "Authentication required") {
        super(message, "AUTHENTICATION_ERROR", 401);
        this.name = "AuthenticationError";
    }
}

export class AuthorizationError extends AppError {
    constructor(message = "Access denied") {
        super(message, "AUTHORIZATION_ERROR", 403);
        this.name = "AuthorizationError";
    }
}