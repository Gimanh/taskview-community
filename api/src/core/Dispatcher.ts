export interface Dispatcher {
    register(): void;
    registerWorkers(): Promise<void>;
}
