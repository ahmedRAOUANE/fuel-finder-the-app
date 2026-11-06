import { AppError } from "./base.error";

export class InvitationNotFoundError extends AppError {
    constructor(message = "Invitation not found") {
        super(message, "INVITATION_NOT_FOUND", 404);
        this.name = "InvitationNotFoundError";
    }
}

export class InvitationExpiredError extends AppError {
    constructor(message = "This invitation has expired") {
        super(message, "INVITATION_EXPIRED", 410);
        this.name = "InvitationExpiredError";
    }
}

export class InvitationNotPendingError extends AppError {
    constructor(status: string) {
        super(
            `Invitation is not pending (current status: ${status})`,
            "INVITATION_NOT_PENDING",
            409,
        );
        this.name = "InvitationNotPendingError";
    }
}

export class InvitationNotForYouError extends AppError {
    constructor(message = "This invitation is not for you") {
        super(message, "INVITATION_NOT_FOR_YOU", 403);
        this.name = "InvitationNotForYouError";
    }
}

export class AlreadyMemberError extends AppError {
    constructor(message = "User is already a member of this station") {
        super(message, "ALREADY_MEMBER", 409);
        this.name = "AlreadyMemberError";
    }
}

export class DuplicateInvitationError extends AppError {
    constructor(
        message = "A pending invitation already exists for this user at this station",
    ) {
        super(message, "DUPLICATE_INVITATION", 409);
        this.name = "DuplicateInvitationError";
    }
}

export class CannotInviteSelfError extends AppError {
    constructor(message = "You cannot invite yourself") {
        super(message, "CANNOT_INVITE_SELF", 422);
        this.name = "CannotInviteSelfError";
    }
}

export class CannotPromoteOwnerError extends AppError {
    constructor(message = "The owner cannot be promoted") {
        super(message, "CANNOT_PROMOTE_OWNER", 422);
        this.name = "CannotPromoteOwnerError";
    }
}

export class AlreadyManagerError extends AppError {
    constructor(message = "This member is already a manager") {
        super(message, "ALREADY_MANAGER", 409);
        this.name = "AlreadyManagerError";
    }
}

export class CannotRemoveOwnerError extends AppError {
    constructor(message = "The owner cannot be removed") {
        super(message, "CANNOT_REMOVE_OWNER", 422);
        this.name = "CannotRemoveOwnerError";
    }
}

export class MemberNotFoundError extends AppError {
    constructor(message = "Member not found at this station") {
        super(message, "MEMBER_NOT_FOUND", 404);
        this.name = "MemberNotFoundError";
    }
}