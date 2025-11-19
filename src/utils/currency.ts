export function convertFromPence(totalPence: number) {
    //1 pound = 20 soli
    //1 soli = 12 pence
    //1 pound = 240 pence
     totalPence = Math.floor(totalPence);

    const pounds = Math.floor(totalPence / 240);
    const remainingAfterPounds = totalPence - pounds * 240;
    const soli = Math.floor(remainingAfterPounds / 12);
    const pence = remainingAfterPounds - soli * 12;

    const parts: string[] = [];
    if (pounds) parts.push(`${pounds} Pound${pounds > 1 ? "s" : ""}`);
    if (soli) parts.push(`${soli} Soli`);
    if (pence) parts.push(`${pence} Pence`);

    const currencyString = parts.length > 1
        ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1]
        : parts[0] || "0 Pence";

    return {
        pounds: pounds,
        soli: soli,
        pence: pence,
        string: currencyString
    }
}

export function convertToPence(pounds: number, soli: number, pence: number) {
    return (pounds*240) + (soli*12) + pence
}