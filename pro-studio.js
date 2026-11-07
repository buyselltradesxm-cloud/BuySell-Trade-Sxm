/* Buy Sell Trade Sxm -- Studio Pro: the posting space for subscribed businesses.
 *
 * Shared by index.html and marketplace.html, loaded after app-index.js /
 * app-marketplace.js: it uses their globals (state, L, userListings, SB, esc,
 * dataArgs, showToast, openModal, closeModal, ...). Handlers are top-level
 * functions so the delegated data-click/data-input dispatcher finds them.
 *
 * Each activity is a template: shared fields (filled once for the whole batch)
 * and item fields (one card per offer). Extra fields are stored in the
 * listing's `details` JSON column and rendered escaped by proDetailsHTML(). */

const STUDIO_DRAFT_KEY = "proStudioDraft";
const STUDIO_MAX_ITEMS = 20;
const STUDIO_MAX_LINES = 40;
const STUDIO_MAX_PHOTOS = 8;
// Keys stored on the listing itself rather than in details.f.
const STUDIO_LISTING_KEYS = new Set(["title", "price", "desc", "area", "phone", "cur"]);
const STUDIO_VEHICLE_KEYS = new Set(["year", "km", "color", "fuel", "transmission"]);

function tr(pair){ return Array.isArray(pair) ? pair[state.lang === "fr" ? 0 : 1] : (pair || ""); }

/* ---------------- field and option catalogue ---------------- */
const SF = {
  text:(k, l, o={})=>({k, t:"text", l, ...o}),
  num:(k, l, o={})=>({k, t:"num", l, ...o}),
  money:(k, l, o={})=>({k, t:"money", l, ...o}),
  date:(k, l, o={})=>({k, t:"date", l, ...o}),
  url:(k, l, o={})=>({k, t:"url", l, ...o}),
  chips:(k, l, opts, o={})=>({k, t:"chips", l, o:opts, ...o}),
  choice:(k, l, opts, o={})=>({k, t:"choice", l, o:opts, ...o}),
  days:(k, l)=>({k, t:"days", l, o:STUDIO_DAYS}),
  hours:(k, l)=>({k, t:"hours", l}),
  lines:(k, l, cols, o={})=>({k, t:"lines", l, cols, ...o}),
  title:(l, ph)=>({k:"title", t:"text", l, ph, req:true, max:140}),
  desc:()=>({k:"desc", t:"textarea", l:["Description (facultatif)", "Description (optional)"]}),
  area:(l=["Zone", "Area"])=>({k:"area", t:"area", l, req:true}),
  phone:(l=["Téléphone / WhatsApp", "Phone / WhatsApp"])=>({k:"phone", t:"tel", l}),
  cur:()=>({k:"cur", t:"choice", l:["Devise", "Currency"], o:[["usd", "USD $", "USD $"], ["eur", "EUR €", "EUR €"]]})
};
const STUDIO_DAYS = [["mon","Lun","Mon"],["tue","Mar","Tue"],["wed","Mer","Wed"],["thu","Jeu","Thu"],["fri","Ven","Fri"],["sat","Sam","Sat"],["sun","Dim","Sun"]];
const STUDIO_LANGS = [["fr","Français","French"],["en","Anglais","English"],["nl","Néerlandais","Dutch"],["es","Espagnol","Spanish"],["kreyol","Créole","Creole"]];
const STUDIO_FUEL = [["gas","Essence","Gasoline"],["diesel","Diesel","Diesel"],["hybrid","Hybride","Hybrid"],["electric","Électrique","Electric"]];
const STUDIO_TRANS = [["automatic","Automatique","Automatic"],["manual","Manuelle","Manual"]];
const STUDIO_AC = ["ac","Climatisation","Air conditioning"];

