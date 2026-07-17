// Curated REAL candidate locations in Texas (ERCOT) and New York (NYISO)
// data-center corridors. Coordinates are real; each site sits on or beside
// genuine power infrastructure (former smelters, hydro, nuclear, mega-parks).
// The ingestion pipeline enriches each with live public data.

export interface Candidate {
  id: string;
  name: string;
  state: "TX" | "NY";
  county: string;
  countyFips: string; // used for regional lookups
  lat: number;
  lng: number;
  iso: "ERCOT" | "NYISO";
  context: string; // why this is a real, credible site
  // Optional real known figures (public announcements / master plans).
  knownAcreage?: number;
  knownZoning?: "heavy_industrial" | "industrial" | "light_industrial" | "agricultural" | "mixed";
}

export const CANDIDATES: Candidate[] = [
  // ------------------------------ TEXAS / ERCOT ------------------------------
  { id: "tx-milam-sandow", name: "Sandow Lakes Industrial", state: "TX", county: "Milam", countyFips: "48331", lat: 30.6323, lng: -97.0011, iso: "ERCOT", context: "Former Alcoa Rockdale smelter; 33k-acre master-planned power district with existing 345kV infrastructure.", knownAcreage: 1200, knownZoning: "heavy_industrial" },
  { id: "tx-hood-comanche", name: "Comanche Peak Corridor", state: "TX", county: "Hood", countyFips: "48221", lat: 32.4417, lng: -97.7853, iso: "ERCOT", context: "Adjacent to Comanche Peak nuclear station; strong baseload and transmission.", knownZoning: "industrial" },
  { id: "tx-ellis-ennis", name: "Ennis North Industrial", state: "TX", county: "Ellis", countyFips: "48139", lat: 32.3612, lng: -96.6255, iso: "ERCOT", context: "I-45 corridor south of Dallas; established industrial base and rail.", knownZoning: "industrial" },
  { id: "tx-williamson-taylor", name: "Taylor Technology Park", state: "TX", county: "Williamson", countyFips: "48491", lat: 30.5702, lng: -97.4092, iso: "ERCOT", context: "Samsung Taylor fab corridor; heavy investment in grid and water.", knownZoning: "heavy_industrial" },
  { id: "tx-tarrant-alliance", name: "AllianceTexas North", state: "TX", county: "Tarrant", countyFips: "48439", lat: 32.9865, lng: -97.3126, iso: "ERCOT", context: "AllianceTexas logistics mega-park north of Fort Worth.", knownZoning: "industrial" },
  { id: "tx-dallas-lancaster", name: "Lancaster Logistics", state: "TX", county: "Dallas", countyFips: "48113", lat: 32.5921, lng: -96.7561, iso: "ERCOT", context: "Southern Dallas industrial submarket with substation density.", knownZoning: "industrial" },
  { id: "tx-harris-katy", name: "Katy Prairie West", state: "TX", county: "Harris", countyFips: "48201", lat: 29.8601, lng: -95.8622, iso: "ERCOT", context: "NW Houston growth edge; large tracts, dense fiber to Houston metro.", knownZoning: "light_industrial" },
  { id: "tx-bell-temple", name: "Temple Industrial Park", state: "TX", county: "Bell", countyFips: "48027", lat: 31.0982, lng: -97.3628, iso: "ERCOT", context: "I-35 corridor between Austin and Waco; growing industrial base.", knownZoning: "industrial" },
  { id: "tx-bastrop-austin", name: "Bastrop Gateway", state: "TX", county: "Bastrop", countyFips: "48021", lat: 30.1105, lng: -97.3204, iso: "ERCOT", context: "SE of Austin; near data-center cluster forming east of the metro.", knownZoning: "light_industrial" },
  { id: "tx-wise-decatur", name: "Decatur Energy Tract", state: "TX", county: "Wise", countyFips: "48497", lat: 33.2342, lng: -97.5861, iso: "ERCOT", context: "North Texas gas country; abundant land and generation.", knownZoning: "agricultural" },
  { id: "tx-nueces-corpus", name: "Corpus Christi Bayfront", state: "TX", county: "Nueces", countyFips: "48355", lat: 27.8006, lng: -97.3964, iso: "ERCOT", context: "Coastal industrial; strong power but hurricane exposure (stress-test case).", knownZoning: "heavy_industrial" },
  { id: "tx-wharton-elcampo", name: "El Campo Plains", state: "TX", county: "Wharton", countyFips: "48481", lat: 29.3105, lng: -96.1044, iso: "ERCOT", context: "Coastal plain SW of Houston; flat, cheap land, coastal risk profile.", knownZoning: "agricultural" },

  // ---------------------------- NEW YORK / NYISO -----------------------------
  { id: "ny-stlawrence-massena", name: "Massena Hydro Campus", state: "NY", county: "St. Lawrence", countyFips: "36089", lat: 44.9284, lng: -74.8907, iso: "NYISO", context: "Adjacent to NYPA St. Lawrence-FDR hydro and former Alcoa works; low-cost firm hydro power and a cold climate.", knownAcreage: 800, knownZoning: "heavy_industrial" },
  { id: "ny-niagara-falls", name: "Niagara Power Reach", state: "NY", county: "Niagara", countyFips: "36063", lat: 43.0912, lng: -79.0231, iso: "NYISO", context: "Fed by NYPA Niagara hydro, a low-cost power source.", knownZoning: "heavy_industrial" },
  { id: "ny-genesee-stamp", name: "WNY STAMP", state: "NY", county: "Genesee", countyFips: "36037", lat: 43.0803, lng: -78.3889, iso: "NYISO", context: "Science & Technology Advanced Manufacturing Park with about 1,250 shovel-ready acres and a dedicated substation.", knownAcreage: 1250, knownZoning: "heavy_industrial" },
  { id: "ny-oneida-marcy", name: "Marcy Nanocenter", state: "NY", county: "Oneida", countyFips: "36065", lat: 43.1712, lng: -75.2688, iso: "NYISO", context: "Wolfspeed/Nexus corridor near Utica; grid and water built out for fabs.", knownZoning: "heavy_industrial" },
  { id: "ny-chautauqua-dunkirk", name: "Dunkirk Repower Site", state: "NY", county: "Chautauqua", countyFips: "36013", lat: 42.4795, lng: -79.3339, iso: "NYISO", context: "Former NRG coal plant with retained transmission interconnection on Lake Erie.", knownZoning: "heavy_industrial" },
  { id: "ny-montgomery-amsterdam", name: "Mohawk Valley Tract", state: "NY", county: "Montgomery", countyFips: "36057", lat: 42.9384, lng: -74.1901, iso: "NYISO", context: "Thruway corridor between Albany and Utica; industrial land and fiber.", knownZoning: "industrial" },
  { id: "ny-franklin-malone", name: "Malone North Country", state: "NY", county: "Franklin", countyFips: "36033", lat: 44.8484, lng: -74.2915, iso: "NYISO", context: "North Country; very cold climate, near hydro-served grid.", knownZoning: "light_industrial" },
  { id: "ny-rensselaer-greenbush", name: "Capital District East", state: "NY", county: "Rensselaer", countyFips: "36083", lat: 42.6009, lng: -73.7009, iso: "NYISO", context: "Near Albany; dense fiber and interconnection to NYC latency corridor.", knownZoning: "industrial" },

  // ---------------------- TEXAS / ERCOT (expansion) --------------------------
  { id: "tx-fortbend-rosenberg", name: "Rosenberg Logistics", state: "TX", county: "Fort Bend", countyFips: "48157", lat: 29.5136, lng: -95.7788, iso: "ERCOT", context: "Southwest Houston industrial corridor with rail and pipeline access.", knownZoning: "light_industrial" },
  { id: "tx-denton-north", name: "Denton North Yard", state: "TX", county: "Denton", countyFips: "48121", lat: 33.2148, lng: -97.1331, iso: "ERCOT", context: "North of the DFW metroplex along I-35; growing logistics and industrial base.", knownZoning: "light_industrial" },
  { id: "tx-johnson-cleburne", name: "Cleburne Gas Tract", state: "TX", county: "Johnson", countyFips: "48251", lat: 32.3496, lng: -97.3861, iso: "ERCOT", context: "South of Fort Worth in gas country; transmission and open acreage.", knownZoning: "industrial" },
  { id: "tx-grayson-sherman", name: "Sherman Semiconductor Park", state: "TX", county: "Grayson", countyFips: "48181", lat: 33.6357, lng: -96.6089, iso: "ERCOT", context: "Sherman chip corridor (Texas Instruments, GlobalWafers); recent grid and water investment.", knownZoning: "heavy_industrial" },
  { id: "tx-mclennan-waco", name: "Waco Interchange", state: "TX", county: "McLennan", countyFips: "48309", lat: 31.5493, lng: -97.1467, iso: "ERCOT", context: "I-35 midpoint between DFW and Austin; industrial parks and rail.", knownZoning: "industrial" },
  { id: "tx-freestone-fairfield", name: "Big Brown Repower Site", state: "TX", county: "Freestone", countyFips: "48161", lat: 31.7246, lng: -96.1638, iso: "ERCOT", context: "Retired Big Brown coal plant with retained high-voltage transmission.", knownZoning: "industrial" },
  { id: "tx-hays-sanmarcos", name: "San Marcos Corridor", state: "TX", county: "Hays", countyFips: "48209", lat: 29.8833, lng: -97.9414, iso: "ERCOT", context: "Between Austin and San Antonio on I-35; growing, though land is tightening.", knownZoning: "light_industrial" },

  // ---------------------- NEW YORK / NYISO (expansion) -----------------------
  { id: "ny-onondaga-clay", name: "White Pine Commerce Park", state: "NY", county: "Onondaga", countyFips: "36067", lat: 43.1893, lng: -76.1936, iso: "NYISO", context: "Near the Micron program in Clay; large grid buildout underway.", knownAcreage: 1400, knownZoning: "heavy_industrial" },
  { id: "ny-saratoga-malta", name: "Luther Forest Tract", state: "NY", county: "Saratoga", countyFips: "36091", lat: 42.9834, lng: -73.7907, iso: "NYISO", context: "GlobalFoundries fab corridor; existing high-capacity power and water.", knownZoning: "heavy_industrial" },
  { id: "ny-erie-lackawanna", name: "Bethlehem Steel Brownfield", state: "NY", county: "Erie", countyFips: "36029", lat: 42.8006, lng: -78.8256, iso: "NYISO", context: "Former Bethlehem Steel works on Lake Erie; brownfield with retained heavy power service.", knownZoning: "heavy_industrial" },
  { id: "ny-monroe-rochester", name: "Eastman Business Park", state: "NY", county: "Monroe", countyFips: "36055", lat: 43.1487, lng: -77.6799, iso: "NYISO", context: "Legacy Kodak industrial campus in Rochester with on-site utilities.", knownZoning: "industrial" },
  { id: "ny-orange-montgomery", name: "Hudson Valley Gateway", state: "NY", county: "Orange", countyFips: "36071", lat: 41.5292, lng: -74.2385, iso: "NYISO", context: "Hudson Valley within the NYC latency corridor; transmission and fiber density.", knownZoning: "industrial" },
  { id: "ny-dutchess-poughkeepsie", name: "Dutchess Tech Campus", state: "NY", county: "Dutchess", countyFips: "36027", lat: 41.7004, lng: -73.9210, iso: "NYISO", context: "Longtime IBM campus area with established power and technical labor.", knownZoning: "industrial" },
];
