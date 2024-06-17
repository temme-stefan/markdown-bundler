enum months {
    "Praios" = 1,
    "Rondra" = 2,
    "Efferd" = 3,
    "Travia" = 4,
    "Boron" = 5,
    "Hesinde" = 6,
    "Firun" = 7,
    "Tsa" = 8,
    "Phex" = 9,
    "Peraine" = 10,
    "Ingerim" = 11,
    "Rahja" = 12,
    "Namenlos" = 13
}

const daysOfMonth = (month: months) => month === months.Namenlos ? 5 : 30;
const halToBosparanFall = (hal: number) => 993 + hal;
const bosparanFallToHal = (bf: number) => bf - 993;

const moonCycleLength = 28;
const year = 365;
const moonphase: [number, number, string][] = [[0, 0, "Vollmond"], [1, 6, "abnehmend, erste Hälfte"], [7, 7, "abnehmend"], [8, 13, "abnehmend, zweite Hälfte"], [14, 14, "new moon"], [15, 20, "zunehmend, erste Hälfte"], [21, 21, "zunehmend"], [22, 27, "zunehmend, zweite Hälfte"]]

type AventurianDate = [number, months, number, "Hal" | "BF"];

const fixedFullMoon: AventurianDate = [19, months.Rondra, 24, "Hal"]

const dayOfCurrentYear = (a: AventurianDate) => {
    if (a[1] == months.Namenlos) {
        return 360 + a[0];
    } else {
        return (a[1] - 1) * 30 + a[0];
    }
}

const deltaDays = (a: AventurianDate, b: AventurianDate) => {
    const yearA = a[3] === "Hal" ? halToBosparanFall(a[2]) : a[2];
    const yearB = b[3] === "Hal" ? halToBosparanFall(b[2]) : b[2];
    const deltaYears = yearB - yearA;
    const dayA = dayOfCurrentYear(a)
    const dayB = dayOfCurrentYear(b);
    const deltadays = dayB - dayA;
    return deltaYears * year + deltadays;
}

const getMoonPhase = (a: AventurianDate) => {
    const daysSincesFullMoon = deltaDays(a, fixedFullMoon);
    const mod = ((daysSincesFullMoon % moonCycleLength) + moonCycleLength) % moonCycleLength;
    return {phase: moonphase.find(([from, to]) => from <= mod && mod <= to)[2], dayofCycle: mod};
}

const dateToString = (a: AventurianDate) => `${a[0]}. ${months[a[1]]} ${a[2]} ${a[3]}`

console.log(deltaDays([1, months.Praios, 1, "BF"], [1, months.Praios, 2, "BF"]))
console.log(deltaDays([5, months.Namenlos, 1, "BF"], [1, months.Praios, 2, "BF"]))
console.log(dateToString(fixedFullMoon), getMoonPhase(fixedFullMoon))
console.log(dateToString([22, months.Boron, 23, "Hal"]), getMoonPhase([22, months.Boron, 23, "Hal"]))
console.log(dateToString([24, months.Travia, 23, "Hal"]), getMoonPhase([24, months.Travia, 23, "Hal"]))


