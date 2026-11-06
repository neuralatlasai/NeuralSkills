// Deliberately no AbortSignal: consumers must guard every resolution/rejection.
export function findGuides(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    const delay = query === "cedar" ? 1200 : query === "moss" ? 180 : query === "fail" ? 650 : 300;
    return new Promise((resolve, reject) => {
        window.setTimeout(() => {
            if (query === "fail") {
                reject(new Error("The field guide service is temporarily unavailable."));
                return;
            }
            const guides = query === "empty" ? [] : query === "moss" ? [
                { id: "moss-1", title: "Mosses of the rain-soaked northern woodland", habitat: "Woodland", pages: 84 },
                { id: "moss-2", title: "Pocket guide to urban moss", habitat: "Urban", pages: 46 }
            ] : query === "cedar" ? [
                { id: "cedar-1", title: "Cedar trails and their seasonal wildlife", habitat: "Forest", pages: 112 }
            ] : [
                { id: "general-1", title: "An introduction to field observation", habitat: "Mixed", pages: 64 }
            ];
            resolve({ query, guides });
        }, delay);
    });
}