const STUDIO_TEMPLATES = [
  {id:"location", icon:"car", cat:"locvoit", multi:true, vehicle:true,
    l:["Location de voitures","Car rentals"], s:["Votre flotte, prix par jour","Your fleet, daily rates"],
    one:["voiture","car"], many:["voitures","cars"], add:["Ajouter une voiture","Add a car"], unit:["/ jour","/ day"],
    shared:[SF.area(["Agence / point de retrait","Office / pick-up point"]),
      SF.chips("handover",["Remise du véhicule","Vehicle hand-over"],[["airport-sxm","Aéroport Juliana","Juliana Airport"],["airport-gce","Aéroport Grand Case","Grand Case Airport"],["port","Port","Port"],["hotel","À l'hôtel","At your hotel"]]),
      SF.text("deposit",["Caution","Deposit"],{half:true, ph:["Ex. 500 $","E.g. $500"]}),
      SF.text("minAge",["Âge minimum","Minimum age"],{half:true, ph:["Ex. 21 ans","E.g. 21"]}),
      SF.cur(), SF.phone(["WhatsApp de réservation","Booking WhatsApp"])],
    item:[SF.title(["Marque et modèle","Make and model"],["Ex. Toyota Yaris","E.g. Toyota Yaris"]),
      SF.num("year",["Année","Year"],{half:true}), SF.num("seats",["Places","Seats"],{half:true}),
      SF.choice("transmission",["Boîte de vitesses","Transmission"],STUDIO_TRANS),
      SF.choice("fuel",["Carburant","Fuel"],STUDIO_FUEL),
      SF.chips("equipment",["Équipements","Equipment"],[STUDIO_AC,["4x4","4x4","4x4"],["convertible","Cabriolet","Convertible"],["child-seat","Siège enfant","Child seat"],["carplay","CarPlay / Android Auto","CarPlay / Android Auto"]]),
      SF.money("price",["Prix / jour","Price / day"],{half:true, req:true}),
      SF.money("week",["Prix / semaine","Price / week"],{half:true}),
      SF.text("km",["Kilométrage inclus","Included mileage"],{ph:["Ex. Illimité","E.g. Unlimited"]}), SF.desc()]},

  {id:"vehicles", icon:"tag", cat:"voit", multi:true, vehicle:true,
    l:["Véhicules à vendre","Vehicles for sale"], s:["Voitures, motos, bateaux","Cars, motorbikes, boats"],
    one:["véhicule","vehicle"], many:["véhicules","vehicles"], add:["Ajouter un véhicule","Add a vehicle"],
    shared:[SF.area(),
      SF.text("warranty",["Garantie","Warranty"],{ph:["Ex. 6 mois","E.g. 6 months"]}),
      SF.chips("perks",["Services du garage","Dealer services"],[["inspection","Contrôle technique OK","Inspection passed"],["financing","Financement possible","Financing available"],["trade-in","Reprise possible","Trade-in accepted"],["delivery","Livraison possible","Delivery available"]]),
      SF.cur(), SF.phone()],
    item:[SF.choice("kind",["Type","Type"],[["car","Voiture","Car",{cat:"voit",sub:"car-sale"}],["truck","Utilitaire","Van / truck",{cat:"voit",sub:"truck-sale"}],["moto","Moto","Motorbike",{cat:"scoot",sub:"motorbike-sale"}],["scooter","Scooter","Scooter",{cat:"scoot",sub:"scooter-sale"}],["boat","Bateau","Boat",{cat:"bat",sub:"boat-sale"}],["jetski","Jet-ski","Jet ski",{cat:"bat",sub:"jet-ski-sale"}]],{req:true}),
      SF.title(["Marque et modèle","Make and model"],["Ex. Kia Picanto","E.g. Kia Picanto"]),
      SF.num("year",["Année","Year"],{half:true}), SF.num("km",["Kilométrage (km)","Mileage (km)"],{half:true}),
      SF.choice("transmission",["Boîte de vitesses","Transmission"],STUDIO_TRANS),
      SF.choice("fuel",["Carburant","Fuel"],STUDIO_FUEL),
      SF.text("color",["Couleur","Colour"],{half:true}), SF.num("owners",["Propriétaires","Previous owners"],{half:true}),
      SF.money("price",["Prix","Price"],{req:true}), SF.desc()]},

  {id:"immo", icon:"home", cat:"immo", multi:true,
    l:["Immobilier","Real estate"], s:["Vente, location, saisonnier","Sale, rental, vacation"],
    one:["bien","property"], many:["biens","properties"], add:["Ajouter un bien","Add a property"],
    unit:(v)=>v.deal === "rent" ? ["/ mois","/ month"] : v.deal === "seasonal" ? ["/ nuit","/ night"] : null,
    sub:(v)=>{
      const p = v.ptype;
      if(p === "commercial") return "commercial";
      if(v.deal === "sale") return p === "land" ? "sale-land" : (p === "apartment" || p === "studio") ? "sale-apartment" : p ? "sale-house" : "sale";
      if(v.deal === "seasonal") return ({villa:"short-term-villa", house:"short-term-house", studio:"short-term-studio", apartment:"short-term-apartment"})[p] || "vacation-rental";
      return (p === "apartment" || p === "studio") ? "rent-apartment" : (p === "house" || p === "villa") ? "rent-house" : "rent";
    },
    shared:[SF.text("fees",["Frais d'agence","Agency fees"],{ph:["Ex. 1 mois de loyer","E.g. one month's rent"]}), SF.cur(), SF.phone()],
    item:[SF.choice("deal",["Transaction","Transaction"],[["sale","Vente","Sale"],["rent","Location à l'année","Long-term rental"],["seasonal","Saisonnier","Vacation rental"]],{req:true}),
      SF.choice("ptype",["Type de bien","Property type"],[["apartment","Appartement","Apartment"],["villa","Villa","Villa"],["house","Maison","House"],["studio","Studio","Studio"],["land","Terrain","Land"],["commercial","Local commercial","Commercial"]]),
      SF.title(["Titre","Title"],["Ex. T2 vue mer à Simpson Bay","E.g. 1-bed sea-view flat in Simpson Bay"]),
      SF.area(["Quartier","Neighbourhood"]),
      SF.num("bedrooms",["Chambres","Bedrooms"],{half:true}), SF.num("bathrooms",["Salles de bain","Bathrooms"],{half:true}),
      SF.num("surface",["Surface (m²)","Floor area (m²)"],{half:true}), SF.text("floor",["Étage","Floor"],{half:true}),
      SF.chips("features",["Atouts","Features"],[["seaview","Vue mer","Sea view"],["pool","Piscine","Pool"],["furnished","Meublé","Furnished"],["parking","Parking","Parking"],STUDIO_AC,["secure","Résidence sécurisée","Gated residence"],["beach","Accès plage","Beach access"]]),
      SF.money("price",["Prix ou loyer","Price or rent"],{half:true}), SF.text("charges",["Charges","Service charges"],{half:true}),
      SF.text("available",["Disponible","Available from"],{ph:["Ex. Immédiatement","E.g. Now"]}),
      SF.url("tour",["Lien visite virtuelle (facultatif)","Virtual tour link (optional)"]), SF.desc()]},

  {id:"restaurant", icon:"food", cat:"dining", multi:false,
    l:["Restaurant & bar","Restaurant & bar"], s:["Carte, horaires, réservation","Menu, hours, bookings"],
    one:["fiche","page"], many:["fiches","pages"],
    shared:[SF.area(), SF.phone(["Téléphone / WhatsApp pour réserver","Phone / WhatsApp for bookings"])],
    item:[SF.title(["Nom de l'établissement","Venue name"]),
      SF.choice("type",["Type","Type"],[["restaurants","Restaurant","Restaurant",{sub:"restaurants"}],["bars","Bar","Bar",{sub:"bars"}],["beach-clubs","Beach club","Beach club",{sub:"beach-clubs"}],["cafes","Café","Café",{sub:"cafes"}],["snack-food-trucks","Snack / food truck","Snack / food truck",{sub:"snack-food-trucks"}],["nightclubs","Club","Club",{sub:"nightclubs"}]],{req:true}),
      SF.chips("cuisine",["Cuisine","Cuisine"],[["creole","Créole","Creole"],["french","Française","French"],["seafood","Fruits de mer","Seafood"],["italian","Italienne","Italian"],["grill","Grillades","Grill"],["asian","Asiatique","Asian"],["vegetarian","Végétarien","Vegetarian"],["international","Internationale","International"]]),
      SF.choice("range",["Gamme de prix","Price range"],[["1","$","$"],["2","$$","$$"],["3","$$$","$$$"],["4","$$$$","$$$$"]]),
      SF.hours("hours",["Horaires","Opening hours"]),
      SF.chips("services",["Services","Services"],[["terrace","Terrasse","Terrace"],["seaview","Vue mer","Sea view"],["delivery","Livraison","Delivery"],["takeaway","À emporter","Takeaway"],["parking","Parking","Parking"],["live-music","Musique live","Live music"],["wheelchair","Accès fauteuil","Wheelchair access"],["booking","Réservation conseillée","Booking advised"]]),
      SF.lines("menu",["La carte","Menu"],[["Plat","Dish"],["Prix","Price"]]), SF.desc()]},

  {id:"excursion", icon:"compass", cat:"tourism", multi:true,
    l:["Excursions & activités","Tours & activities"], s:["Durée, départs, tarifs","Duration, departures, rates"],
    one:["activité","activity"], many:["activités","activities"], add:["Ajouter une activité","Add an activity"], unit:["/ adulte","/ adult"],
    shared:[SF.area(),
      SF.text("meeting",["Point de départ","Meeting point"],{ph:["Ex. Marina Fort Louis","E.g. Fort Louis Marina"]}),
      SF.chips("langs",["Langues parlées","Languages spoken"],STUDIO_LANGS),
      SF.text("cancel",["Annulation","Cancellation"],{ph:["Ex. Gratuite jusqu'à 24 h avant","E.g. Free up to 24 h before"]}),
      SF.cur(), SF.phone()],
    item:[SF.title(["Nom de l'activité","Activity name"]),
      SF.choice("type",["Type","Type"],[["boat-trips","Sortie bateau","Boat trip",{sub:"boat-trips"}],["diving-snorkeling","Plongée & snorkeling","Diving & snorkelling",{sub:"diving-snorkeling"}],["watersports","Jet-ski & nautique","Jet ski & water sports",{sub:"watersports"}],["guided-tours","Visite guidée","Guided tour",{sub:"guided-tours"}],["outdoor-adventures","Randonnée & aventure","Hiking & adventure",{sub:"outdoor-adventures"}],["wellness-spa","Spa & bien-être","Spa & wellness",{sub:"wellness-spa"}]],{req:true}),
      SF.choice("duration",["Durée","Duration"],[["short","1–3 h","1–3 h"],["half","½ journée","Half day"],["full","Journée","Full day"]]),
      SF.days("days",["Jours de départ","Departure days"]),
      SF.text("time",["Heure de départ","Departure time"],{half:true, ph:["Ex. 09:00","E.g. 9:00"]}),
      SF.num("group",["Groupe max","Max group"],{half:true}),
      SF.money("price",["Prix adulte","Adult price"],{half:true}), SF.money("child",["Prix enfant","Child price"],{half:true}),
      SF.text("private",["Privatisation","Private hire"],{ph:["Ex. Sur demande","E.g. On request"]}),
      SF.chips("included",["Inclus","Included"],[["lunch","Déjeuner","Lunch"],["drinks","Boissons","Drinks"],["gear","Matériel","Equipment"],["transfer","Transfert hôtel","Hotel transfer"],["photos","Photos","Photos"],["guide","Guide","Guide"]]), SF.desc()]},

  {id:"taxi", icon:"taxi", cat:"transport", multi:false,
    l:["Taxi & transferts","Taxis & transfers"], s:["Votre grille de trajets","Your route price list"],
    one:["fiche","page"], many:["fiches","pages"],
    shared:[SF.area(["Zone de départ habituelle","Usual base"]), SF.phone()],
    item:[SF.title(["Nom du service","Service name"],["Ex. Taxi Jean – transferts aéroport","E.g. Jean's Taxi – airport transfers"]),
      SF.choice("service",["Service","Service"],[["taxi-driver","Taxi / chauffeur privé","Taxi / private driver",{sub:"taxi-driver"}],["airport-transfer","Transferts aéroport","Airport transfers",{sub:"airport-transfer"}],["port-transfer","Transferts port & croisières","Port & cruise transfers",{sub:"port-transfer"}],["group-shuttle","Navettes & groupes","Shuttles & groups",{sub:"group-shuttle"}]],{req:true}),
      SF.choice("vehicleType",["Véhicule","Vehicle"],[["sedan","Berline","Sedan"],["suv","SUV","SUV"],["minibus","Minibus","Minibus"],["van-wheelchair","Van accessible fauteuil","Wheelchair van"]]),
      SF.num("passengers",["Passagers","Passengers"],{half:true}), SF.num("bags",["Valises","Suitcases"],{half:true}),
      SF.chips("options",["Options","Options"],[STUDIO_AC,["child-seat","Siège enfant","Child seat"],["24h","24 h / 24","24/7"],["sign","Accueil avec pancarte","Meet & greet sign"]]),
      SF.lines("routes",["Grille de tarifs","Route prices"],[["Trajet","Route"],["Prix","Price"]]),
      SF.text("night",["Supplément nuit","Night surcharge"],{half:true}), SF.text("extra",["Par passager en plus","Per extra passenger"],{half:true}),
      SF.chips("payment",["Paiement accepté","Payment accepted"],[["cash","Espèces","Cash"],["card","Carte","Card"],["transfer","Virement","Bank transfer"]]),
      SF.text("license",["Numéro de licence (facultatif)","Licence number (optional)"]), SF.desc()]},

  {id:"services", icon:"scissors", cat:"serv", multi:false,
    l:["Beauté & services","Beauty & services"], s:["Votre carte de prestations","Your service menu"],
    one:["fiche","page"], many:["fiches","pages"],
    shared:[SF.area(), SF.phone()],
    item:[SF.title(["Nom de votre activité","Business name"]),
      SF.choice("activity",["Activité","Activity"],[["hairdresser","Coiffure","Hairdresser",{cat:"beauty",sub:"hairdresser"}],["barber","Barbier","Barber",{cat:"beauty",sub:"barber"}],["nails","Ongles","Nails",{cat:"beauty",sub:"nails"}],["makeup","Maquillage & soins","Make-up & skincare",{cat:"beauty",sub:"makeup"}],["cleaning","Ménage","Cleaning",{cat:"serv",sub:"cleaning"}],["plumber","Plomberie","Plumbing",{cat:"serv",sub:"plumber"}],["electrician","Électricité","Electrical",{cat:"serv",sub:"electrician"}],["gardening","Jardinage","Gardening",{cat:"serv",sub:"gardening"}],["construction-service","Travaux","Building work",{cat:"serv",sub:"construction-service"}],["mechanic-service","Mécanique","Mechanic",{cat:"serv",sub:"mechanic-service"}],["moving-service","Déménagement","Moving",{cat:"serv",sub:"moving-service"}],["photographer","Photographe","Photographer",{cat:"serv",sub:"photographer"}],["web-it","Informatique & web","IT & web",{cat:"serv",sub:"web-it"}]],{req:true}),
      SF.choice("where",["Où","Where"],[["salon","En salon / atelier","At the salon / shop"],["home","À domicile","At the client's home"],["both","Les deux","Both"]]),
      SF.text("zone",["Zone d'intervention","Service area"],{ph:["Ex. Toute l'île","E.g. Whole island"]}),
      SF.hours("hours",["Horaires","Opening hours"]),
      SF.lines("prestations",["Vos prestations","Your services"],[["Prestation","Service"],["Durée","Duration"],["Prix","Price"]]),
      SF.chips("perks",["Bon à savoir","Good to know"],[["free-quote","Devis gratuit","Free quote"],["same-day","Intervention le jour même","Same-day service"],["weekend","Disponible le week-end","Weekends"],["insured","Assuré","Insured"]]), SF.desc()]},

  {id:"boutique", icon:"bag", cat:"autres", multi:true, bulkPhotos:true,
    l:["Boutique & produits","Shop & products"], s:["Catalogue, stock, livraison","Catalogue, stock, delivery"],
    one:["produit","product"], many:["produits","products"], add:["Ajouter un produit","Add a product"],
    unit:(v, shared)=>shared.rayon === "food" ? ({kg:["/ kg","/ kg"], litre:["/ litre","/ litre"], portion:["/ portion","/ portion"]})[v.per] || null : null,
    shared:[SF.choice("rayon",["Rayon","Department"],[["elec","Électronique","Electronics",{cat:"elec"}],["mode","Mode","Fashion",{cat:"mode"}],["meub","Maison & meubles","Home & furniture",{cat:"meub"}],["menag","Électroménager","Appliances",{cat:"menag"}],["gaming","Gaming","Gaming",{cat:"gaming"}],["food","Alimentation & boissons","Food & drinks",{cat:"food"}],["pets","Animaux (accessoires)","Pet supplies",{cat:"pets",sub:"pet-supplies"}],["lois","Loisirs","Leisure",{cat:"lois"}],["pro","Matériel pro","Business gear",{cat:"pro"}],["autres","Autre","Other",{cat:"autres"}]],{req:true}),
      SF.chips("handover",["Remise au client","Hand-over"],[["pickup","Retrait en boutique","In-store pick-up"],["delivery","Livraison sur l'île","Island delivery"]]),
      SF.money("deliveryPrice",["Prix livraison","Delivery price"],{half:true}),
      SF.text("warranty",["Garantie","Warranty"],{half:true}),
      SF.text("address",["Adresse de la boutique","Shop address"]),
      SF.area(), SF.cur(), SF.phone()],
    item:[SF.title(["Nom du produit","Product name"]),
      SF.money("price",["Prix","Price"],{half:true, req:true}), SF.num("stock",["Stock","Stock"],{half:true}),
      SF.choice("cond",["État","Condition"],[["neuf","Neuf","New"],["tbe","Très bon état","Very good"],["bon","Bon état","Good"],["corr","État correct","Fair"]],{when:(v, shared)=>shared.rayon !== "food"}),
      SF.choice("per",["Prix par","Price per"],[["piece","Pièce","Item"],["kg","Kilo","Kilo"],["litre","Litre","Litre"],["portion","Portion","Portion"]],{when:(v, shared)=>shared.rayon === "food"}),
      SF.text("brand",["Marque (facultatif)","Brand (optional)"]), SF.desc()]},

  {id:"emploi", icon:"briefcase", cat:"job", multi:true,
    l:["Emploi","Jobs"], s:["Vos postes à pourvoir","Your open positions"],
    one:["poste","job"], many:["postes","jobs"], add:["Ajouter un poste","Add a job"],
    unit:(v)=>({hour:["/ heure","/ hour"], month:["/ mois","/ month"], year:["/ an","/ year"]})[v.period] || null,
    shared:[SF.area(), SF.text("apply",["Comment postuler","How to apply"],{ph:["Ex. Message, email ou sur place","E.g. Message, email or in person"]}), SF.cur(), SF.phone()],
    item:[SF.title(["Intitulé du poste","Job title"],["Ex. Serveur / serveuse","E.g. Waiter / waitress"]),
      SF.choice("contract",["Type de poste","Job type"],[["full-time","Temps plein","Full time",{sub:"full-time"}],["part-time","Temps partiel","Part time",{sub:"part-time"}],["seasonal","Saisonnier","Seasonal",{sub:"seasonal"}],["freelance","Mission / freelance","Freelance",{sub:"freelance"}],["internship","Stage","Internship",{sub:"internship"}]],{req:true}),
      SF.money("price",["Salaire (facultatif)","Pay (optional)"],{half:true}),
      SF.choice("period",["Par","Per"],[["hour","Heure","Hour"],["month","Mois","Month"],["year","An","Year"]],{half:true}),
      SF.text("schedule",["Horaires","Working hours"],{ph:["Ex. Du soir, 5 j / 7","E.g. Evenings, 5 days a week"]}),
      SF.chips("langs",["Langues demandées","Languages required"],STUDIO_LANGS),
      SF.choice("experience",["Expérience","Experience"],[["none","Débutant accepté","No experience needed"],["1y","1 an","1 year"],["3y","3 ans et +","3+ years"]]), SF.desc()]},

  {id:"events", icon:"ticket", cat:"billet", multi:true,
    l:["Événements & billets","Events & tickets"], s:["Dates, tarifs par billet","Dates, ticket prices"],
    one:["événement","event"], many:["événements","events"], add:["Ajouter un événement","Add an event"],
    shared:[SF.area(), SF.text("venue",["Lieu","Venue"]),
      SF.text("minAge",["Âge minimum","Minimum age"],{half:true}), SF.text("dress",["Dress code","Dress code"],{half:true}),
      SF.cur(), SF.phone()],
    item:[SF.title(["Nom de l'événement","Event name"]),
      SF.date("date",["Date","Date"],{half:true}), SF.text("time",["Ouverture","Doors open"],{half:true, ph:["Ex. 22:00","E.g. 10 pm"]}),
      SF.lines("tickets",["Billets","Tickets"],[["Catégorie","Category"],["Prix","Price"]]),
      SF.money("price",["Prix à partir de","Price from"]), SF.desc()]}
];

