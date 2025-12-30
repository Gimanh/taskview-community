import { $logger } from '../modules/logget';

export function isEmail(email: string): boolean {
    const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

export function generateString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export function time() {
    return Math.floor(Date.now() / 1000);
}

export async function delay(delay: number): Promise<void> {
    return new Promise((r) => {
        setTimeout(r, delay);
    });
}

export function isNotNullable<T>(val: T): val is Exclude<T, null | undefined> {
    return val !== undefined && val !== null;
}

export async function callWithCatch<T>(func: () => Promise<T>): Promise<T | null> {
    try {
        return await func();
    } catch (error) {
        $logger.error(error, 'Error calling function');
        return null;
    }
}


export const chunk = <T>(array: T[], size: number): T[][] => {
    if (!Array.isArray(array)) {
        throw new TypeError('Expected array');
    }

    if (size <= 0) {
        throw new Error('Chunk size must be greater than 0');
    }

    const result: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }

    return result;
}