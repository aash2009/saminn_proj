// Regenerates src/roads.js -- the road geometry drawn on the map.
//
//   node scripts/fetch-roads.mjs
//
// Pulls major roads for the McKinney/Plano area from OpenStreetMap through the
// Overpass API, chains the fragments into continuous lines, simplifies them,
// and writes a compact data file. After this runs, the app needs no network.
//
// You only need to run this if the service area changes. The road network
// itself barely moves year to year.
//
// Road data is (c) OpenStreetMap contributors under the ODbL. The attribution
// printed on every map in src/pdf.js is required -- do not remove it.

