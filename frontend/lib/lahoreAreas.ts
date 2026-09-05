import { cleanAreaName } from "./formatLocation";

/** Famous Lahore neighborhoods — coordinates for geo-based AQI lookups */
export interface LahoreArea {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Optional search aliases */
  aliases?: string[];
}

export const LAHORE_AREAS: LahoreArea[] = [
  // --- Gulberg & Commercial Core ---
  { id: "gulberg", name: "Gulberg", lat: 31.5204, lon: 74.3437, aliases: ["gulberg iii", "gulberg 3", "main gulberg", "gulberg greens", "centre point"] },
  { id: "gulberg-ii", name: "Gulberg II", lat: 31.518, lon: 74.34, aliases: ["gulberg 2", "zahir pir"] },
  { id: "gulberg-i", name: "Gulberg I", lat: 31.526, lon: 74.335, aliases: ["gulberg 1", "home economics college"] },
  { id: "liberty", name: "Liberty Market", lat: 31.511, lon: 74.344, aliases: ["liberty", "liberty chowk", "liberty round about", "duasi"] },
  { id: "mm-alam-road", name: "MM Alam Road", lat: 31.515, lon: 74.348, aliases: ["mm alam", "restaurant street gulberg", "hussain chowk"] },
  { id: "main-market-gulberg", name: "Main Market Gulberg", lat: 31.524, lon: 74.342, aliases: ["main market", "auriga complex"] },
  { id: "hafeez-centre", name: "Hafeez Centre", lat: 31.516, lon: 74.341, aliases: ["hafeez center", "pace gulberg", "computer market"] },
  { id: "gaddafi-stadium", name: "Gaddafi Stadium", lat: 31.513, lon: 74.333, aliases: ["sports complex", "nishtar park", "national stadium"] },
  { id: "cavalry-ground", name: "Cavalry Ground", lat: 31.508, lon: 74.368, aliases: ["cavalry", "cavalry extension", "cavalry bridge"] },
  { id: "cantt", name: "Lahore Cantt", lat: 31.52, lon: 74.39, aliases: ["cantonment", "cantt lahore", "saddar cantt", "saddar bazaar", "mall road cantt"] },
  { id: "sarwar-road", name: "Sarwar Road Cantt", lat: 31.528, lon: 74.385, aliases: ["sarwar road", "cantt station", "garrison golf club"] },
  { id: "fortress-stadium", name: "Fortress Stadium", lat: 31.531, lon: 74.368, aliases: ["fortress", "joyland", "pace fortress", "hyperstar fortress"] },
  { id: "mall-of-lahore", name: "Mall of Lahore", lat: 31.525, lon: 74.372, aliases: ["cantt mall", "tufail road", "lahore cantt mall"] },

  // --- DHA Lahore (Defence Housing Authority Phases 1 to 12) ---
  { id: "dha-phase-1", name: "DHA Phase 1", lat: 31.492, lon: 74.385, aliases: ["dha 1", "defence phase 1", "h block dha", "g block dha", "k block dha"] },
  { id: "dha-phase-2", name: "DHA Phase 2", lat: 31.488, lon: 74.398, aliases: ["dha 2", "defence phase 2", "q block dha", "r block dha", "s block dha"] },
  { id: "dha-phase-3", name: "DHA Phase 3", lat: 31.478, lon: 74.38, aliases: ["dha 3", "defence phase 3", "y block dha", "y block", "xx block dha", "w block dha", "sheba park"] },
  { id: "dha-phase-4", name: "DHA Phase 4", lat: 31.47, lon: 74.405, aliases: ["dha 4", "defence phase 4", "dd block dha", "cca dha 4", "ghazi road dha"] },
  { id: "dha-phase-5", name: "DHA Phase 5", lat: 31.4734, lon: 74.4586, aliases: ["dha", "dha 5", "defence phase 5", "lalik jan chowk", "cca dha 5", "pentas dha"] },
  { id: "dha-phase-6", name: "DHA Phase 6", lat: 31.48, lon: 74.47, aliases: ["dha 6", "defence phase 6", "main boulevard dha 6", "cca 1 dha 6", "cca 2 dha 6", "raya fairways"] },
  { id: "dha-phase-7", name: "DHA Phase 7", lat: 31.465, lon: 74.492, aliases: ["dha 7", "defence phase 7", "sector y dha 7", "sector z dha 7", "sector u dha 7"] },
  { id: "dha-phase-8", name: "DHA Phase 8", lat: 31.448, lon: 74.455, aliases: ["dha 8", "defence phase 8", "air avenue", "broadway dha", "eden city", "park view dha 8"] },
  { id: "dha-phase-9", name: "DHA Phase 9 Prism", lat: 31.425, lon: 74.482, aliases: ["dha 9", "dha prism", "phase 9 town", "prism dha", "ring road phase 9"] },
  { id: "dha-rahbar", name: "DHA Rahbar (Phase 11)", lat: 31.392, lon: 74.268, aliases: ["dha rahbar", "dha phase 11", "rahbar sector 1", "rahbar sector 2"] },
  { id: "defence-raya", name: "Defence Raya", lat: 31.455, lon: 74.445, aliases: ["defence raya golf club", "raya golf resort", "raya commercial"] },
  { id: "bhatta-chowk", name: "Bhatta Chowk", lat: 31.498, lon: 74.435, aliases: ["bedian bhatta chowk", "dha bhatta chowk"] },

  // --- Johar Town & Central Southern Suburbs ---
  { id: "johar-town", name: "Johar Town", lat: 31.4697, lon: 74.2728, aliases: ["johar", "johar town phase 1", "johar town phase 2", "g1 market", "g market", "r1 johar town", "pia road"] },
  { id: "emporium-mall", name: "Emporium Mall", lat: 31.467, lon: 74.266, aliases: ["nishat emporium", "emporium", "johar town expo center", "expo centre lahore"] },
  { id: "shaukat-khanum", name: "Shaukat Khanum Hospital", lat: 31.472, lon: 74.261, aliases: ["skmh", "shaukat khanum chowk", "khayaban e firdousi"] },
  { id: "faisal-town", name: "Faisal Town", lat: 31.4906, lon: 74.3018, aliases: ["faisal town lahore", "kotha pind", "faisal town block a", "block b", "block c", "pec road"] },
  { id: "township", name: "Township", lat: 31.4661, lon: 74.3152, aliases: ["township lahore", "chandni chowk township", "township sector a", "sector b", "baghrian chowk"] },
  { id: "green-town", name: "Green Town", lat: 31.455, lon: 74.305, aliases: ["green town lahore", "baghrian", "green town sector d2", "maryam colony"] },
  { id: "kot-lakhpat", name: "Kot Lakhpat", lat: 31.464, lon: 74.335, aliases: ["kot lakhpat industrial area", "peco road", "general hospital lahore"] },
  { id: "wapda-town", name: "Wapda Town", lat: 31.4428, lon: 74.2581, aliases: ["wapda town phase 1", "wapda town phase 2", "roundabout wapda town", "wapda town block e", "block h"] },
  { id: "pia-society", name: "PIA Housing Scheme", lat: 31.455, lon: 74.265, aliases: ["pia society", "pia main boulevard", "pia colony"] },
  { id: "pcsir-society", name: "PCSIR Housing Society", lat: 31.462, lon: 74.278, aliases: ["pcsir phase 1", "pcsir phase 2", "pcsir staff colony"] },
  { id: "audit-accounts", name: "Audit & Accounts Society", lat: 31.448, lon: 74.282, aliases: ["audit accounts phase 1", "audit accounts phase 2"] },
  { id: "tech-society", name: "Tech Society", lat: 31.502, lon: 74.288, aliases: ["technologists society", "canal road tech society"] },
  { id: "canal-view", name: "Canal View Society", lat: 31.488, lon: 74.268, aliases: ["canal view", "canal view colony", "thokar canal view"] },
  { id: "judicial-colony", name: "Judicial Colony", lat: 31.452, lon: 74.252, aliases: ["judicial society", "thokar judicial colony"] },
  { id: "punjab-university-new-campus", name: "Punjab University (New Campus)", lat: 31.498, lon: 74.302, aliases: ["pu new campus", "quaid e azam campus", "pu canal road", "pu hostel"] },

  // --- Southern Suburbs & Raiwind Corridor ---
  { id: "valencia", name: "Valencia Town", lat: 31.3775, lon: 74.2389, aliases: ["valencia", "valencia homes", "valencia block a", "block h", "valencia commercial"] },
  { id: "lake-city", name: "Lake City", lat: 31.3927, lon: 74.2552, aliases: ["lake city lahore", "lake city phase 2", "lake city golf", "lake city ring road"] },
  { id: "bahria-town", name: "Bahria Town", lat: 31.3704, lon: 74.1845, aliases: ["bahria lahore", "sector c bahria", "eiffel tower bahria", "talwar chowk", "grand jamia mosque bahria", "sector a", "sector b", "sector d", "sector e", "sector f"] },
  { id: "bahria-orchard", name: "Bahria Orchard", lat: 31.325, lon: 74.195, aliases: ["orchard bahria", "bahria orchard phase 1", "bahria orchard phase 2", "phase 3", "phase 4"] },
  { id: "ali-town", name: "Ali Town", lat: 31.448, lon: 74.268, aliases: ["orange line ali town", "raiwind road ali town"] },
  { id: "dubai-town", name: "Dubai Town", lat: 31.435, lon: 74.278, aliases: ["dubai town raiwind road", "dubai town lahore"] },
  { id: "izmir-town", name: "Izmir Town", lat: 31.442, lon: 74.292, aliases: ["izmir", "izmir society"] },
  { id: "sundar", name: "Sundar Industrial Estate", lat: 31.285, lon: 74.175, aliases: ["sundar", "sunder", "sundar adda", "sundar raiwind road"] },
  { id: "chung", name: "Chung", lat: 31.438, lon: 74.318, aliases: ["chuhng", "chung multan road", "chung police training"] },
  { id: "maraka", name: "Maraka Multan Road", lat: 31.385, lon: 74.168, aliases: ["maraka", "shamke bhattian", "manga mandi"] },
  { id: "manga-mandi", name: "Manga Mandi", lat: 31.312, lon: 74.075, aliases: ["manga", "manga bypass"] },
  { id: "raiwind", name: "Raiwind City", lat: 31.248, lon: 74.215, aliases: ["raiwind markaz", "raiwind railway station", "tableeghi markaz raiwind"] },
  { id: "kahna", name: "Kahna Nau", lat: 31.368, lon: 74.368, aliases: ["kahna", "kahna kacha", "kahna flyover", "ferozepur road kahna"] },
  { id: "gajjumata", name: "Gajjumata", lat: 31.385, lon: 74.368, aliases: ["gajju matta", "metro terminal gajjumata", "youhanabad"] },
  { id: "youhanabad", name: "Youhanabad", lat: 31.402, lon: 74.365, aliases: ["yohanabad", "asif town ferozepur road"] },
  { id: "chungi-amar-sidhu", name: "Chungi Amar Sidhu", lat: 31.468, lon: 74.352, aliases: ["chungi", "amar sidhu", "ghazi chowk ferozepur road"] },
  { id: "jubilee-town", name: "Jubilee Town", lat: 31.428, lon: 74.218, aliases: ["jubilee", "jubilee society", "canal bank jubilee"] },
  { id: "lda-avenue", name: "LDA Avenue 1", lat: 31.385, lon: 74.208, aliases: ["lda avenue", "lda avenue one", "raiwind lda avenue"] },
  { id: "tariq-gardens", name: "Tariq Gardens", lat: 31.432, lon: 74.248, aliases: ["tariq garden", "khayaban e jinnah tariq garden"] },
  { id: "khayaban-e-amin", name: "Khayaban-e-Amin", lat: 31.378, lon: 74.272, aliases: ["khayaban e amin", "amin housing", "ring road amin"] },
  { id: "park-view-city", name: "Park View City", lat: 31.435, lon: 74.195, aliases: ["park view lahore", "park view multan road", "vision developers"] },
  { id: "etihad-town", name: "Etihad Town", lat: 31.425, lon: 74.225, aliases: ["etihad town phase 1", "etihad town phase 2", "etihad raiwind road"] },
  { id: "al-kabir-town", name: "Al-Kabir Town", lat: 31.348, lon: 74.205, aliases: ["al kabir phase 1", "al kabir phase 2", "al kabir town"] },

  // --- Central & Historic Lahore ---
  { id: "model-town", name: "Model Town", lat: 31.4834, lon: 74.325, aliases: ["model town lahore", "model town link road", "model town c block", "model town central park", "model town h block", "model town m block", "model town a block"] },
  { id: "model-town-link-road", name: "Model Town Link Road", lat: 31.478, lon: 74.318, aliases: ["link road", "metro cash and carry model town", "amanah mall"] },
  { id: "garden-town", name: "Garden Town", lat: 31.5036, lon: 74.3234, aliases: ["kalma chowk", "barkat market", "civic centre garden town", "tariq block", "ahmed block", "usman block", "babur block"] },
  { id: "allama-iqbal-town", name: "Allama Iqbal Town", lat: 31.5126, lon: 74.2949, aliases: ["iqbal town", "moon market", "kareem block", "chenab block", "ravi block", "huma block", "khyber block", "nishan e haider", "neelam block"] },
  { id: "mall-road", name: "Mall Road", lat: 31.568, lon: 74.31, aliases: ["the mall", "charing cross", "gpo lahore", "faisal chowk mall road", "governor house lahore", "pc hotel lahore", "lahore museum", "zoo lahore"] },
  { id: "anarkali", name: "Anarkali", lat: 31.5686, lon: 74.312, aliases: ["anarkali bazaar", "old anarkali", "new anarkali", "dhani ram road", "bano bazaar"] },
  { id: "punjab-assembly", name: "Punjab Assembly", lat: 31.568, lon: 74.302, aliases: ["civil secretariat", "ag office", "faisal chowk", "alhamra arts council"] },
  { id: "ichhra", name: "Ichhra", lat: 31.528, lon: 74.318, aliases: ["ichhra bazaar", "ichhra mor", "zaildar park ichhra", "ferozepur road ichhra"] },
  { id: "shadman", name: "Shadman", lat: 31.542, lon: 74.328, aliases: ["shadman market", "shadman 1", "shadman 2", "shadman chowk", "fatima memorial hospital"] },
  { id: "samanabad", name: "Samanabad", lat: 31.538, lon: 74.318, aliases: ["samanabad mor", "samanabad main market", "poona chowk samanabad", "dongi ground samanabad"] },
  { id: "gulshan-ravi", name: "Gulshan Ravi", lat: 31.548, lon: 74.328, aliases: ["gulshan e ravi", "gulshan ravi block a", "block f", "moon market gulshan ravi"] },
  { id: "empress-road", name: "Empress Road", lat: 31.572, lon: 74.318, aliases: ["shimla pahari", "radio pakistan lahore", "ptcl house empress road"] },
  { id: "garhi-shahu", name: "Garhi Shahu", lat: 31.565, lon: 74.335, aliases: ["garhi shahu lahore", "allama iqbal road garhi shahu", "garhi shahu chowk"] },
  { id: "islampura", name: "Islampura", lat: 31.562, lon: 74.302, aliases: ["krishan nagar", "sant nagar", "islampura main bazaar", "neela gumbad"] },
  { id: "mozang", name: "Mozang", lat: 31.552, lon: 74.315, aliases: ["mozang chungi", "mozang adda", "lytton road", "safanwala chowk", "temple road"] },
  { id: "chauburji", name: "Chauburji", lat: 31.554, lon: 74.305, aliases: ["chuburji", "chauburji park", "multan road chauburji", "orange line chauburji"] },
  { id: "data-darbar", name: "Data Darbar", lat: 31.578, lon: 74.308, aliases: ["bhati gate", "data sahab", "bhatti chowk", "katchery road"] },
  { id: "walled-city", name: "Walled City (Androon Lahore)", lat: 31.588, lon: 74.315, aliases: ["androon lahore", "lahore fort", "badshahi mosque", "shahi qila", "delhi gate", "bhati gate", "lohari gate", "shah alam market", "kashmiri gate", "taxali gate", "mori gate", "akbari gate", "roshnai gate"] },
  { id: "minar-e-pakistan", name: "Minar-e-Pakistan", lat: 31.592, lon: 74.309, aliases: ["greater iqbal park", "badshahi masjid", "azadi chowk", "circular road"] },
  { id: "badami-bagh", name: "Badami Bagh", lat: 31.595, lon: 74.328, aliases: ["badami bagh station", "lorry adda badami bagh", "sabzi mandi badami bagh"] },
  { id: "shadbagh", name: "Shadbagh", lat: 31.598, lon: 74.342, aliases: ["shad bagh", "taj ghazi chowk", "gol bagh shadbagh", "wassanpura"] },
  { id: "misri-shah", name: "Misri Shah", lat: 31.588, lon: 74.332, aliases: ["misri shah lahore", "iron market misri shah"] },
  { id: "sanda", name: "Sanda", lat: 31.562, lon: 74.288, aliases: ["sanda kalan", "sanda khurd", "bund road sanda", "rajgarh"] },
  { id: "sabzazar", name: "Sabzazar", lat: 31.472, lon: 74.288, aliases: ["sabzazar scheme", "sabzazar block a", "block b", "block g", "sabzazar stadium"] },
  { id: "hall-road", name: "Hall Road", lat: 31.562, lon: 74.318, aliases: ["electronics market hall road", "mall hall road", "beadon road"] },
  { id: "railway-station", name: "Lahore Railway Station", lat: 31.577, lon: 74.332, aliases: ["station", "lahore junction", "railway road"] },

  // --- Askari Housing Schemes (Askari 1 to 14) ---
  { id: "askari-10", name: "Askari 10", lat: 31.498, lon: 74.412, aliases: ["askari x", "airport road askari", "sector a askari 10", "sector b askari 10"] },
  { id: "askari-11", name: "Askari 11", lat: 31.468, lon: 74.418, aliases: ["askari xi", "bedian road askari", "sector a askari 11", "sector b askari 11", "sector c askari 11"] },
  { id: "askari-1", name: "Askari 1 & 2", lat: 31.535, lon: 74.372, aliases: ["askari 1", "askari 2", "cantt askari 1"] },
  { id: "askari-5", name: "Askari 5", lat: 31.512, lon: 74.385, aliases: ["askari v", "gulberg cantt askari 5"] },
  { id: "askari-9", name: "Askari 9", lat: 31.522, lon: 74.398, aliases: ["askari ix", "zarar shaheed road askari"] },

  // --- Eastern & Northern Suburbs ---
  { id: "mughalpura", name: "Mughalpura", lat: 31.575, lon: 74.365, aliases: ["mughalpura flyover", "dry port mughalpura", "lalpul", "canal mughalpura", "dharampura"] },
  { id: "harbanspura", name: "Harbanspura", lat: 31.588, lon: 74.378, aliases: ["harbanspura interchange", "harbanspura canal bank", "taj bagh"] },
  { id: "shalamar", name: "Shalamar Gardens", lat: 31.585, lon: 74.382, aliases: ["shalimar gardens", "baghbanpura", "gt road shalamar", "singhpura", "uet lahore gt road"] },
  { id: "uet-lahore", name: "UET Lahore", lat: 31.578, lon: 74.356, aliases: ["university of engineering and technology", "uet gt road", "begumpura"] },
  { id: "tajpura", name: "Tajpura", lat: 31.572, lon: 74.398, aliases: ["tajpura scheme", "tajpura ground", "shadipura"] },
  { id: "daroghawala", name: "Daroghawala", lat: 31.595, lon: 74.415, aliases: ["daroghawala chowk", "salamtpura", "gt road daroghawala"] },
  { id: "batapur", name: "Batapur", lat: 31.602, lon: 74.468, aliases: ["bambawali canal", "manawan", "batapur brm canal", "bata factory"] },
  { id: "jallo", name: "Jallo Park", lat: 31.562, lon: 74.498, aliases: ["jallo", "jallo mor", "jallo botanical garden", "jallo railway station"] },
  { id: "wagah", name: "Wagah Border", lat: 31.604, lon: 74.572, aliases: ["wagah", "wahga", "pak india border wagah"] },
  { id: "shahdara", name: "Shahdara", lat: 31.613, lon: 74.284, aliases: ["shahdara town", "ravi bridge", "begum kot", "jehangir tomb", "noor jahan tomb", "shahdara mor"] },
  { id: "ravi-town", name: "Ravi Town", lat: 31.598, lon: 74.348, aliases: ["ravi road", "timber market ravi road"] },
  { id: "kala-shah-kaku", name: "Kala Shah Kaku", lat: 31.725, lon: 74.275, aliases: ["ksk", "motorway ksk", "uet ksk campus", "gc university ksk"] },
  { id: "muridke", name: "Muridke", lat: 31.802, lon: 74.262, aliases: ["muridke gt road", "muridke city"] },

  // --- Major Arterial Corridors & Highways ---
  { id: "barki-road", name: "Barki Road", lat: 31.512, lon: 74.442, aliases: ["burki road", "barki", "paragon barki road", "hudiara drain barki"] },
  { id: "bedian-road", name: "Bedian Road", lat: 31.465, lon: 74.415, aliases: ["bedian", "bedian ring road interchange", "heir bedian road"] },
  { id: "raiwind-road", name: "Raiwind Road", lat: 31.398, lon: 74.225, aliases: ["raiwind corridor", "thokar raiwind road", "bhobtian chowk raiwind"] },
  { id: "ferozepur-road", name: "Ferozepur Road", lat: 31.478, lon: 74.332, aliases: ["ferozepur", "ghazi chowk", "qaddafi stadium ferozepur road", "kalma chowk flyover", "arfa software technology park"] },
  { id: "arfa-karim-tower", name: "Arfa Karim Technology Park", lat: 31.475, lon: 74.342, aliases: ["arfa tower", "arfa software park", "astp", "itu lahore"] },
  { id: "multan-road", name: "Multan Road", lat: 31.485, lon: 74.262, aliases: ["yateem khana chowk", "chowk yateem khana", "thokar multan road", "bund road multan road"] },
  { id: "walton-road", name: "Walton Road", lat: 31.495, lon: 74.368, aliases: ["walton", "nishat colony", "walton airport", "packages mall walton road"] },
  { id: "packages-mall", name: "Packages Mall", lat: 31.478, lon: 74.355, aliases: ["packages", "walton packages mall", "shahrah e roomi packages"] },
  { id: "jail-road", name: "Jail Road", lat: 31.54, lon: 74.335, aliases: ["lahore college", "services hospital", "shadman jail road", "kinniard college", "apwa college", "race course park"] },
  { id: "canal-bank-road", name: "Canal Bank Road", lat: 31.505, lon: 74.325, aliases: ["canal road lahore", "canal view", "campus bridge", "doctors hospital canal road", "fc college canal"] },
  { id: "pine-avenue", name: "Pine Avenue", lat: 31.395, lon: 74.248, aliases: ["pine ave", "valencia pine avenue", "lake city pine avenue"] },
  { id: "khayaban-e-jinnah", name: "Khayaban-e-Jinnah", lat: 31.435, lon: 74.265, aliases: ["jinnah road", "shaukat khanum khayaban e jinnah"] },
  { id: "thokar-niaz-baig", name: "Thokar Niaz Baig", lat: 31.458, lon: 74.248, aliases: ["thokar", "motorway M2 entry", "thokar chowk", "multan road thokar", "canal thokar"] },
  { id: "ring-road-lahore", name: "Lahore Ring Road (L-20)", lat: 31.465, lon: 74.455, aliases: ["ring road", "lahore ring road", "lrr", "kamahan interchange", "ghazi road interchange"] },

  // --- Major Societies & Suburbs ---
  { id: "paragon-city", name: "Paragon City", lat: 31.535, lon: 74.468, aliases: ["paragon", "paragon imperial block", "paragon executive block", "paragon barki road"] },
  { id: "state-life", name: "State Life Society", lat: 31.458, lon: 74.432, aliases: ["state life phase 1", "state life phase 2", "state life ring road", "state life block a"] },
  { id: "central-park", name: "Central Park Housing Scheme", lat: 31.348, lon: 74.358, aliases: ["central park lahore", "central park medical college", "ferozepur road central park"] },
  { id: "sui-gas-society", name: "Sui Gas Housing Society", lat: 31.442, lon: 74.448, aliases: ["sui gas phase 1", "sui gas phase 2", "sui gas dha phase 5"] },
  { id: "pak-arab", name: "Pak Arab Housing Society", lat: 31.448, lon: 74.388, aliases: ["pak arab ferozepur road", "pak arab phase 1", "pak arab phase 2"] },
  { id: "punjab-society", name: "Punjab Society", lat: 31.478, lon: 74.355, aliases: ["punjab govt employees housing", "punjab society phase 1", "punjab society phase 2"] },
  { id: "nfc", name: "NFC Society", lat: 31.462, lon: 74.378, aliases: ["nfc phase 1", "nfc phase 2", "nfc lahore", "nfc multan road"] },
  { id: "bhobtian-chowk", name: "Bhobtian Chowk", lat: 31.4486, lon: 74.4094, aliases: ["bhobtian", "uol bhobtian", "university of lahore bhobtian chowk"] },
  { id: "college-road", name: "College Road", lat: 31.438, lon: 74.268, aliases: ["college road township", "ghazi chowk college road"] },
  { id: "allama-iqbal-airport", name: "Allama Iqbal International Airport", lat: 31.521, lon: 74.403, aliases: ["lahore airport", "airport", "lhr airport", "civil aviation", "airport terminal"] },
  { id: "lums-university", name: "LUMS (Lahore University of Management Sciences)", lat: 31.472, lon: 74.409, aliases: ["lums", "dha lums", "lums campus", "opposite dha phase 5"] },
  { id: "fast-nuces", name: "FAST-NUCES Lahore", lat: 31.481, lon: 74.303, aliases: ["fast nu", "fast university faisal town", "fast university"] },
  { id: "university-of-lahore", name: "University of Lahore (UOL)", lat: 31.392, lon: 74.242, aliases: ["uol 1-km defence road", "uol", "uol main campus"] },
  { id: "doctors-hospital", name: "Doctors Hospital", lat: 31.482, lon: 74.275, aliases: ["doctors hospital johar town", "canal road doctors hospital"] },
  { id: "jinnah-hospital", name: "Jinnah Hospital", lat: 31.492, lon: 74.295, aliases: ["allama iqbal medical college", "jinnah hospital faisal town"] },
  { id: "services-hospital", name: "Services Hospital", lat: 31.538, lon: 74.335, aliases: ["sims", "services hospital jail road", "race course services hospital"] },
  { id: "mayo-hospital", name: "Mayo Hospital", lat: 31.572, lon: 74.316, aliases: ["kemu", "king edward medical university", "mayo hospital anarkali"] },
  { id: "general-hospital", name: "Lahore General Hospital (LGH)", lat: 31.448, lon: 74.348, aliases: ["lgh", "general hospital ferozepur road", "ameer ud din medical college"] },
];

