import { AppError } from "./base.error";

export class StationNotFoundError extends AppError {
    constructor(message = "Station not found") {
        super(message, "STATION_NOT_FOUND", 404);
        this.name = "StationNotFoundError";
    }
}

export class InvalidStationTransitionError extends AppError {
    constructor(from: string, to: string) {
        super(
            `Invalid station transition: ${from} → ${to}`,
            "INVALID_STATION_TRANSITION",
            409,
        );
        this.name = "InvalidStationTransitionError";
    }
}

export class StationFuelRequiredError extends AppError {
    constructor(message = "At least one fuel is required for activation") {
        super(message, "STATION_FUEL_REQUIRED", 422);
        this.name = "StationFuelRequiredError";
    }
}

export class SelfApprovalError extends AppError {
    constructor(message = "An admin cannot approve a station they created") {
        super(message, "SELF_APPROVAL_FORBIDDEN", 403);
        this.name = "SelfApprovalError";
    }
}

export class StationNotEditableError extends AppError {
    constructor(status: string) {
        super(
            `Cannot edit a station in status ${status}. Only ACTIVE stations are editable.`,
            "STATION_NOT_EDITABLE",
            409,
        );
        this.name = "StationNotEditableError";
    }
}