export class RequestQueue {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private queue: (() => Promise<any>)[] = [];
    private isProcessing = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    add(request: () => Promise<any>): void {
        this.queue.push(request);
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const currentRequest = this.queue.shift();

            if (currentRequest) {
                try {
                    await currentRequest();
                } catch (error) {
                    console.error('Request failed:', error);
                }
            }
        }

        this.isProcessing = false;
    }
}
