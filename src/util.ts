export function toTitleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, function (a) { return a.toUpperCase(); })
}

export function arraysEqual<T>(a: T[], b: T[], comparator: ((x: T, y: T) => boolean)) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; ++i)
        if (!comparator(a[i], b[i]))
            return false;
    return true;
}