import { AppError } from "./base.error";

export class TargetUserNotFoundError extends AppError {
    constructor(message = "User not found") {
        super(message, "TARGET_USER_NOT_FOUND", 404);
        this.name = "TargetUserNotFoundError";
    }
}

export class AlreadyAdminError extends AppError {
    constructor(message = "User is already an admin") {
        super(message, "ALREADY_ADMIN", 409);
        this.name = "AlreadyAdminError";
    }
}

export class NotAdminError extends AppError {
    constructor(message = "User is not an admin") {
        super(message, "NOT_ADMIN", 409);
        this.name = "NotAdminError";
    }
}

export class CannotDemoteSuperAdminError extends AppError {
    constructor(
        message = "The super admin cannot be demoted via the app — change SUPER_ADMIN_EMAIL instead",
    ) {
        super(message, "CANNOT_DEMOTE_SUPER_ADMIN", 403);
        this.name = "CannotDemoteSuperAdminError";
    }
}