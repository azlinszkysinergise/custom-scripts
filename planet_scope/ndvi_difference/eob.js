//VERSION=3
// Script to extract NDVI difference between the latest acquisition and the acquisition 10-day prior to the latest within a specified time range
// To be used on EO Browser. Makes statistics work in EOB
function setup() {
    return {
        input: [{
            bands: ["Red", "NIR", "dataMask"],
            units: "DN"
        }],
        output: [
            { id: "default", bands: 4 },
            { id: "index", bands: 1, sampleType: "FLOAT32" },
            { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" },
            { id: "dataMask", bands: 1 }
        ],
        mosaicking: Mosaicking.ORBIT
    }

}

function evaluatePixel(samples) {
    // ndvi difference
    let latest = samples[0];
    let prior = samples[1];
    let dataMask = latest.dataMask * prior.dataMask;
    const diff = dataMask === 1 ? index(latest.NIR, latest.Red) - index(prior.NIR, prior.Red) : NaN;

    // visualisation
    const ramps = [
        [-2, 0x8e0152],
        [-1, 0xc51b7d],
        [-0.5, 0xde77ae],
        [0, 0xf7f7f7],
        [0.5, 0x7fbc41],
        [1, 0x4d9221],
        [2, 0x276419]
    ]
    const visualizer = new ColorRampVisualizer(ramps);
    let imgVals = visualizer.process(diff);
    return {
        default: imgVals.concat(dataMask),
        index: [diff],
        eobrowserStats: [diff, dataMask],
        dataMask: [dataMask]
    };
}

function preProcessScenes(collections) {
    // sort from most recent to least recent
    collections.scenes.orbits = collections.scenes.orbits.sort(
        (s1, s2) => new Date(s2.dateFrom) - new Date(s1.dateFrom)
    );

    let scenes = collections.scenes.orbits;
    let latest;
    let closest;
    latest = closest = scenes[0];

    // timestamp of 10-day prior to latest acquisition
    let target = new Date(new Date(latest.dateFrom).getTime() - 10 * 24 * 3600 * 1000);

    // find closet timestamp to the target
    let diff = Number.POSITIVE_INFINITY;
    for (let i = 1; i < scenes.length; i++) {
        current = new Date(scenes[i].dateFrom);
        if (Math.abs(current - target) >= diff) { break; }
        diff = Math.abs(current - target);
        closest = scenes[i];
    }

    // filter collections to keep the latest acquisition and the closest acquisitions to the target
    collections.scenes.orbits = collections.scenes.orbits.filter(function (orbit) {
        var orbitDateFrom = orbit.dateFrom;
        return [latest.dateFrom, closest.dateFrom].includes(orbitDateFrom);
    })
    return collections
}