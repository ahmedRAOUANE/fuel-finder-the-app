declare module "media-pipeline" {
    export interface PipelineFile {
        buffer: Buffer;
        filename: string;
        mimeType: string;
        size: number;
    }

    export interface PipelineResult {
        url: string;
        path: string;
        size: number;
        metadata: Record<string, unknown>;
    }

    export interface PipelineConfig {
        validators?: Array<(ctx: unknown) => void | Promise<void>>;
        processors?: Array<(ctx: unknown) => unknown | Promise<unknown>>;
        storage?: unknown;
        hooks?: Record<string, unknown>;
    }

    export function createPipeline(config?: PipelineConfig): {
        process(file: PipelineFile): Promise<PipelineResult>;
    };

    export function localStorage(basePath: string): unknown;
    export function maxSize(limit: number): (ctx: unknown) => void;
    export function allowedMimeTypes(types: string[]): (ctx: unknown) => void;
}