const skt = [
    [1, 1, 2, 2, 3, 4, 6, 8, 16],
    [1, 2, 4, 6, 7, 9, 14, 18, 35],
    [1, 3, 6, 9, 12, 15, 22, 30, 60],
    [2, 4, 8, 13, 17, 21, 32, 42, 85],
    [4, 6, 11, 17, 22, 28, 41, 55, 110],
    [5, 7, 14, 21, 27, 34, 50, 70, 140],
    [6, 8, 17, 25, 33, 41, 60, 58, 165],
    [8, 10, 19, 29, 39, 48, 75, 95, 195],
    [9, 11, 22, 34, 45, 55, 85, 110, 220],
    [11, 13, 25, 38, 50, 65, 95, 125, 250],
    [12, 14, 28, 43, 55, 70, 105, 140, 280],
    [14, 16, 32, 47, 65, 80, 120, 160, 320],
    [15, 17, 35, 51, 70, 85, 130, 175, 350],
    [17, 19, 38, 55, 75, 95, 140, 190, 380],
    [19, 21, 41, 60, 85, 105, 155, 210, 410],
    [20, 22, 45, 65, 90, 110, 165, 220, 450],
    [22, 24, 48, 70, 95, 120, 180, 240, 480],
    [24, 26, 51, 75, 105, 130, 195, 260, 510],
    [25, 27, 55, 80, 110, 135, 210, 270, 550],
    [27, 29, 58, 85, 115, 145, 220, 290, 580],
    [29, 31, 62, 95, 125, 155, 230, 310, 620],
    [31, 33, 65, 100, 130, 165, 250, 330, 650],
    [32, 34, 69, 105, 140, 170, 260, 340, 690],
    [34, 36, 73, 110, 145, 180, 270, 360, 720],
    [36, 38, 76, 115, 150, 190, 290, 380, 760],
    [38, 40, 80, 120, 160, 200, 300, 400, 800],
    [40, 42, 84, 125, 165, 210, 310, 420, 830],
    [42, 44, 87, 130, 170, 220, 330, 440, 870],
    [43, 45, 91, 135, 180, 230, 340, 460, 910],
    [45, 47, 95, 140, 190, 240, 350, 480, 950],
    [48, 50, 100, 150, 200, 250, 375, 500, 1000]
];
export const colKeys = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"];
const sktMap = new Map(colKeys.map((key, index) => [key, new Map(skt.map((val, row) => [row + 1, val[index]]))]));
function validateLevel(level) {
    if (level < 1) {
        throw "level should at least be one";
    }
    if (level > 31) {
        level = 31;
        console.warn("treat level as 31");
    }
    return level;
}
export function activate(level, col) {
    level = validateLevel(level);
    return sktMap.get(col).get(level);
}
export function leverage(from, to, level, col) {
    level = validateLevel(level);
    if (from > to) {
        throw "from should be bigger than to";
    }
    const colData = sktMap.get(col);
    let sum = 0;
    for (let i = from + 1; i <= to; i++) {
        if (i <= 0) {
            sum += activate(level, col);
        }
        else {
            sum += colData.get(i);
        }
    }
    return sum;
}
export default { activate, leverage };