const STUDIO_ICONS = {
  car:'<path d="M3 13l2-6h14l2 6v4H3z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  home:'<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  food:'<path d="M7 3v18M4 3v6a3 3 0 0 0 6 0V3M17 21V3c-2 2-3 5-3 8h3"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  taxi:'<path d="M3 14l2-6h14l2 6v4H3z"/><path d="M10 8V5h4v3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8.5L20 20M8.5 15.5L20 4"/>',
  bag:'<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
  ticket:'<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  back:'<path d="M15 18l-6-6 6-6"/>'
};
function studioIcon(name, size=22){
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STUDIO_ICONS[name] || ""}</svg>`;
}

/* ---------------- state ---------------- */
// studio: {userId, tpl, shared:{}, items:[{v:{}, photos:[]}], open, editingId, busy}
// A photo is {dataUrl, file, thumbFile} before upload, {url, thumb} once stored.
let studio = null;
let studioHasDraft = false;

function studioTpl(id = studio?.tpl){ return STUDIO_TEMPLATES.find(t=>t.id === id) || null; }
function studioScope(scope, idx){ return scope === "s" ? studio.shared : studio.items[idx]?.v; }
function studioVisible(f, values, shared){ return !f.when || f.when(values || {}, shared || {}); }
function studioEmpty(v){
  if(Array.isArray(v)) return !v.some(x=>Array.isArray(x) ? x.some(c=>String(c || "").trim()) : String(x || "").trim());
  return v === undefined || v === null || String(v).trim() === "";
}
function studioOption(f, id){ return (f.o || []).find(o=>o[0] === id) || null; }
function studioNum(v){ const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : 0; }
function studioMainActivity(){ try { return localStorage.getItem("bst-studio-main") || ""; } catch(e){ return ""; } }

// Local previews are our own compressed data:image URLs; stored photos go through safeUrl.
function studioImgSrc(p){
  return typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:image/") ? p.dataUrl : safeUrl(p?.thumb || p?.url);
}
function studioNewItem(){ return {v:{}, photos:[]}; }
function studioDefaults(tpl){
  const shared = {cur: state.cur === "eur" ? "eur" : "usd",
    phone: state.user?.businessWhatsapp || state.user?.businessPhone || ""};
  return {userId: state.user?.id, tpl: tpl.id, shared, items:[studioNewItem()], open:0, editingId:null, busy:false};
}
function studioRemaining(){
  const limit = listingLimitFor(state.user);
  return Number.isFinite(limit) ? Math.max(0, limit - publicationUsageCountFor(state.user)) : Infinity;
}
function studioCanUse(){
  return state.user?.accountType === "business" && hasActiveProSubscription(state.user);
}

/* ---------------- opening / navigation ---------------- */
function openProStudio(){
  if(!state.user){ requireAccount("post"); return; }
  if(!studioCanUse()){ openPostModal(); return; } // Keeps the existing subscription gate and messages.
  if(studioRemaining() <= 0){
    showToast(publicationLimitMessage(listingLimitFor(state.user)));
    openPricingInfo();
    return;
  }
  closeModal("profileModal");
  if(!studio || studio.userId !== state.user.id || studio.editingId) studio = null;
  renderStudio();
  openModal("proStudioModal");
  if(window.Drafts){
    Drafts.peek(STUDIO_DRAFT_KEY).then(meta=>{ studioHasDraft = !!meta; if(!studio) renderStudio(); });
  }
}
function studioPickTemplate(id){
  const tpl = studioTpl(id);
  if(!tpl) return;
  try { localStorage.setItem("bst-studio-main", id); } catch(e){}
  studio = studioDefaults(tpl);
  renderStudio();
}
function studioHome(){
  if(studio?.busy) return;
  // Leaving a batch keeps it as a draft instead of asking for a confirmation.
  if(studio && !studio.editingId && studioHasContent()) studioSaveDraft(true);
  studio = null;
  renderStudio();
}
function studioHasContent(){
  return !!studio && (studio.items.some(it=>it.photos.length || Object.values(it.v).some(v=>!studioEmpty(v))));
}
function studioClassicForm(){
  closeModal("proStudioModal");
  editingListingId = null;
  buildPostForm();
  openModal("postModal");
  maybeOfferDraftRestore();
}
// Called by openEditListing: listings made in the Studio are edited in the Studio.
function openStudioEdit(listing){
  const tpl = studioTpl(listing?.details?.tpl);
  if(!tpl || !isOwnListing(listing) || !studioCanUse()) return false;
  const f = listing.details.f && typeof listing.details.f === "object" ? listing.details.f : {};
  const shared = {cur: listing.cur === "eur" ? "eur" : "usd", phone: listing.sellerPhone || "", area: listing.area || ""};
  const v = {title: listing.t || "", desc: listing.details.autoDesc ? "" : (listing.desc || ""), area: listing.area || ""};
  const price = Number(listing.cur === "eur" ? listing.eur : listing.usd) || 0;
  if(price) v.price = String(price);
  tpl.shared.forEach(fd=>{ if(!STUDIO_LISTING_KEYS.has(fd.k) && f[fd.k] !== undefined) shared[fd.k] = f[fd.k]; });
  tpl.item.forEach(fd=>{ if(!STUDIO_LISTING_KEYS.has(fd.k) && f[fd.k] !== undefined) v[fd.k] = f[fd.k]; });
  const photos = (listing.photos || []).map((url, i)=>({url, thumb:(listing.thumbPhotos || [])[i] || url}));
  studio = {userId: state.user.id, tpl: tpl.id, shared, items:[{v, photos}], open:0, editingId: listing.id, busy:false};
  closeModal("detailModal");
  closeModal("profileModal");
  renderStudio();
  openModal("proStudioModal");
  return true;
}

/* ---------------- rendering ---------------- */
function renderStudio(){
  const body = document.getElementById("proStudioBody");
  if(!body) return;
  const title = document.getElementById("proStudioTitle");
  const tpl = studioTpl();
  if(title) title.textContent = tpl ? tr(tpl.l) : "Studio Pro";
  body.innerHTML = tpl ? studioEditorHTML(tpl) : studioHomeHTML();
}

function studioHomeHTML(){
  const fr = state.lang === "fr";
  const u = state.user || {};
  const name = u.businessName || u.name || "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w=>w[0]).join("").toUpperCase() || "PRO";
  const limit = listingLimitFor(u);
  const used = publicationUsageCountFor(u);
  const boosts = includedBoostLimitFor(u);
  const usedBoosts = autoBoostUsedCountFor(u);
  const pct = (a, b)=>Number.isFinite(b) && b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0;
  const main = studioMainActivity();
  const tpls = [...STUDIO_TEMPLATES].sort((a, b)=>(b.id === main) - (a.id === main));
  return `<div class="ps-home">
    <header class="ps-head">
      <div class="ps-biz"><span class="ps-logo" aria-hidden="true">${esc(initials)}</span>
        <div><strong>${esc(name)}</strong><span>${esc(planLabel(u.accountPlan))}</span></div>
        <span class="ps-badge">PRO</span></div>
      <div class="ps-meter"><div><span>${fr ? "Offres actives" : "Active offers"}</span><b>${used} <small>/ ${Number.isFinite(limit) ? limit : "∞"}</small></b></div>
        <div class="ps-bar" aria-hidden="true"><span style="width:${pct(used, limit)}%"></span></div></div>
      ${boosts ? `<div class="ps-meter"><div><span>${fr ? "Boosts inclus ce mois" : "Included boosts this month"}</span><b>${usedBoosts} <small>/ ${boosts}</small></b></div>
        <div class="ps-bar sun" aria-hidden="true"><span style="width:${pct(usedBoosts, boosts)}%"></span></div></div>` : ""}
      <button type="button" class="ps-link light" data-click="openBusinessPage" data-click-args='${dataArgs([u.id])}'>${fr ? "Voir ma vitrine publique" : "View my public showcase"}</button>
    </header>
    ${studioHasDraft ? `<div class="ps-card ps-draft"><div><strong>${fr ? "Brouillon en cours" : "Draft in progress"}</strong><span>${fr ? "Reprenez là où vous étiez." : "Pick up where you left off."}</span></div>
      <button type="button" class="ps-btn2" data-click="studioRestoreDraft">${fr ? "Reprendre" : "Resume"}</button></div>` : ""}
    <div><h3 class="ps-h">${fr ? "Que voulez-vous publier ?" : "What would you like to publish?"}</h3>
      <p class="ps-muted">${fr ? "Chaque activité a son formulaire." : "Each activity has its own form."}${main ? (fr ? " Votre activité principale est en premier." : " Your main activity comes first.") : ""}</p></div>
    <div class="ps-tiles">${tpls.map(t=>`<button type="button" class="ps-tile${t.id === main ? " main" : ""}" data-click="studioPickTemplate" data-click-args='${dataArgs([t.id])}'>
      <span class="ps-ico">${studioIcon(t.icon)}</span><span class="ps-tn">${esc(tr(t.l))}</span><span class="ps-ts">${esc(tr(t.s))}</span></button>`).join("")}</div>
    <button type="button" class="ps-link" data-click="studioClassicForm">${fr ? "Utiliser le formulaire simple" : "Use the simple form"}</button>
  </div>`;
}

function studioEditorHTML(tpl){
  const fr = state.lang === "fr";
  const n = studio.items.length;
  const editing = !!studio.editingId;
  const remaining = studioRemaining();
  const sharedFields = tpl.shared;
  const sharedCard = `<section class="ps-card"><div><h3 class="ps-h">${tpl.multi ? (fr ? "Infos communes" : "Shared details") : (fr ? "Zone et contact" : "Area and contact")}</h3>
      ${tpl.multi ? `<p class="ps-muted">${fr ? "Remplies une fois, appliquées à toutes les offres de ce lot." : "Filled in once, applied to every offer in this batch."}</p>` : ""}</div>
      <div class="ps-grid">${sharedFields.filter(f=>studioVisible(f, studio.shared, studio.shared)).map(f=>studioFieldHTML(f, "s", 0, studio.shared)).join("")}</div></section>`;
  const items = studio.items.map((it, i)=>i === studio.open ? studioItemOpenHTML(tpl, it, i) : studioItemClosedHTML(tpl, it, i)).join("");
  const canAdd = tpl.multi && !editing && n < Math.min(STUDIO_MAX_ITEMS, remaining);
  const label = editing ? (fr ? "Enregistrer les modifications" : "Save changes")
    : `${fr ? "Publier" : "Publish"} ${n} ${tr(n > 1 ? tpl.many : tpl.one)}`;
  const after = Number.isFinite(remaining) && !editing
    ? `<span class="ps-muted center">${fr ? `Après publication : ${Math.max(0, remaining - n)} offre(s) disponible(s)` : `After publishing: ${Math.max(0, remaining - n)} offer(s) left`}</span>` : "";
  return `<div class="ps-editor">
    <button type="button" class="ps-link back" data-click="studioHome">${studioIcon("back", 18)}${fr ? "Toutes les activités" : "All activities"}</button>
    ${tpl.multi ? sharedCard : ""}
    ${tpl.multi ? `<h3 class="ps-h">${fr ? `Vos ${tr(tpl.many)}` : `Your ${tr(tpl.many)}`} (${n})</h3>` : ""}
    ${items}
    ${canAdd ? `<button type="button" class="ps-add" data-click="studioAddItem">${studioIcon("plus", 20)}${esc(tr(tpl.add))}</button>` : ""}
    ${canAdd && tpl.bulkPhotos ? `<label class="ps-add ghost" for="psBulkPhotos">${studioIcon("camera", 20)}${fr ? "Une photo = une fiche produit" : "One photo = one product"}</label>
      <input id="psBulkPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-change="studioBulkPhotos" data-change-args='${dataArgs(["__EVENT__"])}'>` : ""}
    ${tpl.multi && !editing ? `<p class="ps-note">${fr ? "Astuce : dupliquez une offre, puis changez seulement ce qui diffère." : "Tip: duplicate an offer, then change only what differs."}</p>` : ""}
    ${tpl.multi ? "" : sharedCard}
    <p class="ps-note">${fr ? "Les clients vous contactent directement : l'app ne prend ni réservation ni paiement." : "Customers contact you directly: the app takes no bookings or payments."}</p>
    <footer class="ps-foot">
      <button type="button" class="primary-btn ps-publish" data-click="studioPublish" ${studio.busy ? "disabled" : ""}>${studio.busy ? (fr ? "Publication…" : "Publishing…") : esc(label)}</button>
      ${editing ? "" : `<button type="button" class="ps-btn2" data-click="studioSaveDraft">${fr ? "Enregistrer le brouillon" : "Save draft"}</button>`}
      ${after}
    </footer>
  </div>`;
}

function studioItemClosedHTML(tpl, it, i){
  const fr = state.lang === "fr";
  const v = it.v;
  const photo = it.photos[0];
  const tags = [v.year, ...tpl.item.filter(f=>f.t === "choice" && studioVisible(f, v, studio.shared))
    .map(f=>tr((studioOption(f, v[f.k]) || []).slice(1, 3)))].filter(x=>!studioEmpty(x)).slice(0, 3);
  const price = studioNum(v.price);
  return `<article class="ps-card ps-item${it.error ? " err" : ""}">
    <div class="ps-thumb">${photo ? `<img src="${esc(studioImgSrc(photo))}" alt="">` : studioIcon("camera", 24)}</div>
    <div class="ps-item-main">
      <strong>${esc(v.title || (fr ? "Sans titre" : "Untitled"))}</strong>
      ${tags.length || it.photos.length ? `<div class="ps-tags">${tags.map(x=>`<span>${esc(x)}</span>`).join("")}${it.photos.length ? `<span>${it.photos.length} photo${it.photos.length > 1 ? "s" : ""}</span>` : ""}</div>` : ""}
      ${price ? `<b class="ps-price">${listingMoney(price, studio.shared.cur)}${studioUnitLabel(tpl, v)}</b>` : ""}
      ${it.error ? `<span class="ps-err">${esc(it.error)}</span>` : ""}
      <div class="ps-actions">
        <button type="button" class="ps-act" data-click="studioOpenItem" data-click-args='${dataArgs([i])}'>${fr ? "Modifier" : "Edit"}</button>
        ${studio.editingId ? "" : `<button type="button" class="ps-act" data-click="studioDuplicate" data-click-args='${dataArgs([i])}'>${studioIcon("copy", 18)}${fr ? "Dupliquer" : "Duplicate"}</button>`}
      </div>
    </div></article>`;
}

function studioItemOpenHTML(tpl, it, i){
  const fr = state.lang === "fr";
  const multi = tpl.multi && studio.items.length > 1;
  const pid = `psPhotos${i}`;
  return `<article class="ps-card ps-item-open${it.error ? " err" : ""}">
    ${tpl.multi ? `<div class="ps-row"><h3 class="ps-h small">${esc(tr(tpl.one)).replace(/^./, c=>c.toUpperCase())} ${i + 1}${studio.editingId ? "" : (fr ? " · en cours" : " · editing")}</h3>
      ${multi ? `<button type="button" class="ps-act" data-click="studioRemoveItem" data-click-args='${dataArgs([i])}' aria-label="${fr ? "Retirer cette offre" : "Remove this offer"}">${studioIcon("trash", 18)}</button>` : ""}</div>` : ""}
    ${it.error ? `<p class="ps-err">${esc(it.error)}</p>` : ""}
    <div class="ps-photos" aria-label="Photos">
      ${it.photos.map((p, pi)=>`<div class="ps-photo"><img src="${esc(studioImgSrc(p))}" alt="Photo ${pi + 1}">
        <button type="button" data-click="studioRemovePhoto" data-click-args='${dataArgs([i, pi])}' aria-label="${fr ? `Retirer la photo ${pi + 1}` : `Remove photo ${pi + 1}`}">×</button></div>`).join("")}
      ${it.pending ? `<div class="ps-photo add" role="status">${fr ? "Optimisation…" : "Optimising…"}</div>` : ""}
      ${it.photos.length < STUDIO_MAX_PHOTOS && !it.pending ? `<label class="ps-photo add" for="${pid}" aria-label="${fr ? "Ajouter des photos" : "Add photos"}">${studioIcon("plus")}</label>
        <input id="${pid}" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-change="studioAddPhotos" data-change-args='${dataArgs([i, "__EVENT__"])}'>` : ""}
    </div>
    <div class="ps-grid">${tpl.item.filter(f=>studioVisible(f, it.v, studio.shared)).map(f=>studioFieldHTML(f, "i", i, it.v)).join("")}</div>
    ${tpl.multi && !studio.editingId ? `<div class="ps-actions"><button type="button" class="ps-act" data-click="studioDuplicate" data-click-args='${dataArgs([i])}'>${studioIcon("copy", 18)}${fr ? "Dupliquer" : "Duplicate"}</button></div>` : ""}
  </article>`;
}

function studioFieldHTML(f, scope, idx, values){
  const id = `ps-${scope}${idx}-${f.k}`;
  const v = values[f.k];
  const label = tr(f.l) + (f.t === "money" ? (studio?.shared.cur === "eur" ? " (€)" : " ($)") : "") + (f.req ? " *" : "");
  const wide = ["chips", "choice", "days", "hours", "lines", "textarea"].includes(f.t) && !f.half;
  const cls = `ps-field${f.half ? " half" : ""}${wide ? " wide" : ""}`;
  const input = (type, extra="")=>`<input class="ps-input" id="${id}" type="${type}" value="${esc(v ?? "")}" ${f.ph ? `placeholder="${esc(tr(f.ph))}"` : ""} ${extra}
    data-input="studioSet" data-input-args='${dataArgs([scope, idx, f.k, "__VALUE__"])}'>`;
  const labelled = inner=>`<div class="${cls}"><label class="ps-label" for="${id}">${esc(label)}</label>${inner}</div>`;
  const grouped = inner=>`<div class="${cls}" role="group" aria-labelledby="${id}-l"><span class="ps-label" id="${id}-l">${esc(label)}</span>${inner}</div>`;
  switch(f.t){
    case "text": return labelled(input("text", `maxlength="${f.max || 120}"`));
    case "tel": return labelled(input("tel", `maxlength="32" autocomplete="tel"`));
    case "url": return labelled(input("url", `maxlength="300" inputmode="url"`));
    case "date": return labelled(input("date"));
    case "num": return labelled(input("number", `min="0" step="1" inputmode="numeric"`));
    case "money": return labelled(input("number", `min="0" step="0.01" inputmode="decimal"`));
    case "textarea": return `<div class="${cls}"><label class="ps-label" for="${id}">${esc(label)}</label>
      <textarea class="ps-input" id="${id}" maxlength="2000" data-input="studioSet" data-input-args='${dataArgs([scope, idx, f.k, "__VALUE__"])}'>${esc(v ?? "")}</textarea></div>`;
    case "area": return labelled(`<select class="ps-input" id="${id}" data-change="studioSet" data-change-args='${dataArgs([scope, idx, f.k, "__VALUE__"])}'>
      <option value="">${state.lang === "fr" ? "Choisir…" : "Choose…"}</option>
      ${[["fr", state.lang === "fr" ? "Partie française" : "French side"], ["nl", state.lang === "fr" ? "Partie hollandaise" : "Dutch side"]].map(([side, name])=>
        `<optgroup label="${esc(name)}">${AREAS[side].map(a=>`<option value="${esc(a)}"${a === v ? " selected" : ""}>${esc(a)}</option>`).join("")}</optgroup>`).join("")}</select>`);
    case "chips":
    case "choice":
    case "days": {
      const multiple = f.t !== "choice";
      const sel = multiple ? (Array.isArray(v) ? v : []) : v;
      const cls2 = f.t === "days" ? "ps-days" : "ps-chips";
      return grouped(`<div class="${cls2}">${f.o.map(o=>{
        const on = multiple ? sel.includes(o[0]) : sel === o[0];
        return `<button type="button" class="ps-chip${on ? " on" : ""}" aria-pressed="${on}" data-click="studioToggle" data-click-args='${dataArgs([scope, idx, f.k, o[0], "__THIS__"])}'>${esc(tr(o.slice(1, 3)))}</button>`;
      }).join("")}</div>`);
    }
    case "hours": {
      const rows = Array.isArray(v) ? v : [];
      return grouped(`<div class="ps-hours">${STUDIO_DAYS.map((d, di)=>`<label class="ps-day" for="${id}-${di}">${esc(tr(d.slice(1, 3)))}</label>
        <input class="ps-input" id="${id}-${di}" maxlength="60" value="${esc(rows[di] || "")}" placeholder="${state.lang === "fr" ? "Fermé" : "Closed"}"
          data-input="studioSetCell" data-input-args='${dataArgs([scope, idx, f.k, di, -1, "__VALUE__"])}'>`).join("")}</div>
        <button type="button" class="ps-link" data-click="studioCopyHours" data-click-args='${dataArgs([scope, idx, f.k])}'>${state.lang === "fr" ? "Copier le lundi sur tous les jours" : "Copy Monday to every day"}</button>`);
    }
    case "lines": {
      const rows = Array.isArray(v) && v.length ? v : [[]];
      return grouped(`<div class="ps-lines c${f.cols.length}">${rows.map((row, ri)=>`<div class="ps-line">${f.cols.map((c, ci)=>
        `<input class="ps-input" maxlength="80" aria-label="${esc(tr(c))} ${ri + 1}" placeholder="${esc(tr(c))}" value="${esc((row || [])[ci] || "")}"
          data-input="studioSetCell" data-input-args='${dataArgs([scope, idx, f.k, ri, ci, "__VALUE__"])}'>`).join("")}
        <button type="button" class="ps-x" data-click="studioRemoveLine" data-click-args='${dataArgs([scope, idx, f.k, ri])}' aria-label="${state.lang === "fr" ? `Retirer la ligne ${ri + 1}` : `Remove row ${ri + 1}`}">×</button></div>`).join("")}</div>
        ${rows.length < STUDIO_MAX_LINES ? `<button type="button" class="ps-add small" data-click="studioAddLine" data-click-args='${dataArgs([scope, idx, f.k])}'>${studioIcon("plus", 18)}${state.lang === "fr" ? "Ajouter une ligne" : "Add a row"}</button>` : ""}`);
    }
  }
  return "";
}

function studioUnitLabel(tpl, v){
  const unit = typeof tpl.unit === "function" ? tpl.unit(v || {}, studio?.shared || {}) : tpl.unit;
  return unit ? ` <small>${esc(tr(unit))}</small>` : "";
}

/* ---------------- editing handlers ---------------- */
function studioSet(scope, idx, key, value){
  const target = studio && studioScope(scope, idx);
  if(!target) return;
  target[key] = value;
  if(scope === "i") studio.items[idx].error = "";
}
function studioToggle(scope, idx, key, optionId, el){
  const target = studio && studioScope(scope, idx);
  const tpl = studioTpl();
  if(!target || !tpl) return;
  const f = (scope === "s" ? tpl.shared : tpl.item).find(x=>x.k === key);
  if(!f) return;
  if(f.t === "choice"){
    target[key] = target[key] === optionId && !f.req ? "" : optionId;
    // The currency changes price labels and a choice can reveal fields (food department): redraw then.
    if(key === "cur" || [...tpl.shared, ...tpl.item].some(x=>x.when)) { renderStudioKeepScroll(); return; }
    el.parentElement.querySelectorAll(".ps-chip").forEach(b=>{
      const on = b === el && target[key] === optionId;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    });
  } else {
    const list = Array.isArray(target[key]) ? target[key] : [];
    target[key] = list.includes(optionId) ? list.filter(x=>x !== optionId) : [...list, optionId];
    const on = target[key].includes(optionId);
    el.classList.toggle("on", on); el.setAttribute("aria-pressed", String(on));
  }
}
function studioSetCell(scope, idx, key, row, col, value){
  const target = studio && studioScope(scope, idx);
  if(!target) return;
  const rows = Array.isArray(target[key]) ? target[key].map(r=>Array.isArray(r) ? [...r] : r) : [];
  if(col < 0) rows[row] = value;
  else { rows[row] = Array.isArray(rows[row]) ? rows[row] : []; rows[row][col] = value; }
  target[key] = rows;
}
function studioCopyHours(scope, idx, key){
  const target = studio && studioScope(scope, idx);
  if(!target) return;
  const first = (Array.isArray(target[key]) ? target[key][0] : "") || "";
  target[key] = STUDIO_DAYS.map(()=>first);
  renderStudioKeepScroll();
}
function studioAddLine(scope, idx, key){
  const target = studio && studioScope(scope, idx);
  if(!target) return;
  const rows = Array.isArray(target[key]) && target[key].length ? target[key] : [[]];
  if(rows.length >= STUDIO_MAX_LINES) return;
  target[key] = [...rows, []];
  renderStudioKeepScroll();
}
function studioRemoveLine(scope, idx, key, row){
  const target = studio && studioScope(scope, idx);
  if(!target || !Array.isArray(target[key])) return;
  target[key] = target[key].filter((_, i)=>i !== row);
  renderStudioKeepScroll();
}
function renderStudioKeepScroll(){
  const scroller = document.querySelector("#proStudioModal .dialog-body");
  const top = scroller ? scroller.scrollTop : 0;
  renderStudio();
  if(scroller) scroller.scrollTop = top;
}
function studioOpenItem(i){
  if(!studio?.items[i]) return;
  studio.open = i;
  renderStudioKeepScroll();
}
function studioAddItem(){
  const tpl = studioTpl();
  if(!tpl?.multi || studio.items.length >= Math.min(STUDIO_MAX_ITEMS, studioRemaining())) return;
  studio.items.push(studioNewItem());
  studio.open = studio.items.length - 1;
  renderStudioKeepScroll();
}
function studioDuplicate(i){
  const tpl = studioTpl();
  const src = studio?.items[i];
  if(!tpl?.multi || !src || studio.items.length >= Math.min(STUDIO_MAX_ITEMS, studioRemaining())){
    if(src) showToast(state.lang === "fr" ? "Limite d'offres atteinte pour ce lot." : "Offer limit reached for this batch.");
    return;
  }
  // Photos are shared by reference: the same compressed file is uploaded once per offer.
  studio.items.splice(i + 1, 0, {v: JSON.parse(JSON.stringify(src.v)), photos: src.photos.slice()});
  studio.open = i + 1;
  renderStudioKeepScroll();
}
function studioRemoveItem(i){
  if(!studio || studio.items.length < 2) return;
  studio.items.splice(i, 1);
  studio.open = Math.min(studio.open, studio.items.length - 1);
  renderStudioKeepScroll();
}
function studioRemovePhoto(i, pi){
  const it = studio?.items[i];
  if(!it) return;
  it.photos = it.photos.filter((_, k)=>k !== pi);
  renderStudioKeepScroll();
}

async function studioCompress(files){
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  const valid = [...files].filter(f=>allowed.has(f.type) && f.size > 0 && f.size <= 5 * 1024 * 1024);
  if(valid.length !== files.length) showToast(state.lang === "fr" ? "Seules les images JPG, PNG ou WebP de 5 Mo maximum sont acceptées." : "Only JPG, PNG, or WebP images up to 5 MB are accepted.");
  if(!valid.length) return [];
  try {
    if(window.ImgUtils) return (await ImgUtils.compressMany(valid, {maxEdge:1600, quality:0.82})).map(r=>({dataUrl:r.dataUrl, file:r.file, thumbFile:r.thumbFile}));
  } catch(e){ console.warn("[studio] compression failed, using originals:", e); }
  return Promise.all(valid.map(file=>new Promise(resolve=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve({dataUrl:reader.result, file, thumbFile:file});
    reader.onerror = reader.onabort = ()=>resolve(null);
    reader.readAsDataURL(file);
  }))).then(list=>list.filter(Boolean));
}
async function studioAddPhotos(i, e){
  const it = studio?.items[i];
  const files = [...(e?.target?.files || [])];
  if(e?.target) e.target.value = "";
  if(!it || !files.length) return;
  const room = STUDIO_MAX_PHOTOS - it.photos.length;
  if(files.length > room) showToast(t().tooManyPhotos);
  const session = studio;
  it.pending = true;
  renderStudioKeepScroll();
  const photos = await studioCompress(files.slice(0, room));
  it.pending = false;
  if(studio !== session) return;
  it.photos.push(...photos);
  it.error = "";
  renderStudioKeepScroll();
}
async function studioBulkPhotos(e){
  const files = [...(e?.target?.files || [])];
  if(e?.target) e.target.value = "";
  if(!studio || !files.length) return;
  const session = studio;
  const room = Math.min(STUDIO_MAX_ITEMS, studioRemaining()) - studio.items.filter(it=>it.photos.length || !studioEmpty(it.v.title)).length;
  if(files.length > room) showToast(state.lang === "fr" ? `Ce lot accepte encore ${Math.max(0, room)} produit(s).` : `This batch can take ${Math.max(0, room)} more product(s).`);
  const photos = await studioCompress(files.slice(0, Math.max(0, room)));
  if(studio !== session || !photos.length) return;
  // Reuse empty cards first, then add one card per photo.
  studio.items = studio.items.filter(it=>it.photos.length || Object.values(it.v).some(x=>!studioEmpty(x)));
  photos.forEach(p=>studio.items.push({v:{}, photos:[p]}));
  studio.open = studio.items.length - photos.length;
  renderStudioKeepScroll();
}

/* ---------------- drafts ---------------- */
async function studioSaveDraft(silent){
  if(!studio || studio.editingId || !window.Drafts) return;
  const data = {tpl: studio.tpl, shared: studio.shared,
    items: studio.items.map(it=>({v: it.v, photos: it.photos.map(p=>p.dataUrl).filter(Boolean)}))};
  const ok = await Drafts.save({userId: studio.userId, studio: data}, STUDIO_DRAFT_KEY);
  studioHasDraft = studioHasDraft || ok;
  if(silent !== true) showToast(ok ? (state.lang === "fr" ? "Brouillon enregistré sur cet appareil." : "Draft saved on this device.")
    : (state.lang === "fr" ? "Brouillon non enregistré." : "Draft could not be saved."));
}
async function studioRestoreDraft(){
  if(!window.Drafts || !state.user) return;
  const d = await Drafts.load(STUDIO_DRAFT_KEY);
  const tpl = studioTpl(d?.studio?.tpl);
  if(!d || d.userId !== state.user.id || !tpl){ studioHasDraft = false; renderStudio(); return; }
  const items = await Promise.all((d.studio.items || []).slice(0, STUDIO_MAX_ITEMS).map(async it=>{
    const files = (await Promise.all((it.photos || []).slice(0, STUDIO_MAX_PHOTOS).map((u, k)=>Drafts.dataUrlToFile(u, `photo-${k + 1}.jpg`)))).filter(Boolean);
    return {v: it.v && typeof it.v === "object" ? it.v : {}, photos: await studioCompress(files)};
  }));
  studio = {...studioDefaults(tpl), shared: {...(d.studio.shared || {})}, items: items.length ? items : [studioNewItem()]};
  renderStudio();
}

/* ---------------- publishing ---------------- */
function studioCatSub(tpl, shared, v){
  let cat = tpl.cat, sub = "";
  [...tpl.shared.map(f=>[f, shared]), ...tpl.item.map(f=>[f, v])].forEach(([f, vals])=>{
    const to = f.t === "choice" && studioOption(f, vals[f.k])?.[3];
    if(to){ if(to.cat) cat = to.cat; if(to.sub) sub = to.sub; }
  });
  if(typeof tpl.sub === "function") sub = tpl.sub(v);
  return {cat, sub};
}
function studioValidate(tpl, it){
  const fr = state.lang === "fr";
  const all = [...tpl.shared.map(f=>[f, studio.shared]), ...tpl.item.map(f=>[f, it.v])];
  const missing = all.filter(([f, vals])=>f.req && studioVisible(f, vals, studio.shared) && studioEmpty(vals[f.k])).map(([f])=>tr(f.l));
  if(!studioEmpty(it.v.title) && String(it.v.title).trim().length < 4) missing.push(fr ? "titre de 4 caractères minimum" : "title of 4+ characters");
  const {cat, sub} = studioCatSub(tpl, studio.shared, it.v);
  if(postFieldProfile(cat, sub).photosRequired && !it.photos.length) missing.push(fr ? "au moins une photo" : "at least one photo");
  const url = it.v.tour;
  if(url && !safeUrl(url)) missing.push(fr ? "lien valide (https://…)" : "valid link (https://…)");
  return missing.length ? `${fr ? "À compléter" : "Missing"} : ${missing.join(", ")}` : "";
}
function studioSummary(tpl, shared, v){
  const parts = [];
  tpl.item.forEach(f=>{
    if(STUDIO_LISTING_KEYS.has(f.k) || !studioVisible(f, v, shared) || studioEmpty(v[f.k])) return;
    if(f.t === "choice") parts.push(tr((studioOption(f, v[f.k]) || []).slice(1, 3)));
    else if(f.t === "chips") parts.push(v[f.k].map(id=>tr((studioOption(f, id) || []).slice(1, 3))).filter(Boolean).join(", "));
    else if(f.t === "num") parts.push(`${tr(f.l)} : ${v[f.k]}`);
  });
  return parts.filter(Boolean).join(" · ").slice(0, 1000);
}
function studioBuildListing(tpl, it, editing){
  const shared = studio.shared, v = it.v;
  const {cat, sub} = studioCatSub(tpl, shared, v);
  const area = v.area || shared.area || "";
  const cur = shared.cur === "eur" ? "eur" : "usd";
  const price = studioNum(v.price);
  const f = {};
  [...tpl.shared.map(x=>[x, shared]), ...tpl.item.map(x=>[x, v])].forEach(([x, vals])=>{
    if(STUDIO_LISTING_KEYS.has(x.k) || !studioVisible(x, vals, shared) || studioEmpty(vals[x.k])) return;
    let val = vals[x.k];
    if(x.t === "lines") val = val.map(r=>(Array.isArray(r) ? r : []).slice(0, x.cols.length).map(c=>String(c || "").trim().slice(0, 80)))
      .filter(r=>r.some(Boolean)).slice(0, STUDIO_MAX_LINES);
    else if(x.t === "hours") val = STUDIO_DAYS.map((_, i)=>String(val[i] || "").trim().slice(0, 60));
    else if(Array.isArray(val)) val = val.filter(id=>studioOption(x, id));
    else if(x.t === "num" || x.t === "money") val = studioNum(val);
    else val = String(val).trim().slice(0, x.t === "url" ? 300 : 120);
    f[x.k] = val;
  });
  const userDesc = String(v.desc || "").trim().slice(0, 2000);
  const vehicle = tpl.vehicle ? {year:String(v.year || ""), km:String(v.km || ""), color:String(v.color || ""),
    fuel:v.fuel || "", transmission:v.transmission || "", body:"", mechanical:"", docs:""} : (editing?.vehicle || null);
  return {
    ...(editing || {}),
    id: editing ? editing.id : Date.now() + Math.floor(Math.random() * 1000),
    createdAt: editing?.createdAt || new Date().toISOString(),
    ownerId: editing?.ownerId || state.user.id,
    sellerId: editing?.sellerId || (state.user.provider === "supabase" ? state.user.id : undefined),
    sellerName: editing?.sellerName || state.user.name,
    sellerPhone: String(shared.phone || "").trim().slice(0, 32),
    t: String(v.title || "").trim().slice(0, 140),
    cat, sub, area, side: AREAS.nl.includes(area) ? "nl" : "fr",
    cond: tpl.id === "boutique" && shared.rayon !== "food" ? (v.cond || "") : "",
    cur, price,
    eur: cur === "eur" ? price : Math.round(price * .92),
    usd: cur === "usd" ? price : Math.round(price * 1.08),
    delivery:null, meetup:null, negotiable:false, safeMeet:false,
    noPrice: !(price > 0),
    salary: cat === "job" && !(price > 0),
    desc: userDesc || studioSummary(tpl, shared, v),
    vehicle,
    details: {tpl: tpl.id, v: 1, autoDesc: !userDesc, f},
    pro: true, urgent:false, feat: editing?.feat ?? true
  };
}
async function studioSaveOne(listing, photos, editing, userId){
  if(state.user?.provider !== "supabase"){
    listing.photos = photos.map(p=>p.url || p.dataUrl);
    listing.thumbPhotos = photos.map(p=>p.thumb || p.dataUrl || p.url);
    return listing;
  }
  if(!(window.SB && SB.enabled())) return null;
  const fresh = photos.map((p, i)=>p.file ? i : -1).filter(i=>i >= 0);
  const up = fresh.length ? await SB.uploadPhotos(fresh.map(i=>photos[i].file), fresh.map(i=>photos[i].thumbFile), userId) : {full:[], thumbs:[]};
  if(up.full.length !== fresh.length) return null;
  listing.photos = photos.map(p=>p.url || null);
  listing.thumbPhotos = photos.map(p=>p.thumb || p.url || null);
  fresh.forEach((pi, k)=>{ listing.photos[pi] = up.full[k]; listing.thumbPhotos[pi] = up.thumbs[k] || up.full[k]; });
  return editing ? SB.updateListing(listing) : SB.insertListing(listing, userId);
}
async function studioPublish(){
  const tpl = studioTpl();
  if(!studio || !tpl || studio.busy) return;
  const fr = state.lang === "fr";
  if(!studioCanUse() || studio.userId !== state.user?.id){ closeModal("proStudioModal"); openPostModal(); return; }
  let firstBad = -1;
  studio.items.forEach((it, i)=>{ it.error = studioValidate(tpl, it); if(it.error && firstBad < 0) firstBad = i; });
  if(firstBad >= 0){
    studio.open = firstBad;
    renderStudioKeepScroll();
    document.querySelector("#proStudioModal .ps-item-open")?.scrollIntoView({block:"start", behavior:"smooth"});
    showToast(studio.items[firstBad].error);
    return;
  }
  const editing = studio.editingId ? L.find(l=>idKey(l.id) === idKey(studio.editingId)) : null;
  if(studio.editingId && !editing){ showToast(fr ? "Modification impossible." : "Could not edit this listing."); return; }
  const remaining = studioRemaining();
  if(!editing && studio.items.length > remaining){
    showToast(publicationLimitMessage(listingLimitFor(state.user), true));
    return;
  }
  const session = studio, userId = state.user.id;
  studio.busy = true;
  renderStudioKeepScroll();
  const published = [];
  for(const it of [...studio.items]){
    if(studio !== session || state.user?.id !== userId) break;
    let saved = null;
    try { saved = await studioSaveOne(studioBuildListing(tpl, it, editing), it.photos, editing, userId); }
    catch(e){ console.warn("[studio] save failed:", e); }
    if(!saved){ it.error = fr ? "Enregistrement non confirmé. Réessayez." : "Save not confirmed. Please retry."; continue; }
    published.push(saved);
    session.items = session.items.filter(x=>x !== it);
  }
  session.busy = false;
  if(state.user?.id !== userId) return;
  published.forEach(l=>{
    if(editing){
      [L, userListings].forEach(list=>{ const k = list.findIndex(x=>idKey(x.id) === idKey(l.id)); if(k >= 0) list[k] = l; });
    } else { userListings.unshift(l); L.unshift(l); }
  });
  if(published.length) persistState();
  const failed = session.items.length;
  if(!failed){
    if(!editing && window.Drafts) Drafts.clear(STUDIO_DRAFT_KEY);
    studioHasDraft = false;
    studio = null;
    closeModal("proStudioModal");
  } else {
    session.open = 0;
    // A saved draft must not bring back the offers that are now live.
    if(studio === session && studioHasDraft && !editing) studioSaveDraft(true);
    if(studio === session) renderStudioKeepScroll();
  }
  if(published.length){
    await applyAutomaticIncludedBoosts({silent:true});
    render();
  }
  showToast(editing ? (failed ? (fr ? "Modification non enregistrée. Réessayez." : "Changes not saved. Please retry.") : (fr ? "Annonce modifiée" : "Listing updated"))
    : failed ? (fr ? `${published.length} publiée(s), ${failed} à réessayer.` : `${published.length} published, ${failed} to retry.`)
    : (fr ? `${published.length} offre(s) publiée(s)` : `${published.length} offer(s) published`));
}

/* ---------------- public listing page ---------------- */
// Extra details of a Studio listing, for the listing page. Everything comes
// from the listing row (public data typed by the seller) and is escaped here.
function proDetailsHTML(l){
  const d = l?.details;
  const tpl = d && typeof d === "object" ? studioTpl(d.tpl) : null;
  const f = tpl && d.f && typeof d.f === "object" && !Array.isArray(d.f) ? d.f : null;
  if(!f) return "";
  const cur = l.cur === "eur" ? "eur" : "usd";
  const specs = [], blocks = [];
  const optLabels = (x, ids)=>(Array.isArray(ids) ? ids : [ids]).map(id=>studioOption(x, id)).filter(Boolean).map(o=>tr(o.slice(1, 3)));
  [...tpl.item, ...tpl.shared].forEach(x=>{
    if(STUDIO_LISTING_KEYS.has(x.k) || (tpl.vehicle && STUDIO_VEHICLE_KEYS.has(x.k)) || !Object.prototype.hasOwnProperty.call(f, x.k)) return;
    const val = f[x.k];
    const label = tr(x.l).replace(/ \((facultatif|optional)\)$/, "");
    if(x.t === "hours" && Array.isArray(val)){
      if(!val.some(h=>String(h || "").trim())) return;
      blocks.push(`<div class="vehicle-section"><b>${esc(label)}</b><table class="pro-table"><tbody>${STUDIO_DAYS.map((day, i)=>
        `<tr><th scope="row">${esc(tr(day.slice(1, 3)))}</th><td>${esc(String(val[i] || "").trim() || (state.lang === "fr" ? "Fermé" : "Closed"))}</td></tr>`).join("")}</tbody></table></div>`);
    } else if(x.t === "lines" && Array.isArray(val)){
      const rows = val.filter(r=>Array.isArray(r) && r.some(c=>String(c || "").trim()));
      if(!rows.length) return;
      blocks.push(`<div class="vehicle-section"><b>${esc(label)}</b><table class="pro-table"><thead><tr>${x.cols.map(c=>`<th scope="col">${esc(tr(c))}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${x.cols.map((_, ci)=>`<td>${esc(String(r[ci] || ""))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    } else if(["chips", "days", "choice"].includes(x.t)){
      const labels = optLabels(x, val);
      if(labels.length) specs.push([label, labels.join(", ")]);
    } else if(x.t === "money"){
      if(studioNum(val) > 0) specs.push([label, listingMoney(studioNum(val), cur)]);
    } else if(x.t === "url"){
      const href = safeUrl(String(val || ""));
      if(href) specs.push([label, `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${state.lang === "fr" ? "Ouvrir" : "Open"}</a>`, true]);
    } else if(!studioEmpty(val) && typeof val !== "object"){
      specs.push([label, String(val)]);
    }
  });
  if(!specs.length && !blocks.length) return "";
  return `<section class="vehicle-detail pro-details">
    <h3>${esc(tr(tpl.l))}</h3>
    ${specs.length ? `<div class="vehicle-spec-grid">${specs.map(([label, value, html])=>`<div class="vehicle-spec"><span>${esc(label)}</span><b>${html ? value : esc(value)}</b></div>`).join("")}</div>` : ""}
    ${blocks.join("")}
  </section>`;
}
// The listing page hides the automatic summary when the structured details already say it.
function proDescriptionFor(l){
  return l?.details?.autoDesc && proDetailsHTML(l) ? "" : descriptionFor(l);
}
