export function formatNumber(num: number) {
    if (num >= 1e6) {
        // Convert to millions, round to one decimal, and remove trailing .0
        return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1e3) {
        // Convert to thousands, round to one decimal, and remove trailing .0
        return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return num.toString();
}
