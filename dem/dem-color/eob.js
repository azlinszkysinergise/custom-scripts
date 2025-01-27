//VERSION=3
// To set custom max and min values, set
// defaultVis to false and choose your max and
// min values. The color map will then be scaled
// to those max and min values
const defaultVis = true
const max = 9000
const min = -9000

function setup() {
    return {
        input: ["DEM", "dataMask"],
        output: [
            { id: "default", bands: 4, sampleTYPE: 'AUTO' },
            { id: "index", bands: 1, sampleType: 'FLOAT32' },
            { id: "dataMask", bands: 1 }
        ]
    };
}

function updateMap(max, min) {
    const numIntervals = map.length
    const intervalLength = (max - min) / (numIntervals - 1);
    for (let i = 0; i < numIntervals; i++) {
        map[i][0] = max - intervalLength * i
    }
}

const map = [
    [9000, 0xffffff],
    [7000, 0xdcefff],
    [5000, 0xbdc7f9],
    [3000, 0x9faaef],
    [1000, 0x788bb4],
    [500, 0x8b6d00],
    [400, 0xd292b4],
    [300, 0x78385a],
    [200, 0xaa5f00],
    [50, 0x8b4b28],
    [30, 0x782d28],
    [10, 0x63383b],
    [0, 0xc7c7c7],
    [-10, 0x9f9fff],
    [-20, 0x7878eb],
    [-50, 0x5a54f9],
    [-200, 0x3b50f5],
    [-500, 0x3b3be6],
    [-1000, 0x2831b4],
    [-6000, 0x1e1e78],
    [-9000, 0x1e005a],
    [-12000, 0x000028],
];

if (!defaultVis) updateMap(max, min);
const visualizer = new ColorRampVisualizer(map);

function evaluatePixel(sample) {
    let val = sample.DEM;
    let imgVals = visualizer.process(val)

    // Return the 4 inputs and define content for each one
    return {
        default: [...imgVals, sample.dataMask],
        index: [val],
        dataMask: [sample.dataMask]
    };
}
