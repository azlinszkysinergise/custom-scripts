//VERSION=3
//// STARTING OPTIONS
// choose on basis of which band (B10 or B11) LST mapping will be done
var band = "B10";

// for one image (EO Browser), choose option=0. For MULTI-TEMPORAL analysis:
// 0 - average LST over the selected timeline (cloud coverage should be low, e.g. < 10%)
// 1 - maximum LST over the selected timeline (cloud coverage can be high)
// 2 - standard deviation of LST; minC/maxC are overwritten with 0 and 25 (cloud coverage < 5%)
var option = 0;

// min/max values (°C) for the output colour palette. Option 2 overwrites these.
var minC = 10;
var maxC = 60;

//// INPUT DATA - FOR BETTER RESULTS, ADJUST TO YOUR SCENE
var NDVIs = 0.2;
var NDVIv = 0.8;

// emissivity values
var waterE = 0.991;
var soilE = 0.966;
var vegetationE = 0.973;
// Metal roofs: 0.55 accounts for weathering, dirt and paint on real-world urban metal roofs.
// A value near 0.25 is too low for a 30 m mixed pixel and mathematically exaggerates temperatures (>75 C).
var metalE = 0.55;

var C = 0.009; // surface roughness

// central/mean wavelength in meters, B10 or B11
var bCent = band == "B10" ? 0.000010895 : 0.000012005;

// rho = h*c/sigma = PlanckC*velocityLight/BoltzmannC
var rho = 0.01438; // m K

//// visualization
if (option == 2) {
  minC = 0;
  maxC = 25;
}

function setup() {
  return {
    input: [
      {
        bands: ["B03", "B04", "B05", "B06", band],
      },
    ],
    mosaicking: "ORBIT",
    output: { bands: 3 },
  };
}

// Emissivity classification: water and metal roofs use SWIR (B06); soil/vegetation use NDVI.
function LSEcalc(NDVI, Pv, B04, B06) {
  var LSE;

  // 1. Water: low NDVI and very low SWIR reflectance
  if (NDVI < 0 && B06 < 0.05) {
    LSE = waterE;
  }
  // 2. Metal roofs: low NDVI and high SWIR/visible reflectance.
  //    B06 > 0.35 keeps light concrete from being misclassified as metal.
  else if (NDVI < 0.15 && B06 > 0.35 && B04 > 0.2) {
    LSE = metalE;
  }
  // 3. Soil / standard urban: low NDVI, moderate reflectance
  else if (NDVI < NDVIs) {
    LSE = soilE;
  }
  // 4. Dense vegetation (forests): high NDVI
  else if (NDVI > 0.7) {
    LSE = 0.985;
  }
  // 5. Moderate vegetation (grasslands / parks)
  else if (NDVI > 0.4) {
    LSE = 0.975;
  }
  // 6. Mixed pixels
  else {
    LSE = vegetationE * Pv + soilE * (1 - Pv) + C;
  }

  return LSE;
}

function evaluatePixel(samples) {
  // starting values for max, avg, stdev, reduced-N (multi-temporal)
  var LSTmax = -999;
  var LSTavg = 0;
  var LSTstd = 0;
  var reduceNavg = 0;
  var N = samples.length;

  // all pixel values over the timeline (mosaic order)
  var LSTarray = [];

  // multi-temporal: loop all samples in the selected timeline
  for (var i = 0; i < N; i++) {
    var Bi = samples[i][band];
    var B03i = samples[i].B03;
    var B04i = samples[i].B04;
    var B05i = samples[i].B05;
    var B06i = samples[i].B06;

    // skip error images (whole-scene thermal out of range, or B03/B04/B05 = 0); reduce N accordingly
    if (Bi > 173 && Bi < 65000 && B03i > 0 && B04i > 0 && B05i > 0) {
      //2 NDVI
      var NDVIi = (B05i - B04i) / (B05i + B04i);
      //3 PV - proportional vegetation
      var PVi = Math.pow((NDVIi - NDVIs) / (NDVIv - NDVIs), 2);
      //4 LSE - land surface emissivity
      var LSEi = LSEcalc(NDVIi, PVi, B04i, B06i);
      //5 LST - correction in Kelvin, then converted to Celsius
      var LST_Kelvin = Bi / (1 + ((bCent * Bi) / rho) * Math.log(LSEi));
      var LSTi = LST_Kelvin - 273.15;

      LSTavg = LSTavg + LSTi;
      if (LSTi > LSTmax) {
        LSTmax = LSTi;
      }
      LSTarray.push(LSTi);
    } else {
      ++reduceNavg;
    }
  }
  // correct N for skipped images
  N = N - reduceNavg;

  // no valid samples -> nothing to show
  if (N === 0) {
    return [0, 0, 0];
  }

  // final average
  LSTavg = LSTavg / N;

  // final standard deviation
  for (var i = 0; i < LSTarray.length; i++) {
    LSTstd = LSTstd + Math.pow(LSTarray[i] - LSTavg, 2);
  }
  LSTstd = Math.pow(LSTstd / (LSTarray.length - 1), 0.5);

  // option: 0 -> avg (single image / multi-temporal average), 1 -> max, 2 -> stdev
  let outLST = option == 0 ? LSTavg : option == 1 ? LSTmax : LSTstd;

  // standard deviation (option 2): simple grayscale
  if (option == 2) {
    return [outLST / maxC, outLST / maxC, outLST / maxC];
  }

  // dynamic colour stops scaled between minC and maxC
  var step = (maxC - minC) / 5;

  return colorBlend(
    outLST,
    [minC, minC + step, minC + 2 * step, minC + 3 * step, minC + 4 * step, maxC],
    [
      [0.0, 0.0, 1.0], // blue (minC)
      [0.5, 1.0, 0.5], // light green
      [1.0, 1.0, 0.0], // yellow
      [1.0, 0.0, 0.0], // red
      [0.6, 0.0, 1.0], // violet
      [1.0, 1.0, 1.0], // white (>= maxC)
    ]
  );
}
