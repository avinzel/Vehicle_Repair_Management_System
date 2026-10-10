// src/data/vehicleCatalog.js
//
// Bundled brand -> model catalog for the Vehicle Details step. It ships with
// the app, so it works with no internet connection.
//
// This is a STARTER list of commonly seen Philippine-market vehicles. Edit it
// freely: add what your shop actually sees, remove what it doesn't. Anything
// not listed can still be typed by hand, and brands/models you type get
// remembered automatically (see rememberVehicle in vehicleLookup.js).
//
// Tricycles reuse the MOTORCYCLE list (they are motorcycles with sidecars).

export const VEHICLE_CATALOG = {
  CAR: {
    Audi: ["A3", "A4", "Q3", "Q5"],
    BMW: ["1 Series", "3 Series", "5 Series", "X1", "X3", "X5"],
    BYD: ["Atto 3", "Dolphin", "Seal"],
    Chery: ["Tiggo 2 Pro", "Tiggo 5x", "Tiggo 7 Pro", "Tiggo 8 Pro"],
    Chevrolet: ["Aveo", "Colorado", "Cruze", "Sail", "Spark", "Trailblazer"],
    Foton: ["Gratour", "Thunder", "Toplander", "Tornado", "Traveller"],
    Ford: ["EcoSport", "Everest", "Explorer", "Fiesta", "Focus", "Ranger", "Territory"],
    Geely: ["Azkarra", "Coolray", "Emgrand", "Okavango"],
    Honda: ["Accord", "BR-V", "Brio", "City", "Civic", "CR-V", "HR-V", "Jazz", "Mobilio"],
    Hyundai: ["Accent", "Creta", "Elantra", "Eon", "H-100", "Kona", "Reina", "Santa Fe", "Starex", "Stargazer", "Tucson"],
    Isuzu: ["Alterra", "Crosswind", "D-Max", "mu-X", "Traviz"],
    Kia: ["Carnival", "Picanto", "Rio", "Seltos", "Sorento", "Soluto", "Sportage", "Stonic"],
    Mazda: ["BT-50", "CX-3", "CX-30", "CX-5", "CX-8", "Mazda2", "Mazda3", "Mazda6"],
    "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "GLC"],
    MG: ["MG 3", "MG 5", "MG HS", "MG RX5", "MG ZS"],
    Mitsubishi: ["Adventure", "L300", "Lancer EX", "Mirage", "Mirage G4", "Montero Sport", "Outlander", "Strada", "Xpander", "Xpander Cross"],
    Nissan: ["Almera", "Kicks", "Livina", "Navara", "Patrol", "Sentra", "Terra", "Urvan"],
    Subaru: ["Crosstrek", "Forester", "Impreza", "Outback", "WRX", "XV"],
    Suzuki: ["APV", "Carry", "Celerio", "Ciaz", "Dzire", "Ertiga", "Jimny", "S-Presso", "Swift", "XL7"],
    Toyota: ["Alphard", "Avanza", "Camry", "Corolla Altis", "Corolla Cross", "Fortuner", "Hiace", "Hilux", "Innova", "Land Cruiser", "Land Cruiser Prado", "Raize", "RAV4", "Rush", "Veloz", "Vios", "Wigo", "Yaris", "Yaris Cross"],
    Volkswagen: ["Lavida", "Polo", "Tiguan"],
  },

  MOTORCYCLE: {
    Bajaj: ["Boxer 150", "Dominar 400", "Pulsar 200NS", "Pulsar N160"],
    Honda: ["ADV 160", "Beat", "CB150X", "CBR150R", "CRF150L", "Click 125i", "Click 160", "Genio", "PCX 160", "TMX 125 Alpha", "TMX 155", "Wave RSX", "Winner X", "XR150L", "XRM 125"],
    Kawasaki: ["Barako 175", "Barako II", "CT100", "KLX 150", "KLX 230", "Ninja 400", "Ninja 650", "Rouser NS125", "Rouser NS160", "Rouser NS200", "Versys-X 300", "W175", "Z400", "Z650"],
    KTM: ["Duke 200", "Duke 390"],
    Kymco: ["Like 125", "Like 150i"],
    "Royal Enfield": ["Classic 350", "Himalayan", "Hunter 350", "Meteor 350"],
    Suzuki: ["Address", "Avenis 125", "Burgman Street 125EX", "Gixxer 155", "Gixxer SF 250", "GSX-R150", "GSX-S150", "Raider J Crossover", "Raider R150", "Skydrive Sport", "Smash 115"],
    Yamaha: ["Aerox 155", "Fazzio", "FZi", "Mio Gear", "Mio Gravis", "Mio i125", "Mio Soul i125", "Mio Sporty", "MT-15", "NMAX 155", "Sight 115", "Sniper 155", "XMAX 300", "XSR155", "YZF-R15"],
  },
};