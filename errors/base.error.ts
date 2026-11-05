export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string = "APP_ERROR",
        public readonly statusCode: number = 500,
    ) {
        super(message);
        this.name = "AppError";
    }
}