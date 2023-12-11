export function omitKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = {...obj};
    for (let key of keys) {
        delete result[key];
    }
    return result;
}
