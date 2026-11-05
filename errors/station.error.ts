import { AppError } from "./base.error";

export class StationNotFoundError extends AppError {
    constructor(message = "Station not found") {
        super(message, "STATION_NOT_FOUND", 404);
        this.name = "StationNotFoundError";
    }
}