export const LAHORE_ROTATE_MS = 45_000;

function normalizeSearch(q: string): string {
  return cleanAreaName(q).toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();
}

function tokens(q: string): string[] {
  return normalizeSearch(q).split(/\s+/).filter((t) => t.length > 0);
}

function scoreArea(area: LahoreArea, q: string, toks: string[]): number {
  const name = area.name.toLowerCase();
  const id = area.id.replace(/-/g, " ");
  const aliasList = (area.aliases ?? []).map((a) => a.toLowerCase());
  let score = 0;

  if (!q) return 1;

  if (name === q || id === q) score = 100;
  else if (aliasList.includes(q)) score = 95;
  else if (name.startsWith(q) || id.startsWith(q)) score = 85;
  else if (aliasList.some((a) => a.startsWith(q))) score = 82;
  else if (name.includes(q) || id.includes(q)) score = 70;
  else if (aliasList.some((a) => q.includes(a) || a.includes(q))) score = 65;

  for (const t of toks) {
    if (t.length < 2) continue;
    if (name === t || id === t) score = Math.max(score, 90);
    else if (name.startsWith(t) || id.startsWith(t)) score = Math.max(score, 75);
    else if (name.includes(t) || id.includes(t)) score = Math.max(score, 55);
    else if (aliasList.some((a) => a.includes(t) || t.includes(a))) score = Math.max(score, 50);
    else {
      const nameWords = name.split(/\s+/);
      if (nameWords.some((w) => w.startsWith(t))) score = Math.max(score, 48);
    }
  }

  if (score === 0 && q.length >= 2) {
    const compact = q.replace(/\s/g, "");
    const compactName = name.replace(/\s/g, "");
    if (compactName.includes(compact) || (compact.length >= 3 && compactName.includes(compact.slice(0, 3)))) {
      score = 35;
    }
  }

  return score;
}

