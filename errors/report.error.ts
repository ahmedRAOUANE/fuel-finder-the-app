import { AppError } from "./base.error";

export class ReportNotFoundError extends AppError {
    constructor(message = "Report not found") {
        super(message, "REPORT_NOT_FOUND", 404);
        this.name = "ReportNotFoundError";
    }
}

export class ReportAlreadyClosedError extends AppError {
    constructor(status: string) {
        super(
            `Report is already closed (current status: ${status})`,
            "REPORT_ALREADY_CLOSED",
            409,
        );
        this.name = "ReportAlreadyClosedError";
    }
}

export class CannotReportInactiveStationError extends AppError {
    constructor() {
        super(
            "Only active stations can be reported",
            "CANNOT_REPORT_INACTIVE_STATION",
            422,
        );
        this.name = "CannotReportInactiveStationError";
    }
}