/** Type-ahead search for user-driven location pickers */
export function searchAreas(query: string, limit = 16): LahoreArea[] {
  const q = normalizeSearch(query);
  if (!q) return LAHORE_AREAS.slice(0, limit);

  const toks = tokens(q);
  return LAHORE_AREAS.map((area) => ({ area, score: scoreArea(area, q, toks) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.area.name.localeCompare(b.area.name))
    .slice(0, limit)
    .map((x) => x.area);
}

/** Match user-typed area names to a known zone (returns undefined if no real match so Nominatim/Photon geocoding triggers) */
export function findAreaByName(query: string): LahoreArea | undefined {
  const q = normalizeSearch(query);
  if (!q) return undefined;

  // Exact or high-confidence match only
  for (const area of LAHORE_AREAS) {
    const name = area.name.toLowerCase();
    const id = area.id.replace(/-/g, " ");
    const aliasList = (area.aliases ?? []).map((a) => a.toLowerCase());

    if (name === q || id === q || aliasList.includes(q)) {
      return area;
    }
  }

  // Check prefix match or alias match
  for (const area of LAHORE_AREAS) {
    const name = area.name.toLowerCase();
    const aliasList = (area.aliases ?? []).map((a) => a.toLowerCase());
    if (name.startsWith(q) || q.startsWith(name)) {
      return area;
    }
    for (const al of aliasList) {
      if (al.startsWith(q) || q.startsWith(al)) {
        return area;
      }
    }
  }

  return undefined;
}

