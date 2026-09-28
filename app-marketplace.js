
/* ---------------- DATA ---------------- */
const AREAS = {
  fr:["Marigot","Concordia","Agrément","Galisbay","Hameau du Pont","Saint-James","Bellevue","Sandy Ground","Baie Nettlé","Terres Basses","Grand Case","La Savane","Cul-de-Sac","Anse Marcel","Colombier","Rambaud","Saint-Louis","Friar's Bay","Quartier d'Orléans","Oyster Pond","Baie Orientale"],
  nl:["Philipsburg","Simpson Bay","Cole Bay","Maho","Beacon Hill","Cupecoy","Mullet Bay","Lowlands","Pelican Key","Cay Bay","Cay Hill","Little Bay","Belair","Point Blanche","Guana Bay","Dawn Beach","Oyster Pond","Dutch Quarter","Middle Region","Madame Estate","Sucker Garden","Belvedere","Defiance","St. Peters","Saunders","South Reward","Ebenezer","Cul de Sac","St. John's Estate","Mary's Estate / Mary's Fancy","Sentry Hill","Pond Island","Indigo Bay","Orange Grove","Billy Folly","Point Pirouette"]
};

const CATS = [
  {id:"all",  fr:"Toutes catégories",       en:"All categories"},
  {id:"voit", fr:"Véhicules",               en:"Vehicles"},
  {id:"immo", fr:"Immobilier",              en:"Property"},
  {id:"elec", fr:"Électronique",            en:"Electronics"},
  {id:"meub", fr:"Maison & meubles",        en:"Home & Furniture"},
  {id:"mode", fr:"Mode",                    en:"Fashion"},
  {id:"job",  fr:"Emploi",                  en:"Jobs"},
  {id:"serv", fr:"Services",                en:"Services"},
  {id:"pets", fr:"Animaux",                 en:"Pets"},
  {id:"bat",  fr:"Bateaux",                 en:"Boats"},
  {id:"gaming", fr:"Gaming",                en:"Gaming"},
  {id:"beauty", fr:"Beauté",                en:"Beauty"},
  {id:"scoot",fr:"Motos & scooters",        en:"Motorcycles & scooters"},
  {id:"locvoit", fr:"Locations de voitures",en:"Car rentals"},
  {id:"menag",fr:"Électroménager",          en:"Appliances"},
  {id:"food", fr:"Alimentation & Boissons", en:"Food & Drinks"},
  {id:"lois", fr:"Loisirs",                 en:"Leisure"},
  {id:"billet",fr:"Billetterie",            en:"Tickets"},
  {id:"pro",  fr:"Matériel pro",            en:"Business gear"},
  {id:"bonplan", fr:"Bons plans",           en:"Deals"},
  {id:"autres", fr:"Plus",                  en:"More"}
];

const CONDS = [
  {id:"neuf",  fr:"Neuf",           en:"New"},
  {id:"tbe",   fr:"Très bon état",  en:"Very good"},
  {id:"bon",   fr:"Bon état",       en:"Good"},
  {id:"corr",  fr:"État correct",   en:"Fair"},
  {id:"piece", fr:"Pour pièces",    en:"For parts"}
];

const SUBCATS = {
  immo:{
    fr:"Immobilier",
    en:"Property",
    groups:[
      {fr:"Services utiles", en:"Useful services", items:[
        {id:"loan", fr:"Simuler votre prêt immobilier", en:"Mortgage simulator"},
        {id:"news", fr:"Actualité immobilière", en:"Property news"},
        {id:"all-immo", fr:"Tout Immobilier", en:"All property"}
      ]},
      {fr:"Ventes immobilières", en:"Property sales", items:[
        {id:"sale", fr:"À vendre", en:"For sale"},
        {id:"sale-apartment", fr:"Appartement", en:"Apartment"},
        {id:"sale-house", fr:"Maison", en:"House"},
        {id:"sale-land", fr:"Terrain", en:"Land"}
      ]},
      {fr:"Locations", en:"Rentals", items:[
        {id:"rent", fr:"À louer", en:"For rent"},
        {id:"vacation-rental", fr:"Location saisonnière / courte durée", en:"Short-term rental"},
        {id:"short-term-studio", fr:"Studio courte durée", en:"Short-term studio"},
        {id:"short-term-apartment", fr:"Appartement courte durée", en:"Short-term apartment"},
        {id:"short-term-villa", fr:"Villa courte durée", en:"Short-term villa"},
        {id:"short-term-house", fr:"Maison courte durée", en:"Short-term house"},
        {id:"short-term-room", fr:"Chambre courte durée", en:"Short-term room"},
        {id:"rent-apartment", fr:"Appartement", en:"Apartment"},
        {id:"rent-house", fr:"Maison", en:"House"},
        {id:"rent-parking", fr:"Parking", en:"Parking"},
        {id:"roommates", fr:"Colocations", en:"Roommates"},
        {id:"commercial", fr:"Commercial", en:"Commercial"},
        {id:"offices", fr:"Bureaux & commerces", en:"Offices & shops"}
      ]},
      {fr:"Immobilier neuf", en:"New developments", items:[
        {id:"new-property", fr:"Immobilier neuf", en:"New property"},
        {id:"new-apartment", fr:"Appartement neuf", en:"New apartment"},
        {id:"new-house", fr:"Maison neuve", en:"New house"},
        {id:"programs", fr:"Programmes logements neufs", en:"New housing programs"},
        {id:"developers", fr:"Promoteurs immobiliers", en:"Property developers"}
      ]}
    ]
  },
  voit:{
    fr:"Véhicules",
    en:"Vehicles",
    groups:[
      {fr:"Véhicules", en:"Vehicles", items:[
        {id:"car-sale", fr:"Voitures", en:"Cars"},
        {id:"motorbike-sale", fr:"Motos", en:"Motorcycles"},
        {id:"scooter-sale", fr:"Scooters", en:"Scooters"},
        {id:"truck-sale", fr:"Trucks / utilitaires", en:"Trucks"},
        {id:"dealer-inventory", fr:"Inventaire concessionnaire", en:"Dealer inventory"}
      ]},
      {fr:"Pièces", en:"Parts", items:[
        {id:"auto-parts", fr:"Pièces auto", en:"Car parts"},
        {id:"motorbike-parts", fr:"Pièces moto", en:"Motorcycle parts"},
        {id:"truck-parts", fr:"Pièces utilitaires", en:"Truck parts"}
      ]},
      {fr:"Services", en:"Services", items:[
        {id:"mechanic", fr:"Réparation mécanique", en:"Mechanical repair"},
        {id:"dealer-account", fr:"Compte concessionnaire", en:"Dealer account"}
      ]}
    ]
  },
  scoot:{
    fr:"Scooters & motos",
    en:"Scooters & bikes",
    groups:[
      {fr:"Acheter & vendre", en:"Buy & sell", items:[
        {id:"scooter-sale", fr:"Scooters à vendre", en:"Scooters for sale"},
        {id:"motorbike-sale", fr:"Motos à vendre", en:"Motorcycles for sale"}
      ]},
      {fr:"Pièces & équipements", en:"Parts & equipment", items:[
        {id:"motorbike-parts", fr:"Pièces moto", en:"Motorbike parts"},
        {id:"bike-equipment", fr:"Équipements vélos", en:"Bike equipment"},
        {id:"helmets-gear", fr:"Casques & protections", en:"Helmets & riding gear"}
      ]},
      {fr:"Services", en:"Services", items:[
        {id:"scooter-mechanic", fr:"Réparation scooters & motos", en:"Scooter and motorbike repairs"}
      ]}
    ]
  },
  bat:{
    fr:"Bateaux & nautisme",
    en:"Boats & marine",
    groups:[
      {fr:"Vente", en:"For sale", items:[
        {id:"boat-sale", fr:"Bateaux", en:"Boats"},
        {id:"jet-ski-sale", fr:"Jet skis", en:"Jet skis"},
        {id:"marine-trailer", fr:"Remorques bateau", en:"Boat trailers"}
      ]},
      {fr:"Pièces & services", en:"Parts & services", items:[
        {id:"marine-parts", fr:"Pièces nautiques", en:"Marine parts"},
        {id:"marine-service", fr:"Entretien nautique", en:"Marine service"}
      ]}
    ]
  },
  elec:{
    fr:"Électronique",
    en:"Electronics",
    groups:[
      {fr:"Téléphones & ordinateurs", en:"Phones & computers", items:[
        {id:"phones", fr:"Téléphones", en:"Phones"},
        {id:"laptops", fr:"Ordinateurs portables", en:"Laptops"},
        {id:"tablets", fr:"Tablettes", en:"Tablets"},
        {id:"desktop-computers", fr:"Ordinateurs fixes", en:"Desktop computers"}
      ]},
      {fr:"Maison & image", en:"Home & video", items:[
        {id:"tv-audio", fr:"TV, audio & vidéo", en:"TV, audio and video"},
        {id:"gaming", fr:"Consoles & jeux vidéo", en:"Gaming"},
        {id:"cameras", fr:"Photo & caméras", en:"Cameras"}
      ]},
      {fr:"Accessoires & services", en:"Accessories & services", items:[
        {id:"electronics-accessories", fr:"Accessoires électroniques", en:"Electronics accessories"},
        {id:"repairs", fr:"Réparation électronique", en:"Electronics repair"}
      ]}
    ]
  },
  job:{
    fr:"Emploi",
    en:"Jobs",
    groups:[
      {fr:"Types de poste", en:"Job types", items:[
        {id:"hiring", fr:"Je recrute", en:"I am hiring"},
        {id:"looking-work", fr:"Je cherche du travail", en:"I'm looking for work"},
        {id:"cv", fr:"Publier un CV", en:"Post a resume"},
        {id:"full-time", fr:"Temps plein", en:"Full-time"},
        {id:"part-time", fr:"Temps partiel", en:"Part-time"},
        {id:"seasonal", fr:"Saisonnier", en:"Seasonal"},
        {id:"freelance", fr:"Freelance / missions", en:"Freelance / gigs"}
      ]},
      {fr:"Secteurs", en:"Industries", items:[
        {id:"hospitality", fr:"Hôtellerie & restauration", en:"Hospitality and restaurants"},
        {id:"sales", fr:"Vente & commerce", en:"Sales and retail"},
        {id:"construction", fr:"BTP & maintenance", en:"Construction and maintenance"},
        {id:"office-admin", fr:"Bureau & administration", en:"Office and admin"}
      ]},
      {fr:"Services emploi", en:"Job services", items:[
        {id:"paid-job-post", fr:"Offre d'emploi entreprise", en:"Paid job post"},
        {id:"internship", fr:"Stages", en:"Internships"},
        {id:"training", fr:"Formations", en:"Training"}
      ]}
    ]
  },
  food:{
    fr:"Alimentation & Boissons",
    en:"Food & Drinks",
    groups:[
      {fr:"À manger", en:"Food", items:[
        {id:"prepared-food", fr:"Plats préparés", en:"Prepared meals"},
        {id:"fresh-produce", fr:"Produits frais", en:"Fresh produce"},
        {id:"bakery", fr:"Boulangerie & pâtisserie", en:"Bakery & pastries"}
      ]},
      {fr:"Boissons & épicerie", en:"Drinks & groceries", items:[
        {id:"drinks", fr:"Boissons", en:"Drinks"},
        {id:"groceries", fr:"Épicerie", en:"Groceries"}
      ]},
      {fr:"Services", en:"Services", items:[
        {id:"catering", fr:"Traiteur & événements", en:"Catering & events"}
      ]}
    ]
  },
  gaming:{
    fr:"Gaming",
    en:"Gaming",
    groups:[
      {fr:"Consoles & jeux", en:"Consoles & games", items:[
        {id:"playstation", fr:"PlayStation", en:"PlayStation"},
        {id:"xbox", fr:"Xbox", en:"Xbox"},
        {id:"nintendo", fr:"Nintendo", en:"Nintendo"},
        {id:"pc-gaming", fr:"PC gaming", en:"PC gaming"}
      ]},
      {fr:"Accessoires", en:"Accessories", items:[
        {id:"controllers", fr:"Manettes", en:"Controllers"},
        {id:"gaming-headsets", fr:"Casques gaming", en:"Gaming headsets"}
      ]}
    ]
  },
  pets:{
    fr:"Animaux",
    en:"Pets",
    groups:[
      {fr:"Animaux & accessoires", en:"Pets & supplies", items:[
        {id:"dogs", fr:"Chiens", en:"Dogs"},
        {id:"cats", fr:"Chats", en:"Cats"},
        {id:"pet-supplies", fr:"Accessoires animaux", en:"Pet supplies"},
        {id:"pet-services", fr:"Garde & services animaux", en:"Pet sitting and services"}
      ]}
    ]
  },
  beauty:{
    fr:"Beauté",
    en:"Beauty",
    groups:[
      {fr:"Services beauté", en:"Beauty services", items:[
        {id:"hairdresser", fr:"Coiffure", en:"Hairdresser"},
        {id:"nails", fr:"Ongles", en:"Nails"},
        {id:"makeup", fr:"Maquillage", en:"Makeup"},
        {id:"barber", fr:"Barbier", en:"Barber"}
      ]},
      {fr:"Produits", en:"Products", items:[
        {id:"beauty-products", fr:"Produits beauté", en:"Beauty products"}
      ]}
    ]
  },
  serv:{
    fr:"Services",
    en:"Services",
    groups:[
      {fr:"Maison & entretien", en:"Home maintenance", items:[
        {id:"cleaning", fr:"Ménage / nettoyage", en:"Cleaning"},
        {id:"plumber", fr:"Plombier", en:"Plumber"},
        {id:"electrician", fr:"Électricien", en:"Electrician"},
        {id:"gardening", fr:"Jardinage", en:"Gardening"}
      ]},
      {fr:"Auto & bâtiment", en:"Auto and construction", items:[
        {id:"mechanic-service", fr:"Mécanicien", en:"Mechanic"},
        {id:"construction-service", fr:"Construction", en:"Construction"},
        {id:"moving-service", fr:"Déménagement", en:"Moving"}
      ]},
      {fr:"Créatif & digital", en:"Creative and digital", items:[
        {id:"photographer", fr:"Photographe", en:"Photographer"},
        {id:"web-it", fr:"Web / IT", en:"Web / IT"}
      ]},
      {fr:"Visibilité Pro", en:"Pro visibility", items:[
        {id:"verified-pro", fr:"Verified Pro", en:"Verified Pro"},
        {id:"top-service", fr:"Top Service Provider", en:"Top Service Provider"}
      ]}
    ]
  }
};

const SERVICE_SUBCATS = new Set([
  "mechanic","dealer-account","scooter-mechanic","marine-service","repairs",
  "catering","pet-services","hairdresser","nails","makeup","barber",
  "loan","news","developers"
]);

function postFieldProfile(cat, sub){
  const serviceListing = cat === "serv" || cat === "job" || SERVICE_SUBCATS.has(sub);
  if(serviceListing){
    return {photos:false, photosRequired:false, price:false, condition:false, delivery:false,
      meetup:false, negotiable:false, urgent:false, safeMeet:false, vehicle:false};
  }
  if(cat === "immo"){
    return {photos:true, photosRequired:true, price:true, condition:false, delivery:false,
      meetup:false, negotiable:true, urgent:false, safeMeet:true, vehicle:false};
  }
  const condition = !["food","billet"].includes(cat) && !(cat === "pets" && ["dogs","cats"].includes(sub));
  return {photos:true, photosRequired:true, price:true, condition, delivery:true,
    meetup:true, negotiable:true, urgent:true, safeMeet:cat !== "food", vehicle:usesVehicleFields(cat, sub)};
}

function usesVehicleFields(cat, sub){
  if(cat === "locvoit") return true;
  return new Set(["car-sale","motorbike-sale","scooter-sale","truck-sale","dealer-inventory","boat-sale","jet-ski-sale"]).has(sub);
}

const I18N = {
  fr:{searchPh:"Que cherchez-vous ?",searchBtn:"Rechercher",postAd:"Déposer une annonce",postShort:"Déposer",favoris:"Favoris",messages:"Messages",
  socialGoogle:"Continuer avec Google",socialApple:"Continuer avec Apple",socialOr:"ou",
  inboxPick:"Choisissez une conversation pour répondre.",inboxSend:"Envoyer",inboxViewListing:"Voir l'annonce",inboxWrite:"Écrivez votre réponse…",
  notifLabel:"Alertes",notifTitle:"Notifications",notifClear:"Tout effacer",pushDefault:"Recevoir les alertes sur cet appareil",pushLogin:"Connectez-vous pour activer les alertes.",pushOn:"Alertes activées sur cet appareil.",pushReady:"Alertes prêtes. Appuyez sur Activer.",pushDenied:"Alertes bloquées dans le navigateur.",pushUnsupported:"Alertes non disponibles sur ce navigateur.",pushEnable:"Activer",pushDisable:"Désactiver",
      pricingLabel:"Tarifs",loginLabel:"Login",pricingKicker:"Gratuit pour vendre, payant pour les pros",pricingTitle:"Tarifs",pricingIntro:"Créer un compte est gratuit. Publier et vendre vos objets personnels est gratuit. Les plans payants sont des abonnements pour les pros qui veulent plus de visibilité.",pricingPlansTitle:"Types de compte",pricingFreeNote:"Personal Free permet de publier gratuitement vos annonces personnelles. Les abonnements Pro ajoutent des outils business, des boosts et plus de visibilité.",authFreeTitle:"Créer un compte gratuit",authFreeText:"Publier une annonce personnelle reste gratuit. Les options Pro sont séparées dans Tarifs.",authBadge:"Gratuit",createKicker:"Nouveau compte",loginKicker:"Connexion rapide",
  otpSentText:"Nous avons envoyé un email de confirmation. Cliquez sur le lien qu'il contient pour activer votre compte, ou entrez ci-dessous le code reçu si vous en avez un.",otpCodeLabel:"Code de confirmation",otpConfirm:"Confirmer le code",otpResend:"Renvoyer le code",otpInvalid:"Code invalide ou expiré.",otpConfirmed:"Compte confirmé - bienvenue.",otpResent:"Nouveau code envoyé.",freeCreateAccount:"Créer un compte est gratuit.",freePostListing:"Publier quelque chose à vendre est gratuit.",freePersonalSelling:"Vendre vos objets personnels est gratuit.",loginWithEmail:"ou connectez-vous avec email",
      filters:"Filtres",filtersHint:"Trouvez plus vite l'annonce qui vous convient.",price:"Prix",side:"Côté de l'île",condition:"État",subcategoryLabel:"Sous-catégorie",allSubcategories:"Toutes les sous-catégories",sellerTypeLabel:"Type de vendeur",availabilityLabel:"Disponibilité",handoverFilterLabel:"Remise du produit",moreCriteria:"Autres critères",allSellers:"Tous les vendeurs",individualSeller:"Particuliers",professionalSeller:"Professionnels",allStatuses:"Tous les statuts",availableOnly:"Disponible maintenant",reservedOnly:"Réservé",soldOnly:"Vendu",allHandovers:"Tous les modes",urgentOnly:"Ventes urgentes",negotiableOnly:"Prix négociables",deliveryOnly:"Livraison disponible",resetFilters:"Tout effacer",activeFilters:n=>`${n} actif${n>1?"s":""}`,showResults:n=>`Voir ${n} annonce${n===1?"":"s"}`,filterSearch:"Rechercher",
      allIsland:"Toute l'île",browseLabel:"Parcourir",listingLabel:"Annonce",titleLabel:"Titre",titlePh:"Ex: Scooter 125 en bon état",categoryLabel:"Catégorie",areaLabel:"Zone",currencyLabel:"Devise",photosLabel:"Photos",uploadPhotos:"Ajouter des photos",photosHelp:"Ajoutez jusqu'à 8 photos réelles de l'objet. La première photo sera utilisée comme image principale.",deliveryLabel:"Remise",pickupOnly:"Retrait uniquement",deliveryPossible:"Livraison possible",meetupPossible:"Rendez-vous possible",meetupLabel:"Lieu préféré",publicMeetup:"Lieu public",sellerPlace:"Chez le vendeur",buyerPlace:"Chez l'acheteur",negotiableLabel:"Prix négociable",urgentSaleLabel:"Vente urgente",safeMeetLabel:"Rendez-vous sécurisé",photoRequired:"Ajoutez au moins une photo réelle pour publier.",tooManyPhotos:"Maximum 8 photos par annonce.",sideLabel:"Côté",descLabel:"Description",descPh:"Ajoutez les détails utiles: état, quantité, livraison et point de rendez-vous",postSubmit:"Publier l'annonce",cancelLabel:"Annuler",sellerPro:"Vendeur pro",sellerLocal:"Vendeur local",quickMessage:"Chat avec le vendeur",chatOnline:"Réponse instantanée",chatPlaceholder:"Écrivez votre message au vendeur",chatSend:"Envoyer",sellerTyping:"Le vendeur répond...",instantReply:"Oui, c'est disponible. On peut s'organiser ici dans le chat.",loginToChat:"Connectez-vous pour envoyer un message au vendeur.",shareLabel:"Partager",shareTitle:"Partager cette annonce",shareHelp:"Copiez le lien ou envoyez-le directement pour que quelqu'un ouvre cette annonce.",copyLink:"Copier le lien",linkCopied:"Lien copié",shareText:"Regarde cette annonce sur Buy Sell Trade Sxm",shareFailed:"Impossible de partager. Le lien a été copié.",savedLabel:"Enregistré",saveLabel:"Enregistrer",removedToast:"Retiré",savedToast:"Enregistré",messageReady:"Message envoyé",listingPublished:"Annonce publiée",defaultMessage:"Bonjour, votre annonce est-elle toujours disponible ?",subcatHint:"Affinez sans perdre le fil.",footerMarket:"Marketplace",footerTrust:"Confiance & sécurité",footerLang:"Français et anglais",profileLabel:"Profil",profileTitle:"Mon profil",profileRequired:"Connectez-vous pour voir votre profil.",memberSince:"Membre depuis",verifiedEmail:"Email vérifié",trustedMember:"Membre de confiance",fastReply:"Réponse rapide",profileListings:"Mes annonces",profileNoListings:"Vous n'avez pas encore publié d'annonce.",activeListings:"Annonces",savedItems:"Favoris",conversations:"Messages",ratingLabel:"Note",editProfile:"Modifier le profil",logoutLabel:"Se déconnecter",deleteAccountLabel:"Supprimer mon compte",boostPageTitle:"Boost & Pro",boostKicker:"Visibilité payante",boostHeroTitle:"Faites voir vos annonces aux bons acheteurs",boostHeroText:"Les annonces classiques restent gratuites pour les particuliers. Les boosts et comptes Pro sont des options payantes pour vendre plus vite, afficher plus d'annonces et obtenir plus de contacts.",boostFreeTitle:"Annonce gratuite",boostFreeText:"Pour vendre un objet occasionnellement: photos, prix, quartier, chat avec l'acheteur et partage du lien.",boostPaidTitle:"Boost payant",boostPaidText:"Le vendeur choisit une annonce, sélectionne une durée de mise en avant, paie, puis l'annonce reçoit le badge Sponsorisé et apparaît plus haut sur la page.",boostProTitle:"Compte Pro business",boostProText:"Pour les commerces: page business, badge Pro, plus d'annonces, statistiques, messages centralisés et options de visibilité régulières.",boostStepsTitle:"Comment ça marche",boostStep1:"Choisir l'annonce à promouvoir.",boostStep2:"Choisir la durée: 3, 7 ou 14 jours.",boostStep3:"Payer avant l'activation.",boostStep4:"Suivre les vues, favoris et messages.",boostPaymentTitle:"Paiement requis",boostPaymentText:"Aucune annonce n'est mise en avant sans paiement confirmé. Les prix seront ajoutés avant le lancement officiel.",boostTrustTitle:"Confiance vendeur",boostTrustText:"Après une discussion ou une vente, les acheteurs pourront noter le vendeur. Les profils sérieux seront plus rassurants pour les prochains acheteurs.",boostPriceSoon:"Prix à définir",boostPriceText:"On peut déjà construire le parcours paiement avec des prix temporaires masqués, puis brancher Stripe quand les tarifs sont validés.",accountTitle:"Compte requis",newAccountTitle:"Nouveau sur Buy Sell Trade Sxm",newAccountHelp:"Créez un compte particulier ou professionnel pour publier, gérer vos messages et protéger la communauté.",loginTitle:"J'ai déjà un compte",loginHelp:"Connectez-vous pour reprendre vos annonces, vos favoris et vos conversations.",passwordLabel:"Mot de passe",confirmPasswordLabel:"Confirmer le mot de passe",accountTypeLabel:"Type de compte",personalAccount:"Particulier",businessAccount:"Professionnel",businessNameLabel:"Nom du commerce",passwordMismatch:"Les mots de passe ne correspondent pas.",emailExists:"Un compte existe déjà avec cet email.",invalidLogin:"Email ou mot de passe incorrect.",loginSubmit:"Se connecter",loginToast:"Connexion réussie",accountName:"Nom",accountEmail:"Email",accountHelp:"Un compte est obligatoire pour déposer une annonce, contacter un vendeur et protéger la communauté.",accountSubmit:"Créer mon compte",comingSoon:"Bientôt disponible",storeAvailable:"Disponible",safetyBanner:"Objets illégaux interdits: armes, drogues, contrefaçons et articles dangereux. Toute violation peut entraîner un bannissement définitif.",illegalPolicy:"Les objets illégaux, armes, drogues, contrefaçons, produits volés et articles dangereux sont strictement interdits. Les comptes en infraction peuvent être supprimés et bannis définitivement.",
      saveSearch:"Enregistrer cette recherche",featured:"À la une sur l'île",sortBy:"Trier par",
      footNote:"Petites annonces locales pour Saint-Martin et Sint Maarten.",frSide:"Côté français · Marigot",nlSide:"Côté Sint Maarten · Philipsburg",
      sort_recent:"Plus récentes",sort_pxup:"Prix croissant",sort_pxdn:"Prix décroissant",sort_near:"Au plus près",
      results:n=>`${n.toLocaleString('fr-FR')} annonce${n===1?"":"s"}`,onIsland:"sur toute l'île",
      ago_h:n=>`il y a ${n} h`,ago_d:n=>`il y a ${n} j`,reserved:"Réservé",sold:"Vendu",urgent:"Urgent",
      priceIn:c=>c==='eur'?"en euros (€)":"en dollars ($)",noneT:"Rien sur la planche",noneB:"Élargis la zone ou le prix pour voir plus d'annonces.",
      heroH:"Une île. Pas de frontière. Une seule place de marché.",
      heroP:"Publiez en euros ou en dollars, discutez avec un voisin, retrouvez-vous à Marigot ou Philipsburg. Les deux côtés sur le même tableau.",
      prop1:"Deux côtés, un tableau",prop2:"Prix en € et en $",prop3:"Français et anglais",
      howH:"Trois gestes, et c'est sur le tableau de l'île",
      howL:"Créez un compte, publiez en quelques minutes, recevez un message ce soir.",
      s1h:"Photographiez et publiez",s1p:"Des photos, un prix en € ou en $, votre zone: Marigot, Philipsburg, Grand Case, où que vous soyez sur l'île.",
      s2h:"Discutez, sans appeler",s2p:"Les acheteurs vous écrivent dans l'app. Votre numéro reste privé jusqu'à ce que vous décidiez de le partager.",
      s3h:"Retrouvez-vous et vendez",s3p:"Un lieu, la main à la main, marqué vendu. Laissez-vous une note pour le prochain sur l'île.",
      t1h:"Deux territoires, une app",t1p:"Français et anglais, avec le prix dans la devise de votre côté de l'île.",
      t2h:"Messagerie intégrée",t2p:"Posez une question, négociez, organisez le retrait sans donner votre numéro.",
      t3h:"Signaler et bloquer",t3p:"Chaque annonce et chaque profil peut être signalé. Une petite île tourne à la confiance.",
      t4h:"Trié par zone",t4p:"Parcourez Marigot séparément de Simpson Bay, ou toute l'île d'un seul coup d'œil.",
      getH:"Déposez votre première annonce aujourd'hui",getP:"C'est gratuit, c'est local, et votre voisin cherche sans doute déjà ce que vous vendez.",leaderAdTitle:"Assistance digitale pour votre business",leaderAdText:"Un emplacement premium pour les services, boutiques et offres locales qui veulent être vus sur toute l'île.",leaderAdCta:"En savoir plus",sponsoredTitle:"Boostez votre annonce",sponsoredText:"Option payante: mettez votre annonce en avant sur la page d'accueil pour toucher plus d'acheteurs à Saint-Martin et Sint Maarten.",sponsoredCta:"Mettre en avant",adLabel:"Pub",mobileAdTop:"Espace AdMob mobile",mobileAdFeed:"Annonce sponsorisée dans le fil",mobileAdBottom:"Annonce mobile sponsorisée",
      dlOn:"Télécharger sur",getOn:"Disponible sur"},
  en:{searchPh:"What are you looking for?",searchBtn:"Search",postAd:"Post an ad",postShort:"Post",favoris:"Saved",messages:"Messages",
  socialGoogle:"Continue with Google",socialApple:"Continue with Apple",socialOr:"or",
  inboxPick:"Pick a conversation to reply.",inboxSend:"Send",inboxViewListing:"View listing",inboxWrite:"Write your reply…",
  notifLabel:"Alerts",notifTitle:"Notifications",notifClear:"Clear all",pushDefault:"Receive alerts on this device",pushLogin:"Log in to turn on alerts.",pushOn:"Alerts are on for this device.",pushReady:"Alerts are ready. Tap Enable.",pushDenied:"Alerts are blocked in the browser.",pushUnsupported:"Alerts are not available in this browser.",pushEnable:"Enable",pushDisable:"Turn off",
      pricingLabel:"Pricing",loginLabel:"Login",pricingKicker:"Free to sell, paid for pros",pricingTitle:"Pricing",pricingIntro:"Creating an account is free. Posting and selling your personal items is free. Paid plans are subscriptions for pros who want more visibility.",pricingPlansTitle:"Account types",pricingFreeNote:"Personal Free lets you publish personal listings for free. Pro subscriptions add business tools, boosts, and more visibility.",authFreeTitle:"Create a free account",authFreeText:"Posting a personal listing stays free. Pro options live separately in Pricing.",authBadge:"Free",createKicker:"New account",loginKicker:"Fast login",
  otpSentText:"We sent a confirmation email. Click the link inside it to activate your account, or enter the code below if you received one.",otpCodeLabel:"Confirmation code",otpConfirm:"Confirm code",otpResend:"Resend code",otpInvalid:"Invalid or expired code.",otpConfirmed:"Account confirmed - welcome.",otpResent:"New code sent.",freeCreateAccount:"Creating an account is free.",freePostListing:"Posting something for sale is free.",freePersonalSelling:"Selling your personal items is free.",loginWithEmail:"or log in with email",
      filters:"Filters",filtersHint:"Find the right listing faster.",price:"Price",side:"Side of the island",condition:"Condition",subcategoryLabel:"Subcategory",allSubcategories:"All subcategories",sellerTypeLabel:"Seller type",availabilityLabel:"Availability",handoverFilterLabel:"Item handover",moreCriteria:"More criteria",allSellers:"All sellers",individualSeller:"Individuals",professionalSeller:"Businesses",allStatuses:"All statuses",availableOnly:"Available now",reservedOnly:"Reserved",soldOnly:"Sold",allHandovers:"All handover options",urgentOnly:"Urgent listings",negotiableOnly:"Negotiable prices",deliveryOnly:"Delivery available",resetFilters:"Clear all",activeFilters:n=>`${n} active`,showResults:n=>`Show ${n} listing${n!==1?"s":""}`,filterSearch:"Search",
      allIsland:"Whole island",browseLabel:"Browse",listingLabel:"Listing",titleLabel:"Title",titlePh:"Ex: 125cc scooter in good condition",categoryLabel:"Category",areaLabel:"Area",currencyLabel:"Currency",photosLabel:"Photos",uploadPhotos:"Add photos",photosHelp:"Add up to 8 real photos of the item. The first photo becomes the main listing image.",deliveryLabel:"Handover",pickupOnly:"Pickup only",deliveryPossible:"Delivery possible",meetupPossible:"Meetup possible",meetupLabel:"Preferred place",publicMeetup:"Public place",sellerPlace:"Seller's place",buyerPlace:"Buyer's place",negotiableLabel:"Negotiable price",urgentSaleLabel:"Urgent sale",safeMeetLabel:"Safe meetup",photoRequired:"Add at least one real photo before publishing.",tooManyPhotos:"Maximum 8 photos per listing.",sideLabel:"Side",descLabel:"Description",descPh:"Add useful details: condition, quantity, delivery, and meeting point",postSubmit:"Publish listing",cancelLabel:"Cancel",sellerPro:"Professional seller",sellerLocal:"Local seller",quickMessage:"Chat with seller",chatOnline:"Instant reply",chatPlaceholder:"Write your message to the seller",chatSend:"Send",sellerTyping:"Seller is replying...",instantReply:"Yes, it is available. We can arrange everything here in the chat.",loginToChat:"Log in to message the seller.",shareLabel:"Share",shareTitle:"Share this listing",shareHelp:"Copy the link or send it directly so someone can open this listing.",copyLink:"Copy link",linkCopied:"Link copied",shareText:"Look at this listing on Buy Sell Trade Sxm",shareFailed:"Sharing was not available. The link was copied.",savedLabel:"Saved",saveLabel:"Save",removedToast:"Removed",savedToast:"Saved",messageReady:"Message sent",listingPublished:"Listing published",defaultMessage:"Hi, is this listing still available?",subcatHint:"Refine the search without losing your place.",footerMarket:"Marketplace",footerTrust:"Trust & safety",footerLang:"French and English",profileLabel:"Profile",profileTitle:"My profile",profileRequired:"Log in to view your profile.",memberSince:"Member since",verifiedEmail:"Verified email",trustedMember:"Trusted member",fastReply:"Fast reply",profileListings:"My listings",profileNoListings:"You have not posted a listing yet.",activeListings:"Listings",savedItems:"Saved",conversations:"Messages",ratingLabel:"Rating",editProfile:"Edit profile",logoutLabel:"Log out",deleteAccountLabel:"Delete my account",boostPageTitle:"Boost & Pro",boostKicker:"Paid visibility",boostHeroTitle:"Put your listings in front of the right buyers",boostHeroText:"Regular listings stay free for individuals. Boosts and Pro accounts are paid options to sell faster, publish more listings, and get more contacts.",boostFreeTitle:"Free listing",boostFreeText:"For occasional selling: photos, price, area, buyer chat, and shareable listing link.",boostPaidTitle:"Paid boost",boostPaidText:"The seller chooses a listing, selects a promotion duration, pays, then the listing gets a Sponsored badge and appears higher on the page.",boostProTitle:"Pro business account",boostProText:"For local businesses: business page, Pro badge, more listings, analytics, centralized messages, and regular visibility options.",boostStepsTitle:"How it works",boostStep1:"Choose the listing to promote.",boostStep2:"Choose the duration: 3, 7, or 14 days.",boostStep3:"Pay before activation.",boostStep4:"Track views, saves, and messages.",boostPaymentTitle:"Payment required",boostPaymentText:"No listing is featured until payment is confirmed. Prices will be added before the official launch.",boostTrustTitle:"Seller trust",boostTrustText:"After a chat or sale, buyers can rate the seller. Serious profiles will feel safer for the next buyers.",boostPriceSoon:"Pricing to define",boostPriceText:"We can already build the payment flow with hidden temporary prices, then connect Stripe once pricing is approved.",accountTitle:"Account required",newAccountTitle:"New to Buy Sell Trade Sxm",newAccountHelp:"Create a personal or business account to post, manage messages, and protect the community.",loginTitle:"I already have an account",loginHelp:"Log in to continue with your listings, saved items, and conversations.",passwordLabel:"Password",confirmPasswordLabel:"Confirm password",accountTypeLabel:"Account type",personalAccount:"Personal",businessAccount:"Business",businessNameLabel:"Business name",passwordMismatch:"Passwords do not match.",emailExists:"An account already exists with this email.",invalidLogin:"Incorrect email or password.",loginSubmit:"Log in",loginToast:"Logged in",accountName:"Name",accountEmail:"Email",accountHelp:"An account is required to post a listing, contact a seller, and protect the community.",accountSubmit:"Create my account",comingSoon:"Coming soon",storeAvailable:"Available",safetyBanner:"Illegal items are prohibited: weapons, drugs, counterfeit goods, and dangerous items. Violations may result in a permanent ban.",illegalPolicy:"Illegal items, weapons, drugs, counterfeit goods, stolen products, and dangerous items are strictly prohibited. Accounts that break these rules may be removed and permanently banned.",
      saveSearch:"Save this search",featured:"Featured on the island",sortBy:"Sort by",
      footNote:"Local classifieds for Saint-Martin and Sint Maarten.",frSide:"French side · Marigot",nlSide:"Sint Maarten side · Philipsburg",
      sort_recent:"Most recent",sort_pxup:"Price low to high",sort_pxdn:"Price high to low",sort_near:"Nearest",
      results:n=>`${n.toLocaleString('en-US')} listing${n===1?"":"s"}`,onIsland:"across the island",
      ago_h:n=>`${n} h ago`,ago_d:n=>`${n} d ago`,reserved:"Reserved",sold:"Sold",urgent:"Urgent",
      priceIn:c=>c==='eur'?"in euros (€)":"in dollars ($)",noneT:"Nothing on the board",noneB:"Widen the area or price to see more listings.",
      heroH:"One island. No border. One marketplace.",
      heroP:"Post in euros or dollars, chat with a neighbour, meet in Marigot or Philipsburg. Both sides on the same board.",
      prop1:"Two sides, one board",prop2:"Prices in € and $",prop3:"French and English",
      howH:"Three steps, and it's on the island's board",
      howL:"Create an account, post in minutes, get a message tonight.",
      s1h:"Snap and post",s1p:"Photos, a price in € or $, your area: Marigot, Philipsburg, Grand Case, wherever you are on the island.",
      s2h:"Chat, don't call",s2p:"Buyers message you in the app. Your number stays yours until you decide to share it.",
      s3h:"Meet and sell",s3p:"Pick a spot, hand it over, mark it sold. Leave each other a rating for the next person on the island.",
      t1h:"Two territories, one app",t1p:"French and English, with the price in whichever currency fits your side.",
      t2h:"Messaging built in",t2p:"Ask a question, negotiate, arrange pickup without handing out your number.",
      t3h:"Report and block",t3p:"Every listing and every profile can be flagged. A small island runs on trust.",
      t4h:"Sorted by area",t4p:"Browse Marigot separately from Simpson Bay, or the whole island at once.",
      getH:"Post your first listing today",getP:"It's free, it's local, and your neighbour is probably already looking for what you're selling.",leaderAdTitle:"Digital support for your business",leaderAdText:"A premium spot for local services, shops, and offers that need visibility across the whole island.",leaderAdCta:"Learn more",sponsoredTitle:"Boost your listing",sponsoredText:"Paid option: feature your listing on the home page to reach more buyers across Saint-Martin and Sint Maarten.",sponsoredCta:"Promote my ad",adLabel:"Ad",mobileAdTop:"Mobile AdMob space",mobileAdFeed:"Sponsored in-feed ad",mobileAdBottom:"Sponsored mobile ad",
      dlOn:"Download on the",getOn:"Get it on"}
};

Object.assign(I18N.fr, {
  planPersonalTitle:"Particulier",
  planFreeBadge:"Gratuit",
  planPaidBadge:"Payant",
  planFrontBadge:"Mise en avant",
  planPersonalText:"Pour vendre vos propres objets de temps en temps.",
  planPersonal1:"Annonces personnelles",
  planPersonal2:"Chat, favoris et partage de lien",
  planPersonal3:"Notes vendeur après achat",
  planStarterTitle:"Pro Starter",
  planStarterText:"Pour un commerce qui commence à vendre régulièrement.",
  planStarter1:"Page business + badge Pro",
  planStarter2:"Plus d'annonces actives",
  planStarter3:"Messages clients regroupés",
  planPlusTitle:"Pro Plus",
  planPlusText:"Pour les pros qui veulent vendre plus et booster leurs produits.",
  planPlus1:"Tout Starter",
  planPlus2:"Boosts mensuels inclus",
  planPlus3:"Statistiques vues, favoris, messages",
  planPremiumTitle:"Premium",
  planPremiumText:"Pour les businesses qui veulent une présence forte sur la page d'accueil.",
  planPremium1:"Tout Pro Plus",
  planPremium2:"Emplacements front page",
  planPremium3:"Priorité dans les annonces sponsorisées",
  planDealerTitle:"Dealer Pro",
  planDealerBadge:"$79/month",
  planDealerText:"Pour concessionnaires auto, motos, scooters, bateaux et jet skis.",
  planDealer1:"Page concessionnaire + logo",
  planDealer2:"Inventaire complet avec annonces prioritaires",
  planDealer3:"WhatsApp, téléphone, site web et statistiques",
  planDealerPrice:"$79/month",
  planPriceSoon:"Prix à définir",
  planLearnMore:"Voir comment fonctionne Boost & Pro",
  planPaymentNote:"Les plans Pro nécessitent un abonnement payé avant activation. Sans paiement confirmé, le compte Pro ne peut pas publier.",
  continueToPayment:"Continuer vers le paiement",
  proPaymentRequired:"Un abonnement Pro payé est obligatoire avant de créer un compte professionnel.",
  proPostBlocked:"Votre abonnement Pro doit être activé par paiement avant de publier comme professionnel.",
  paymentTitle:"Activer l'abonnement Pro",
  paymentKicker:"Paiement obligatoire",
  paymentAmountLabel:"Montant",
  paymentStatusLabel:"Statut",
  paymentWaiting:"En attente de paiement",
  paymentDemoTitle:"Paiement sécurisé",
  paymentDemoText:"Votre abonnement est activé après confirmation du paiement.",
  paymentConfirm:"Continuer vers le paiement",
  paymentPlanText:"Votre boutique sera activée après paiement confirmé. Vous pourrez ensuite publier vos produits, recevoir des messages et utiliser les options de visibilité.",
  paymentSuccess:"Paiement confirmé. Votre compte Pro est actif.",
  proDashboardTitle:"Espace Pro",
  proStorefrontTitle:"Vitrine business",
  proStorefrontText:"Votre page business regroupe vos produits, logo, WhatsApp, téléphone, site web, badge Pro, avis clients et informations de confiance.",
  proProductsTitle:"Produits à vendre",
  proProductsText:"Chaque produit se publie comme une annonce: photos réelles, prix en euro ou dollar, catégorie, quartier et chat direct avec les acheteurs.",
  proVisibilityTitle:"Visibilité",
  proVisibilityText:"Les boosts payants mettent un produit en avant sur la page d'accueil et dans les emplacements sponsorisés après paiement confirmé.",
  proOpenStore:"Voir ma boutique",
  proAddProduct:"Ajouter un produit",
  proBoostProduct:"Booster un produit",
  proActive:"Abonnement actif",
  proInactive:"Paiement requis",
  proPlan:"Plan",
  businessPhoneLabel:"Téléphone",
  businessWhatsappLabel:"WhatsApp",
  businessWebsiteLabel:"Site Internet",
  businessLogoLabel:"Logo URL",
  chatLocation:"Partager un lieu",
  chatPhoto:"Envoyer une photo",
  chatOffer:"Faire une offre",
  chatReport:"Signaler",
  chatBlock:"Bloquer",
  locationDraft:"Bonjour, pouvons-nous nous retrouver dans un lieu public proche de cette zone ?",
  offerDraft:"Bonjour, accepteriez-vous une offre à ",
  photoSent:"Photo ajoutée au chat",
  reportSent:"Merci. Cette annonce sera revue par l'équipe.",
  sellerBlocked:"Vendeur bloqué dans ce prototype.",
  dealerAccountNote:"Dealer Pro est pensé pour les concessionnaires: inventaire complet, logo, WhatsApp, téléphone, site web, statistiques et annonces prioritaires.",
  jobMonetizationNote:"Les CV et recherches d'emploi restent gratuits. Les entreprises pourront payer par offre ou via abonnement employeur.",
  dealerGuideTitle:"Dealer Pro",
  dealerGuideText:"Pour les concessionnaires: logo, page professionnelle, inventaire complet, WhatsApp, téléphone, site web, statistiques et annonces prioritaires.",
  jobsGuideTitle:"Jobs & employeurs",
  jobsGuideText:"Publier un CV ou chercher un emploi reste gratuit. Les entreprises paient par offre ou via abonnement employeur.",
  servicesGuideTitle:"Services vérifiés",
  servicesGuideText:"Cleaning, plomberie, électricité, mécanique, beauté, photo, jardinage, construction, déménagement et Web / IT peuvent obtenir des badges Verified Pro ou Top Service Provider.",
  revenueTitle:"Moteurs de revenus",
  revenue1:"Boosts d'annonces",
  revenue2:"Abonnements Pro",
  revenue3:"AdMob mobile",
  revenue4:"Publicités locales",
  revenue5:"Commission paiement sécurisé",
  revenue6:"Offres dealer, immo et emploi",
  profileVerified:"Profil vérifié",
  phoneVerified:"Téléphone vérifié",
  emailVerifiedShort:"Email vérifié",
  reviewsLabel:"avis",
  salesLabel:"ventes",
  fastResponder:"Répond vite",
  boostPaidText:"Pas besoin de compte Pro: un particulier peut payer un boost pour une seule annonce et la rendre plus visible.",
  boostStep1:"Publiez une annonce ou choisissez une annonce déjà active.",
  boostStep2:"Cliquez sur Booster depuis votre profil ou depuis cette page.",
  boostStep3:"Choisissez 3, 7 ou 14 jours de visibilité.",
  boostStep4:"Payez avant activation, puis suivez les vues, favoris et messages.",
  boostPaymentText:"Aucune annonce n'est mise en avant sans paiement confirmé. Le boost simple fonctionne aussi avec un compte particulier.",
  boostPricingTitle:"Booster une annonce sans compte Pro",
  boostPricingText:"Un vendeur particulier peut payer seulement pour mettre une annonce en avant. Aucun abonnement Pro n'est nécessaire.",
  boost3Title:"Boost 3 jours",
  boost3Price:"$6",
  boost3Text:"Pour une vente rapide ou un objet à petit prix.",
  boost7Title:"Boost 7 jours",
  boost7Price:"$11",
  boost7Text:"Le meilleur choix pour la plupart des annonces.",
  boost14Title:"Boost 14 jours",
  boost14Price:"$20",
  boost14Text:"Pour voitures, bateaux, immobilier ou objets plus chers.",
  boostFlow1:"Publier une annonce",
  boostFlow2:"Choisir Booster",
  boostFlow3:"Sélectionner la durée",
  boostFlow4:"Payer en ligne",
  boostFlow5:"Badge Sponsorisé activé",
  boostReadyTitle:"Prêt à booster une annonce ?",
  boostReadyText:"Utilisez un compte normal, choisissez une annonce active, puis payez uniquement la durée voulue.",
  boostCta:"Booster une annonce",
  boostCardCta:"Boost",
  boostBadge:"Sponsorisé",
  boostCheckoutTitle:"Booster mon annonce",
  boostCheckoutText:"Choisissez une durée. Le boost met votre annonce en avant sans abonnement Pro.",
  boostConfirm:"Acheter le boost",
  boostSuccess:"Boost activé. Votre annonce est maintenant sponsorisée.",
  boostAlreadyActive:"Cette annonce est déjà boostée.",
  boostLoginRequired:"Connectez-vous avec un compte normal pour booster une annonce.",
  boostNoListings:"Publiez d'abord une annonce, puis vous pourrez la booster.",
  boostChooseListing:"Choisissez une de vos annonces actives à booster.",
  vehicleInfoTitle:"Informations véhicule",
  vehicleInfoHelp:"Ajoutez les détails essentiels: année, kilométrage, couleur, motorisation et transmission.",
  vehicleYearLabel:"Année",
  vehicleYearPh:"2020",
  vehicleKmLabel:"Kilométrage",
  vehicleKmPh:"78000",
  vehicleColorLabel:"Couleur",
  vehicleColorPh:"Blanc",
  vehicleFuelLabel:"Motorisation",
  vehicleTransmissionLabel:"Transmission",
  vehicleFuelGas:"Essence",
  vehicleFuelDiesel:"Diesel",
  vehicleFuelHybrid:"Hybride",
  vehicleFuelElectric:"Électrique",
  vehicleFuelOther:"Autre",
  vehicleTransmissionAuto:"Automatique",
  vehicleTransmissionManual:"Manuelle",
  vehicleBodyLabel:"État intérieur / extérieur",
  vehicleBodyPh:"Carrosserie, intérieur, pneus, rayures, entretien visible",
  vehicleMechanicalLabel:"Mécanique & entretien",
  vehicleMechanicalPh:"Moteur, batterie, freins, dernières réparations, carnet d'entretien",
  vehicleDocsLabel:"Papiers & disponibilité",
  vehicleDocsPh:"Carte grise, assurance, contrôle technique, import, essai possible",
  vehicleDetailsTitle:"Détails véhicule",
  vehicleBodyTitle:"Intérieur / extérieur",
  vehicleMechanicalTitle:"Mécanique & entretien",
  vehicleDocsTitle:"Papiers & disponibilité"
});

Object.assign(I18N.en, {
  planPersonalTitle:"Personal",
  planFreeBadge:"Free",
  planPaidBadge:"Paid",
  planFrontBadge:"Featured",
  planPersonalText:"For selling your own items from time to time.",
  planPersonal1:"Personal listings",
  planPersonal2:"Chat, saved items, and shareable links",
  planPersonal3:"Seller ratings after purchase",
  planStarterTitle:"Pro Starter",
  planStarterText:"For a business starting to sell regularly.",
  planStarter1:"Business page + Pro badge",
  planStarter2:"More active listings",
  planStarter3:"Customer messages in one place",
  planPlusTitle:"Pro Plus",
  planPlusText:"For pros who want to sell more and boost products.",
  planPlus1:"Everything in Starter",
  planPlus2:"Monthly boosts included",
  planPlus3:"Views, saves, and message stats",
  planPremiumTitle:"Premium",
  planPremiumText:"For businesses that want strong home page visibility.",
  planPremium1:"Everything in Pro Plus",
  planPremium2:"Front page placements",
  planPremium3:"Priority in sponsored listings",
  planDealerTitle:"Dealer Pro",
  planDealerBadge:"$79/month",
  planDealerText:"For car, motorcycle, scooter, boat, and jet ski dealers.",
  planDealer1:"Dealer page + logo",
  planDealer2:"Full inventory with priority listings",
  planDealer3:"WhatsApp, phone, website, and stats",
  planDealerPrice:"$79/month",
  planPriceSoon:"Pricing to define",
  planLearnMore:"See how Boost & Pro works",
  planPaymentNote:"Pro plans require a paid subscription before activation. Without confirmed payment, a Pro account cannot publish.",
  continueToPayment:"Continue to payment",
  proPaymentRequired:"A paid Pro subscription is required before creating a business account.",
  proPostBlocked:"Your Pro subscription must be activated by payment before posting as a business.",
  paymentTitle:"Activate Pro subscription",
  paymentKicker:"Payment required",
  paymentAmountLabel:"Amount",
  paymentStatusLabel:"Status",
  paymentWaiting:"Waiting for payment",
  paymentDemoTitle:"Secure payment",
  paymentDemoText:"Your subscription is activated after payment is confirmed.",
  paymentConfirm:"Continue to payment",
  paymentPlanText:"Your store will be activated after confirmed payment. Then you can publish products, receive messages, and use visibility options.",
  paymentSuccess:"Payment confirmed. Your Pro account is active.",
  proDashboardTitle:"Pro workspace",
  proStorefrontTitle:"Business storefront",
  proStorefrontText:"Your business page brings together your products, logo, WhatsApp, phone, website, Pro badge, customer ratings, and trust information.",
  proProductsTitle:"Products for sale",
  proProductsText:"Each product is posted like a listing: real photos, euro or dollar price, category, area, and direct buyer chat.",
  proVisibilityTitle:"Visibility",
  proVisibilityText:"Paid boosts feature a product on the home page and sponsored ad spaces after confirmed payment.",
  proOpenStore:"View my store",
  proAddProduct:"Add product",
  proBoostProduct:"Boost product",
  proActive:"Subscription active",
  proInactive:"Payment required",
  proPlan:"Plan",
  businessPhoneLabel:"Phone",
  businessWhatsappLabel:"WhatsApp",
  businessWebsiteLabel:"Website",
  businessLogoLabel:"Logo URL",
  chatLocation:"Share location",
  chatPhoto:"Send photo",
  chatOffer:"Make offer",
  chatReport:"Report",
  chatBlock:"Block",
  locationDraft:"Hi, can we meet in a public place near this area?",
  offerDraft:"Hi, would you accept an offer of ",
  photoSent:"Photo added to chat",
  reportSent:"Thanks. This listing will be reviewed by the team.",
  sellerBlocked:"Seller blocked in this prototype.",
  dealerAccountNote:"Dealer Pro is built for dealers: full inventory, logo, WhatsApp, phone, website, stats, and priority listings.",
  jobMonetizationNote:"Resumes and job search stay free. Companies can pay per job post or use an employer subscription.",
  dealerGuideTitle:"Dealer Pro",
  dealerGuideText:"For dealers: logo, professional page, full inventory, WhatsApp, phone, website, analytics, and priority listings.",
  jobsGuideTitle:"Jobs & employers",
  jobsGuideText:"Posting a resume or looking for work stays free. Companies pay per job post or through an employer subscription.",
  servicesGuideTitle:"Verified services",
  servicesGuideText:"Cleaning, plumbing, electrical, mechanics, beauty, photo, gardening, construction, moving, and Web / IT can earn Verified Pro or Top Service Provider badges.",
  revenueTitle:"Revenue engines",
  revenue1:"Listing boosts",
  revenue2:"Pro subscriptions",
  revenue3:"Mobile AdMob",
  revenue4:"Local business ads",
  revenue5:"Secure payment commission",
  revenue6:"Dealer, property, and job offers",
  profileVerified:"Profile verified",
  phoneVerified:"Phone verified",
  emailVerifiedShort:"Email verified",
  reviewsLabel:"reviews",
  salesLabel:"sales",
  fastResponder:"Fast responder",
  boostPaidText:"No Pro account needed: an individual seller can pay to boost one listing and make it more visible.",
  boostStep1:"Post a listing or choose one that is already active.",
  boostStep2:"Click Boost from your profile or from this page.",
  boostStep3:"Choose 3, 7, or 14 days of visibility.",
  boostStep4:"Pay before activation, then track views, saves, and messages.",
  boostPaymentText:"No listing is featured until payment is confirmed. A simple boost also works with a personal account.",
  boostPricingTitle:"Boost a listing without Pro",
  boostPricingText:"An individual seller can pay only to promote one listing. No Pro subscription is required.",
  boost3Title:"3-day boost",
  boost3Price:"$6",
  boost3Text:"For a quick sale or a lower-priced item.",
  boost7Title:"7-day boost",
  boost7Price:"$11",
  boost7Text:"Best for most listings.",
  boost14Title:"14-day boost",
  boost14Price:"$20",
  boost14Text:"For cars, boats, property, or higher-priced items.",
  boostFlow1:"Post a listing",
  boostFlow2:"Choose Boost",
  boostFlow3:"Select duration",
  boostFlow4:"Pay online",
  boostFlow5:"Sponsored badge active",
  boostReadyTitle:"Ready to boost a listing?",
  boostReadyText:"Use a normal account, choose an active listing, then pay only for the duration you want.",
  boostCta:"Boost a listing",
  boostCardCta:"Boost",
  boostBadge:"Sponsored",
  boostCheckoutTitle:"Boost my ad",
  boostCheckoutText:"Choose a duration. The boost promotes your listing without a Pro subscription.",
  boostConfirm:"Confirm demo boost",
  boostSuccess:"Boost activated. Your listing is now sponsored.",
  boostAlreadyActive:"This listing is already boosted.",
  boostLoginRequired:"Log in with a normal account to boost a listing.",
  boostNoListings:"Post a listing first, then you can boost it.",
  boostChooseListing:"Choose one of your active listings to boost.",
  vehicleInfoTitle:"Vehicle information",
  vehicleInfoHelp:"Add the essential details: year, mileage, color, engine, and transmission.",
  vehicleYearLabel:"Year",
  vehicleYearPh:"2020",
  vehicleKmLabel:"Mileage",
  vehicleKmPh:"78000",
  vehicleColorLabel:"Color",
  vehicleColorPh:"White",
  vehicleFuelLabel:"Engine",
  vehicleTransmissionLabel:"Transmission",
  vehicleFuelGas:"Gasoline",
  vehicleFuelDiesel:"Diesel",
  vehicleFuelHybrid:"Hybrid",
  vehicleFuelElectric:"Electric",
  vehicleFuelOther:"Other",
  vehicleTransmissionAuto:"Automatic",
  vehicleTransmissionManual:"Manual",
  vehicleBodyLabel:"Interior / exterior condition",
  vehicleBodyPh:"Bodywork, interior, tires, scratches, visible care",
  vehicleMechanicalLabel:"Mechanics & maintenance",
  vehicleMechanicalPh:"Engine, battery, brakes, recent repairs, service history",
  vehicleDocsLabel:"Paperwork & availability",
  vehicleDocsPh:"Registration, insurance, inspection, import status, test drive possible",
  vehicleDetailsTitle:"Vehicle details",
  vehicleBodyTitle:"Interior / exterior",
  vehicleMechanicalTitle:"Mechanics & maintenance",
  vehicleDocsTitle:"Paperwork & availability"
});

Object.assign(I18N.fr, {
  authFreeTitle:"Choisissez votre compte", authFreeText:"Un compte particulier reste gratuit. Un compte Pro ajoute des outils business avec un abonnement.", authBadge:"Inscription sécurisée",
  createKicker:"Compte particulier", newAccountTitle:"Créer un compte gratuit", newAccountHelp:"Pour vendre vos propres objets, publier gratuitement et discuter avec les acheteurs.", loginKicker:"Connexion", freeGoogle:"Créer gratuitement avec Google", freeApple:"Créer gratuitement avec Apple", createWithEmail:"ou créez votre compte avec email",
  proKicker:"Pour les entreprises", proAccountTitle:"Créer un compte Pro", proAccountHelp:"Pour les commerces et vendeurs réguliers qui veulent plus d'annonces, de visibilité et d'outils.",
  proBenefit1:"Page business et badge Pro", proBenefit2:"Plus d'annonces et de visibilité", proBenefit3:"Abonnement requis avant publication Pro",
  proGoogle:"Continuer Pro avec Google", proApple:"Continuer Pro avec Apple", proPlansHint:"Comparez le nombre d'annonces, les boosts et la visibilité avant de choisir.", viewProPlans:"Découvrir tous les comptes Pro"
});
Object.assign(I18N.en, {
  authFreeTitle:"Choose your account", authFreeText:"A personal account stays free. A Pro account adds business tools with a subscription.", authBadge:"Secure sign-up",
  createKicker:"Personal account", newAccountTitle:"Create a free account", newAccountHelp:"Sell your own items, post for free, and chat with buyers.", loginKicker:"Log in", freeGoogle:"Create free with Google", freeApple:"Create free with Apple", createWithEmail:"or create your account with email",
  proKicker:"For businesses", proAccountTitle:"Create a Pro account", proAccountHelp:"For businesses and regular sellers who need more listings, visibility, and tools.",
  proBenefit1:"Business page and Pro badge", proBenefit2:"More listings and visibility", proBenefit3:"Subscription required before Pro publishing",
  proGoogle:"Continue Pro with Google", proApple:"Continue Pro with Apple", proPlansHint:"Compare listing limits, boosts, and visibility before choosing.", viewProPlans:"Explore all Pro accounts"
});

const G = {
  all:{img:"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80", alt:"Person browsing a marketplace on a phone"},
  voit:{img:"https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80", alt:"Used car parked outdoors"},
  locvoit:{img:"https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80", alt:"Compact rental car on the road"},
  scoot:{img:"https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80", alt:"Motorcycle parked outside"},
  immo:{img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", alt:"Furnished apartment interior"},
  bat:{img:"https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80", alt:"Boat at a marina"},
  elec:{img:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80", alt:"Used laptop and electronics"},
  meub:{img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80", alt:"Second-hand sofa for sale"},
  menag:{img:"https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80", alt:"Home appliance refrigerator"},
  mode:{img:"https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80", alt:"Second-hand clothes on a rack"},
  food:{img:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80", alt:"Fresh fruit and vegetables at a local market"},
  job:{img:"https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80", alt:"People working in a local business"},
  gaming:{img:"https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80", alt:"Game console and controller for sale"},
  pets:{img:"https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80", alt:"Dog with pet accessories"},
  beauty:{img:"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80", alt:"Hair salon and beauty service"},
  serv:{img:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80", alt:"Cleaning service supplies"},
  pro:{img:"https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80", alt:"Professional tools for sale"},
  lois:{img:"https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=80", alt:"Beach sport equipment for sale"},
  billet:{img:"https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80", alt:"Concert and event ticket listing"},
  bonplan:{img:"https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=900&q=80", alt:"Discount tags and shopping deal"},
  autres:{img:"https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=900&q=80", alt:"Miscellaneous household items for sale"}
};

const CATEGORY_PHOTOS = {
  voit:[
    {img:G.voit.img, alt:G.voit.alt},
    {img:"https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80", alt:"Used car parked for sale"},
    {img:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80", alt:"Clean used car exterior"},
    {img:"https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80", alt:"Car closeup for automotive listing"}
  ],
  locvoit:[
    {img:G.locvoit.img, alt:G.locvoit.alt},
    {img:"https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80", alt:"Car rental vehicle ready for pickup"},
    {img:"https://images.unsplash.com/photo-1441148345475-03a2e82f9719?auto=format&fit=crop&w=900&q=80", alt:"Rental car on a sunny road"}
  ],
  scoot:[
    {img:G.scoot.img, alt:G.scoot.alt},
    {img:"https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80", alt:"Motorbike listed for sale"},
    {img:"https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=900&q=80", alt:"Scooter parked near the street"}
  ],
  immo:[
    {img:G.immo.img, alt:G.immo.alt},
    {img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80", alt:"Modern house for rent or sale"},
    {img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", alt:"Furnished apartment interior"},
    {img:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80", alt:"Villa and pool property listing"}
  ],
  bat:[
    {img:G.bat.img, alt:G.bat.alt},
    {img:"https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80", alt:"Sailboat at marina"},
    {img:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", alt:"Small leisure boat on water"}
  ],
  elec:[
    {img:G.elec.img, alt:G.elec.alt},
    {img:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80", alt:"Laptop for sale"},
    {img:"https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80", alt:"Game console and controller"}
  ],
  meub:[
    {img:G.meub.img, alt:G.meub.alt},
    {img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80", alt:"Sofa furniture listing"},
    {img:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", alt:"Wood furniture and home decor"}
  ],
  menag:[
    {img:G.menag.img, alt:G.menag.alt},
    {img:"https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80", alt:"Refrigerator appliance for sale"},
    {img:"https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80", alt:"Washing machine appliance"}
  ],
  mode:[
    {img:G.mode.img, alt:G.mode.alt},
    {img:"https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80", alt:"Clothing rack fashion listing"}
  ],
  food:[
    {img:G.food.img, alt:G.food.alt},
    {img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80", alt:"Freshly prepared meal for sale"},
    {img:"https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80", alt:"Cold bottled drinks"},
    {img:"https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80", alt:"Fresh bread and pastries"}
  ],
  job:[
    {img:G.job.img, alt:G.job.alt},
    {img:"https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80", alt:"Team hiring and job listing"}
  ],
  gaming:[
    {img:G.gaming.img, alt:G.gaming.alt},
    {img:"https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80", alt:"Gaming setup and monitor"},
    {img:"https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=900&q=80", alt:"Video game controller closeup"}
  ],
  pets:[
    {img:G.pets.img, alt:G.pets.alt},
    {img:"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80", alt:"Cat looking at camera"},
    {img:"https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=900&q=80", alt:"Pet grooming supplies"}
  ],
  beauty:[
    {img:G.beauty.img, alt:G.beauty.alt},
    {img:"https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80", alt:"Nail care and manicure service"},
    {img:"https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80", alt:"Hairdresser working in salon"}
  ],
  loisirs:[
    {img:G.lois.img, alt:G.lois.alt}
  ],
  lois:[
    {img:G.lois.img, alt:G.lois.alt},
    {img:"https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=80", alt:"Surf and leisure equipment"},
    {img:"https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80", alt:"Sports leisure equipment"}
  ],
  billet:[
    {img:G.billet.img, alt:G.billet.alt},
    {img:"https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80", alt:"Concert and event ticket listing"}
  ],
  serv:[
    {img:G.serv.img, alt:G.serv.alt},
    {img:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80", alt:"Cleaning service listing"},
    {img:"https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=900&q=80", alt:"Local professional service"}
  ],
  pro:[
    {img:G.pro.img, alt:G.pro.alt},
    {img:"https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80", alt:"Professional tools for sale"},
    {img:"https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80", alt:"Workshop equipment listing"}
  ],
  bonplan:[
    {img:G.bonplan.img, alt:G.bonplan.alt},
    {img:"https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=900&q=80", alt:"Local bargain deal"}
  ],
  autres:[
    {img:G.autres.img, alt:G.autres.alt},
    {img:"https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=900&q=80", alt:"Miscellaneous household items"}
  ]
};

const LISTING_PHOTOS = {
  1:{img:"https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80", alt:"Black used scooter parked outside"},
  2:{img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", alt:"Furnished apartment living room"},
  3:{img:"https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80", alt:"Boat for sale at a marina"},
  4:{img:"https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80", alt:"iPhone on a table"},
  5:{img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80", alt:"Second-hand sofa in a living room"},
  6:{img:"https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80", alt:"Motorbike for sale"},
  7:{img:"https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80", alt:"Refrigerator appliance"},
  8:{img:"https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=900&q=80", alt:"Restaurant staff working"},
  9:{img:"https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=80", alt:"Kitesurf and beach sport equipment"},
  10:{img:"https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80", alt:"Used car parked outdoors"},
  11:{img:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80", alt:"Used laptop for sale"},
  12:{img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", alt:"Studio apartment interior"},
  13:{img:"https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80", alt:"Small boat at marina"},
  14:{img:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", alt:"Teak outdoor dining table and chairs"},
  15:{img:"https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80", alt:"Professional power tool"},
  16:{img:"https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=80", alt:"Electric bicycle"},
  17:{img:"https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80", alt:"Home appliance for sale"},
  18:{img:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80", alt:"Cleaning service supplies"},
  19:{img:"https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80", alt:"PlayStation game console and controller"},
  20:{img:"https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80", alt:"Used compact car parked outdoors"},
  21:{img:"https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=80", alt:"Stand up paddle board"},
  22:{img:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", alt:"Wood TV cabinet"},
  23:{img:"https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80", alt:"Professional workshop equipment"},
  24:{img:"https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80", alt:"Baby furniture and nursery items"},
  25:{img:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80", alt:"Car wheels and tires"},
  26:{img:"https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80", alt:"Language tutoring session"},
  27:{img:"https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80", alt:"Small rental car"},
  28:{img:"https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80", alt:"Concert tickets in hand"},
  29:{img:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", alt:"Beach chairs and umbrella"},
  30:{img:"https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=900&q=80", alt:"Miscellaneous household items"},
  31:{img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80", alt:"Caribbean takeaway meal ready for pickup"},
  32:{img:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80", alt:"Fresh local fruit and vegetables"},
  33:{img:"https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80", alt:"Fresh bread and pastries"},
  34:{img:"https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80", alt:"Dealer car inventory"},
  35:{img:"https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=900&q=80", alt:"Jet ski on the water"},
  36:{img:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80", alt:"Vacation villa with pool"},
  37:{img:"https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=900&q=80", alt:"Hotel reception job"},
  38:{img:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80", alt:"Villa cleaning service supplies"},
  39:{img:"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80", alt:"Hair and beauty service"},
  40:{img:"https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80", alt:"Game console and games"},
  41:{img:"https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80", alt:"Dog accessories for sale"}
};

// eur/usd roughly paired; drop = price-drop flag
const L = [
  {id:1, t:"Scooter Piaggio Liberty 125, révisé, 2 casques", cat:"scoot", sub:"scooter-sale", side:"fr", area:"Marigot",       cond:"tbe",  cur:"eur", eur:850,  usd:920,  ph:6,  pics:8, pro:false, urgent:true,  feat:true, delivery:"meetup", negotiable:true},
  {id:2, t:"T2 vue lagon, meublé, dispo 1er du mois",        cat:"immo",  sub:"rent-apartment", side:"nl", area:"Simpson Bay", cond:"bon", cur:"usd", eur:1250, usd:1350, ph:2, pics:12, pro:true, urgent:false, feat:true, delivery:"meetup"},
  {id:3, t:"Hobie Cat 16 avec remorque, voiles OK",           cat:"bat",   side:"nl", area:"Simpson Bay",   cond:"bon",  eur:3200, usd:3450, ph:20, pics:6, pro:false, urgent:false, feat:true},
  {id:4, t:"iPhone 13 128 Go, batterie 89%, sous coque",      cat:"elec", sub:"phones", side:"fr", area:"Grand Case",    cond:"tbe",  cur:"eur", eur:360,  usd:390,  ph:1,  pics:5, pro:false, urgent:true,  feat:true, drop:true, delivery:"meetup", negotiable:true},
  {id:5, t:"Canapé rotin 3 places + coussins déperlants",     cat:"meub",  side:"nl", area:"Cole Bay",      cond:"bon",  cur:"usd", eur:210,  usd:225,  ph:9,  pics:4, pro:false, urgent:false, delivery:"delivery", negotiable:true},
  {id:6, t:"Yamaha 4x4 Kodiak 450, entretien à jour",         cat:"scoot", sub:"motorbike-sale", side:"nl", area:"Dutch Quarter", cond:"tbe",  cur:"usd", eur:4800, usd:5150, ph:30, pics:10,pro:false, urgent:false},
  {id:7, t:"Frigo américain Samsung, froid ventilé",          cat:"menag", side:"fr", area:"Cul-de-Sac",    cond:"bon",  cur:"eur", eur:290,  usd:315,  ph:14, pics:3, pro:false, urgent:false, delivery:"delivery"},
  {id:8, t:"Serveur / barman expérimenté - Baie Orientale",   cat:"job", sub:"hospitality",  side:"fr", area:"Baie Orientale",cond:"neuf", cur:"eur", eur:0, usd:0, ph:5, pics:1, pro:true, urgent:true, salary:true},
  {id:9, t:"Kitesurf Duotone 10m + barre, pack complet",      cat:"lois",  side:"nl", area:"Cupecoy",       cond:"tbe",  cur:"usd", eur:640,  usd:690,  ph:26, pics:7, pro:false, urgent:false},
  {id:10,t:"Suzuki Jimny 2019, clim, 62 000 km",              cat:"voit",  sub:"car-sale", side:"nl", area:"Philipsburg", cond:"tbe", cur:"usd", eur:14500,usd:15600,ph:3, pics:14,pro:true, urgent:false, drop:true, delivery:"pickup", negotiable:true},
  {id:11,t:"MacBook Air M1, 8/256, clavier AZERTY",           cat:"elec", sub:"laptops", side:"fr", area:"Marigot",       cond:"tbe",  cur:"eur", eur:560,  usd:605,  ph:7,  pics:6, pro:false, urgent:false, delivery:"meetup", negotiable:true},
  {id:12,t:"Studio Grand Case, pieds dans l'eau, courte durée",cat:"immo", sub:"rent-apartment", side:"fr", area:"Grand Case", cond:"bon", cur:"eur", eur:900, usd:970, ph:11, pics:9, pro:true, urgent:false},
  {id:13,t:"Annexe 3,10 m + moteur Tohatsu 9.8, révisé",      cat:"bat",   side:"nl", area:"Simpson Bay",   cond:"bon",  eur:2100, usd:2260, ph:19, pics:5, pro:false, urgent:false},
  {id:14,t:"Lot 6 chaises teck jardin + table pliante",       cat:"meub",  side:"fr", area:"Sandy Ground",  cond:"corr", cur:"eur", eur:120, usd:130, ph:34, pics:4, pro:false, urgent:false},
  {id:15,t:"Groupe électrogène Honda 2 kVA, insonorisé",      cat:"pro",   side:"nl", area:"Cole Bay",      cond:"tbe",  cur:"usd", eur:430,  usd:465,  ph:16, pics:3, pro:true, urgent:true},
  {id:16,t:"Vélo électrique VTC, 2 batteries, phare neuf",    cat:"lois",  side:"fr", area:"Quartier d'Orléans",cond:"bon",cur:"eur", eur:520, usd:560, ph:22, pics:6, pro:false, urgent:false, drop:true},
  {id:17,t:"Climatiseur split 12000 BTU, pose incluse",       cat:"menag", side:"nl", area:"Maho",          cond:"neuf", cur:"usd", eur:340,  usd:365,  ph:8,  pics:2, pro:true, urgent:false, delivery:"delivery"},
  {id:18,t:"Ménage villas & check-out, équipe dispo",         cat:"serv",  side:"nl", area:"Cupecoy",       cond:"neuf", cur:"usd", eur:0, usd:0, ph:12, pics:1, pro:true, urgent:false, salary:true, delivery:"delivery"},
  {id:19,t:"PS5 + 2 manettes + 4 jeux, boîte d'origine",      cat:"elec", sub:"gaming", side:"fr", area:"Marigot",       cond:"tbe",  cur:"eur", eur:380,  usd:410,  ph:4,  pics:5, pro:false, urgent:true},
  {id:20,t:"Renault Clio IV 2016, CT OK, 1re main",           cat:"voit",  sub:"car-sale", side:"fr", area:"Cul-de-Sac", cond:"bon", cur:"eur", eur:6200, usd:6700, ph:28, pics:11,pro:false, urgent:false},
  {id:21,t:"Paddle gonflable 10'6 + pagaie carbone",          cat:"lois",  side:"nl", area:"Simpson Bay",   cond:"tbe",  cur:"usd", eur:250,  usd:270,  ph:15, pics:4, pro:false, urgent:false},
  {id:22,t:"Meuble TV manguier massif, 1,60 m",               cat:"meub",  side:"fr", area:"Baie Orientale",cond:"tbe",  cur:"eur", eur:180,  usd:195,  ph:40, pics:3, pro:false, urgent:false, reserved:true},
  {id:23,t:"Compresseur plongée Bauer, 225 bar, révisé",      cat:"pro",   side:"nl", area:"Philipsburg",   cond:"bon",  cur:"usd", eur:2600, usd:2800, ph:33, pics:6, pro:true, urgent:false},
  {id:24,t:"Table à langer + transat + parc, lot bébé",       cat:"meub",  side:"fr", area:"Grand Case",    cond:"bon",  cur:"eur", eur:90, usd:98, ph:9, pics:5, pro:false, urgent:false, sold:true},
  {id:25,t:"Jantes 17\" + pneus été 205/45, jeu de 4",        cat:"voit",  sub:"auto-parts", side:"nl", area:"Cole Bay", cond:"corr", cur:"usd", eur:220, usd:238, ph:21, pics:4, pro:false, urgent:false},
  {id:26,t:"Cours de français & anglais, particuliers",       cat:"serv",  side:"fr", area:"Marigot",       cond:"neuf", cur:"eur", eur:0, usd:0, ph:17, pics:1, pro:false, urgent:false, salary:true},
  {id:27,t:"Hyundai i10 automatique à louer - journée ou semaine", cat:"locvoit", side:"nl", area:"Maho", cond:"tbe", cur:"usd", eur:42, usd:45, ph:2, pics:7, pro:true, urgent:false, delivery:"pickup"},
  {id:28,t:"2 billets concert local samedi soir",             cat:"billet",side:"fr", area:"Marigot",       cond:"neuf", cur:"eur", eur:35, usd:38, ph:6, pics:2, pro:false, urgent:true},
  {id:29,t:"Bon plan: lot parasol + 2 chaises plage",         cat:"bonplan",side:"nl", area:"Mullet Bay",   cond:"bon",  cur:"usd", eur:55, usd:60, ph:10, pics:4, pro:false, urgent:false},
  {id:30,t:"Cartons de déménagement propres, lot complet",    cat:"autres",side:"fr", area:"Concordia",     cond:"bon",  cur:"eur", eur:20, usd:22, ph:13, pics:3, pro:false, urgent:false},
  {id:31,t:"Colombo de poulet maison - portion à emporter", te:"Homemade chicken colombo - takeaway portion", cat:"food", sub:"prepared-food", side:"fr", area:"Marigot", cond:"neuf", cur:"eur", eur:12, usd:13, ph:2, pics:3, pro:true, urgent:false, feat:true, delivery:"pickup", desc:"Préparé le jour même. Commande avant 11 h et retrait à Marigot entre 12 h et 14 h.", desce:"Prepared the same day. Order before 11 a.m. and collect in Marigot between noon and 2 p.m."},
  {id:32,t:"Panier de fruits et légumes locaux", te:"Local fruit and vegetable box", cat:"food", sub:"fresh-produce", side:"nl", area:"Philipsburg", cond:"neuf", cur:"usd", eur:23, usd:25, ph:4, pics:5, pro:true, urgent:false, delivery:"delivery", desc:"Produits locaux de saison. Réservez votre panier dans le chat et récupérez-le à Philipsburg.", desce:"Seasonal local produce. Reserve your box in chat and collect it in Philipsburg."},
  {id:33,t:"Viennoiseries fraîches - boîte de 8", te:"Fresh pastries - box of 8", cat:"food", sub:"bakery", side:"fr", area:"Grand Case", cond:"neuf", cur:"eur", eur:16, usd:18, ph:5, pics:4, pro:true, urgent:false, delivery:"pickup", desc:"Croissants et pains au chocolat préparés le matin. Réservation recommandée.", desce:"Croissants and pain au chocolat baked in the morning. Pre-ordering is recommended."},
  {id:34,t:"Toyota Hilux double cabine - inventaire concessionnaire", te:"Toyota Hilux double cab - dealer inventory", cat:"voit", sub:"dealer-inventory", side:"nl", area:"Philipsburg", cond:"tbe", cur:"usd", eur:25200, usd:27200, ph:3, pics:16, pro:true, urgent:false, feat:true, delivery:"pickup", desc:"Véhicule visible chez le concessionnaire. Financement et reprise possibles sur demande.", desce:"Vehicle available at the dealership. Financing and trade-in available on request."},
  {id:35,t:"Jet ski Yamaha VX Cruiser 2021", te:"2021 Yamaha VX Cruiser jet ski", cat:"bat", sub:"jet-ski-sale", side:"fr", area:"Baie Nettlé", cond:"bon", cur:"eur", eur:7600, usd:8200, ph:18, pics:9, pro:false, urgent:false, delivery:"meetup", negotiable:true},
  {id:36,t:"Villa 2 chambres - location vacances Orient Bay", te:"2-bedroom villa - Orient Bay vacation rental", cat:"immo", sub:"vacation-rental", side:"fr", area:"Baie Orientale", cond:"tbe", cur:"eur", eur:185, usd:200, ph:12, pics:14, pro:true, urgent:false, delivery:"meetup"},
  {id:37,t:"Offre d'emploi: réceptionniste hôtel - Maho", te:"Job offer: hotel receptionist - Maho", cat:"job", sub:"paid-job-post", side:"nl", area:"Maho", cond:"neuf", cur:"usd", eur:0, usd:0, ph:4, pics:1, pro:true, urgent:true, salary:true},
  {id:38,t:"Service nettoyage villas - check-in / check-out", te:"Villa cleaning service - check-in / check-out", cat:"serv", sub:"cleaning", side:"fr", area:"Terres Basses", cond:"neuf", cur:"eur", eur:0, usd:0, ph:9, pics:4, pro:true, urgent:false, salary:true, delivery:"delivery"},
  {id:39,t:"Coiffure braids & brushing à domicile", te:"Braids and blowout at-home hair service", cat:"beauty", sub:"hairdresser", side:"nl", area:"Cole Bay", cond:"neuf", cur:"usd", eur:0, usd:0, ph:7, pics:5, pro:true, urgent:false, salary:true, delivery:"meetup"},
  {id:40,t:"Nintendo Switch OLED + 3 jeux", te:"Nintendo Switch OLED + 3 games", cat:"gaming", sub:"nintendo", side:"fr", area:"Marigot", cond:"tbe", cur:"eur", eur:240, usd:260, ph:6, pics:5, pro:false, urgent:true, delivery:"meetup", negotiable:true},
  {id:41,t:"Accessoires chien: panier, laisse, gamelles", te:"Dog accessories: bed, leash, bowls", cat:"pets", sub:"pet-supplies", side:"nl", area:"Simpson Bay", cond:"bon", cur:"usd", eur:42, usd:45, ph:16, pics:4, pro:false, urgent:false, delivery:"pickup", negotiable:true}
];

const BASE_LISTINGS = L.map(item=>({...item}));

/* ---------------- STATE ---------------- */
const state = {
  lang:"fr", cur:"eur", cat:"all",
  q:"", area:"",
  subcat:"",
  sides:new Set(), conds:new Set(),
  sellerType:"all", availability:"all", handover:"all", features:new Set(),
  sort:"recent", view:"grid",
  favs:new Set(), saved:[], user:null
};

let userListings = [];
let adminTab = "overview";
let adminReports = [];
let adminBanned = [];
let adminProfiles = [];
let adminCategoryStatus = {};
let adminModerationRules = { categories:[], keywords:[] };
let adminAdCampaigns = [];
let adminDailyCounts = [];
let adminListingSearch = "";
let adminUserSearch = "";
let selectedPostPhotos = [];   // aperçus (data URL) pour l'affichage
let selectedPostFiles = [];    // File d'origine, pour l'upload Supabase Storage
let usersByEmail = {};
let pendingAuthAction = null;
let pendingProSignup = null;
let pendingSignupOtp = null; // { email, name, accountType, accountPlan } en attente du code de confirmation
let pendingPaymentExistingUser = false;
let pendingAfterPayment = null;
let pendingSelectedProPlan = null;
let pendingBoostListingId = null;
let pendingBoostDays = 7;
let editingListingId = null;

const chatThreads = {};
let unreadMessageCount = 0;

/* ================= NOTIFICATIONS (cloche + panneau) ================= */
const LISTING_ACTIVE_DAYS = 14;
const LISTING_EXPIRY_WARNING_DAYS = 3;
let notifications = [];          // { id, kind, title, text, at, seen, listingId, convKey }
let dismissedNotificationIds = new Set();
let notifPanelOpen = false;

function notifIcon(kind){
  return kind === "message" ? "✉️"
    : kind === "listing_expiring" ? "⏳"
    : kind === "listing_flagged" ? "⚠️"
    : kind === "report" ? "✅"
    : "🔔";
}

function unseenNotifCount(){
  return notifications.filter(n=>!n.seen).length;
}

function refreshNotifBadge(){
  const n = unseenNotifCount();
  ["notifCount", "mobileNotifCount"].forEach(id=>{
    const badge = document.getElementById(id);
    if(!badge) return;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  });
}

async function refreshPushControl(){
  const wrap = document.getElementById("pushControl");
  const text = document.getElementById("pushStatusText");
  const btn = document.getElementById("pushToggle");
  if(!wrap || !text || !btn) return;
  if(!(window.Push && Push.supported && Push.supported())){
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  if(!state.user || state.user.provider !== "supabase"){
    text.textContent = t().pushLogin;
    btn.textContent = t().pushEnable;
    btn.disabled = true;
    btn.classList.remove("is-on");
    return;
  }
  btn.disabled = false;
  const status = await Push.status();
  btn.classList.toggle("is-on", status === "on");
  btn.textContent = status === "on" ? t().pushDisable : t().pushEnable;
  text.textContent = status === "on" ? t().pushOn
    : status === "denied" ? t().pushDenied
    : status === "unsupported" ? t().pushUnsupported
    : t().pushReady;
  btn.disabled = status === "denied" || status === "unsupported";
}

async function togglePushNotifications(e){
  if(e) e.stopPropagation();
  const btn = document.getElementById("pushToggle");
  if(btn) btn.disabled = true;
  if(!state.user || state.user.provider !== "supabase"){
    showToast(t().pushLogin);
    await refreshPushControl();
    return;
  }
  const status = window.Push && Push.status ? await Push.status() : "unsupported";
  const result = status === "on" ? await Push.disable() : await Push.enable();
  await refreshPushControl();
  showToast(result && result.ok
    ? (status === "on" ? t().pushReady : t().pushOn)
    : (state.lang === "fr" ? "Alertes non activées." : "Alerts not enabled."));
}

function pushNotification(note){
  const entry = {
    id: note.id || ("n-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6)),
    kind: note.kind || "generic",
    title: note.title || "",
    text: note.text || "",
    at: note.at || new Date().toISOString(),
    seen: false,
    listingId: note.listingId ?? null,
    convKey: note.convKey ?? null,
    actionRequired: !!note.actionRequired,
    backendId: note.backendId ?? null
  };
  if(dismissedNotificationIds.has(entry.id)) return;
  const existing = notifications.find(n=>n.id === entry.id);
  if(existing){
    existing.title = entry.title;
    existing.text = entry.text;
    existing.at = entry.at;
    existing.listingId = entry.listingId;
    existing.convKey = entry.convKey;
  }else if(entry.convKey && notifications.some(n=>!n.seen && n.convKey === entry.convKey && n.kind === entry.kind)){
    // regroupe les messages non lus d'une même conversation
    const prev = notifications.find(n=>!n.seen && n.convKey === entry.convKey && n.kind === entry.kind);
    prev.text = entry.text; prev.at = entry.at;
  }else{
    notifications.unshift(entry);
  }
  notifications = notifications.slice(0, 40);
  persistState();
  refreshNotifBadge();
  if(notifPanelOpen) renderNotifPanel();
}

function renderNotifPanel(){
  const list = document.getElementById("notifList");
  if(!list) return;
  if(!notifications.length){
    list.innerHTML = `<p class="notif-empty">${state.lang==="fr" ? "Aucune notification." : "No notifications."}</p>`;
    return;
  }
  list.innerHTML = notifications.map(n=>`
    <div class="notif-item ${n.seen ? "" : "unseen"}">
    <button type="button" class="notif-open" data-notif-id="${esc(n.id)}" data-click="openNotification" data-click-args='${dataArgs(["__DATA__:notifId"])}'>
      <span class="notif-ico">${notifIcon(n.kind)}</span>
      <span class="notif-item-main">
        <b>${esc(n.title)}</b>
        <span>${esc(n.text)}</span>
      </span>
      <span class="notif-time">${notifWhen(n.at)}</span>
    </button>
    ${notificationActionsHTML(n)}</div>`).join("");
}

function notificationActionsHTML(n){
  if(n.kind !== "listing_expiring" || !n.listingId) return "";
  const p = idKey(n.listingId);
  return `<div class="notif-actions">
    <button type="button" class="notif-action keep" data-click="confirmListingAvailable" data-click-args='${dataArgs([p, "__EVENT__"])}'>${state.lang==="fr" ? "Oui, garder" : "Keep listing"}</button>
    <button type="button" class="notif-action sold" data-click="markSoldAndRemove" data-click-args='${dataArgs([p, "__EVENT__"])}'>${state.lang==="fr" ? "Vendu" : "Sold"}</button>
    <button type="button" class="notif-action delete" data-click="deleteOwnListing" data-click-args='${dataArgs([p, "__EVENT__"])}'>${state.lang==="fr" ? "Supprimer" : "Delete"}</button>
  </div>`;
}

function notifWhen(at){
  const d = new Date(at);
  if(isNaN(d)) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if(mins < 1) return state.lang==="fr" ? "à l'instant" : "now";
  if(mins < 60) return mins + " min";
  const hrs = Math.round(mins / 60);
  if(hrs < 24) return hrs + " h";
  return d.toLocaleDateString(state.lang==="fr" ? "fr-FR" : "en-US", {day:"2-digit", month:"2-digit"});
}

function toggleNotifPanel(e){
  if(e) e.stopPropagation();
  notifPanelOpen = !notifPanelOpen;
  const panel = document.getElementById("notifPanel");
  const btn = document.getElementById("notifBtn");
  if(panel) panel.hidden = !notifPanelOpen;
  if(btn) btn.setAttribute("aria-expanded", String(notifPanelOpen));
  if(notifPanelOpen){
    refreshPushControl();
    renderNotifPanel();
    notifications.forEach(n=>{
      if(!n.seen && n.backendId && window.SB && SB.markNotificationRead) SB.markNotificationRead(n.backendId);
      n.seen = true;
    });
    persistState();
    refreshNotifBadge();
  }
}

function closeNotifPanel(){
  if(!notifPanelOpen) return;
  notifPanelOpen = false;
  const panel = document.getElementById("notifPanel");
  const btn = document.getElementById("notifBtn");
  if(panel) panel.hidden = true;
  if(btn) btn.setAttribute("aria-expanded", "false");
}

function clearNotifications(){
  notifications.forEach(n=>dismissedNotificationIds.add(n.id));
  notifications = [];
  persistState();
  refreshNotifBadge();
  renderNotifPanel();
}

function openNotification(id){
  const n = notifications.find(x=>x.id === id);
  closeNotifPanel();
  if(!n) return;
  if(n.kind === "message"){
    openMessages().then(()=>{ if(n.convKey && typeof openInboxThread === "function") openInboxThread(n.convKey); });
  }else if(n.listingId){
    openListing(n.listingId);
  }
}

document.addEventListener("click", (e)=>{
  if(notifPanelOpen && !e.target.closest(".notif-wrap")) closeNotifPanel();
});
document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeNotifPanel(); });

Object.assign(window, { toggleNotifPanel, clearNotifications, openNotification, refreshPushControl, togglePushNotifications });

function setUnreadMessageCount(count){
  unreadMessageCount = Math.max(0, Number(count) || 0);
  const badge = document.getElementById("msgCount");
  if(!badge) return;
  badge.textContent = String(unreadMessageCount);
  badge.hidden = unreadMessageCount === 0;
}

async function refreshMessageBadge(inbox){
  if(!(window.SB && SB.enabled()) || !state.user || state.user.provider !== "supabase"){
    setUnreadMessageCount(0);
    return;
  }
  const conversations = inbox || await SB.fetchInbox();
  if(!conversations) return;
  setUnreadMessageCount(conversations.reduce((total, conversation)=>total + (Number(conversation.unread) || 0), 0));
  seedMessageNotifications(conversations);
}

/* Une notification "message" par conversation ayant des messages non lus. */
function seedMessageNotifications(conversations){
  if(typeof pushNotification !== "function") return;
  conversations.forEach(conv=>{
    if(!conv.unread) return;
    if(notifications.some(n=>n.convKey === conv.key && n.kind === "message")) return;
    const last = conv.messages[conv.messages.length - 1];
    const l = L.find(x=>String(x.id) === String(conv.listingId));
    const fromName = conv.otherName || (l ? sellerName(l) : (state.lang==="fr" ? "un utilisateur" : "a user"));
    pushNotification({
      id: "seed-" + conv.key,
      kind: "message",
      title: (state.lang==="fr" ? "Message de " : "Message from ") + fromName,
      text: last ? last.body : "",
      at: conv.lastAt || new Date().toISOString(),
      listingId: l ? l.id : conv.listingId,
      convKey: conv.key
    });
  });
}

function listingCreatedAtMs(l){
  const raw = l?.createdAt || l?.created_at;
  const parsed = raw ? new Date(raw).getTime() : NaN;
  if(Number.isFinite(parsed)) return parsed;
  const numericId = Number(l?.id);
  return Number.isFinite(numericId) ? numericId : NaN;
}

function listingExpiryInfo(l){
  const explicit = l?.expiresAt ? new Date(l.expiresAt).getTime() : NaN;
  const created = listingCreatedAtMs(l);
  if(!Number.isFinite(explicit) && !Number.isFinite(created)) return null;
  const expiresAt = Number.isFinite(explicit) ? explicit : created + LISTING_ACTIVE_DAYS * 86400000;
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
  return {
    daysLeft,
    expired: daysLeft <= 0,
    expiringSoon: daysLeft > 0 && daysLeft <= LISTING_EXPIRY_WARNING_DAYS
  };
}

function seedListingExpiryNotifications(){
  if(!state.user || typeof pushNotification !== "function") return;
  L.forEach(l=>{
    if(!isOwnListing(l) || l.sold || l.status === "sold") return;
    const info = listingExpiryInfo(l);
    if(!info || (!info.expired && !info.expiringSoon)) return;
    const expired = info.expired;
    const title = state.lang === "fr"
      ? (expired ? "Annonce expirée" : "Annonce bientôt expirée")
      : (expired ? "Listing expired" : "Listing expiring soon");
    const timing = state.lang === "fr"
      ? (expired ? "est expirée" : `expire dans ${info.daysLeft} jour${info.daysLeft > 1 ? "s" : ""}`)
      : (expired ? "has expired" : `expires in ${info.daysLeft} day${info.daysLeft > 1 ? "s" : ""}`);
    const action = state.lang === "fr" ? "Modifiez ou republiez si besoin." : "Edit or renew it if needed.";
    pushNotification({
      id: `listing-expiry-${idKey(l.id)}-${expired ? "expired" : "soon"}`,
      kind: "listing_expiring",
      title,
      text: `${titleFor(l)} ${timing}. ${action}`,
      at: new Date().toISOString(),
      listingId: l.id,
      actionRequired: true
    });
  });
}

function removeListingExpiryNotifications(id){
  notifications = notifications.filter(n=>!(n.kind === "listing_expiring" && idKey(n.listingId) === idKey(id)));
}

async function refreshBackendNotifications(){
  if(!(window.SB && SB.enabled() && SB.fetchNotifications) || !state.user || state.user.provider !== "supabase") return;
  const rows = await SB.fetchNotifications();
  if(!Array.isArray(rows)) return;
  rows.forEach(row=>{
    const kind = row.kind === "listing_renewal_required" ? "listing_expiring" : row.kind;
    pushNotification({
      id: `db-${row.id}`,
      backendId: row.id,
      kind,
      title: row.title,
      text: row.body,
      at: row.created_at,
      listingId: row.listing_id,
      actionRequired: row.action_required
    });
  });
}

function loadLocalState(){
  try{
    const raw = localStorage.getItem("bstsxm-state");
    if(!raw) return;
    const data = JSON.parse(raw);
    if(data.lang && I18N[data.lang]) state.lang = data.lang;
    if(data.cur) state.cur = data.cur;
    if(data.user) state.user = normalizeUser(data.user);
    if(data.usersByEmail) usersByEmail = data.usersByEmail;
    if(state.user?.email) usersByEmail[state.user.email.toLowerCase()] = state.user;
    if(data.favs) state.favs = new Set(data.favs.map(idKey));
    if(data.saved) state.saved = data.saved.map((item,index)=>
      typeof item === "string" ? {id:`legacy-${index}`,label:item} : item);
    if(data.adminReports) adminReports = data.adminReports;
    if(data.adminBanned) adminBanned = data.adminBanned;
    if(data.adminCategoryStatus) adminCategoryStatus = data.adminCategoryStatus;
    if(Array.isArray(data.notifications)) notifications = data.notifications.slice(0, 40);
    if(Array.isArray(data.dismissedNotificationIds)) dismissedNotificationIds = new Set(data.dismissedNotificationIds);
    if(data.chatThreads && isLocalDevHost()){
      Object.keys(chatThreads).forEach(k=>delete chatThreads[k]);
      Object.assign(chatThreads, data.chatThreads);
    }
    if(data.userListings){
      userListings = data.userListings;
      L.unshift(...userListings);
    }
  }catch(e){}
}

function restoreListingsIfNeeded(){
  if(L.length) return;
  L.push(...BASE_LISTINGS.map(item=>({...item})));
  if(userListings.length){
    const existingIds = new Set(L.map(item=>String(item.id)));
    L.unshift(...userListings.filter(item=>!existingIds.has(String(item.id))));
  }
}

function persistState(){
  localStorage.setItem("bstsxm-state", JSON.stringify({
    lang:state.lang, cur:state.cur, user:state.user,
    usersByEmail,
    favs:[...state.favs], saved:state.saved,
    chatThreads,
    userListings,
    adminReports,
    adminBanned,
    adminCategoryStatus,
    notifications,
    dismissedNotificationIds:[...dismissedNotificationIds]
  }));
}

function isLocalDevHost(){
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

function createLocalAdminUser(email="rxmarketing09@gmail.com"){
  const name = email.split("@")[0] || "Admin Test";
  return normalizeUser({
    id:`admin-${name}`,
    email,
    name,
    role:"admin",
    avatar:initials(name, email),
    accountType:"personal",
    accountPlan:"personal-free",
    provider:"local"
  });
}

function applyLocalAdminTestMode(){
  const params = new URLSearchParams(location.search || "");
  if(!isLocalDevHost() || !params.has("local") || !params.has("admin")) return;
  const user = createLocalAdminUser(params.get("email") || "rxmarketing09@gmail.com");
  state.user = user;
  usersByEmail[user.email.toLowerCase()] = user;
}

/* ---------------- HELPERS ---------------- */
const t = () => I18N[state.lang];
const money = (n, c) => (c==="eur"?"€":"$") + Number(n || 0).toLocaleString("en-US");
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
/* HTML-escaping an href/src is not enough — a "javascript:" (or "data:")
 * URL contains none of the characters esc() touches, so it survives
 * escaping intact and runs in the visitor's session when clicked.
 * Only allow http(s) links (and same-origin absolute paths) through. */
function safeUrl(u){
  if(typeof u !== "string") return "";
  if(/^https?:\/\//i.test(u)) return u;
  if(/^\/(?!\/)/.test(u)) return u;
  return "";
}
function idKey(id){
  return String(id ?? "");
}
function jsArg(value){
  return esc(JSON.stringify(idKey(value)));
}

/* ------------------------------------------------------------------
 * CSP event delegation -- replaces inline on*= attributes so script-src
 * can drop 'unsafe-inline'. Most of the UI is rendered via innerHTML
 * (listing cards, admin rows, modals) and re-rendered constantly, so a
 * single delegated listener per event type -- bound once here, never
 * re-bound -- is what has to survive every future re-render, instead of
 * attaching/detaching individual listeners on elements that get thrown
 * away and recreated on every render() call.
 *
 * Markup: data-click="fnName" data-click-args='["a", "__EVENT__"]'
 * (same pattern for data-change/data-input/data-keydown/data-submit).
 * Args are JSON; three sentinel strings resolve to live values at
 * dispatch time instead of being frozen at render time: "__EVENT__" the
 * DOM event, "__THIS__" the element, "__VALUE__" el.value. "__DATA__:x"
 * resolves to el.dataset.x.
 *
 * Dispatch walks UP from event.target through every ancestor carrying a
 * data-<event> attribute (innermost first) -- not just the nearest one
 * -- so it matches real bubbling: an inner handler calling
 * event.stopPropagation() still stops an outer one from also firing,
 * exactly like the inline data-click="stopEventPropagation" data-click-args='${dataArgs(["__EVENT__"])}' pattern it
 * replaces relied on. ------------------------------------------------ */
function dataArgs(arr){
  return JSON.stringify(arr).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/'/g,"&#39;");
}
function _resolveDispatchArg(raw, el, event){
  if(raw === "__EVENT__") return event;
  if(raw === "__THIS__") return el;
  if(raw === "__VALUE__") return el.value;
  if(typeof raw === "string" && raw.indexOf("__DATA__:") === 0) return el.dataset[raw.slice(9)];
  return raw;
}
function _dispatchDelegated(evtName, event){
  const attr = "data-" + evtName;
  let el = event.target.closest("[" + attr + "]");
  while(el){
    const fnName = el.getAttribute(attr);
    const fn = window[fnName];
    if(typeof fn === "function"){
      let args = [];
      const rawArgs = el.getAttribute(attr + "-args");
      if(rawArgs){
        try { args = JSON.parse(rawArgs).map(a => _resolveDispatchArg(a, el, event)); }
        catch(e){ console.warn("[dispatch] bad args for", fnName, e); }
      }
      fn.apply(el, args);
    } else {
      console.warn("[dispatch] missing handler:", fnName);
    }
    if(event.cancelBubble) break;
    el = el.parentElement ? el.parentElement.closest("[" + attr + "]") : null;
  }
}
["click","change","input","keydown"].forEach(function(evtName){
  document.addEventListener(evtName, function(event){ _dispatchDelegated(evtName, event); });
});
document.addEventListener("submit", function(event){ _dispatchDelegated("submit", event); });

/* Small named wrappers for the onclick= patterns that chained multiple
 * calls or held real logic, instead of a single function call -- kept
 * as tiny, readable, individually-named functions rather than teaching
 * the generic dispatcher above a multi-call or expression syntax. */
function closeAccountModalThenPricing(){ closeModal("accountModal"); openPricingInfo(); }
function closeBoostModalThenPostModal(){ closeModal("boostModal"); openPostModal(); }
function closeProfileModalThenAdmin(){ closeModal("profileModal"); openAdmin(); }
function closeProfileModalThenBoostInfo(){ closeModal("profileModal"); openBoostInfo(); }
function closeProfileModalThenOpenListing(id){ closeModal("profileModal"); openListing(id); }
function closeProfileModalThenMessages(){ closeModal("profileModal"); openMessages(); }
function closeProfileModalThenPostModal(){ closeModal("profileModal"); openPostModal(); }
function closeProfileModalThenPricing(){ closeModal("profileModal"); openPricingInfo(); }
function scrollFavsThenCloseProfileModal(){ scrollFavs(); closeModal("profileModal"); }
function openMessagesPreventDefault(event){ if(event) event.preventDefault(); openMessages(); }
function openPostModalPreventDefault(event){ if(event) event.preventDefault(); openPostModal(); }
function openPricingInfoPreventDefault(event){ if(event) event.preventDefault(); openPricingInfo(); }
function openCookieConsentPreventDefault(event){
  if(event) event.preventDefault();
  if(window.BstConsent) BstConsent.open();
}
function stopEventPropagation(event){ event.stopPropagation(); }
function selectInputText(event){ event.target.select(); }
function triggerAvatarFileInput(){
  const el = document.getElementById("avatarFileInput");
  if(el) el.click();
}
function handleInstallAppClick(){
  if(!(window.bstPromptInstall && bstPromptInstall())){
    showToast(state.lang==="fr"
      ? "Ouvrez le menu de votre navigateur puis « Ajouter à l'écran d'accueil »."
      : "Open your browser menu, then 'Add to Home Screen'.");
  }
}
function onSearchKeydown(event){
  if(event.key === "Enter") applySearch(event);
}

function initials(name, email){
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if(parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0,2).toUpperCase();
}
// Contenu du cercle avatar : la vraie photo si l'utilisateur en a une
// (upload perso ou récupérée depuis Google/Apple), sinon ses initiales.
function avatarHTML(user){
  if(user && user.avatarUrl) return `<img src="${esc(user.avatarUrl)}" alt="">`;
  return esc(user ? user.avatar : "?");
}
// Recadre l'image choisie en carré et la réencode en JPEG côté client avant
// upload : évite les photos de plusieurs Mo et donne un avatar de taille
// cohérente partout sur le site.
function resizeImageToSquareJpeg(file, size){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("toBlob failed")), "image/jpeg", 0.88);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function blobToDataURL(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
// Gère le choix d'un fichier sur l'input de la photo de profil : recadrage,
// upload Supabase (ou data URL en mode démo local sans Supabase), puis
// rafraîchit l'avatar affiché partout (header + carte profil).
async function handleAvatarChange(input){
  const file = input.files && input.files[0];
  input.value = "";
  if(!file || !state.user) return;
  if(!file.type || !file.type.startsWith("image/")){
    showToast(state.lang==="fr" ? "Choisissez une image." : "Please choose an image.");
    return;
  }
  try {
    const blob = await resizeImageToSquareJpeg(file, 512);
    if(window.SB && SB.enabled()){
      const url = await SB.uploadAvatar(blob);
      if(!url){
        showToast(state.lang==="fr" ? "Échec de l'envoi de la photo." : "Photo upload failed.");
        return;
      }
      await SB.upsertProfile({ avatar_url: url });
      state.user.avatarUrl = url;
    } else {
      const dataUrl = await blobToDataURL(blob);
      state.user.avatarUrl = dataUrl;
      const key = (state.user.email || "").toLowerCase();
      if(key) usersByEmail[key] = state.user;
    }
    persistState();
    renderProfile();
    render();
    showToast(state.lang==="fr" ? "Photo de profil mise à jour." : "Profile photo updated.");
  } catch(e){
    showToast(state.lang==="fr" ? "Échec de l'envoi de la photo." : "Photo upload failed.");
  }
}
function createUserProfile({name, email, accountType="personal", accountPlan="personal-free", businessName="", businessPhone="", businessWhatsapp="", businessWebsite="", businessLogo=""}){
  return {
    id:"user-" + Date.now(),
    name:name || email.split("@")[0] || "User",
    email,
    accountType,
    accountPlan,
    businessName,
    businessPhone,
    businessWhatsapp,
    businessWebsite,
    businessLogo,
    area:state.area || "SXM",
    avatar:initials(name, email),
    avatarUrl:null,
    memberSince:new Date().toISOString(),
    rating:5,
    reviews:0,
    subscriptionStatus:accountType === "business" ? "inactive" : "free",
    subscriptionStarted:null,
    subscriptionCurrentPeriodEnd:null,
    subscriptionCancelAtPeriodEnd:false,
    stripeCustomerId:null,
    role:"user",
    verifiedEmail:true,
    trusted:true
  };
}
function normalizeUser(user){
  if(!user) return null;
  return {
    ...createUserProfile({name:user.name || "", email:user.email || ""}),
    ...user,
    avatar:user.avatar || initials(user.name, user.email),
    avatarUrl:user.avatarUrl || null,
    memberSince:user.memberSince || new Date().toISOString(),
    rating:user.rating || 5,
    reviews:user.reviews || 0,
    role:user.role || "user",
    accountPlan:user.accountPlan || (user.accountType === "business" ? "pro-starter" : "personal-free"),
    subscriptionStatus:user.subscriptionStatus || (user.accountType === "business" ? "inactive" : "free"),
    subscriptionStarted:user.subscriptionStarted || null,
    subscriptionCurrentPeriodEnd:user.subscriptionCurrentPeriodEnd || null,
    subscriptionCancelAtPeriodEnd:!!user.subscriptionCancelAtPeriodEnd,
    stripeCustomerId:user.stripeCustomerId || null,
    verifiedEmail:user.verifiedEmail !== false,
    trusted:user.trusted !== false
  };
}
const ADMIN_EMAILS = new Set(["rxmarketing09@gmail.com"]);
function isAdminUser(user=state.user){
  const email = (user?.email || "").toLowerCase();
  if(!user) return false;
  if(isLocalDevHost() && ADMIN_EMAILS.has(email)) return true;
  return user.provider === "supabase" && user.role === "admin" && ADMIN_EMAILS.has(email);
}
function titleFor(l){
  return state.lang === "en" && l.te ? l.te : l.t;
}
function descriptionFor(l){
  return state.lang === "en" && l.desce ? l.desce : l.desc;
}
const VEHICLE_CATS = new Set(["voit","scoot","locvoit","bat"]);
const VEHICLE_META = {
  1:{year:2021, km:18600, color:"Noir", fuel:"gas", transmission:"automatic", body:"Carrosserie propre, intérieur soigné, pneus en bon état.", mechanical:"Entretien régulier, climatisation froide, aucun voyant moteur.", docs:"Papiers disponibles, essai possible en journée."},
  3:{year:2017, km:0, color:"Blanc", fuel:"other", transmission:"other", body:"Coque propre, sellerie entretenue, équipement de sécurité à vérifier avec le vendeur.", mechanical:"Moteur entretenu, démarrage facile, révision recommandée avant longue sortie.", docs:"Documents disponibles sur demande, visite possible au port."},
  6:{year:2020, km:4200, color:"Vert", fuel:"gas", transmission:"automatic", body:"Carénage propre avec petites marques d'usage, coffre sous selle fonctionnel.", mechanical:"Démarre bien, freins récents, entretien fait localement.", docs:"Carte grise disponible, essai possible avec permis adapté."},
  10:{year:2019, km:62000, color:"Gris", fuel:"gas", transmission:"manual", body:"Intérieur propre, carrosserie en bon état général.", mechanical:"Vidange récente, pneus corrects, conduite souple.", docs:"Papiers à jour, disponible rapidement."},
  20:{year:2016, km:94000, color:"Blanc", fuel:"diesel", transmission:"manual", body:"Véhicule utilitaire avec traces normales de travail, cabine propre.", mechanical:"Moteur solide, entretien suivi, idéal chantier ou livraison.", docs:"Documents disponibles, visible sur rendez-vous."},
  25:{year:2022, km:0, color:"Gris", fuel:"other", transmission:"other", body:"Pont propre, sellerie extérieure correcte, rangement fonctionnel.", mechanical:"Moteur révisé, batterie entretenue, prêt pour visite.", docs:"Papiers disponibles, place au port à confirmer."},
  27:{year:2022, km:31500, color:"Blanc", fuel:"gas", transmission:"automatic", body:"Très bon état intérieur et extérieur, peinture propre.", mechanical:"Entretien suivi, climatisation OK, conduite fluide.", docs:"Carte grise disponible, essai possible."},
  34:{year:2022, km:38000, color:"Argent", fuel:"diesel", transmission:"automatic", body:"Présentation dealer, intérieur propre, carrosserie contrôlée.", mechanical:"Révision récente, garantie dealer selon conditions.", docs:"Dossier complet disponible chez le concessionnaire."},
  35:{year:2021, km:82, color:"Bleu", fuel:"gas", transmission:"automatic", body:"Jet ski très propre, selle et coque bien entretenues.", mechanical:"Moteur entretenu, rinçage après utilisation, prêt à l'eau.", docs:"Documents disponibles, démonstration possible sur rendez-vous."}
};
function isVehicleCategory(cat){
  return VEHICLE_CATS.has(cat);
}
function vehicleFuelOptions(){
  return [["gas",t().vehicleFuelGas],["diesel",t().vehicleFuelDiesel],["hybrid",t().vehicleFuelHybrid],["electric",t().vehicleFuelElectric],["other",t().vehicleFuelOther]];
}
function vehicleTransmissionOptions(){
  return [["automatic",t().vehicleTransmissionAuto],["manual",t().vehicleTransmissionManual],["other",t().vehicleFuelOther]];
}
function vehicleDataFor(l){
  return {...(VEHICLE_META[l.id] || {}), ...(l.vehicle || {})};
}
function userListingCount(){
  return L.filter(l=>l.ownerId && state.user && l.ownerId === state.user.id).length;
}
function activeUserListingCount(){
  return L.filter(l=>l.ownerId && state.user && l.ownerId === state.user.id && !l.sold && l.status !== "sold" && l.status !== "expired").length;
}
function monthlyUserListingCount(){
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return L.filter(l=>{
    if(!l.ownerId || !state.user || l.ownerId !== state.user.id) return false;
    const created = l.createdAt ? new Date(l.createdAt).getTime() : Number(l.id) || 0;
    return created >= start && created < end;
  }).length;
}
function publicationUsageCountFor(user=state.user){
  return user?.accountType === "business" ? activeUserListingCount() : monthlyUserListingCount();
}
function publicationLimitMessage(limit, blocked=false){
  if(state.user?.accountType === "business"){
    return state.lang === "fr"
      ? `${blocked ? "Publication bloquée: " : "Limite atteinte: "}votre plan autorise ${limit} annonces actives.`
      : `${blocked ? "Publishing blocked: " : "Limit reached: "}your plan allows ${limit} active listings.`;
  }
  return state.lang === "fr"
    ? `${blocked ? "Publication bloquée: " : "Limite atteinte: "}le compte particulier autorise ${limit} annonces gratuites par mois.`
    : `${blocked ? "Publishing blocked: " : "Limit reached: "}a personal account allows ${limit} free listings per month.`;
}
function isOwnListing(l){
  return !!(state.user && l?.ownerId && l.ownerId === state.user.id);
}
function boostPlan(days){
  const plans = {
    3:{eur:5, usd:6, label:t().boost3Price},
    7:{eur:10, usd:11, label:t().boost7Price},
    14:{eur:18, usd:20, label:t().boost14Price}
  };
  return plans[days] || plans[7];
}
function hasActiveProSubscription(user = state.user){
  return user?.accountType === "business" && user?.subscriptionStatus === "active" &&
    (!user.subscriptionCurrentPeriodEnd || new Date(user.subscriptionCurrentPeriodEnd).getTime() > Date.now());
}
function isPaidPlan(plan){
  return plan && plan !== "personal-free";
}
const ACCOUNT_PLANS = {
  "personal-free":{fr:"Particulier",en:"Personal",price:"Gratuit",limit:5,includedBoosts:0},
  "pro-starter":{fr:"Pro Starter",en:"Pro Starter",price:"$29/month",limit:10,includedBoosts:1},
  "pro-business":{fr:"Pro Business",en:"Pro Business",price:"$59/month",limit:30,includedBoosts:2},
  "pro-premium":{fr:"Premium",en:"Premium",price:"$99/month",limit:75,includedBoosts:5},
  "pro-elite":{fr:"Elite",en:"Elite",price:"$149/month",limit:150,includedBoosts:10},
  "pro-unlimited":{fr:"Unlimited",en:"Unlimited",price:"$199/month",limit:Infinity,includedBoosts:20}
};
function accountPlan(plan){ return ACCOUNT_PLANS[plan] || ACCOUNT_PLANS["personal-free"]; }
function listingLimitFor(user=state.user){ return accountPlan(user?.accountPlan || "personal-free").limit; }
function includedBoostLimitFor(user=state.user){ return accountPlan(user?.accountPlan || "personal-free").includedBoosts || 0; }
function monthKey(value=new Date()){
  const d = value instanceof Date ? value : new Date(value);
  const valid = !Number.isNaN(d.getTime()) ? d : new Date();
  return `${valid.getFullYear()}-${String(valid.getMonth() + 1).padStart(2, "0")}`;
}
function listingBoostMonth(l){
  return l?.boost?.month || (l?.boost?.startedAt ? monthKey(l.boost.startedAt) : null);
}
function isIncludedAutoBoost(l){
  return !!(l?.boosted && l?.boost?.auto && l.boost.included);
}
function autoBoostUsedCountFor(user=state.user){
  if(!hasActiveProSubscription(user)) return 0;
  const currentMonth = monthKey();
  return L.filter(l=>
    l.ownerId === user.id &&
    isIncludedAutoBoost(l) &&
    listingBoostMonth(l) === currentMonth
  ).length;
}
function autoBoostEligibleListings(user=state.user){
  if(!hasActiveProSubscription(user)) return [];
  const currentMonth = monthKey();
  return L.filter(l=>
    l.ownerId === user.id &&
    !listingIsSold(l) &&
    l.status !== "expired" &&
    !l.boosted &&
    listingBoostMonth(l) !== currentMonth
  ).sort((a,b)=>new Date(b.createdAt || Number(b.id) || 0) - new Date(a.createdAt || Number(a.id) || 0));
}
function applyIncludedBoostToListing(l, user=state.user){
  l.boosted = true;
  l.feat = true;
  l.pro = true;
  l.boost = {
    days:30,
    eur:0,
    usd:0,
    paid:false,
    auto:true,
    included:true,
    month:monthKey(),
    plan:user?.accountPlan || "personal-free",
    startedAt:new Date().toISOString()
  };
  return l;
}
async function applyAutomaticIncludedBoosts({silent=false} = {}){
  if(!hasActiveProSubscription(state.user)) return 0;
  const limit = includedBoostLimitFor(state.user);
  if(!limit) return 0;
  const remaining = limit - autoBoostUsedCountFor(state.user);
  if(remaining <= 0) return 0;
  const selected = autoBoostEligibleListings(state.user).slice(0, remaining);
  if(!selected.length) return 0;
  for(const listing of selected){
    applyIncludedBoostToListing(listing, state.user);
    if(window.SB && SB.enabled() && state.user.provider === "supabase" && typeof SB.updateListing === "function"){
      try {
        const updated = await SB.updateListing(listing);
        if(updated) Object.assign(listing, updated);
      } catch(e){}
    }
  }
  persistState();
  if(!silent){
    showToast(state.lang === "fr"
      ? `${selected.length} boost${selected.length > 1 ? "s" : ""} inclus activé${selected.length > 1 ? "s" : ""} automatiquement.`
      : `${selected.length} included boost${selected.length > 1 ? "s" : ""} activated automatically.`);
  }
  return selected.length;
}
function planLabel(plan){
  const selected = accountPlan(plan);
  return selected[state.lang] || selected.fr;
}
function formatProfileDate(value){
  if(!value) return state.lang === "fr" ? "Non configuré" : "Not configured";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return state.lang === "fr" ? "Non configuré" : "Not configured";
  return date.toLocaleDateString(state.lang === "fr" ? "fr-FR" : "en-US", {day:"2-digit", month:"short", year:"numeric"});
}
function subscriptionPeriodEndFor(user){
  if(user?.subscriptionCurrentPeriodEnd) return user.subscriptionCurrentPeriodEnd;
  if(!hasActiveProSubscription(user) || !user?.subscriptionStarted) return null;
  const started = new Date(user.subscriptionStarted);
  if(Number.isNaN(started.getTime())) return null;
  const end = new Date(started);
  end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}
function subscriptionStatusLabel(user){
  if(user?.accountType !== "business") return state.lang === "fr" ? "Compte gratuit" : "Free account";
  if(user.subscriptionCancelAtPeriodEnd) return state.lang === "fr" ? "Annulation programmée" : "Cancellation scheduled";
  return hasActiveProSubscription(user) ? t().proActive : t().proInactive;
}
function manageSubscription(){
  if(window.SXM && SXM.isIOS()) { SXM.manage(); return; }
  const user = normalizeUser(state.user);
  if(!user) return;
  if(user.accountType !== "business"){
    closeModal("profileModal");
    openPricingInfo();
    return;
  }
  if(user.stripeCustomerId){
    showToast(state.lang === "fr"
      ? "Le portail Stripe sera branché à l'étape Stripe."
      : "Stripe portal will be connected in the Stripe step.");
    return;
  }
  showToast(state.lang === "fr"
    ? "Gestion et annulation arrivent avec Stripe Billing."
    : "Manage and cancel arrives with Stripe Billing.");
}
// Only ever shows facts this app can actually back: a Pro badge is tied to
// a real subscription_status check, and every account holder has a
// verified email by construction (mailer_autoconfirm is off, so login is
// impossible without confirming it). Star ratings, review/sale counts,
// "member since", "fast responder", and "phone verified" were previously
// invented here whenever a listing had no real data (no `reviews` table
// exists anywhere in the schema, and there is no phone-verification flow
// at all) -- fabricated trust signals shown identically for a brand-new
// account and an established one. Removed rather than backed with real
// data, since building an actual review system is a separate feature.
function sellerTrustHTML(l){
  if(!l.pro) return "";
  return `
    <div class="seller-trust">
      <div class="seller-trust-grid">
        <span>${t().profileVerified}</span>
        <span>${t().emailVerifiedShort}</span>
      </div>
    </div>`;
}
function businessContactHTML(user){
  if(user.accountType !== "business") return "";
  const logo = user.businessLogo ? `<span>${state.lang==="fr" ? "Logo ajouté" : "Logo added"}</span>` : "";
  const phone = user.businessPhone ? `<span>${esc(user.businessPhone)}</span>` : "";
  const whatsapp = user.businessWhatsapp ? `<span>WhatsApp ${esc(user.businessWhatsapp)}</span>` : "";
  const safeWebsite = safeUrl(user.businessWebsite);
  const website = safeWebsite ? `<a href="${esc(safeWebsite)}" target="_blank" rel="noopener">${state.lang==="fr" ? "Site Internet" : "Website"}</a>` : "";
  const items = [logo, phone, whatsapp, website].filter(Boolean).join("");
  return items ? `<div class="business-contact">${items}</div>` : "";
}
function vehicleOptionLabel(options, value){
  return (options().find(([id])=>id === value) || [null, value || ""])[1];
}
function vehicleDetailsHTML(l){
  if(!usesVehicleFields(l.cat, l.sub || "")) return "";
  const v = vehicleDataFor(l);
  const specs = [
    [t().vehicleYearLabel, v.year],
    [t().vehicleKmLabel, v.km ? `${Number(v.km).toLocaleString(state.lang==="en"?"en-US":"fr-FR")} km` : ""],
    [t().vehicleColorLabel, v.color],
    [t().vehicleFuelLabel, vehicleOptionLabel(vehicleFuelOptions, v.fuel)],
    [t().vehicleTransmissionLabel, vehicleOptionLabel(vehicleTransmissionOptions, v.transmission)]
  ].filter(([,value])=>value !== undefined && value !== null && value !== "");
  const sections = [
    [t().vehicleBodyTitle, v.body],
    [t().vehicleMechanicalTitle, v.mechanical],
    [t().vehicleDocsTitle, v.docs]
  ].filter(([,value])=>value);
  if(!specs.length && !sections.length) return "";
  return `
    <section class="vehicle-detail">
      <h3>${t().vehicleDetailsTitle}</h3>
      ${specs.length ? `<div class="vehicle-spec-grid">${specs.map(([label,value])=>`
        <div class="vehicle-spec"><span>${esc(label)}</span><b>${esc(value)}</b></div>
      `).join("")}</div>` : ""}
      ${sections.map(([label,value])=>`
        <div class="vehicle-section"><b>${esc(label)}</b><p>${esc(value)}</p></div>
      `).join("")}
    </section>`;
}
function mediaFor(l){
  if(l.photos?.length) return {img:l.photos[0], alt:titleFor(l)};
  if(l.img) return {img:l.img, alt:l.alt || G[l.cat]?.alt || l.t};
  if(LISTING_PHOTOS[l.id]) return LISTING_PHOTOS[l.id];
  const choices = CATEGORY_PHOTOS[l.cat] || [G[l.cat] || G.all];
  return choices[Math.abs(Number(l.id) || 0) % choices.length];
}

function listingGallery(l){
  const main = mediaFor(l);
  const photos = [];
  const seen = new Set();
  const add = item=>{
    if(!item) return;
    const img = typeof item === "string" ? item : item.img;
    if(!img || seen.has(img)) return;
    seen.add(img);
    photos.push({img, alt:(typeof item === "string" ? titleFor(l) : item.alt) || titleFor(l)});
  };
  if(l.photos?.length){
    l.photos.forEach((src,i)=>add({img:src, alt:`${titleFor(l)} photo ${i+1}`}));
  } else {
    add(main);
    (CATEGORY_PHOTOS[l.cat] || [G[l.cat] || G.all]).forEach(add);
  }
  return photos.slice(0, Math.min(Math.max(l.pics || photos.length, 1), 8));
}

function jsString(value){
  return JSON.stringify(String(value ?? "")).replace(/</g, "\\u003C");
}

function setMainListingPhoto(id, src, alt, btn){
  const img = document.getElementById(`mainPhoto-${id}`);
  if(img){
    img.src = src;
    img.alt = alt || img.alt;
  }
  btn?.parentElement?.querySelectorAll(".gallery-thumb").forEach(item=>item.classList.remove("active"));
  btn?.classList.add("active");
}

function priceHTML(l){
  if(l.salary) return `<span class="alt">${t().sort_recent?"":""}</span><span>${state.lang==="fr"?"Salaire à convenir":"Pay negotiable"}</span>`;
  const eur = money(l.eur,"eur"), usd = money(l.usd,"usd");
  const listingCur = l.cur || (l.side==="fr" ? "eur" : "usd");
  const primary = listingCur==="eur" ? eur : usd;
  const secondary = listingCur==="eur" ? usd : eur;
  const dropLbl = state.lang==="en"?"price dropped":"prix en baisse";
  const drop = l.drop ? `<span class="drop" title="${dropLbl}" aria-label="${dropLbl}">&#8595;</span>` : "";
  return `<span class="amt">${primary}</span><span class="alt">≈ ${secondary}</span>${drop}`;
}

function agoHTML(h){
  return h < 24 ? t().ago_h(h) : t().ago_d(Math.round(h/24));
}

function condLabel(id){ const c = CONDS.find(x=>x.id===id); return c ? c[state.lang] : ""; }
function sellerName(l){
  if(l?.sellerName) return l.sellerName;
  if(l.pro) return state.lang==="fr" ? "Vendeur Pro SXM" : "SXM Pro Seller";
  const names = ["Maya","Jules","Nadia","Chris","Ana","Kevin","Sarah","Jean"];
  return names[Math.abs(Number(l.id) || 0) % names.length];
}
function listingUrl(id){
  const url = new URL(window.location.href);
  url.searchParams.set("listing", id);
  return url.toString();
}
function listingSharePayload(l){
  const title = titleFor(l);
  return {
    title:`${title} | Buy Sell Trade Sxm`,
    text:`${t().shareText}: ${title}`,
    url:listingUrl(l.id)
  };
}
function threadFor(id){
  const key = idKey(id);
  const l = L.find(x=>idKey(x.id)===key);
  if(!chatThreads[key]){
    chatThreads[key] = {
      seller:sellerName(l || {id}),
      updated:state.lang==="fr" ? "nouveau" : "new",
      messages:[
        {who:"seller", fr:"Bonjour, je réponds vite ici si vous avez une question.", en:"Hi, I reply quickly here if you have a question.", at:state.lang==="fr" ? "maintenant" : "now"}
      ]
    };
  }
  return chatThreads[key];
}

/* Rendu d'une bulle - partagé entre le rendu initial, l'envoi et le realtime. */
function bubbleRowHTML(m, sellerLabel){
  return `
    <div class="bubble ${m.who==="buyer" ? "me" : ""}">
      <small>${m.who==="buyer" ? esc(state.user?.name || "You") : esc(sellerLabel || "")} · ${esc(m.at || "")}</small>
      ${esc(m[state.lang] || m.en || m.fr || m.text || "")}
    </div>`;
}

/* Ligne DB `messages` -> bulle de chat, dans la forme attendue par l'UI. */
function sbMsgToBubble(m){
  const mine = state.user && m.sender_id === state.user.id;
  const at = new Date(m.created_at).toLocaleTimeString(
    state.lang==="fr" ? "fr-FR" : "en-US", { hour:"2-digit", minute:"2-digit" });
  return { who: mine ? "buyer" : "seller", fr:m.body, en:m.body, at, real:true, mid:m.id };
}

/* Charge l'historique réel d'une conversation depuis Supabase et rafraîchit le log. */
async function hydrateRealThread(id){
  if(!(window.SB && SB.enabled()) || !state.user || state.user.provider !== "supabase") return;
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(!l || !l.sellerId || l.sellerId === state.user.id) return;
  const inbox = await SB.fetchInbox();
  if(!inbox) return;
  const conv = inbox.find(x => String(x.listingId) === String(id) && x.otherId === l.sellerId);
  const thread = threadFor(id);
  thread.real = true;
  thread.seller = sellerName(l);
  thread.messages = conv ? conv.messages.map(sbMsgToBubble) : [];
  const log = document.getElementById(`chatLog-${id}`);
  if(log){
    log.innerHTML = thread.messages.map(m => bubbleRowHTML(m, thread.seller)).join("");
    scrollChatToBottom(id);
  }
}

function chatHTML(id){
  const idParam = idKey(id);
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(l && !l.sellerId){
    return `
      <div class="chat-box">
        <div class="chat-head">
          <b>${t().quickMessage}</b>
        </div>
        <p class="chat-demo-notice">${state.lang==="fr"
          ? "Annonce d'exemple sans vendeur réel — la messagerie n'est pas disponible ici."
          : "Example listing with no real seller — messaging isn't available here."}</p>
      </div>`;
  }
  const thread = threadFor(id);
  const rows = thread.messages.map(m => bubbleRowHTML(m, thread.seller)).join("");
  return `
    <div class="chat-box">
      <div class="chat-head">
        <b>${t().quickMessage}</b>
        <small>${t().chatOnline}</small>
      </div>
      <div class="chat-log" id="chatLog-${id}">${rows}</div>
      <form class="chat-compose" data-submit="sendListingMessage" data-submit-args='${dataArgs([idParam, "__EVENT__"])}'>
        <input id="chatInput-${id}" ${state.user ? "" : "disabled"} placeholder="${state.user ? t().chatPlaceholder : t().loginToChat}" value="${state.user ? esc(t().defaultMessage) : ""}">
        <button type="submit" ${state.user ? "" : "disabled"}>${t().chatSend}</button>
      </form>
      <div class="chat-actions">
        <button type="button" class="chat-action" data-click="quickChatAction" data-click-args='${dataArgs([idParam, 'location'])}'>${t().chatLocation}</button>
        <button type="button" class="chat-action" data-click="quickChatAction" data-click-args='${dataArgs([idParam, 'photo'])}'>${t().chatPhoto}</button>
        <button type="button" class="chat-action" data-click="quickChatAction" data-click-args='${dataArgs([idParam, 'offer'])}'>${t().chatOffer}</button>
        <button type="button" class="chat-action" data-click="quickChatAction" data-click-args='${dataArgs([idParam, 'report'])}'>${t().chatReport}</button>
        <button type="button" class="chat-action" data-click="quickChatAction" data-click-args='${dataArgs([idParam, 'block'])}'>${t().chatBlock}</button>
      </div>
    </div>`;
}

/* ---------------- RENDER: CARD ---------------- */
function cardHTML(l, pinned, idx){
  const idParam = idKey(l.id);
  const profile = postFieldProfile(l.cat, l.sub || "");
  const gallery = listingGallery(l);
  const media = gallery[0] || mediaFor(l);
  const photoCount = l.photos?.length || l.pics || 1;
  const status = l.sold ? t().sold : l.reserved ? t().reserved : "";
  const badges = [];
  if(l.pro) badges.push(`<span class="badge pro">Pro</span>`);
  if(l.urgent) badges.push(`<span class="badge urgent">${t().urgent}</span>`);
  if(l.boosted) badges.push(`<span class="badge boosted">${t().boostBadge}</span>`);
  if(!l.sellerId) badges.push(`<span class="badge demo">${state.lang==="fr" ? "Exemple" : "Example"}</span>`);
  const isFav = state.favs.has(idKey(l.id));
  return `
    <article class="card ${profile.photos ? "" : "no-media"} ${listingIsSold(l) ? "is-sold" : ""}" ${pinned?`style="--i:${idx}"`:""} data-click="openListing" data-click-args='${dataArgs([idParam])}' tabindex="0" data-keydown="cardKey" data-keydown-args='${dataArgs(["__EVENT__", idParam])}'>
      ${pinned?`<span class="pin" aria-hidden="true"></span>`:""}
      <span class="stripe ${l.side}" aria-hidden="true"></span>
      <button type="button" class="fav" aria-pressed="${isFav}"
        aria-label="${state.lang==="fr"?"Ajouter aux favoris":"Add to favourites"}"
        data-click="toggleFav" data-click-args='${dataArgs([idParam, "__THIS__", "__EVENT__"])}'>${isFav?"&#9829;":"&#9825;"}</button>
      <button type="button" class="share-card" aria-label="${t().shareLabel}" title="${t().shareLabel}"
        data-click="shareListing" data-click-args='${dataArgs([idParam, "__EVENT__"])}'><span aria-hidden="true">&#8599;</span>${t().shareLabel}</button>
      ${isOwnListing(l) && !l.sold && !hasActiveProSubscription(state.user) ? `<button type="button" class="boost-card-action" data-click="openBoostCheckout" data-click-args='${dataArgs([idParam, "__EVENT__"])}' aria-label="${t().boostCta}">${t().boostCardCta}</button>` : ""}
      ${profile.photos ? `<div class="photo">
        <img src="${esc(media.img)}" alt="${esc(media.alt)}" loading="lazy">
        <span class="gallery"><span aria-hidden="true">&#9634;</span> ${photoCount}</span>
      </div>` : ""}
      ${status?`<div class="status-tag"><span>${status}</span></div>`:""}
      <div class="body">
        ${profile.price ? `<div class="price">${priceHTML(l)}</div>` : ""}
        <div class="ttl">${esc(titleFor(l))}</div>
        <div class="badges">${badges.join("")}</div>
        <div class="meta">
          <span class="area"><span class="n ${l.side}"></span>${l.area}</span>
          <span aria-hidden="true">·</span>
          <span>${agoHTML(l.ph)}</span>
          ${profile.condition && l.cond ? `<span aria-hidden="true">·</span><span>${condLabel(l.cond)}</span>` : ""}
        </div>
        ${ownerActionBarHTML(l)}
      </div>
    </article>`;
}

function cardKey(e, id){
  if(e.key === "Enter" || e.key === " "){
    e.preventDefault();
    openListing(id);
  }
}

function mobileAdHTML(slot){
  return `
    <aside class="feed-ad" aria-label="${state.lang==="fr" ? "Publicité" : "Sponsored"}" data-ad-placement="feed" data-ad-feed-slot="${slot}"></aside>`;
}

/* ---------------- RENDER: FILTER + LOGIC ---------------- */
function passesFilters(l){
  // Les annonces vendues/expirees sortent du fil principal, sauf pour leur propre vendeur
  // (qui doit pouvoir les retrouver pour les remettre en vente).
  if(listingIsSold(l) && !isOwnListing(l)) return false;
  if(listingIsExpired(l) && !isOwnListing(l)) return false;
  if(state.cat!=="all" && l.cat!==state.cat) return false;
  if(state.subcat && l.sub !== state.subcat) return false;
  if(state.q){
    if(!listingMatchesQuery(l, state.q)) return false;
  }
  if(state.area && l.area!==state.area) return false;
  const pmin = parseFloat(document.getElementById("pmin").value);
  const pmax = parseFloat(document.getElementById("pmax").value);
  const val = state.cur==="eur" ? l.eur : l.usd;
  if(postFieldProfile(l.cat, l.sub || "").price){
    if(!isNaN(pmin) && val < pmin) return false;
    if(!isNaN(pmax) && val > pmax) return false;
  }
  return true;
}

function normalizeQuery(text){
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchAliases(l){
  const aliases = {
    voit:"vehicle vehicles car cars voiture voitures auto autos camion truck trucks",
    locvoit:"car cars voiture voitures rental rentals location louer",
    scoot:"scooter scooters moto motos motorcycle motorcycles bike bikes",
    bat:"boat boats bateau bateaux jet ski jetski nautique marine",
    immo:"property real estate immobilier maison apartment appartement rent rental sale vendre louer",
    elec:"electronics electronic phone phones laptop laptops ordinateur telephone",
    meub:"home furniture maison meubles sofa canape table chair chaise",
    menag:"appliance appliances electromenager frigo refrigerator washer washing",
    job:"job jobs emploi work travail hiring cv resume",
    serv:"service services cleaning plumber plumbing mechanic construction beauty",
    food:"food foods drinks alimentation boisson restaurant meal repas"
  };
  return aliases[l.cat] || "";
}

function subcatText(l){
  const data = SUBCATS[l.cat];
  if(!data || !l.sub) return "";
  const item = data.groups.flatMap(group=>group.items).find(x=>x.id === l.sub);
  return item ? `${item.fr} ${item.en} ${item.id.replace(/-/g, " ")}` : l.sub.replace(/-/g, " ");
}

function listingSearchText(l){
  const cat = CATS.find(c=>c.id===l.cat);
  const vehicle = l.vehicle || {};
  return normalizeQuery([
    l.t,l.te,l.desc,l.desce,l.area,l.side,
    cat?.fr,cat?.en,l.cat,subcatText(l),searchAliases(l),
    vehicle.year,vehicle.color,vehicle.fuel,vehicle.transmission
  ].filter(Boolean).join(" "));
}

function listingMatchesQuery(l, query){
  const words = normalizeQuery(query).split(" ").filter(Boolean);
  if(!words.length) return true;
  const hay = listingSearchText(l);
  const tokens = new Set(hay.split(" ").filter(Boolean));
  const exactCategoryWords = new Set([
    "car","cars","auto","autos","voiture","voitures","vehicle","vehicles",
    "moto","motos","motorcycle","motorcycles","scooter","scooters",
    "boat","boats","bateau","bateaux","jetski","nautique"
  ]);
  return words.every(word=>exactCategoryWords.has(word) ? tokens.has(word) : hay.includes(word));
}

function sortList(arr){
  const key = state.cur==="eur" ? "eur" : "usd";
  const a = [...arr];
  const sortablePrice = (listing, fallback)=>postFieldProfile(listing.cat, listing.sub || "").price ? listing[key] : fallback;
  if(state.sort==="recent") a.sort((x,y)=>x.ph-y.ph);
  else if(state.sort==="pxup") a.sort((x,y)=>sortablePrice(x,1e12)-sortablePrice(y,1e12));
  else if(state.sort==="pxdn") a.sort((x,y)=>sortablePrice(y,-1)-sortablePrice(x,-1));
  else if(state.sort==="near") a.sort((x,y)=>x.area.localeCompare(y.area));
  return a;
}

function render(){
  restoreListingsIfNeeded();
  // featured board
  const feat = L.filter(l => l.feat && passesFilters(l));
  const board = document.getElementById("board");
  board.innerHTML = feat.map((l,i)=>cardHTML(l,true,i)).join("") ||
    `<p style="padding:24px;color:var(--mute)">${t().noneB}</p>`;
  document.getElementById("boardTally").textContent =
    feat.length ? `${feat.length} · ${t().onIsland}` : "";

  // main grid
  const list = sortList(L.filter(passesFilters));
  const grid = document.getElementById("grid");
  grid.className = "grid" + (state.view==="list" ? " list" : "");
  const listingCards = list.map(l=>cardHTML(l,false));
  // One ad slot every FEED_AD_INTERVAL listings -- deliberately not every
  // listing (Google AdSense's ad-density policy can get a whole account
  // suspended for pages that read as mostly ads), but tight enough to
  // maximize impressions within that limit.
  const FEED_AD_INTERVAL = 4;
  const listingCardsWithAds = [];
  listingCards.forEach((card, idx) => {
    listingCardsWithAds.push(card);
    if((idx + 1) % FEED_AD_INTERVAL === 0 && idx + 1 < listingCards.length){
      listingCardsWithAds.push(mobileAdHTML("feed-after-" + (idx + 1)));
    }
  });
  grid.innerHTML = list.length
    ? listingCardsWithAds.join("")
    : `<div class="no-results"><b>${t().noneT}</b>${t().noneB}</div>`;

  document.getElementById("count").innerHTML =
    `${t().results(list.length)} <small>${state.cat==="all" ? "" : "· " + CATS.find(c=>c.id===state.cat)[state.lang]}</small>`;

  document.getElementById("favCount").textContent = state.favs.size;
  setUnreadMessageCount(unreadMessageCount);
  const headerAvatarEl = document.getElementById("profileInitials");
  if(state.user && state.user.avatarUrl){
    headerAvatarEl.style.backgroundImage = `url('${state.user.avatarUrl}')`;
    headerAvatarEl.textContent = "";
  } else {
    headerAvatarEl.style.backgroundImage = "";
    headerAvatarEl.textContent = state.user ? state.user.avatar : "?";
  }
  const profileLabel = state.user ? t().profileLabel : t().loginLabel;
  const profileBtnLabel = document.getElementById("profileBtnLabel");
  const mobileProfileLabel = document.getElementById("mobileProfileLabel");
  if(profileBtnLabel) profileBtnLabel.textContent = profileLabel;
  if(mobileProfileLabel) mobileProfileLabel.textContent = profileLabel;
  const mobileProfileBtn = document.getElementById("mobileProfileBtn");
  if(mobileProfileBtn){
    mobileProfileBtn.classList.toggle("is-auth", !!state.user);
    mobileProfileBtn.setAttribute("aria-label", profileLabel);
  }
  document.getElementById("profileBtn").classList.toggle("on", !!state.user);
  document.getElementById("favBtn").classList.toggle("on", state.favs.size>0);
  const activeCount = activeFilterTotal();
  document.getElementById("activeFilterCount").textContent = activeCount ? t().activeFilters(activeCount) : "";
  seedListingExpiryNotifications();
  refreshNotifBadge();
  
  renderSavedSearches();
}

/* ---------------- INTERACTIONS ---------------- */
function applySearch(e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }
  restoreListingsIfNeeded();
  state.q = document.getElementById("q").value.trim();
  state.area = document.getElementById("area").value;
  state.cat = "all";
  state.subcat = "";
  state.sides.clear();
  state.conds.clear();
  state.sellerType = "all";
  state.availability = "all";
  state.handover = "all";
  state.features.clear();
  buildFilters();
  render();
  if(!L.length){
    restoreListingsIfNeeded();
    render();
  }
  return false;
}
function applyFilterSearch(){
  toggleFilters(false);
  state.sides.clear();
  state.conds.clear();
  state.sellerType = "all";
  state.availability = "all";
  state.handover = "all";
  state.features.clear();
  document.getElementById("browse").scrollIntoView({behavior:"smooth", block:"start"});
}
function setCurrency(c){
  state.cur = c;
  document.getElementById("cur-eur").setAttribute("aria-pressed", c==="eur");
  document.getElementById("cur-usd").setAttribute("aria-pressed", c==="usd");
  document.getElementById("curPrefix").textContent = t().priceIn(c);
  render();
  persistState();
}
function setSort(v){ state.sort = v; render(); }
function setView(v){
  state.view = v;
  document.getElementById("v-grid").setAttribute("aria-pressed", v==="grid");
  document.getElementById("v-list").setAttribute("aria-pressed", v==="list");
  render();
}
function setCat(id, btn){
  state.cat = id;
  state.subcat = "";
  document.querySelectorAll("#catrail .cat").forEach(b=>b.setAttribute("aria-pressed", b===btn));
  renderSubcats();
  buildFilters();
  render();
}

function filterByCategory(id){
  state.cat = id;
  state.subcat = "";
  buildCats();
  buildFilters();
  render();
}

function filterBySubcategory(id){
  state.subcat = id;
  renderSubcats();
  render();
}

function filterByArea(area){
  state.area = area;
  document.getElementById("area").value = area;
  render();
}

function setFilterValue(key, value){
  state[key] = value;
  render();
}

function activeFilterTotal(){
  let count = 0;
  if(state.cat!=="all") count++;
  if(state.subcat) count++;
  if(state.q) count++;
  if(state.area) count++;
  if(document.getElementById("pmin").value || document.getElementById("pmax").value) count++;
  return count;
}

function resetFilters(){
  state.cat = "all";
  state.subcat = "";
  state.q = "";
  state.area = "";
  state.sides.clear();
  state.conds.clear();
  state.sellerType = "all";
  state.availability = "all";
  state.handover = "all";
  state.features.clear();
  document.getElementById("q").value = "";
  document.getElementById("area").value = "";
  document.getElementById("pmin").value = "";
  document.getElementById("pmax").value = "";
  buildCats(); buildFilters(); render();
}

function setSubcat(id, btn){
  state.subcat = id;
  document.querySelectorAll("#subcatGroups .subcat-chip").forEach(b=>b.setAttribute("aria-pressed", b===btn));
  buildFilters();
  render();
}

function scrollCats(dir){
  document.getElementById("catrail").scrollBy({left:dir * 360, behavior:"smooth"});
}

/* ---------------- PUSH NOTIFICATIONS (profile shortcut) ---------------- */
async function toggleProfilePushNotifications(btn){
  if(!(window.Push && Push.supported())){
    showToast(state.lang==="fr" ? "Notifications non disponibles sur ce navigateur." : "Notifications aren't available in this browser.");
    return;
  }
  const s = await Push.status();
  if(s === "denied"){
    showToast(state.lang==="fr" ? "Notifications bloquées — autorisez-les dans les réglages du navigateur." : "Notifications are blocked — allow them in your browser settings.");
    return;
  }
  if(s === "on"){
    await Push.disable();
    showToast(state.lang==="fr" ? "Notifications désactivées." : "Notifications turned off.");
  } else {
    const r = await Push.enable();
    if(r.ok) showToast(state.lang==="fr" ? "Notifications activées." : "Notifications turned on.");
    else if(r.status === "denied") showToast(state.lang==="fr" ? "Permission refusée." : "Permission denied.");
    else showToast(state.lang==="fr" ? "Activation impossible pour le moment." : "Couldn't turn notifications on right now.");
  }
  refreshPushToolLabel(btn || document.getElementById("pushTool"));
}
function refreshPushToolLabel(btn){
  if(!btn || !(window.Push && Push.status)) return;
  Push.status().then(s=>{
    const on = s === "on";
    const b = btn.querySelector("b"), sp = btn.querySelector("span");
    if(b) b.textContent = on
      ? (state.lang==="fr" ? "Désactiver les notifications" : "Turn off notifications")
      : (state.lang==="fr" ? "Activer les notifications" : "Turn on notifications");
    if(sp) sp.textContent = on
      ? (state.lang==="fr" ? "Vous recevez les alertes de messages." : "You get message alerts.")
      : (state.lang==="fr" ? "Soyez prévenu des nouveaux messages, même l'app fermée." : "Get told about new messages, even when the app is closed.");
  });
}
function toggleFav(id, btn){
  if(arguments[2]) arguments[2].stopPropagation();
  const key = idKey(id);
  if(state.favs.has(key)) state.favs.delete(key); else state.favs.add(key);
  const on = state.favs.has(key);
  btn.setAttribute("aria-pressed", on);
  btn.innerHTML = on ? "&#9829;" : "&#9825;";
  btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
  document.getElementById("favCount").textContent = state.favs.size;
  document.getElementById("favBtn").classList.toggle("on", state.favs.size>0);
  persistState();
}
function scrollFavs(){
  const first = [...document.querySelectorAll(".fav[aria-pressed=true]")][0];
  if(first){
    first.closest(".card").scrollIntoView({behavior:"smooth", block:"center"});
    showToast(state.lang==="fr" ? "Favoris affichés." : "Saved items shown.");
  } else {
    showToast(state.lang==="fr" ? "Aucun favori pour l'instant." : "No saved items yet.");
  }
}
function openMyListings(){
  if(!state.user){
    requireAccount("profile");
    return;
  }
  const own = L.find(l=>isOwnListing(l));
  closeModal("profileModal");
  if(own){
    openListing(own.id);
  } else {
    showToast(t().profileNoListings);
    openPostModal();
  }
}

function renewalActionFromUrl(){
  const params = new URLSearchParams(location.search);
  const action = params.get("renew");
  const listingId = params.get("listing");
  if(!listingId || !["keep", "sold", "delete"].includes(action || "")) return null;
  return { listingId, action };
}

function clearRenewalActionFromUrl(){
  const url = new URL(location.href);
  url.searchParams.delete("renew");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

// Handles the unsubscribe link in the listing-renewal reminder email
// (?unsub=renewal&uid=<profile id>). Works whether or not the visitor is
// signed in -- that's the point of an unsubscribe link -- so it calls the
// RPC directly rather than going through requireAccount().
async function handleUnsubscribeFromUrl(){
  const params = new URLSearchParams(location.search);
  if(params.get("unsub") !== "renewal") return;
  const uid = params.get("uid");
  const url = new URL(location.href);
  url.searchParams.delete("unsub");
  url.searchParams.delete("uid");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  if(!uid) return;
  const ok = canUseSupabaseAdmin() || (window.SB && SB.enabled())
    ? await SB.unsubscribeRenewalEmails(uid)
    : false;
  showToast(ok
    ? (state.lang==="fr" ? "Vous ne recevrez plus ces rappels." : "You will no longer receive these reminders.")
    : (state.lang==="fr" ? "Échec de la désinscription." : "Unsubscribe failed."));
}

async function handleListingRenewalActionFromUrl(){
  const pending = renewalActionFromUrl();
  if(!pending) return;
  if(!state.user){
    requireAccount("profile");
    showToast(state.lang==="fr" ? "Connectez-vous pour gérer cette annonce." : "Log in to manage this listing.");
    return;
  }
  const l = L.find(item=>idKey(item.id) === idKey(pending.listingId));
  if(!l){
    showToast(state.lang==="fr" ? "Annonce introuvable." : "Listing not found.");
    return;
  }
  if(!isOwnListing(l)){
    showToast(state.lang==="fr" ? "Cette action est réservée au vendeur." : "This action is for the seller only.");
    return;
  }
  if(pending.action === "keep") await confirmListingAvailable(l.id);
  if(pending.action === "sold") await markSoldAndRemove(l.id);
  if(pending.action === "delete") await deleteOwnListing(l.id);
  clearRenewalActionFromUrl();
}

function showTrustInfo(type){
  const messages = {
    email: state.lang==="fr" ? "Email vérifié: ce compte peut recevoir les messages importants." : "Verified email: this account can receive important messages.",
    pro: state.lang==="fr" ? "Compte Pro certifié: abonnement business actif ou validé." : "Certified Pro account: business subscription active or approved.",
    member: state.lang==="fr" ? "Membre de confiance: profil avec activité normale et historique positif." : "Trusted member: normal activity and positive history.",
    reply: state.lang==="fr" ? "Réponse rapide: le vendeur répond généralement vite aux acheteurs." : "Fast reply: the seller usually replies quickly."
  };
  showToast(messages[type] || t().comingSoon);
}
function openProfileStat(type){
  if(type === "listings") return openMyListings();
  if(type === "saved"){
    closeModal("profileModal");
    scrollFavs();
    return;
  }
  if(type === "messages"){
    closeModal("profileModal");
    openMessages();
    return;
  }
  if(type === "rating") showTrustInfo("member");
}
function openCategoryPost(category){
  closeModal("boostModal");
  state.cat = category || "all";
  state.subcat = "";
  openPostModal();
}
function saveSearch(){
  const btn = document.getElementById("saveBtn");
  if(!btn) return;
  const parts = [];
  if(state.cat!=="all") parts.push(CATS.find(c=>c.id===state.cat)[state.lang]);
  const subcatItem = state.subcat ? SUBCATS[state.cat]?.groups.flatMap(group=>group.items).find(item=>item.id===state.subcat) : null;
  if(subcatItem) parts.push(subcatItem[state.lang]);
  if(state.q) parts.push(`"${state.q}"`);
  if(state.area) parts.push(state.area);
  state.sides.forEach(s=> parts.push(s==="fr" ? "🇫🇷" : "🇳🇱"));
  if(state.sellerType==="pro") parts.push(t().professionalSeller);
  if(state.sellerType==="private") parts.push(t().individualSeller);
  if(state.availability!=="all") parts.push({available:t().availableOnly,reserved:t().reservedOnly,sold:t().soldOnly}[state.availability]);
  if(state.handover!=="all") parts.push({pickup:t().pickupOnly,delivery:t().deliveryPossible,meetup:t().meetupPossible}[state.handover]);
  if(state.features.has("urgent")) parts.push(t().urgentOnly);
  if(state.features.has("negotiable")) parts.push(t().negotiableOnly);
  if(state.features.has("delivery")) parts.push(t().deliveryOnly);
  const label = parts.length ? parts.join(" · ") : t().onIsland;
  const saved = {
    id:`search-${Date.now()}`, label,
    cat:state.cat, subcat:state.subcat, q:state.q, area:state.area, cur:state.cur,
    sides:[...state.sides], conds:[...state.conds],
    sellerType:state.sellerType, availability:state.availability,
    handover:state.handover, features:[...state.features],
    pmin:document.getElementById("pmin").value,
    pmax:document.getElementById("pmax").value
  };
  const signature = JSON.stringify({...saved,id:"",label:""});
  if(!state.saved.some(item=>JSON.stringify({...item,id:"",label:""})===signature)) state.saved.push(saved);
  btn.classList.add("saved");
  btn.textContent = state.lang==="fr" ? "Recherche enregistrée ✓" : "Search saved ✓";
  setTimeout(()=>{ btn.classList.remove("saved"); btn.textContent = t().saveSearch; }, 1600);
  renderSavedSearches();
  persistState();
}
function renderSavedSearches(){
  const list = document.getElementById("savedList");
  if(!list) return;
  list.innerHTML = state.saved.map(item=>`
    <span class="s">
      <button type="button" data-click="applySavedSearch" data-click-args='${dataArgs([item.id])}'>${esc(item.label)}</button>
      <button type="button" class="remove-search" data-click="removeSavedSearch" data-click-args='${dataArgs([item.id])}' aria-label="${state.lang==="fr"?"Supprimer la recherche":"Remove search"}">x</button>
    </span>`).join("");
}
function applySavedSearch(id){
  const item = state.saved.find(saved=>saved.id===id);
  if(!item || !item.cat) return;
  state.cat = item.cat;
  state.subcat = item.subcat || "";
  state.q = item.q || "";
  state.area = item.area || "";
  state.cur = item.cur || state.cur;
  state.sides = new Set(item.sides || []);
  state.conds = new Set(item.conds || []);
  state.sellerType = item.sellerType || "all";
  state.availability = item.availability || "all";
  state.handover = item.handover || "all";
  state.features = new Set(item.features || []);
  document.getElementById("q").value = state.q;
  document.getElementById("area").value = state.area;
  document.getElementById("pmin").value = item.pmin || "";
  document.getElementById("pmax").value = item.pmax || "";
  buildCats(); buildFilters(); setCurrency(state.cur); render();
}
function removeSavedSearch(id){
  state.saved = state.saved.filter(item=>item.id!==id);
  renderSavedSearches();
  persistState();
}
function toggleFilters(open){
  document.getElementById("filters").classList.toggle("open", open);
  document.getElementById("scrim").classList.toggle("show", open);
}

// Builds the signup consent label via real DOM nodes rather than
// innerHTML/textContent -- it needs two genuine <a> links, and the
// data-i18n mechanism (el.textContent = ...) would strip any markup on
// every language switch, so this can't go through the generic i18n loop.
// Content here is 100% static/hardcoded, never derived from user or
// remote data, so building it with createElement is just about
// surviving re-renders, not an XSS concern.
function updateTermsConsentLabel(){
  const el = document.getElementById("termsConsentLabel");
  if(!el) return;
  el.textContent = "";
  const parts = state.lang==="fr"
    ? ["J'accepte les ", "Conditions d'utilisation", " et la ", "Politique de confidentialité", "."]
    : ["I agree to the ", "Terms of Use", " and ", "Privacy Policy", "."];
  el.appendChild(document.createTextNode(parts[0]));
  const terms = document.createElement("a");
  terms.href = "/terms.html"; terms.target = "_blank"; terms.rel = "noopener"; terms.textContent = parts[1];
  el.appendChild(terms);
  el.appendChild(document.createTextNode(parts[2]));
  const privacy = document.createElement("a");
  privacy.href = "/privacy.html"; privacy.target = "_blank"; privacy.rel = "noopener"; privacy.textContent = parts[3];
  el.appendChild(privacy);
  el.appendChild(document.createTextNode(parts[4]));
}

/* ---------------- I18N SWAP ---------------- */
function setLang(lang){
  if(!I18N[lang]) lang = "fr";
  state.lang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll(".lang button").forEach(b=>
    b.setAttribute("aria-pressed", b.textContent.trim().toLowerCase()===lang));
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    if(t()[k]) el.textContent = t()[k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{
    const k = el.getAttribute("data-i18n-ph");
    if(t()[k]) el.setAttribute("placeholder", t()[k]);
  });
  document.querySelectorAll(".post[data-mobile-label]").forEach(el=>{
    if(t().postShort) el.setAttribute("data-mobile-label", t().postShort);
  });
  if(window.SXM) SXM.refreshPrices();
  updateTermsConsentLabel();
  const accountPlan = document.getElementById("accountPlan");
  const accountSubmit = document.querySelector("#accountModal .auth-card button[type=submit]");
  if(accountPlan && accountSubmit) accountSubmit.textContent = isPaidPlan(accountPlan.value) ? t().continueToPayment : t().accountSubmit;
  buildAreas(); buildCats(); buildFilters(); buildSort();
  document.getElementById("curPrefix").textContent = t().priceIn(state.cur);
  render();
  persistState();
}

function openModal(id){
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
  if(window.SXM) SXM.refreshPrices();
}

function closeModal(id){
  document.getElementById(id).classList.remove("open");
  if(id === "detailModal") clearListingFromUrl();
  if(!document.querySelector(".modal.open")) document.body.style.overflow = "";
}

function showToast(msg){
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>toast.classList.remove("show"), 2200);
}

function clearListingFromUrl(){
  if(!window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if(!url.searchParams.has("listing")) return;
  url.searchParams.delete("listing");
  window.history.replaceState({}, "", url);
}

function syncListingToUrl(id){
  if(!window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.set("listing", id);
  window.history.replaceState({listing:id}, "", url);
}

function openListing(id, syncUrl = true){
  restoreListingsIfNeeded();
  const l = L.find(x=>String(x.id)===String(id));
  if(!l) return;
  const profile = postFieldProfile(l.cat, l.sub || "");
  if(syncUrl) syncListingToUrl(l.id);
  const gallery = listingGallery(l);
  const media = gallery[0] || mediaFor(l);
  const listingTitle = titleFor(l);
  const side = l.side === "fr" ? t().frSide : t().nlSide;
  const shareUrl = listingUrl(l.id);
  const detail = document.getElementById("detailBody");
  const thumbs = gallery.length > 1 ? `
    <div class="photo-preview" style="margin-top:10px">
        ${gallery.map((item,i)=>`<button type="button" class="gallery-thumb ${i===0 ? "active" : ""}" data-full="${esc(item.img)}" data-alt="${esc(item.alt)}" data-click="setMainListingPhoto" data-click-args='${dataArgs([l.id, "__DATA__:full", "__DATA__:alt", "__THIS__"])}' aria-label="${esc(listingTitle)} photo ${i+1}"><img src="${esc(item.img)}" alt="${esc(item.alt)}" loading="eager"></button>`).join("")}
    </div>` : "";
  document.getElementById("detailTitle").textContent = listingTitle;
  detail.innerHTML = `
    <div class="detail-grid ${profile.photos ? "" : "no-media"}">
      ${profile.photos ? `<div class="detail-media">
        <div class="detail-photo"><img id="mainPhoto-${l.id}" src="${esc(media.img)}" alt="${esc(media.alt)}"></div>
        ${thumbs}
      </div>` : ""}
      <div class="detail-meta">
        ${ownerActionBarHTML(l)}
        <div class="listing-primary">
          ${profile.price ? `<div class="detail-price">${priceHTML(l)}</div>` : ""}
          <p>${esc(listingTitle)}</p>
        </div>
        <div class="seller-box">
          <b>${esc(sellerName(l))} · ${l.pro ? t().sellerPro : t().sellerLocal}</b>
          <span>${l.area} · ${side}${profile.condition && l.cond ? " · " + condLabel(l.cond) : ""} · ${agoHTML(l.ph)}</span>
          ${profile.delivery && l.delivery ? `<br><span>${deliveryLabel(l.delivery)}${profile.meetup && l.meetup ? " · " + meetupLabel(l.meetup) : ""}${profile.negotiable && l.negotiable ? " · " + t().negotiableLabel : ""}</span>` : ""}
          ${sellerTrustHTML(l)}
        </div>
        ${listingIsSold(l) && !isOwnListing(l)
          ? `<div class="sold-notice">${state.lang==="fr" ? "Cette annonce est vendue. La messagerie est fermée." : "This listing is sold. Messaging is closed."}</div>`
          : chatHTML(l.id)}
        <div class="detail-actions">
          ${state.user || listingIsSold(l) ? "" : `<button type="button" class="primary-btn" data-click="requestListingLogin" data-click-args='${dataArgs([l.id])}'>${state.lang==="fr"?"Se connecter pour discuter":"Log in to chat"}</button>`}
          ${isOwnListing(l) && !listingIsSold(l) && !hasActiveProSubscription(state.user) ? `<button type="button" class="primary-btn" data-click="openBoostCheckout" data-click-args='${dataArgs([l.id, "__EVENT__"])}'>${t().boostCta}</button>` : ""}
          <button type="button" class="primary-btn" data-click="shareListing" data-click-args='${dataArgs([l.id, "__EVENT__"])}'>${t().shareLabel}</button>
          <button type="button" class="secondary-btn" data-click="toggleFavFromDetail" data-click-args='${dataArgs([l.id])}'>${state.favs.has(idKey(id))?t().savedLabel:t().saveLabel}</button>
        </div>
        <div class="share-box">
          <div>
            <b>${t().shareTitle}</b>
            <p>${t().shareHelp}</p>
          </div>
          <div class="share-row">
            <input id="shareUrl-${l.id}" value="${esc(shareUrl)}" readonly data-click="selectInputText" data-click-args='${dataArgs(["__EVENT__"])}' aria-label="${t().shareTitle}">
            <button type="button" class="secondary-btn" data-click="copyListingLink" data-click-args='${dataArgs([l.id, "__EVENT__"])}'>${t().copyLink}</button>
          </div>
        </div>
        ${(descriptionFor(l) || vehicleDetailsHTML(l)) ? `
          <details class="listing-extra">
            <summary>${state.lang==="fr" ? "Description et détails" : "Description and details"}</summary>
            <div class="listing-extra-body">
              ${descriptionFor(l) ? `<p class="detail-description">${esc(descriptionFor(l))}</p>` : ""}
              ${vehicleDetailsHTML(l)}
            </div>
          </details>` : ""}
        <aside class="listing-detail-ad" aria-label="Publicité" data-ad-placement="listing-detail"></aside>
      </div>
    </div>`;
  openModal("detailModal");
  setTimeout(()=>scrollChatToBottom(l.id), 0);
  // Annonce d'un vendeur réel : on remplace la conversation simulée par l'historique Supabase.
  if(window.SB && SB.enabled() && state.user && state.user.provider === "supabase" && l.sellerId && l.sellerId !== state.user.id){
    hydrateRealThread(l.id);
  }
}

function openListingFromAdmin(id){
  closeModal("adminModal");
  setTimeout(()=>openListing(id), 80);
}

function toggleFavFromDetail(id){
  const key = idKey(id);
  if(state.favs.has(key)) state.favs.delete(key); else state.favs.add(key);
  persistState();
  render();
  openListing(id);
  showToast(state.favs.has(key) ? t().savedToast : t().removedToast);
}

async function copyText(text){
  if(navigator.clipboard?.writeText && window.isSecureContext){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){}
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  let ok = false;
  try{
    ok = document.execCommand("copy");
  }catch(e){
    ok = false;
  }
  helper.remove();
  return ok;
}

async function copyListingLink(id, e){
  if(e) e.stopPropagation();
  const input = document.getElementById(`shareUrl-${id}`);
  const url = input?.value || listingUrl(id);
  if(input) input.select();
  const ok = await copyText(url);
  showToast(ok ? t().linkCopied : (state.lang==="fr" ? "Lien prêt à copier." : "Link ready to copy."));
}

async function shareListing(id, e){
  if(e) e.stopPropagation();
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(!l) return;
  const payload = listingSharePayload(l);
  if(navigator.share){
    try{
      await navigator.share(payload);
      return;
    }catch(err){
      if(err?.name === "AbortError") return;
    }
  }
  await copyText(payload.url);
  showToast(navigator.share ? t().shareFailed : t().linkCopied);
}

function scrollChatToBottom(id){
  const log = document.getElementById(`chatLog-${id}`);
  if(log) log.scrollTop = log.scrollHeight;
}

async function sendListingMessage(id, e){
  if(e) e.preventDefault();
  if(!state.user){
    closeModal("detailModal");
    requireAccount(`listing:${id}`);
    return false;
  }
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(!l) return;
  const input = document.getElementById(`chatInput-${id}`);
  const text = (input?.value || t().defaultMessage).trim();
  if(!text) return false;

  // Vraie messagerie : annonce avec vendeur réel + utilisateur Supabase.
  // On envoie le message en base ; la réponse arrivera via le realtime,
  // pas via le faux "vendeur" simulé.
  if(window.SB && SB.enabled() && state.user.provider === "supabase" && l.sellerId && l.sellerId !== state.user.id){
    if(input) input.value = "";
    const sent = await SB.sendMessage({ listingId: id, recipientId: l.sellerId, body: text });
    if(!sent){
      showToast(state.lang==="fr" ? "Message non envoyé" : "Message not sent");
      if(input) input.value = text;
      return false;
    }
    const rt = threadFor(id);
    rt.real = true;
    rt.seller = sellerName(l);
    const bubble = sbMsgToBubble(sent);
    rt.messages.push(bubble);
    rt.updated = state.lang==="fr" ? "maintenant" : "now";
    const rlog = document.getElementById(`chatLog-${id}`);
    if(rlog){ rlog.insertAdjacentHTML("beforeend", bubbleRowHTML(bubble, rt.seller)); scrollChatToBottom(id); }
    showToast(t().messageReady);
    render();
    return false;
  }

  const thread = threadFor(id);
  thread.messages.push({who:"buyer", fr:text, en:text, at:state.lang==="fr" ? "maintenant" : "now"});
  thread.updated = state.lang==="fr" ? "maintenant" : "now";
  if(input) input.value = "";
  const log = document.getElementById(`chatLog-${id}`);
  if(log){
    log.insertAdjacentHTML("beforeend", `
      <div class="bubble me">
        <small>${esc(state.user.name || "You")} · ${state.lang==="fr" ? "maintenant" : "now"}</small>
        ${esc(text)}
      </div>
      <div class="bubble" id="typing-${id}">
        <small>${esc(thread.seller)}</small>
        ${t().sellerTyping}
      </div>`);
    scrollChatToBottom(id);
  }
  setTimeout(()=>{
    const typing = document.getElementById(`typing-${id}`);
    const reply = sellerReply(l);
    thread.messages.push({who:"seller", fr:reply.fr, en:reply.en, at:state.lang==="fr" ? "maintenant" : "now"});
    thread.updated = state.lang==="fr" ? "maintenant" : "now";
    if(typing){
      typing.innerHTML = `<small>${esc(thread.seller)} · ${state.lang==="fr" ? "maintenant" : "now"}</small>${esc(reply[state.lang])}`;
      scrollChatToBottom(id);
    }
    persistState();
  }, 550);
  showToast(t().messageReady);
  persistState();
  render();
  return false;
}

async function quickChatAction(id, type){
  if(!state.user){
    closeModal("detailModal");
    requireAccount(`listing:${id}`);
    return;
  }
  const input = document.getElementById(`chatInput-${id}`);
  if(type === "location" && input) input.value = t().locationDraft;
  if(type === "offer" && input) input.value = `${t().offerDraft}${state.cur === "eur" ? "€" : "$"}`;
  if(type === "photo"){
    const thread = threadFor(id);
    const text = state.lang==="fr"
      ? "Je souhaite envoyer une photo dans cette conversation."
      : "I want to send a photo in this conversation.";
    thread.messages.push({who:"buyer", fr:text, en:text, at:state.lang==="fr" ? "maintenant" : "now"});
    thread.updated = state.lang==="fr" ? "maintenant" : "now";
    const log = document.getElementById(`chatLog-${id}`);
    if(log){
      log.insertAdjacentHTML("beforeend", bubbleRowHTML(thread.messages[thread.messages.length - 1], thread.seller));
      scrollChatToBottom(id);
    }
    persistState();
    showToast(state.lang==="fr" ? "Photo: upload réel à brancher avec Supabase Storage." : "Photo: real upload will be connected with Supabase Storage.");
  }
  if(type === "report"){
    if(window.SB && SB.enabled() && state.user?.provider === "supabase" && SB.createReport){
      const l = L.find(item=>String(item.id) === String(id));
      await SB.createReport(id, state.lang==="fr" ? "Signalement utilisateur" : "User report", l ? titleFor(l) : "");
    } else {
      const exists = adminReports.some(r=>String(r.listingId) === String(id) && r.status !== "resolved");
      if(!exists) adminReports.unshift({
        id:`rep-${id}-${Date.now()}`,
        listingId:id,
        reason:state.lang==="fr" ? "Signalement utilisateur" : "User report",
        status:"open",
        createdAt:new Date().toISOString()
      });
      persistState();
    }
    showToast(t().reportSent);
  }
  if(type === "block") showToast(state.lang==="fr" ? "Vendeur bloqué pour cette session." : "Seller blocked for this session.");
  if(input && (type === "location" || type === "offer")) input.focus();
}

function sellerReply(l){
  if(l.sold) return {fr:"Désolé, l'annonce est déjà vendue.", en:"Sorry, this listing is already sold."};
  if(l.reserved) return {fr:"Elle est réservée pour l'instant, mais je vous préviens si ça se libère.", en:"It is reserved for now, but I will let you know if it becomes available."};
  if(l.cat==="immo") return {fr:"Oui, c'est disponible. Vous voulez organiser une visite ?", en:"Yes, it is available. Would you like to arrange a viewing?"};
  if(l.cat==="locvoit") return {fr:"Oui, la voiture est disponible. Vous la voulez pour quelles dates ?", en:"Yes, the car is available. What dates do you need it for?"};
  if(l.cat==="job") return {fr:"Merci pour votre message. Vous pouvez envoyer vos disponibilités ici.", en:"Thanks for your message. You can send your availability here."};
  if(l.cat==="serv") return {fr:"Oui, je suis disponible. Dites-moi la zone et le jour souhaité.", en:"Yes, I am available. Tell me the area and preferred day."};
  return {fr:t().instantReply, en:I18N.en.instantReply};
}

/* ================= BOÎTE DE RÉCEPTION (deux volets) ================= */
let inboxConvs = [];
let activeConvKey = null;
let inboxSearchTerm = "";

async function openMessages(){
  if(!state.user){ requireAccount("messages"); return; }
  openModal("messagesModal");
  const search = document.getElementById("msgrSearch");
  if(search) search.value = inboxSearchTerm;
  await loadInbox();
}

function inboxAvatar(name){
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  const letters = parts.map(w=>w[0]).join("").slice(0,2);
  return (letters || "?").toUpperCase();
}

function inboxOtherLabel(conv, listing){
  if(conv.otherName) return conv.otherName;
  if(listing && conv.otherId && listing.sellerId && conv.otherId === listing.sellerId) return sellerName(listing);
  if(conv.otherId && state.user && listing && listing.sellerId === state.user.id){
    return (state.lang==="fr" ? "Acheteur" : "Buyer") + " #" + String(conv.otherId).slice(0, 4);
  }
  return listing ? sellerName(listing) : (state.lang==="fr" ? "Contact" : "Contact");
}

async function loadInbox(){
  const convs = [];
  if(window.SB && SB.enabled() && state.user.provider === "supabase"){
    const inbox = await SB.fetchInbox();
    if(inbox){
      refreshMessageBadge(inbox);
      inbox.forEach(conv=>{
        const l = L.find(x=>String(x.id) === String(conv.listingId));
        convs.push({
          key: conv.key, listingId: conv.listingId, otherId: conv.otherId,
          who: inboxOtherLabel(conv, l),
          title: l ? titleFor(l) : (state.lang==="fr" ? "Annonce" : "Listing"),
          preview: conv.lastBody || "", at: conv.lastAt || null,
          unread: Number(conv.unread) || 0, messages: conv.messages.slice(), real: true
        });
      });
    }
  }
  Object.entries(chatThreads).forEach(([id, thread])=>{
    if(convs.some(c=>String(c.listingId) === String(id))) return;
    const l = L.find(x=>idKey(x.id) === idKey(id));
    if(!l) return;
    const last = thread.messages[thread.messages.length - 1];
    convs.push({
      key: "local:" + id, listingId: id, otherId: null,
      who: thread.seller || sellerName(l), title: titleFor(l),
      preview: last ? (last[state.lang] || last.en || last.fr || last.text || "") : "",
      at: null, unread: 0, messages: thread.messages, real: false, local: true
    });
  });
  inboxConvs = convs;
  renderInboxRail();
  const visible = filteredInboxConvs();
  if(activeConvKey && visible.some(c=>c.key === activeConvKey)) openInboxThread(activeConvKey);
  else if(visible.length && window.matchMedia("(min-width: 641px)").matches) openInboxThread(visible[0].key);
  else inboxBack();
}

function filteredInboxConvs(){
  const term = inboxSearchTerm.trim().toLowerCase();
  if(!term) return inboxConvs;
  return inboxConvs.filter(c=>
    [c.who, c.title, c.preview].some(value=>String(value || "").toLowerCase().includes(term))
  );
}

function filterInbox(){
  const search = document.getElementById("msgrSearch");
  inboxSearchTerm = search ? search.value : "";
  const visible = filteredInboxConvs();
  if(activeConvKey && !visible.some(c=>c.key === activeConvKey)) inboxBack();
  renderInboxRail();
  if(visible.length && !activeConvKey && window.matchMedia("(min-width: 641px)").matches) openInboxThread(visible[0].key);
}

function renderInboxRail(){
  const rail = document.getElementById("msgrRail");
  if(!rail) return;
  const visible = filteredInboxConvs();
  const count = document.getElementById("msgrCount");
  const unread = document.getElementById("msgrUnread");
  const unreadTotal = inboxConvs.reduce((sum,c)=>sum + (Number(c.unread) || 0), 0);
  if(count) count.textContent = `${inboxConvs.length} ${state.lang==="fr" ? "conversation" : "conversation"}${inboxConvs.length > 1 ? "s" : ""}`;
  if(unread) unread.textContent = `${unreadTotal} ${state.lang==="fr" ? "non lus" : "unread"}`;
  if(!inboxConvs.length){
    rail.innerHTML = `<p class="msgr-rail-empty">${state.lang==="fr" ? "Aucune conversation pour l'instant. Quand un acheteur vous écrit, le message apparaît ici." : "No conversations yet. When a buyer messages you, it appears here."}</p>`;
    return;
  }
  if(!visible.length){
    rail.innerHTML = `<p class="msgr-rail-empty">${state.lang==="fr" ? "Aucune conversation trouvée." : "No conversation found."}</p>`;
    return;
  }
  rail.innerHTML = visible.map(c=>`
    <button type="button" class="msgr-item ${c.key === activeConvKey ? "active" : ""}" data-key="${esc(c.key)}" data-click="openInboxThread" data-click-args='${dataArgs(["__DATA__:key"])}'>
      <span class="msgr-ava">${esc(inboxAvatar(c.who))}</span>
      <span class="msgr-item-main">
        <b>${esc(c.who)}${c.unread ? `<span class="msgr-dot" aria-label="${c.unread} ${state.lang==="fr" ? "non lus" : "unread"}"></span>` : ""}</b>
        <small>${esc(c.title)}</small>
        <span>${esc(c.preview)}</span>
      </span>
      <span class="msgr-item-time">${c.at ? new Date(c.at).toLocaleDateString(state.lang==="fr" ? "fr-FR" : "en-US", {day:"2-digit", month:"2-digit"}) : ""}</span>
    </button>`).join("");
}

function renderInboxLog(conv){
  const log = document.getElementById("msgrLog");
  if(!log) return;
  const rows = conv.real
    ? conv.messages.map(m=>bubbleRowHTML(sbMsgToBubble(m), conv.who)).join("")
    : conv.messages.map(m=>bubbleRowHTML(m, conv.who)).join("");
  log.innerHTML = rows || `<p class="msgr-log-empty">${state.lang==="fr" ? "Pas encore de message." : "No messages yet."}</p>`;
  log.scrollTop = log.scrollHeight;
}

async function openInboxThread(key){
  const conv = inboxConvs.find(x=>x.key === key);
  if(!conv) return;
  activeConvKey = key;
  document.getElementById("msgrEmpty").hidden = true;
  document.getElementById("msgrThread").hidden = false;
  document.getElementById("messengerBody")?.classList.add("show-thread");
  document.getElementById("msgrOther").textContent = conv.who;
  document.getElementById("msgrListing").textContent = conv.title;
  const openBtn = document.getElementById("msgrOpenListing");
  if(openBtn){
    const hasListing = conv.listingId && String(conv.listingId) !== "0";
    openBtn.hidden = !hasListing;
    openBtn.onclick = hasListing ? ()=>{ closeModal("messagesModal"); openListing(conv.listingId); } : null;
  }
  renderInboxLog(conv);
  renderInboxRail();
  if(conv.real && conv.unread && window.SB && SB.markConversationRead){
    const done = await SB.markConversationRead(conv.messages);
    if(done){
      setUnreadMessageCount(Math.max(0, unreadMessageCount - done));
      conv.unread = 0;
      conv.messages.forEach(m=>{ if(m.recipient_id === state.user.id) m.read = true; });
      renderInboxRail();
    }
  }
  const input = document.getElementById("msgrInput");
  if(input){ input.disabled = false; input.focus(); }
}

function inboxBack(){
  activeConvKey = null;
  document.getElementById("messengerBody")?.classList.remove("show-thread");
  const thread = document.getElementById("msgrThread");
  const empty = document.getElementById("msgrEmpty");
  if(thread) thread.hidden = true;
  if(empty) empty.hidden = false;
  renderInboxRail();
}

async function sendInboxMessage(e){
  if(e) e.preventDefault();
  const conv = inboxConvs.find(x=>x.key === activeConvKey);
  const input = document.getElementById("msgrInput");
  if(!conv || !input) return false;
  const text = input.value.trim();
  if(!text) return false;
  input.value = "";
  if(conv.real && window.SB && SB.enabled() && state.user.provider === "supabase" && conv.otherId){
    const sent = await SB.sendMessage({ listingId: conv.listingId, recipientId: conv.otherId, body: text, senderName: state.user.name });
    if(!sent){
      input.value = text;
      showToast(state.lang==="fr" ? "Message non envoyé" : "Message not sent");
      return false;
    }
    conv.messages.push(sent);
    conv.preview = text;
    conv.at = sent.created_at;
    const rt = chatThreads[conv.listingId];
    if(rt){ rt.messages.push(sbMsgToBubble(sent)); rt.updated = state.lang==="fr" ? "maintenant" : "now"; }
  }else{
    const rt = threadFor(conv.listingId);
    rt.messages.push({ who:"buyer", fr:text, en:text, at:state.lang==="fr" ? "maintenant" : "now" });
    rt.updated = state.lang==="fr" ? "maintenant" : "now";
    conv.messages = rt.messages;
    conv.preview = text;
    persistState();
  }
  renderInboxLog(conv);
  renderInboxRail();
  return false;
}

Object.assign(window, { openInboxThread, sendInboxMessage, inboxBack, filterInbox });

function openProfile(){
  if(!state.user){
    requireAccount("profile");
    showToast(t().profileRequired);
    return;
  }
  renderProfile();
  openModal("profileModal");
}

function openBoostInfo(){
  openModal("boostModal");
}

function openPricingInfo(){
  openBoostInfo();
}

async function startBoostFlow(){
  closeModal("boostModal");
  if(!state.user){
    requireAccount("boost");
    showToast(t().boostLoginRequired);
    return;
  }
  if(hasActiveProSubscription(state.user)){
    const applied = await applyAutomaticIncludedBoosts();
    if(!applied){
      showToast(state.lang === "fr"
        ? `Vos boosts inclus sont automatiques (${autoBoostUsedCountFor(state.user)} / ${includedBoostLimitFor(state.user)} ce mois).`
        : `Your included boosts are automatic (${autoBoostUsedCountFor(state.user)} / ${includedBoostLimitFor(state.user)} this month).`);
    }
    render();
    return;
  }
  if(!userListingCount()){
    showToast(t().boostNoListings);
    openPostModal();
    return;
  }
  const own = L.filter(l=>isOwnListing(l) && !l.sold);
  if(own.length === 1){
    openBoostCheckout(own[0].id);
    return;
  }
  openProfile();
  showToast(t().boostChooseListing);
}

function openBoostCheckout(id, event){
  if(event) event.stopPropagation();
  const l = L.find(x=>idKey(x.id) === idKey(id));
  if(!l) return;
  if(!state.user || !isOwnListing(l)){
    requireAccount("boost");
    showToast(t().boostLoginRequired);
    return;
  }
  if(hasActiveProSubscription(state.user)){
    applyAutomaticIncludedBoosts().then(applied=>{
      if(!applied){
        showToast(state.lang === "fr"
          ? `Vos boosts inclus sont automatiques (${autoBoostUsedCountFor(state.user)} / ${includedBoostLimitFor(state.user)} ce mois).`
          : `Your included boosts are automatic (${autoBoostUsedCountFor(state.user)} / ${includedBoostLimitFor(state.user)} this month).`);
      }
      render();
    });
    return;
  }
  pendingBoostListingId = id;
  pendingBoostDays = l.boost?.days || 7;
  const title = document.getElementById("boostListingTitle");
  if(title) title.textContent = titleFor(l);
  selectBoostPlan(pendingBoostDays);
  closeModal("profileModal");
  closeModal("detailModal");
  openModal("boostCheckoutModal");
}

function selectBoostPlan(days, btn){
  pendingBoostDays = days;
  document.querySelectorAll("#boostCheckoutModal .boost-plan-choice").forEach(choice=>{
    if(btn){ choice.setAttribute("aria-pressed", choice === btn); return; }
    // Called without a button (e.g. pre-selecting a plan when the checkout
    // modal opens programmatically) -- match by the days encoded in
    // data-click-args instead of the onclick attribute, which no longer
    // exists since inline handlers were replaced with delegated dispatch.
    let matches = false;
    try {
      const args = JSON.parse(choice.getAttribute("data-click-args") || "[]");
      matches = args[0] === days;
    } catch(e){ /* ignore */ }
    choice.setAttribute("aria-pressed", matches);
  });
  const amount = document.getElementById("boostCheckoutAmount");
  if(amount) amount.textContent = boostPlan(days).label;
  if(window.SXM) SXM.refreshPrices();
}

async function confirmListingBoost(e){
  e.preventDefault();
  if(window.SXM && SXM.isIOS()){
    if(await SXM.buy("boost-" + pendingBoostDays, pendingBoostListingId)){ closeModal("boostCheckoutModal"); showToast(t().boostSuccess); }
    return false;
  }
  if(!isLocalDevHost()){ showToast(state.lang === "fr" ? "Achat de boost indisponible pour le moment." : "Boost purchase is currently unavailable."); return false; }
  const l = L.find(x=>idKey(x.id) === idKey(pendingBoostListingId));
  if(!l) return false;
  const plan = boostPlan(pendingBoostDays);
  l.boosted = true;
  l.feat = true;
  l.boost = {
    days:pendingBoostDays,
    eur:plan.eur,
    usd:plan.usd,
    paid:true,
    startedAt:new Date().toISOString()
  };
  persistState();
  closeModal("boostCheckoutModal");
  render();
  showToast(t().boostSuccess);
  setTimeout(()=>openListing(l.id), 180);
  return false;
}

function openPaymentModal({existingUser=false, plan=null, after=null} = {}){
  pendingPaymentExistingUser = existingUser;
  pendingAfterPayment = after;
  const selectedPlan = plan || pendingProSignup?.accountPlan || state.user?.accountPlan || "pro-starter";
  pendingSelectedProPlan = selectedPlan;
  document.getElementById("paymentPlanName").textContent = planLabel(selectedPlan);
  document.getElementById("paymentPlanPrice").textContent = accountPlan(selectedPlan).price;
  document.getElementById("paymentPlanText").textContent = t().paymentPlanText;
  openModal("paymentModal");
}

function chooseProPlan(plan){
  if(!ACCOUNT_PLANS[plan] || plan === "personal-free") return;
  closeModal("boostModal");
  sessionStorage.setItem("bst-selected-pro-plan", plan);
  if(!state.user){
    requireAccount(`pro-plan:${plan}`);
    showToast(state.lang === "fr" ? "Connectez-vous pour continuer avec ce plan." : "Log in to continue with this plan.");
    return;
  }
  sessionStorage.removeItem("bst-selected-pro-plan");
  openPaymentModal({existingUser:true, plan});
}

function cancelPaymentFlow(){
  pendingProSignup = null;
  pendingPaymentExistingUser = false;
  pendingAfterPayment = null;
  pendingSelectedProPlan = null;
  closeModal("paymentModal");
}

function renderProfile(){
  const user = normalizeUser(state.user);
  state.user = user;
  const own = L.filter(l=>l.ownerId === user.id);
  const joined = new Date(user.memberSince).toLocaleDateString(state.lang==="fr" ? "fr-FR" : "en-US", {
    month:"short", year:"numeric"
  });
  const body = document.getElementById("profileBody");
  const displayName = user.businessName || user.name;
  const isBusiness = user.accountType === "business";
  const proActive = hasActiveProSubscription(user);
  const profileType = isBusiness ? (state.lang==="fr" ? "Boutique Pro SXM" : "SXM Pro Store") : (state.lang==="fr" ? "Vendeur local" : "Local seller");
  const profileCopy = own.length
    ? (state.lang==="fr" ? "Votre vitrine commence à prendre forme. Gardez vos photos propres, répondez vite et marquez les annonces vendues." : "Your storefront is taking shape. Keep photos clean, reply fast, and mark sold listings.")
    : isBusiness
      ? (state.lang==="fr" ? "Votre boutique Pro est prête à recevoir vos produits. Ajoutez des photos propres, un prix clair, et gardez le chat ouvert aux clients." : "Your Pro store is ready for products. Add clean photos, a clear price, and keep chat open for customers.")
      : (state.lang==="fr" ? "Prêt à vendre sur l'île ? Ajoutez une vraie photo, un prix clair, et votre annonce peut partir aujourd'hui." : "Ready to sell on the island? Add a real photo, a clear price, and your listing can move today.");
  body.innerHTML = `
    <section class="profile-hero">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar">${avatarHTML(user)}</div>
        <button type="button" class="avatar-edit-btn" data-click="triggerAvatarFileInput" aria-label="${t().changePhoto}" title="${t().changePhoto}">📷</button>
        <input type="file" id="avatarFileInput" accept="image/*" hidden data-change="handleAvatarChange" data-change-args='${dataArgs(["__THIS__"])}'>
      </div>
      <div>
        <span class="profile-kicker">${profileType}</span>
        <h3>${esc(displayName)}</h3>
        <p>${esc(user.email)} · ${esc(user.area || "SXM")}</p>
        <p>${t().memberSince} ${joined}</p>
        ${isBusiness ? `<p><strong>${t().proPlan}:</strong> ${planLabel(user.accountPlan)} · ${proActive ? t().proActive : t().proInactive}</p>` : ""}
        ${businessContactHTML(user)}
        <p class="profile-copy">${profileCopy}</p>
      </div>
    </section>
    <div class="profile-stats">
      <button type="button" class="profile-stat" data-click="openProfileStat" data-click-args='${dataArgs(['listings'])}'><b>${own.length}</b><span>${t().activeListings}</span></button>
      <button type="button" class="profile-stat" data-click="openProfileStat" data-click-args='${dataArgs(['saved'])}'><b>${state.favs.size}</b><span>${t().savedItems}</span></button>
      <button type="button" class="profile-stat" data-click="openProfileStat" data-click-args='${dataArgs(['messages'])}'><b>${Object.keys(chatThreads).length}</b><span>${t().conversations}</span></button>
      <button type="button" class="profile-stat" data-click="openProfileStat" data-click-args='${dataArgs(['rating'])}'><b>${Number(user.rating).toFixed(1)}</b><span>${t().ratingLabel}</span></button>
    </div>
    ${subscriptionDashboardHTML(user, own)}
    <section class="profile-section">
      <h3>${state.lang==="fr" ? "Confiance" : "Trust"}</h3>
      <div class="trust-badges">
        <button type="button" data-click="showTrustInfo" data-click-args='${dataArgs(['email'])}'>${t().verifiedEmail}</button>
        ${proActive ? `<button type="button" data-click="showTrustInfo" data-click-args='${dataArgs(['pro'])}'>${state.lang === "fr" ? "Compte Pro certifié" : "Certified Pro account"}</button>` : ""}
        <button type="button" data-click="showTrustInfo" data-click-args='${dataArgs(['member'])}'>${t().trustedMember}</button>
        <button type="button" data-click="showTrustInfo" data-click-args='${dataArgs(['reply'])}'>${t().fastReply}</button>
      </div>
    </section>
    <section class="profile-section">
      <h3>${state.lang==="fr" ? "Boîte à outils vendeur" : "Seller toolkit"}</h3>
      <div class="profile-tools">
        <button type="button" class="profile-tool" data-click="closeProfileModalThenPostModal">
          <b>${state.lang==="fr" ? "Mettre un objet en avant" : "List something now"}</b>
          <span>${state.lang==="fr" ? "Photos, prix, quartier et devise en quelques minutes." : "Photos, price, area and currency in a few minutes."}</span>
        </button>
        <button type="button" class="profile-tool" data-click="closeProfileModalThenMessages">
          <b>${state.lang==="fr" ? "Répondre aux acheteurs" : "Reply to buyers"}</b>
          <span>${state.lang==="fr" ? "Les réponses rapides aident à vendre plus vite." : "Fast replies help listings sell sooner."}</span>
        </button>
        <button type="button" class="profile-tool" data-click="closeProfileModalThenBoostInfo">
          <b>${t().boostCta}</b>
          <span>${state.lang==="fr" ? "Boost 3, 7 ou 14 jours sans abonnement Pro." : "Boost for 3, 7, or 14 days without a Pro subscription."}</span>
        </button>
        <button type="button" class="profile-tool" data-click="scrollFavsThenCloseProfileModal">
          <b>${state.lang==="fr" ? "Suivre mes favoris" : "Watch saved items"}</b>
          <span>${state.lang==="fr" ? "Gardez les bons plans sous la main." : "Keep good deals close."}</span>
        </button>
        ${(!window.matchMedia || !window.matchMedia('(display-mode: standalone)').matches) ? `<button type="button" class="profile-tool" data-click="handleInstallAppClick">
          <b>${state.lang==="fr" ? "Installer l'application" : "Install the app"}</b>
          <span>${state.lang==="fr" ? "Accès depuis l'écran d'accueil, plein écran, même hors ligne." : "Home-screen access, full screen, works offline."}</span>
        </button>` : ""}
        ${(window.PUSH_ENABLED && window.Push && Push.supported()) ? `<button type="button" class="profile-tool" id="pushTool" data-click="toggleProfilePushNotifications" data-click-args='${dataArgs(["__THIS__"])}'>
          <b>${state.lang==="fr" ? "Activer les notifications" : "Turn on notifications"}</b>
          <span>${state.lang==="fr" ? "Soyez prévenu des nouveaux messages, même l'app fermée." : "Get told about new messages, even when the app is closed."}</span>
        </button>` : ""}
        ${isAdminUser(user) ? `<button type="button" class="profile-tool" data-click="closeProfileModalThenAdmin">
          <b>Admin</b>
          <span>${state.lang==="fr" ? "Modérer les annonces, signalements, boosts et catégories." : "Moderate listings, reports, boosts, and categories."}</span>
        </button>` : ""}
      </div>
    </section>
    ${isBusiness ? proDashboardHTML(user, own, proActive) : ""}
    <section class="profile-section">
      <h3>${t().profileListings}</h3>
      <div class="mini-listing">
        ${own.length ? own.map(l=>miniListingHTML(l)).join("") : `<p class="upload-help">${t().profileNoListings}</p>`}
      </div>
    </section>
    <div class="detail-actions">
      <button type="button" class="primary-btn" data-click="closeProfileModalThenPostModal">${t().postAd}</button>
      <button type="button" class="secondary-btn" data-click="logoutUser">${t().logoutLabel}</button>
    </div>
    <div class="detail-actions">
      ${window.SXM && SXM.isIOS() ? `<button type="button" class="secondary-btn" data-apple-restore>${state.lang === "fr" ? "Restaurer les achats" : "Restore purchases"}</button><button type="button" class="secondary-btn" data-apple-manage>${state.lang === "fr" ? "Gérer les abonnements Apple" : "Manage Apple subscriptions"}</button>` : ""}
      <button type="button" class="secondary-btn" data-click="deleteMyAccountConfirmed">${t().deleteAccountLabel}</button>
    </div>`;
  refreshPushToolLabel(document.getElementById("pushTool"));
  persistState();
}

function subscriptionDashboardHTML(user, own){
  const plan = accountPlan(user.accountPlan);
  const isBusiness = user.accountType === "business";
  const proActive = hasActiveProSubscription(user);
  const limit = listingLimitFor(user);
  const used = publicationUsageCountFor(user);
  const quota = Number.isFinite(limit) ? `${used} / ${limit}` : `${used} / ${state.lang === "fr" ? "Illimité" : "Unlimited"}`;
  const periodEnd = subscriptionPeriodEndFor(user);
  const renewal = isBusiness
    ? (periodEnd ? formatProfileDate(periodEnd) : (state.lang === "fr" ? "Après connexion Stripe" : "After Stripe setup"))
    : (state.lang === "fr" ? "Le 1er du mois" : "1st of the month");
  const statusClass = proActive || !isBusiness ? "active" : "pending";
  const statusText = subscriptionStatusLabel(user);
  const paymentText = isBusiness
    ? (proActive
      ? (state.lang === "fr" ? "Votre compte Pro peut publier selon sa limite actuelle." : "Your Pro account can publish within its current limit.")
      : (state.lang === "fr" ? "Paiement requis avant publication Pro." : "Payment is required before Pro publishing."))
    : (state.lang === "fr" ? "Créer un compte et vendre vos objets personnels reste gratuit." : "Creating an account and selling personal items stays free.");
  return `
    <section class="subscription-card">
      <div class="subscription-summary">
        <h3>${state.lang === "fr" ? "Mon abonnement" : "My subscription"}</h3>
        <div class="subscription-badges">
          <span class="${statusClass}">${esc(statusText)}</span>
          <span>${esc(planLabel(user.accountPlan))}</span>
          <span>${esc(plan.price)}</span>
        </div>
        <p>${paymentText}</p>
        <div class="subscription-actions">
          <button type="button" class="primary-btn" data-click="closeProfileModalThenPricing">${state.lang === "fr" ? "Changer de plan" : "Change plan"}</button>
          <button type="button" class="secondary-btn" data-click="manageSubscription">${state.lang === "fr" ? "Gérer / annuler" : "Manage / cancel"}</button>
        </div>
      </div>
      <div class="subscription-metrics">
        <div class="subscription-metric"><span>${isBusiness ? (state.lang === "fr" ? "Annonces actives" : "Active listings") : (state.lang === "fr" ? "Annonces ce mois" : "Listings this month")}</span><b>${quota}</b></div>
        <div class="subscription-metric"><span>${state.lang === "fr" ? "Renouvellement" : "Renewal"}</span><b>${esc(renewal)}</b></div>
        <div class="subscription-metric"><span>${state.lang === "fr" ? "Statut paiement" : "Payment status"}</span><b>${esc(statusText)}</b></div>
        <div class="subscription-metric"><span>${state.lang === "fr" ? "Boosts auto ce mois" : "Auto boosts this month"}</span><b>${autoBoostUsedCountFor(user)} / ${includedBoostLimitFor(user)}</b></div>
      </div>
    </section>`;
}

function proDashboardHTML(user, own, proActive){
  const activeOwn = own.filter(l=>!l.sold && l.status !== "sold").length;
  const planLimit = listingLimitFor(user);
  const quota = Number.isFinite(planLimit) ? `${activeOwn} / ${planLimit}` : `${activeOwn} / ∞`;
  return `
    <section class="profile-section">
      <h3>${t().proDashboardTitle}</h3>
      <div class="pro-status">
        <span class="${proActive ? "active" : "pending"}">${proActive ? t().proActive : t().proInactive}</span>
        <span>${t().proPlan}: ${planLabel(user.accountPlan)}</span>
        <span>${quota} ${t().activeListings}</span>
      </div>
      <div class="pro-dashboard">
        <article class="pro-panel">
          <h4>${t().proStorefrontTitle}</h4>
          <p>${t().proStorefrontText}</p>
          <button type="button" class="secondary-btn" data-click="showToast" data-click-args='${dataArgs([t().comingSoon])}'>${t().proOpenStore}</button>
        </article>
        <article class="pro-panel">
          <h4>${t().proProductsTitle}</h4>
          <p>${t().proProductsText}</p>
          <button type="button" class="primary-btn" data-click="closeProfileModalThenPostModal">${t().proAddProduct}</button>
        </article>
        <article class="pro-panel">
          <h4>${t().proVisibilityTitle}</h4>
          <p>${t().proVisibilityText}</p>
          <button type="button" class="secondary-btn" data-click="closeProfileModalThenBoostInfo">${t().proBoostProduct}</button>
        </article>
        <article class="pro-panel">
          <h4>${state.lang==="fr" ? "Méthode de vente" : "Selling method"}</h4>
          <ul>
            <li>${state.lang==="fr" ? "Publiez chaque produit avec ses propres photos et son stock." : "Publish each product with its own photos and stock."}</li>
            <li>${state.lang==="fr" ? "Les acheteurs contactent le commerce dans le chat instantané." : "Buyers contact the business through instant chat."}</li>
            <li>${state.lang==="fr" ? "Les avis renforcent la confiance autour de votre boutique." : "Ratings build trust around your store."}</li>
          </ul>
        </article>
      </div>
    </section>`;
}

function miniListingHTML(l){
  const idParam = idKey(l.id);
  const profile = postFieldProfile(l.cat, l.sub || "");
  const media = mediaFor(l);
  const status = l.sold ? t().sold : l.reserved ? t().reserved : state.lang==="fr" ? "Active" : "Active";
  return `
    <div class="mini-row ${profile.photos ? "" : "no-media"}">
      ${profile.photos ? `<img src="${esc(media.img)}" alt="">` : ""}
      <button type="button" class="mini-main" data-click="closeProfileModalThenOpenListing" data-click-args='${dataArgs([idParam])}'>
        <b>${esc(titleFor(l))}</b><br><small>${esc(l.area)}${profile.price ? " · " + priceHTML(l).replace(/<[^>]*>/g," ") : ""}</small>
      </button>
      <div class="mini-actions">
        <small>${status}</small>
        ${l.sold || hasActiveProSubscription(state.user) ? "" : `<button type="button" class="secondary-btn" data-click="openBoostCheckout" data-click-args='${dataArgs([idParam, "__EVENT__"])}'>${t().boostCta}</button>`}
      </div>
    </div>`;
}

async function logoutUser(){
  if(window.Push && Push.disable && state.user && state.user.provider === "supabase"){
    try { await Push.disable(); } catch(e){}
  }
  if(window.SB && SB.enabled() && state.user && state.user.provider === "supabase"){
    try { await SB.signOut(); } catch(e){}
  }
  state.user = null;
  persistState();
  closeModal("profileModal");
  render();
  showToast(state.lang==="fr" ? "Déconnecté" : "Logged out");
}

// Self-service account deletion (GDPR right to erasure). Local-only demo
// accounts have no server row to delete, so this just signs the demo user
// out locally -- real deletion only applies to actual Supabase accounts.
async function deleteMyAccountConfirmed(){
  if(!state.user) return;
  if(window.SXM && SXM.isIOS()) alert(state.lang === "fr" ? "La suppression du compte ne résilie pas un abonnement Apple. Vous pouvez le résilier avec le bouton Gérer les abonnements Apple du profil." : "Deleting your account does not cancel an Apple subscription. You can cancel it using Manage Apple subscriptions in your profile.");
  if(!confirm(state.lang==="fr"
    ? "Supprimer définitivement votre compte ? Vos messages seront supprimés et vos annonces resteront visibles sans vendeur associé. Cette action est irréversible."
    : "Permanently delete your account? Your messages will be deleted and your listings will remain visible without an associated seller. This cannot be undone.")) return;

  if(!window.SB || !SB.enabled() || state.user.provider !== "supabase"){
    showToast(state.lang==="fr" ? "Compte de démonstration : rien à supprimer côté serveur." : "Demo account: nothing to delete server-side.");
    await logoutUser();
    return;
  }

  const res = await SB.deleteMyAccount();
  if(res && res.ok){
    if(window.Push && Push.disable){ try { await Push.disable(); } catch(e){} }
    try { await SB.signOut(); } catch(e){}
    state.user = null;
    persistState();
    closeModal("profileModal");
    render();
    showToast(state.lang==="fr" ? "Votre compte a été supprimé." : "Your account has been deleted.");
  } else {
    showToast((state.lang==="fr" ? "Échec de la suppression : " : "Deletion failed: ") + (res && res.error ? res.error : "?"));
  }
}

function requireAccount(action){
  pendingAuthAction = action;
  document.getElementById("createAccountError").textContent = "";
  document.getElementById("loginError").textContent = "";
  openModal("accountModal");
}

function requestListingLogin(id){
  closeModal("detailModal");
  requireAccount(`listing:${id}`);
}

function completeAuth(){
  const action = pendingAuthAction;
  pendingAuthAction = null;
  closeModal("accountModal");
  render();
  if(action === "post") openPostModal();
  else if(action === "profile") openProfile();
  else if(action === "messages") openMessages();
  else if(action === "boost") startBoostFlow();
  else if(action === "admin") openAdmin();
  else if(action?.startsWith("pro-plan:")) openPaymentModal({existingUser:true, plan:action.slice("pro-plan:".length)});
  else if(action?.startsWith("listing:")) openListing(action.slice("listing:".length));
}

function ensureAdminReports(){
  if(window.SB && SB.enabled() && state.user?.provider === "supabase") return;
  if(adminReports.length) return;
  const picks = L.filter(l=>[4,10,20].includes(Number(l.id))).slice(0,3);
  adminReports = picks.map((l,index)=>({
    id:`rep-${l.id}`,
    listingId:l.id,
    reason:[
      state.lang==="fr" ? "Prix ou description à vérifier" : "Price or description needs review",
      state.lang==="fr" ? "Possible annonce déjà vendue" : "May already be sold",
      state.lang==="fr" ? "Photos / catégorie à contrôler" : "Photos / category need checking"
    ][index] || "Review",
    status:"open",
    createdAt:new Date(Date.now() - (index + 1) * 86400000).toISOString()
  }));
  persistState();
}

function canUseSupabaseAdmin(){
  return !!(window.SB && SB.enabled() && state.user?.provider === "supabase" && isAdminUser());
}

function isUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function reportFromRow(row){
  return {
    id:row.id,
    listingId:row.listing_id,
    reporterId:row.reporter_id,
    reason:row.reason,
    notes:row.notes || "",
    status:row.status || "open",
    createdAt:row.created_at,
    resolvedAt:row.resolved_at || null
  };
}

function profileFromRow(row){
  return normalizeUser({
    id:row.id,
    provider:"supabase",
    email:row.email || "",
    name:row.name || row.business_name || "Supabase user",
    accountType:row.account_type || "personal",
    accountPlan:row.account_plan || "personal-free",
    subscriptionStatus:row.subscription_status || (row.account_type === "business" ? "inactive" : "free"),
    businessName:row.business_name || "",
    businessPhone:row.business_phone || row.phone || "",
    role:row.role || "user"
  });
}

async function loadSupabaseAdminData(){
  if(!canUseSupabaseAdmin()) return false;
  const [reports, banned, profiles, categoryStatus, rules, campaigns, counts] = await Promise.all([
    SB.fetchReports ? SB.fetchReports() : null,
    SB.fetchBannedUsers ? SB.fetchBannedUsers() : null,
    SB.fetchProfiles ? SB.fetchProfiles() : null,
    SB.fetchAdminSettings ? SB.fetchAdminSettings("category_status") : null,
    SB.fetchModerationRules ? SB.fetchModerationRules() : null,
    SB.fetchAdCampaigns ? SB.fetchAdCampaigns() : null,
    SB.fetchDailyCounts ? SB.fetchDailyCounts(14) : null
  ]);
  if(Array.isArray(reports)) adminReports = reports.map(reportFromRow);
  if(Array.isArray(banned)) adminBanned = banned.map(row=>String(row.user_id));
  if(Array.isArray(profiles)) adminProfiles = profiles.map(profileFromRow);
  if(categoryStatus && typeof categoryStatus === "object") adminCategoryStatus = categoryStatus;
  if(rules) adminModerationRules = { categories:rules.categories || [], keywords:rules.keywords || [] };
  if(Array.isArray(campaigns)) adminAdCampaigns = campaigns;
  if(Array.isArray(counts)) adminDailyCounts = counts;
  buildCats();
  buildFilters();
  return true;
}

async function loadSupabasePublicSettings(){
  if(!(window.SB && SB.enabled() && SB.fetchAdminSettings)) return false;
  const categoryStatus = await SB.fetchAdminSettings("category_status");
  if(categoryStatus && typeof categoryStatus === "object"){
    adminCategoryStatus = categoryStatus;
    buildCats();
    buildFilters();
    render();
    return true;
  }
  return false;
}

function adminPrice(l){
  if(!postFieldProfile(l.cat, l.sub || "").price) return state.lang==="fr" ? "Sans prix" : "No price";
  return priceHTML(l).replace(/<[^>]*>/g," ").trim();
}

function adminUsers(){
  if(adminProfiles.length){
    const counts = new Map();
    L.forEach(l=>{
      const key = l.ownerId || l.sellerId;
      if(key) counts.set(String(key), (counts.get(String(key)) || 0) + 1);
    });
    return adminProfiles.map(u=>({...u, listings:counts.get(String(u.id)) || 0}));
  }
  const map = new Map();
  Object.values(usersByEmail).forEach(user=>{
    if(!user?.email) return;
    const u = normalizeUser(user);
    map.set(u.id || u.email, {...u, listings:L.filter(l=>l.ownerId === u.id || l.sellerId === u.id).length});
  });
  L.forEach(l=>{
    const key = l.ownerId || l.sellerId || sellerName(l);
    if(map.has(key)) return;
    map.set(key, {
      id:key,
      name:sellerName(l),
      email:l.sellerId ? "Supabase user" : "Demo seller",
      role:"seller",
      accountType:l.pro ? "business" : "personal",
      listings:L.filter(x=>(x.ownerId || x.sellerId || sellerName(x)) === key).length
    });
  });
  return [...map.values()];
}

function adminStats(){
  const boosted = L.filter(l=>l.boosted || l.feat);
  const boostRevenue = L.reduce((sum,l)=>sum + (l.boost?.paid ? Number(l.boost.eur || 0) : 0), 0);
  const proRevenue = Object.values(usersByEmail).reduce((sum,u)=>sum + (hasActiveProSubscription(normalizeUser(u)) ? 29 : 0), 0);
  return {
    listings:L.length,
    active:L.filter(l=>!l.sold).length,
    pending:L.filter(l=>l.moderationStatus === "pending").length,
    reports:adminReports.filter(r=>r.status !== "resolved").length,
    boosted:boosted.length,
    users:adminUsers().length,
    revenue:boostRevenue + proRevenue
  };
}

async function openAdmin(){
  if(!state.user){
    requireAccount("admin");
    showToast(state.lang==="fr" ? "Connectez-vous avec un compte admin." : "Sign in with an admin account.");
    return;
  }
  if(!isAdminUser()){
    showToast(state.lang==="fr" ? "Accès admin réservé." : "Admin access only.");
    return;
  }
  if(canUseSupabaseAdmin()) await loadSupabaseAdminData();
  else ensureAdminReports();
  renderAdmin(adminTab);
  openModal("adminModal");
}

function renderAdmin(tab=adminTab){
  adminTab = tab;
  const body = document.getElementById("adminBody");
  if(!body) return;
  const stats = adminStats();
  const labels = {
    overview:state.lang==="fr" ? "Vue globale" : "Overview",
    listings:state.lang==="fr" ? "Annonces" : "Listings",
    moderation:state.lang==="fr" ? "À valider" : "To review",
    reports:state.lang==="fr" ? "Signalements" : "Reports",
    users:state.lang==="fr" ? "Utilisateurs" : "Users",
    boosts:state.lang==="fr" ? "Boosts" : "Boosts",
    ads:state.lang==="fr" ? "Publicités" : "Ads",
    categories:state.lang==="fr" ? "Catégories" : "Categories",
    stats:state.lang==="fr" ? "Statistiques" : "Stats"
  };
  body.innerHTML = `
    <div class="admin-shell">
      <div class="admin-note">${state.lang==="fr" ? "Connecté comme admin. Les actions modifient l'app tout de suite; avec Supabase elles utilisent les règles admin ajoutées au schéma." : "Signed in as admin. Actions update the app immediately; with Supabase they use the admin rules added to the schema."}</div>
      <div class="admin-tabs">
        ${Object.entries(labels).map(([key,label])=>`<button type="button" class="admin-tab" aria-pressed="${adminTab===key}" data-click="renderAdmin" data-click-args='${dataArgs([key])}'>${label}${key==="moderation" && stats.pending ? ` (${stats.pending})` : ""}</button>`).join("")}
      </div>
      <div class="admin-metrics">
        <div class="admin-metric"><b>${stats.listings}</b><span>${state.lang==="fr" ? "annonces" : "listings"}</span></div>
        <div class="admin-metric"><b>${stats.active}</b><span>${state.lang==="fr" ? "actives" : "active"}</span></div>
        <div class="admin-metric"><b>${stats.pending}</b><span>${state.lang==="fr" ? "à valider" : "to review"}</span></div>
        <div class="admin-metric"><b>${stats.reports}</b><span>${state.lang==="fr" ? "à vérifier" : "to review"}</span></div>
        <div class="admin-metric"><b>${stats.boosted}</b><span>${state.lang==="fr" ? "boostées" : "boosted"}</span></div>
        <div class="admin-metric"><b>${money(stats.revenue,"eur")}</b><span>${state.lang==="fr" ? "revenu démo" : "demo revenue"}</span></div>
      </div>
      ${adminPanelHTML(adminTab)}
    </div>`;
}

function adminPanelHTML(tab){
  if(tab === "listings") return adminListingsHTML(L);
  if(tab === "moderation") return adminModerationHTML();
  if(tab === "reports") return adminReportsHTML();
  if(tab === "users") return adminUsersHTML();
  if(tab === "boosts") return adminBoostsHTML();
  if(tab === "ads") return adminAdsHTML();
  if(tab === "categories") return adminCategoriesHTML();
  if(tab === "stats") return adminStatsHTML();
  const recent = [...L].slice(0,5);
  return `
    <div class="admin-grid">
      <section class="admin-panel"><h3>${state.lang==="fr" ? "Dernières annonces" : "Latest listings"}</h3>${adminListingRows(recent)}</section>
      <section class="admin-panel"><h3>${state.lang==="fr" ? "Signalements ouverts" : "Open reports"}</h3>${adminReportRows(adminReports.filter(r=>r.status !== "resolved").slice(0,5))}</section>
    </div>`;
}

function adminListingRows(items){
  return `<div class="admin-table">${items.map(l=>`
    <div class="admin-row">
      <img src="${esc(mediaFor(l).img)}" alt="">
      <div><b>${esc(titleFor(l))}</b><br><small>${esc(l.area || "SXM")} · ${esc(adminPrice(l))} · ${esc(l.cat)}${l.boosted ? " · Boost" : ""}${l.sold ? " · Sold" : ""}${l.moderationStatus && l.moderationStatus !== "approved" ? " · " + (l.moderationStatus === "pending" ? (state.lang==="fr" ? "À valider" : "Pending") : (state.lang==="fr" ? "Rejetée" : "Rejected")) : ""}</small></div>
      <div class="admin-actions">
        <button type="button" data-click="openListingFromAdmin" data-click-args='${dataArgs([l.id])}'>${state.lang==="fr" ? "Voir" : "View"}</button>
        <button type="button" data-click="adminEditListing" data-click-args='${dataArgs([l.id])}'>${state.lang==="fr" ? "Modifier" : "Edit"}</button>
        <button type="button" class="primary" data-click="toggleFeaturedAdmin" data-click-args='${dataArgs([l.id])}'>${l.feat ? (state.lang==="fr" ? "Retirer une" : "Unfeature") : (state.lang==="fr" ? "Mettre une" : "Feature")}</button>
        <button type="button" data-click="markListingStatusAdmin" data-click-args='${dataArgs([idKey(l.id), l.sold ? "active" : "sold"])}'>${l.sold ? "Active" : "Sold"}</button>
        <button type="button" class="danger" data-click="removeListingAdmin" data-click-args='${dataArgs([l.id])}'>${state.lang==="fr" ? "Supprimer" : "Remove"}</button>
      </div>
    </div>`).join("") || `<p>${state.lang==="fr" ? "Rien à afficher." : "Nothing to show."}</p>`}</div>`;
}

function filterListingsBySearch(items, q){
  const needle = (q || "").trim().toLowerCase();
  if(!needle) return items;
  return items.filter(l=>[titleFor(l), l.cat, l.sub, l.area, l.desc].filter(Boolean).join(" ").toLowerCase().includes(needle));
}

function filterAdminListings(value){
  adminListingSearch = value;
  const el = document.getElementById("adminListingResults");
  if(el) el.innerHTML = adminListingRows(filterListingsBySearch(L, adminListingSearch));
}

function adminListingsHTML(items){
  return `<section class="admin-panel">
    <h3>${state.lang==="fr" ? "Gérer les annonces" : "Manage listings"}</h3>
    <input type="text" class="admin-search" placeholder="${state.lang==="fr" ? "Rechercher par titre, catégorie, zone..." : "Search by title, category, area..."}" value="${esc(adminListingSearch)}" data-input="filterAdminListings" data-input-args='${dataArgs(["__VALUE__"])}'>
    <div id="adminListingResults">${adminListingRows(filterListingsBySearch(items, adminListingSearch))}</div>
  </section>`;
}

function adminEditListing(id){
  closeModal("adminModal");
  openEditListing(id);
}

function adminReportRows(items){
  return `<div class="admin-table">${items.map(r=>{
    const l = L.find(x=>String(x.id) === String(r.listingId));
    return `<div class="admin-row ${l ? "" : "no-img"}">
      ${l ? `<img src="${esc(mediaFor(l).img)}" alt="">` : ""}
      <div><b>${esc(l ? titleFor(l) : "Listing removed")}</b><br><small>${esc(r.reason)} · ${r.createdAt ? new Date(r.createdAt).toLocaleDateString(state.lang==="fr"?"fr-FR":"en-US") : ""} · ${esc(r.status)}</small>${r.notes ? `<br><small>${esc(r.notes)}</small>` : ""}</div>
      <div class="admin-actions">
        ${l ? `<button type="button" data-click="openListingFromAdmin" data-click-args='${dataArgs([l.id])}'>${state.lang==="fr" ? "Voir" : "View"}</button><button type="button" class="danger" data-click="removeListingAdmin" data-click-args='${dataArgs([l.id])}'>${state.lang==="fr" ? "Supprimer" : "Remove"}</button>` : ""}
        <button type="button" class="primary" data-click="resolveReportAdmin" data-click-args='${dataArgs([r.id])}'>${state.lang==="fr" ? "Résoudre" : "Resolve"}</button>
      </div>
    </div>`;
  }).join("") || `<p>${state.lang==="fr" ? "Aucun signalement ouvert." : "No open reports."}</p>`}</div>`;
}

function adminReportsHTML(){
  return `<section class="admin-panel"><h3>${state.lang==="fr" ? "Signalements" : "Reports"}</h3>${adminReportRows(adminReports)}</section>`;
}

function adminModerationHTML(){
  const pending = L.filter(l=>l.moderationStatus === "pending");
  const catOptions = CATS.filter(c=>c.id!=="all");
  return `<section class="admin-panel">
    <h3>${state.lang==="fr" ? "Annonces à valider" : "Listings to review"}</h3>
    <p class="admin-note">${state.lang==="fr"
      ? "Les comptes Pro publient toujours directement. Une annonce personnelle attend votre validation seulement si sa catégorie ou un mot-clé ci-dessous la signale."
      : "Pro accounts always publish instantly. A personal listing waits for your approval only if its category or a keyword below flags it."}</p>
    <div class="admin-table">
      ${pending.map(l=>`
        <div class="admin-row">
          <img src="${esc(mediaFor(l).img)}" alt="">
          <div>
            <b>${esc(titleFor(l))}</b><br>
            <small>${esc(l.area || "SXM")} · ${esc(adminPrice(l))} · ${esc(l.cat)} · ${esc(sellerName(l))}</small>
            <div class="ai-scan-result" id="aiScan-${l.id}"></div>
          </div>
          <div class="admin-actions">
            <button type="button" data-click="openListingFromAdmin" data-click-args='${dataArgs([l.id])}'>${state.lang==="fr" ? "Voir" : "View"}</button>
            <button type="button" data-click="scanListingPhotosAdmin" data-click-args='${dataArgs([l.id, "__THIS__"])}'>${state.lang==="fr" ? "Scanner les photos (IA)" : "Scan photos (AI)"}</button>
            <button type="button" class="primary" data-click="setModerationStatusAdmin" data-click-args='${dataArgs([l.id, 'approved'])}'>${state.lang==="fr" ? "Approuver" : "Approve"}</button>
            <button type="button" class="danger" data-click="setModerationStatusAdmin" data-click-args='${dataArgs([l.id, 'rejected'])}'>${state.lang==="fr" ? "Rejeter" : "Reject"}</button>
          </div>
        </div>`).join("") || `<p>${state.lang==="fr" ? "Rien à valider." : "Nothing to review."}</p>`}
    </div>
    <div class="admin-panel" style="margin-top:16px">
      <h3>${state.lang==="fr" ? "Règles de filtrage" : "Filtering rules"}</h3>
      <p class="admin-note">${state.lang==="fr"
        ? "Cochez les catégories à toujours faire valider, et/ou listez des mots interdits (séparés par des virgules)."
        : "Check categories that always need review, and/or list banned words (comma-separated)."}</p>
      <div class="admin-cat-checks" id="adminModCats">
        ${catOptions.map(c=>`<label><input type="checkbox" value="${c.id}" ${adminModerationRules.categories.includes(c.id) ? "checked" : ""}> ${c[state.lang]}</label>`).join("")}
      </div>
      <textarea id="adminModKeywords" rows="3" placeholder="${state.lang==="fr" ? "ex: arme, pistolet, drogue" : "e.g. weapon, gun, drug"}">${esc((adminModerationRules.keywords || []).join(", "))}</textarea>
      <div class="detail-actions"><button type="button" class="primary-btn" data-click="saveModerationRulesAdmin">${state.lang==="fr" ? "Enregistrer les règles" : "Save rules"}</button></div>
    </div>
  </section>`;
}

async function setModerationStatusAdmin(id, status){
  const l = L.find(x=>String(x.id) === String(id));
  if(!l) return;
  const ok = canUseSupabaseAdmin() ? await SB.setListingModerationStatus(id, status) : true;
  if(!ok){ showToast(state.lang==="fr" ? "Échec" : "Failed"); return; }
  l.moderationStatus = status;
  refreshAdmin();
  showToast(status === "approved"
    ? (state.lang==="fr" ? "Annonce approuvée" : "Listing approved")
    : (state.lang==="fr" ? "Annonce rejetée" : "Listing rejected"));
}

async function saveModerationRulesAdmin(){
  const boxes = [...document.querySelectorAll("#adminModCats input[type=checkbox]:checked")].map(b=>b.value);
  const kws = (document.getElementById("adminModKeywords")?.value || "").split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
  const ok = canUseSupabaseAdmin() ? await SB.saveModerationRules(boxes, kws) : true;
  if(ok){
    adminModerationRules = { categories:boxes, keywords:kws };
    showToast(state.lang==="fr" ? "Règles enregistrées" : "Rules saved");
  } else showToast(state.lang==="fr" ? "Échec de l'enregistrement" : "Save failed");
}

async function scanListingPhotosAdmin(id, btn){
  const l = L.find(x=>String(x.id) === String(id));
  const box = document.getElementById("aiScan-" + id);
  if(!l || !l.photos || !l.photos.length){ if(box) box.textContent = state.lang==="fr" ? "Aucune photo." : "No photo."; return; }
  if(!canUseSupabaseAdmin()){ if(box) box.textContent = state.lang==="fr" ? "Nécessite Supabase." : "Requires Supabase."; return; }
  if(btn) btn.disabled = true;
  if(box) box.textContent = state.lang==="fr" ? "Analyse en cours..." : "Scanning...";
  const results = [];
  for(const url of l.photos.slice(0,8)) results.push(await SB.moderatePhoto(url));
  if(btn) btn.disabled = false;
  const errored = results.find(r=>r && r.error);
  const flagged = results.some(r=>r && r.flagged);
  const labelNames = [...new Set(results.flatMap(r=>(r && r.labels) || []).map(x=>x.name).filter(Boolean))];
  if(box){
    if(errored) box.textContent = (state.lang==="fr" ? "Erreur: " : "Error: ") + errored.error;
    else box.textContent = flagged
      ? (state.lang==="fr" ? "⚠ Signalé par l'IA : " : "⚠ Flagged by AI: ") + labelNames.join(", ")
      : (state.lang==="fr" ? "✓ Rien de suspect détecté." : "✓ Nothing suspicious detected.");
  }
}

function adminUserRows(list){
  return list.map(u=>{
    const banned = adminBanned.includes(String(u.id));
    const canManage = !canUseSupabaseAdmin() || isUuid(u.id);
    return `<div class="admin-row no-img">
      <div><b>${esc(u.businessName || u.name || u.email)}</b><br><small>${esc(u.email || "")} · ${esc(u.accountType || "personal")} · ${u.listings || 0} listings · ${banned ? "Banned" : "Active"}${u.role === "admin" ? " · Admin" : ""}</small></div>
      <div class="admin-actions">
        <button type="button" data-click="toggleAdminRole" data-click-args='${dataArgs([String(u.id)])}' ${canManage ? "" : "disabled"}>${u.role === "admin" ? "User" : "Admin"}</button>
        <button type="button" class="danger" data-click="toggleBanUser" data-click-args='${dataArgs([String(u.id)])}' ${canManage ? "" : "disabled"}>${banned ? (state.lang==="fr" ? "Débloquer" : "Unban") : (state.lang==="fr" ? "Bannir" : "Ban")}</button>
        <button type="button" class="danger" data-click="deleteUserAdmin" data-click-args='${dataArgs([String(u.id)])}' ${canUseSupabaseAdmin() && isUuid(u.id) ? "" : "disabled"}>${state.lang==="fr" ? "Supprimer le compte" : "Delete account"}</button>
      </div>
    </div>`;
  }).join("") || `<p>${state.lang==="fr" ? "Aucun utilisateur." : "No users."}</p>`;
}

function filterUsersBySearch(list, q){
  const needle = (q || "").trim().toLowerCase();
  if(!needle) return list;
  return list.filter(u=>[u.name, u.businessName, u.email].filter(Boolean).join(" ").toLowerCase().includes(needle));
}

function filterAdminUsers(value){
  adminUserSearch = value;
  const el = document.getElementById("adminUserResults");
  if(el) el.innerHTML = adminUserRows(filterUsersBySearch(adminUsers(), adminUserSearch));
}

function adminUsersHTML(){
  return `<section class="admin-panel">
    <h3>${state.lang==="fr" ? "Utilisateurs et bannissements" : "Users and bans"}</h3>
    <input type="text" class="admin-search" placeholder="${state.lang==="fr" ? "Rechercher par nom ou email..." : "Search by name or email..."}" value="${esc(adminUserSearch)}" data-input="filterAdminUsers" data-input-args='${dataArgs(["__VALUE__"])}'>
    <div id="adminUserResults" class="admin-table">${adminUserRows(filterUsersBySearch(adminUsers(), adminUserSearch))}</div>
  </section>`;
}

async function deleteUserAdmin(id){
  if(!canUseSupabaseAdmin() || !isUuid(id)) return;
  if(state.user && state.user.id === id){
    showToast(state.lang==="fr" ? "Vous ne pouvez pas supprimer votre propre compte ici." : "You can't delete your own account here.");
    return;
  }
  if(!confirm(state.lang==="fr" ? "Supprimer définitivement ce compte ? Cette action est irréversible." : "Permanently delete this account? This cannot be undone.")) return;
  const res = await SB.adminDeleteUser(id);
  if(res && res.ok){
    adminProfiles = adminProfiles.filter(u=>String(u.id) !== String(id));
    showToast(state.lang==="fr" ? "Compte supprimé" : "Account deleted");
    refreshAdmin();
  } else {
    showToast((state.lang==="fr" ? "Échec : " : "Failed: ") + (res && res.error ? res.error : "?"));
  }
}

function adminBoostsHTML(){
  const boosted = L.filter(l=>l.boosted || l.feat);
  return `<section class="admin-panel"><h3>${state.lang==="fr" ? "Boosts et visibilité payante" : "Boosts and paid visibility"}</h3>${adminListingRows(boosted)}
    <div class="detail-actions"><button type="button" class="primary-btn" data-click="renderAdmin" data-click-args='${dataArgs(['listings'])}'>${state.lang==="fr" ? "Choisir une annonce à booster" : "Choose a listing to boost"}</button></div>
  </section>`;
}

const ADMIN_AD_PLACEMENTS = ["desktop-leaderboard","content-1","home-top","feed","listing-detail","sticky-bottom"];

function adminAdRowHTML(c){
  const id = c.id;
  const isNew = !adminAdCampaigns.some(x=>x.id === id && x._saved);
  return `<div class="admin-ad-row" id="adRow-${esc(id)}">
    <div class="admin-ad-grid">
      <label>ID<input type="text" class="ad-id" value="${esc(id)}" ${isNew ? "" : "readonly"}></label>
      <label>${state.lang==="fr" ? "Actif" : "Active"}<select class="ad-active"><option value="true" ${c.active !== false ? "selected" : ""}>${state.lang==="fr" ? "Oui" : "Yes"}</option><option value="false" ${c.active === false ? "selected" : ""}>${state.lang==="fr" ? "Non" : "No"}</option></select></label>
      <label>${state.lang==="fr" ? "Annonceur" : "Sponsor"}<input type="text" class="ad-sponsor" value="${esc(c.sponsor || "")}"></label>
      <label>URL<input type="text" class="ad-url" value="${esc(c.url || "")}" placeholder="https://..."></label>
      <label>${state.lang==="fr" ? "Image (optionnel)" : "Image (optional)"}<input type="text" class="ad-image" value="${esc(c.image || "")}" placeholder="https://..."></label>
      <label>${state.lang==="fr" ? "Poids" : "Weight"}<input type="number" class="ad-weight" min="0" value="${c.weight == null ? 1 : c.weight}"></label>
      <label>${state.lang==="fr" ? "Début" : "Start"}<input type="date" class="ad-start" value="${esc(c.start_date || "")}"></label>
      <label>${state.lang==="fr" ? "Fin" : "End"}<input type="date" class="ad-end" value="${esc(c.end_date || "")}"></label>
    </div>
    <div class="admin-ad-grid">
      <label>${state.lang==="fr" ? "Titre FR" : "Headline FR"}<input type="text" class="ad-headline-fr" value="${esc(c.headline_fr || "")}"></label>
      <label>${state.lang==="fr" ? "Titre EN" : "Headline EN"}<input type="text" class="ad-headline-en" value="${esc(c.headline_en || "")}"></label>
      <label>${state.lang==="fr" ? "Texte FR" : "Text FR"}<input type="text" class="ad-text-fr" value="${esc(c.text_fr || "")}"></label>
      <label>${state.lang==="fr" ? "Texte EN" : "Text EN"}<input type="text" class="ad-text-en" value="${esc(c.text_en || "")}"></label>
      <label>CTA FR<input type="text" class="ad-cta-fr" value="${esc(c.cta_fr || "")}"></label>
      <label>CTA EN<input type="text" class="ad-cta-en" value="${esc(c.cta_en || "")}"></label>
    </div>
    <div class="admin-cat-checks">
      ${ADMIN_AD_PLACEMENTS.map(p=>`<label><input type="checkbox" class="ad-placement" value="${p}" ${(c.placements || []).includes(p) ? "checked" : ""}> ${p}</label>`).join("")}
    </div>
    <div class="admin-actions">
      <button type="button" class="primary" data-click="saveAdCampaignRow" data-click-args='${dataArgs([id])}'>${state.lang==="fr" ? "Enregistrer" : "Save"}</button>
      <button type="button" class="danger" data-click="deleteAdCampaignRow" data-click-args='${dataArgs([id])}'>${state.lang==="fr" ? "Supprimer" : "Delete"}</button>
    </div>
  </div>`;
}

function adminAdRows(rows){
  return rows.length ? rows.map(c=>adminAdRowHTML(c)).join("") : `<p>${state.lang==="fr" ? "Aucune pub pour l'instant." : "No ads yet."}</p>`;
}

function adminAdsHTML(){
  return `<section class="admin-panel">
    <h3>${state.lang==="fr" ? "Publicités vendues directement" : "Direct-sold ads"}</h3>
    <p class="admin-note">${state.lang==="fr" ? "Une pub active pour un emplacement passe toujours avant AdSense et les messages internes." : "An active ad for a placement always beats AdSense and house promos."}</p>
    <div id="adminAdsList">${adminAdRows(adminAdCampaigns)}</div>
    <div class="detail-actions"><button type="button" class="primary-btn" data-click="addAdCampaignRow">${state.lang==="fr" ? "+ Ajouter une pub" : "+ Add an ad"}</button></div>
  </section>`;
}

function addAdCampaignRow(){
  const id = "ad-" + Date.now().toString(36);
  adminAdCampaigns.unshift({ id, active:true, placements:[], weight:1 });
  const el = document.getElementById("adminAdsList");
  if(el) el.innerHTML = adminAdRows(adminAdCampaigns);
}

async function saveAdCampaignRow(id){
  const row = document.getElementById("adRow-" + id);
  if(!row) return;
  const val = sel => row.querySelector(sel)?.value || "";
  const placements = [...row.querySelectorAll(".ad-placement:checked")].map(x=>x.value);
  const newId = val(".ad-id").trim() || id;
  const payload = {
    id:newId,
    active:val(".ad-active") === "true",
    placements,
    weight:Number(val(".ad-weight")) || 0,
    start_date:val(".ad-start") || null,
    end_date:val(".ad-end") || null,
    sponsor:val(".ad-sponsor"),
    url:val(".ad-url"),
    image:val(".ad-image") || null,
    headline_fr:val(".ad-headline-fr"), headline_en:val(".ad-headline-en"),
    text_fr:val(".ad-text-fr"), text_en:val(".ad-text-en"),
    cta_fr:val(".ad-cta-fr"), cta_en:val(".ad-cta-en")
  };
  if(!payload.url){ showToast(state.lang==="fr" ? "URL requise" : "URL required"); return; }
  const ok = canUseSupabaseAdmin() ? await SB.upsertAdCampaign(payload) : true;
  if(ok){
    payload._saved = true;
    const i = adminAdCampaigns.findIndex(x=>x.id === id);
    if(i >= 0) adminAdCampaigns[i] = payload; else adminAdCampaigns.unshift(payload);
    showToast(state.lang==="fr" ? "Pub enregistrée" : "Ad saved");
    renderAdmin("ads");
  } else showToast(state.lang==="fr" ? "Échec de l'enregistrement" : "Save failed");
}

async function deleteAdCampaignRow(id){
  if(!confirm(state.lang==="fr" ? "Supprimer cette pub ?" : "Delete this ad?")) return;
  const ok = canUseSupabaseAdmin() ? await SB.deleteAdCampaign(id) : true;
  if(ok){
    adminAdCampaigns = adminAdCampaigns.filter(x=>x.id !== id);
    renderAdmin("ads");
  } else showToast(state.lang==="fr" ? "Échec de la suppression" : "Delete failed");
}

function adminCategoriesHTML(){
  return `<section class="admin-panel"><h3>${state.lang==="fr" ? "Catégories" : "Categories"}</h3><div class="admin-table">
    ${CATS.filter(c=>c.id!=="all").map(c=>{
      const hidden = !!adminCategoryStatus[c.id]?.hidden;
      const count = L.filter(l=>l.cat===c.id).length;
      return `<div class="admin-row">
        <img src="${G[c.id].img}" alt="">
        <div><b>${c[state.lang]}</b><br><small>${count} listings · ${hidden ? "Hidden" : "Visible"}</small></div>
        <div class="admin-actions"><button type="button" class="${hidden ? "primary" : ""}" data-click="toggleCategoryAdmin" data-click-args='${dataArgs([c.id])}'>${hidden ? (state.lang==="fr" ? "Afficher" : "Show") : (state.lang==="fr" ? "Masquer" : "Hide")}</button></div>
      </div>`;
    }).join("")}
  </div></section>`;
}

function adminStatsHTML(){
  const rows = adminDailyCounts;
  const sum = key => rows.reduce((s,r)=>s + (Number(r[key]) || 0), 0);
  return `<section class="admin-panel">
    <h3>${state.lang==="fr" ? "Statistiques (14 derniers jours)" : "Stats (last 14 days)"}</h3>
    <div class="admin-metrics">
      <div class="admin-metric"><b>${sum("new_listings")}</b><span>${state.lang==="fr" ? "nouvelles annonces" : "new listings"}</span></div>
      <div class="admin-metric"><b>${sum("new_users")}</b><span>${state.lang==="fr" ? "nouveaux comptes" : "new accounts"}</span></div>
      <div class="admin-metric"><b>${sum("new_messages")}</b><span>${state.lang==="fr" ? "messages" : "messages"}</span></div>
    </div>
    <div class="admin-table">
      ${rows.map(r=>`<div class="admin-row no-img">
        <div><b>${new Date(r.day).toLocaleDateString(state.lang==="fr" ? "fr-FR" : "en-US", {weekday:"short",day:"numeric",month:"short"})}</b></div>
        <div class="admin-actions"><span>${r.new_listings || 0} ${state.lang==="fr" ? "annonces" : "listings"}</span><span>${r.new_users || 0} ${state.lang==="fr" ? "comptes" : "users"}</span><span>${r.new_messages || 0} ${state.lang==="fr" ? "messages" : "messages"}</span></div>
      </div>`).join("") || `<p>${state.lang==="fr" ? "Pas encore de données." : "No data yet."}</p>`}
    </div>
  </section>`;
}

async function syncAdminListing(l, removed=false){
  if(!(window.SB && SB.enabled() && state.user?.provider === "supabase")) return;
  try{
    if(removed && SB.deleteListing) await SB.deleteListing(l.id);
    else if(SB.updateListing) await SB.updateListing(l);
  }catch(e){ console.warn("[admin sync]", e); }
}

function refreshAdmin(){
  persistState();
  render();
  renderAdmin(adminTab);
}

async function toggleFeaturedAdmin(id){
  const l = L.find(x=>String(x.id) === String(id));
  if(!l) return;
  l.feat = !l.feat;
  if(l.feat && !l.boosted) l.boosted = true;
  await syncAdminListing(l);
  if(canUseSupabaseAdmin() && SB.logAdminEvent) await SB.logAdminEvent(l.feat ? "feature_listing" : "unfeature_listing", "listing", id, {});
  refreshAdmin();
}

async function markListingStatusAdmin(id, status){
  const l = L.find(x=>String(x.id) === String(id));
  if(!l) return;
  l.sold = status === "sold";
  l.reserved = status === "reserved";
  if(canUseSupabaseAdmin() && SB.adminSetListingStatus){
    const row = await SB.adminSetListingStatus(id, status);
    if(row) Object.assign(l, row);
  } else {
    await syncAdminListing(l);
    if(canUseSupabaseAdmin() && SB.logAdminEvent) await SB.logAdminEvent("mark_listing_status", "listing", id, {status});
  }
  refreshAdmin();
}

async function removeListingAdmin(id){
  const index = L.findIndex(x=>String(x.id) === String(id));
  if(index < 0) return;
  const [removed] = L.splice(index, 1);
  userListings = userListings.filter(x=>String(x.id) !== String(id));
  adminReports = adminReports.map(r=>String(r.listingId) === String(id) ? {...r,status:"resolved"} : r);
  await syncAdminListing(removed, true);
  if(canUseSupabaseAdmin() && SB.logAdminEvent) await SB.logAdminEvent("remove_listing", "listing", id, {});
  refreshAdmin();
}

async function resolveReportAdmin(id){
  if(canUseSupabaseAdmin() && SB.resolveReport){
    const row = await SB.resolveReport(id);
    if(row) adminReports = adminReports.map(r=>String(r.id) === String(id) ? reportFromRow(row) : r);
  } else {
    adminReports = adminReports.map(r=>r.id === id ? {...r,status:"resolved",resolvedAt:new Date().toISOString()} : r);
  }
  refreshAdmin();
}

async function toggleBanUser(id){
  const key = String(id);
  if(canUseSupabaseAdmin()){
    if(!isUuid(key)){
      showToast(state.lang==="fr" ? "Utilisateur Supabase requis." : "Supabase user required.");
      return;
    }
    if(adminBanned.includes(key)){
      const ok = SB.unbanUser ? await SB.unbanUser(key) : false;
      if(ok) adminBanned = adminBanned.filter(x=>x!==key);
    } else {
      const row = SB.banUser ? await SB.banUser(key) : null;
      if(row) adminBanned = [...adminBanned, key];
    }
  } else {
    adminBanned = adminBanned.includes(key) ? adminBanned.filter(x=>x!==key) : [...adminBanned, key];
  }
  refreshAdmin();
}

async function toggleAdminRole(id){
  const key = String(id);
  if(canUseSupabaseAdmin()){
    if(!isUuid(key)){
      showToast(state.lang==="fr" ? "Utilisateur Supabase requis." : "Supabase user required.");
      return;
    }
    const user = adminProfiles.find(u=>String(u.id) === key);
    const nextRole = user?.role === "admin" ? "user" : "admin";
    const row = SB.updateUserRole ? await SB.updateUserRole(key, nextRole) : null;
    if(row){
      adminProfiles = adminProfiles.map(u=>String(u.id) === key ? profileFromRow(row) : u);
      if(String(state.user?.id) === key) state.user.role = row.role || nextRole;
    }
  } else {
    const user = Object.values(usersByEmail).find(u=>String(u.id) === key);
    if(user){
      user.role = user.role === "admin" ? "user" : "admin";
      usersByEmail[(user.email || "").toLowerCase()] = user;
    }
  }
  refreshAdmin();
}

async function toggleCategoryAdmin(id){
  adminCategoryStatus[id] = {hidden:!adminCategoryStatus[id]?.hidden};
  if(state.cat === id && adminCategoryStatus[id].hidden) state.cat = "all";
  if(canUseSupabaseAdmin() && SB.saveAdminSettings) await SB.saveAdminSettings("category_status", adminCategoryStatus);
  buildCats();
  buildFilters();
  refreshAdmin();
}

function openPostModal(){
  if(!state.user){
    requireAccount("post");
    return;
  }
  if(state.user.accountType === "business" && !hasActiveProSubscription(state.user)){
    showToast(t().proPostBlocked);
    openPaymentModal({existingUser:true, plan:state.user.accountPlan, after:"post"});
    return;
  }
  const limit = listingLimitFor(state.user);
  if(Number.isFinite(limit) && publicationUsageCountFor(state.user) >= limit){
    showToast(publicationLimitMessage(limit));
    if(state.user.accountType === "business") openPricingInfo();
    return;
  }
  editingListingId = null;
  buildPostForm();
  openModal("postModal");
  maybeOfferDraftRestore();
}

function setPostModalMode(isEditing){
  const title = document.getElementById("postTitle");
  const submit = document.getElementById("postSubmitBtn");
  if(title){
    title.textContent = isEditing
      ? (state.lang==="fr" ? "Modifier l'annonce" : "Edit listing")
      : (state.lang==="fr" ? "Déposer une annonce" : "Post an ad");
  }
  if(submit){
    submit.textContent = isEditing
      ? (state.lang==="fr" ? "Enregistrer les modifications" : "Save changes")
      : t().postSubmit;
  }
}

function openEditListing(id, e){
  if(e) e.stopPropagation();
  const listing = L.find(item=>idKey(item.id)===idKey(id));
  if(!listing || (!isOwnListing(listing) && !isAdminUser())){
    showToast(state.lang==="fr" ? "Vous ne pouvez modifier que vos propres annonces." : "You can only edit your own listings.");
    return;
  }
  editingListingId = listing.id;
  closeModal("detailModal");
  buildPostForm(listing);
  openModal("postModal");
}

/* ---- Cycle de vie d'une annonce, côté vendeur (pas admin) ---- */
function listingIsSold(l){
  return !!(l && (l.sold || l.status === "sold"));
}

function listingIsExpired(l){
  return !!(l && l.status === "expired");
}

function syncOwnListingPatch(id, patch){
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(l) Object.assign(l, patch);
  const u = userListings.find(x=>idKey(x.id)===idKey(id));
  if(u) Object.assign(u, patch);
  removeListingExpiryNotifications(id);
  return l;
}

async function confirmListingAvailable(id, e){
  if(e) e.stopPropagation();
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(!l || !isOwnListing(l)) return;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LISTING_ACTIVE_DAYS * 86400000).toISOString();
  const patch = {
    sold:false,
    reserved:false,
    status:"active",
    expiresAt,
    renewalRequestedAt:null,
    renewalResponseAt:now.toISOString(),
    expiredAt:null
  };
  syncOwnListingPatch(id, patch);
  try{
    if(window.SB && SB.enabled() && state.user?.provider === "supabase"){
      const updated = SB.confirmListingAvailable
        ? await SB.confirmListingAvailable(id)
        : (SB.updateListing ? await SB.updateListing({...l, ...patch}) : null);
      if(updated) syncOwnListingPatch(id, updated);
    }
  }catch(err){ console.warn("[confirm available]", err); }
  persistState();
  render();
  closeNotifPanel();
  showToast(state.lang==="fr" ? "Annonce gardée en ligne pour 14 jours." : "Listing kept online for 14 days.");
}

async function setOwnListingSold(id, sold, e){
  if(e) e.stopPropagation();
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(!l || !isOwnListing(l)) return;
  l.sold = !!sold;
  l.reserved = false;
  l.status = sold ? "sold" : "active";
  const u = userListings.find(x=>idKey(x.id)===idKey(id));
  if(u){ u.sold = l.sold; u.reserved = false; u.status = l.status; }
  removeListingExpiryNotifications(id);
  try{
    if(window.SB && SB.enabled() && state.user?.provider === "supabase" && SB.updateListing) await SB.updateListing(l);
  }catch(err){ console.warn("[sold]", err); }
  persistState();
  render();
  if(document.querySelector("#detailModal.open")) openListing(l.id, false);
  if(sold){
    const limit = listingLimitFor(state.user);
    const left = Number.isFinite(limit) ? Math.max(0, limit - activeUserListingCount()) : null;
    showToast(left === null
      ? (state.lang==="fr" ? "Marqué comme vendu." : "Marked as sold.")
      : (state.lang==="fr" ? `Vendu ! Il vous reste ${left} annonce(s).` : `Sold! You have ${left} listing(s) left.`));
  }else{
    showToast(state.lang==="fr" ? "Remis en vente." : "Relisted.");
  }
}

async function deleteOwnListing(id, e){
  if(e) e.stopPropagation();
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(!l || !isOwnListing(l)) return;
  const ok = window.confirm(state.lang==="fr"
    ? "Supprimer définitivement cette annonce ? Pour une vente terminée, préférez « Marquer comme vendu »."
    : "Permanently delete this listing? For a completed sale, use “Mark as sold” instead.");
  if(!ok) return;
  const idx = L.findIndex(x=>idKey(x.id)===idKey(id));
  if(idx >= 0) L.splice(idx, 1);
  userListings = userListings.filter(x=>idKey(x.id)!==idKey(id));
  state.favs.delete(idKey(id));
  removeListingExpiryNotifications(id);
  try{
    if(window.SB && SB.enabled() && state.user?.provider === "supabase" && SB.deleteListing) await SB.deleteListing(id);
  }catch(err){ console.warn("[delete listing]", err); }
  persistState();
  closeModal("detailModal");
  render();
  showToast(state.lang==="fr" ? "Annonce supprimée." : "Listing deleted.");
}

// "Sold" from the 2-week renewal reminder: unlike the general "mark as
// sold" toggle elsewhere (which just tags status=sold and keeps it
// visible), confirming a sale from the reminder removes the listing
// outright — the whole point of the reminder is to keep sold items off
// the site instead of accumulating.
async function markSoldAndRemove(id, e){
  if(e) e.stopPropagation();
  const l = L.find(x=>idKey(x.id)===idKey(id));
  if(!l || !isOwnListing(l)) return;
  const idx = L.findIndex(x=>idKey(x.id)===idKey(id));
  if(idx >= 0) L.splice(idx, 1);
  userListings = userListings.filter(x=>idKey(x.id)!==idKey(id));
  state.favs.delete(idKey(id));
  removeListingExpiryNotifications(id);
  try{
    if(window.SB && SB.enabled() && state.user?.provider === "supabase" && SB.deleteListing) await SB.deleteListing(id);
  }catch(err){ console.warn("[sold+remove]", err); }
  persistState();
  closeModal("detailModal");
  closeNotifPanel();
  render();
  showToast(state.lang==="fr" ? "Vendu — annonce retirée du site." : "Sold — listing removed from the site.");
}

function ownerActionBarHTML(l){
  if(!isOwnListing(l)) return "";
  const p = idKey(l.id);
  const sold = listingIsSold(l);
  return `<div class="owner-bar" data-click="stopEventPropagation" data-click-args='${dataArgs(["__EVENT__"])}'>
    <span class="owner-bar-tag">${state.lang==="fr" ? "Votre annonce" : "Your listing"}</span>
    ${sold
      ? `<button type="button" class="owner-btn" data-click="setOwnListingSold" data-click-args='${dataArgs([p, false, "__EVENT__"])}'>${state.lang==="fr" ? "Remettre en vente" : "Relist"}</button>`
      : `<button type="button" class="owner-btn sold" data-click="setOwnListingSold" data-click-args='${dataArgs([p, true, "__EVENT__"])}'>${state.lang==="fr" ? "Marquer comme vendu" : "Mark as sold"}</button>`}
    <button type="button" class="owner-btn" data-click="openEditListing" data-click-args='${dataArgs([p, "__EVENT__"])}'>${state.lang==="fr" ? "Modifier" : "Edit"}</button>
    <button type="button" class="owner-btn danger" data-click="deleteOwnListing" data-click-args='${dataArgs([p, "__EVENT__"])}'>${state.lang==="fr" ? "Supprimer" : "Delete"}</button>
  </div>`;
}

Object.assign(window, { confirmListingAvailable, setOwnListingSold, deleteOwnListing });

function selectAccountPlan(plan, btn){
  const type = plan === "personal-free" ? "personal" : "business";
  const accountType = document.getElementById("accountType");
  const accountPlan = document.getElementById("accountPlan");
  if(accountType) accountType.value = type;
  if(accountPlan) accountPlan.value = plan;
  document.querySelectorAll(".plan-card").forEach(card=>card.setAttribute("aria-pressed", card===btn));
  const submit = document.querySelector("#accountModal .auth-card button[type=submit]");
  if(submit) submit.textContent = isPaidPlan(plan) ? t().continueToPayment : t().accountSubmit;
  toggleBusinessFields(type);
}

function toggleBusinessFields(type){
  const field = document.getElementById("businessNameField");
  const input = document.getElementById("businessName");
  const extra = document.getElementById("businessExtraFields");
  const isBusiness = type === "business";
  if(field) field.hidden = !isBusiness;
  if(input) input.required = isBusiness;
  if(extra) extra.classList.toggle("show", isBusiness);
}

async function hashPassword(value){
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

/* ---- Supabase auth : projette l'identité Supabase dans state.user ----
   Toute l'app lit state.user ; on garde donc exactement la même forme,
   qu'on vienne d'un compte local (démo) ou de Supabase. Le champ
   `provider:"supabase"` sert à savoir quelle session déconnecter. */
async function applySupabaseUser(sbUser){
  if(!sbUser) return null;
  let profile = null;
  try { profile = await SB.fetchProfile(sbUser.id); } catch(e){}
  const meta = sbUser.user_metadata || {};
  const identityData = (sbUser.identities && sbUser.identities[0] && sbUser.identities[0].identity_data) || {};
  // Google/Apple renvoient la photo de profil sous des noms différents selon
  // l'endroit où Supabase l'expose (user_metadata ou identities bruts).
  const oauthAvatar = meta.avatar_url || meta.picture || identityData.avatar_url || identityData.picture || null;
  if(!profile && window.SB && SB.enabled()){
    try {
      profile = await SB.upsertProfile({
        name: meta.name || (sbUser.email || "").split("@")[0],
        account_type: meta.account_type || "personal",
        account_plan: meta.account_plan || "personal-free",
        business_name: meta.business_name || null,
        phone: meta.phone || null,
        avatar_url: oauthAvatar
      });
    } catch(e){}
  } else if(profile && !profile.avatar_url && oauthAvatar && window.SB && SB.enabled()){
    // Compte existant sans photo : on récupère celle du fournisseur OAuth une
    // seule fois. Ne s'exécute jamais si l'utilisateur a déjà choisi une photo.
    try { profile = (await SB.upsertProfile({ avatar_url: oauthAvatar })) || profile; } catch(e){}
  }
  const accountType = (profile && profile.account_type) || meta.account_type || "personal";
  state.user = normalizeUser({
    id: sbUser.id,
    provider: "supabase",
    email: sbUser.email || "",
    name: (profile && profile.name) || meta.name || (sbUser.email || "").split("@")[0],
    accountType,
    accountPlan: (profile && profile.account_plan) || (accountType === "business" ? "pro-starter" : "personal-free"),
    subscriptionStatus: (profile && profile.subscription_status) || (accountType === "business" ? "inactive" : "free"),
    subscriptionStarted: profile && profile.subscription_started,
    subscriptionCurrentPeriodEnd: profile && profile.subscription_current_period_end,
    subscriptionCancelAtPeriodEnd: profile && profile.subscription_cancel_at_period_end,
    stripeCustomerId: profile && profile.stripe_customer_id,
    businessName: (profile && profile.business_name) || "",
    businessPhone: (profile && profile.phone) || "",
    role: (profile && profile.role) || "user",
    avatarUrl: (profile && profile.avatar_url) || oauthAvatar || null
  });
  persistState();
  return state.user;
}

async function createAccount(e){
  e.preventDefault();
  const email = document.getElementById("accountEmail").value.trim();
  const key = email.toLowerCase();
  const password = document.getElementById("accountPassword").value;
  const confirmation = document.getElementById("accountPasswordConfirm").value;
  const error = document.getElementById("createAccountError");
  const accountType = document.getElementById("accountType").value;
  const accountPlan = document.getElementById("accountPlan").value;
  const businessName = accountType === "business" ? document.getElementById("businessName")?.value.trim() || "" : "";
  const businessPhone = accountType === "business" ? document.getElementById("businessPhone")?.value.trim() || "" : "";
  const businessWhatsapp = accountType === "business" ? document.getElementById("businessWhatsapp")?.value.trim() || "" : "";
  const businessWebsite = accountType === "business" ? document.getElementById("businessWebsite")?.value.trim() || "" : "";
  const businessLogo = accountType === "business" ? document.getElementById("businessLogo")?.value.trim() || "" : "";
  const useSupabase = !!(window.SB && SB.enabled());
  if(!useSupabase && usersByEmail[key]){
    error.textContent = t().emailExists;
    return false;
  }
  if(password !== confirmation){
    error.textContent = t().passwordMismatch;
    return false;
  }

  // Create the real account before opening the selected paid plan.
  if(useSupabase){
    const signupPlan = "personal-free";
    if(isPaidPlan(accountPlan)) sessionStorage.setItem("bst-selected-pro-plan", accountPlan);
    const name = document.getElementById("accountName").value.trim();
    const { data, error: sbErr } = await SB.signUp(email, password, {
      name,
      account_type: accountType,
      account_plan: signupPlan,
      business_name: businessName, phone: businessPhone
    });
    if(sbErr){
      // Do not reveal whether an address is already registered.
      error.textContent = state.lang === "fr" ? "Si cette adresse peut être utilisée, vérifiez votre email pour continuer." : "If this address can be used, check your email to continue.";
      return false;
    }
    if(data && data.session && data.user){
      await SB.upsertProfile({ name, account_type: accountType, business_name: businessName, phone: businessPhone });
      await applySupabaseUser(data.user);
      showToast(state.lang==="fr" ? "Compte créé" : "Account created");
      e.target.reset();
      selectAccountPlan("personal-free", document.querySelector(".plan-card"));
      completeAuth();
    } else {
      // Confirmation email activée : on garde l'email en attente et on
      // bascule le formulaire sur la saisie du code reçu par email.
      error.textContent = "";
      pendingSignupOtp = { email, name, accountType, accountPlan: signupPlan };
      document.getElementById("signupFields").hidden = true;
      document.getElementById("signupSubmitRow").hidden = true;
      document.getElementById("signupOtpStep").hidden = false;
      document.getElementById("signupOtpError").textContent = "";
      document.getElementById("signupOtpCode").value = "";
      document.getElementById("signupOtpCode").focus();
    }
    return false;
  }

  if(isPaidPlan(accountPlan)){
    error.textContent = "";
    pendingProSignup = {
      name:document.getElementById("accountName").value.trim(),
      email,
      key,
      accountType:"business",
      accountPlan,
      businessName,
      businessPhone,
      businessWhatsapp,
      businessWebsite,
      businessLogo,
      password,
      passwordHash:await hashPassword(password)
    };
    openPaymentModal({plan:accountPlan});
    return false;
  }
  state.user = normalizeUser(createUserProfile({
    name:document.getElementById("accountName").value.trim(),
    email,
    accountType,
    accountPlan,
    businessName,
    businessPhone,
    businessWhatsapp,
    businessWebsite,
    businessLogo
  }));
  state.user.passwordHash = await hashPassword(password);
  usersByEmail[key] = state.user;
  persistState();
  showToast(state.lang==="fr" ? "Compte créé" : "Account created");
  e.target.reset();
  selectAccountPlan("personal-free", document.querySelector(".plan-card"));
  completeAuth();
  return false;
}

async function confirmDemoPayment(e){
  e.preventDefault();
  if(window.SXM && SXM.isIOS()){
    const plan = pendingSelectedProPlan || state.user?.accountPlan;
    if(await SXM.buy(plan)){ closeModal("paymentModal"); closeModal("accountModal"); showToast(t().paymentSuccess); }
    return false;
  }
  if(pendingProSignup){
    // Paiement démo local. Le vrai compte Pro Supabase doit passer par Stripe
    // ou une fonction serveur avant d'ecrire subscription_status en base.
    if(window.SB && SB.enabled() && window.ENABLE_SUPABASE_PAID_SIGNUP){
      const p = pendingProSignup;
      const { data, error: sbErr } = await SB.signUp(p.email, p.password, {
        name: p.name,
        account_type: "business",
        account_plan: p.accountPlan,
        business_name: p.businessName || null,
        phone: p.businessPhone || null
      });
      if(sbErr){
        document.getElementById("createAccountError").textContent = sbErr.message || t().emailExists;
        closeModal("paymentModal");
        return false;
      }
      pendingProSignup = null;
      showToast(t().paymentSuccess);
      const card = document.querySelector("#accountModal .auth-card");
      if(card) card.reset();
      selectAccountPlan("personal-free", document.querySelector(".plan-card"));
      closeModal("paymentModal");
      if(data && data.session && data.user){
        await SB.upsertProfile({
          name: p.name,
          account_type: "business",
          account_plan: p.accountPlan,
          business_name: p.businessName || null,
          business_phone: p.businessPhone || null,
          business_whatsapp: p.businessWhatsapp || null,
          business_website: p.businessWebsite || null,
          business_logo: p.businessLogo || null,
          subscription_status: "active",
          subscription_started: new Date().toISOString()
        });
        await applySupabaseUser(data.user);
        state.user.subscriptionStatus = "active";
        persistState();
        completeAuth();
      } else {
        closeModal("accountModal");
        showToast(state.lang==="fr"
          ? "Compte Pro créé - confirmez votre email puis connectez-vous."
          : "Pro account created - confirm your email, then sign in.");
      }
      return false;
    }
    if(usersByEmail[pendingProSignup.key]){
      document.getElementById("createAccountError").textContent = t().emailExists;
      closeModal("paymentModal");
      return false;
    }
    state.user = normalizeUser(createUserProfile(pendingProSignup));
    state.user.passwordHash = pendingProSignup.passwordHash;
    state.user.subscriptionStatus = "active";
    state.user.subscriptionStarted = new Date().toISOString();
    usersByEmail[pendingProSignup.key] = state.user;
    pendingProSignup = null;
    persistState();
    showToast(t().paymentSuccess);
    document.querySelector("#accountModal .auth-card").reset();
    selectAccountPlan("personal-free", document.querySelector(".plan-card"));
    closeModal("paymentModal");
    completeAuth();
    return false;
  }
  if(pendingPaymentExistingUser && state.user){
    state.user = normalizeUser(state.user);
    state.user.accountType = "business";
    state.user.accountPlan = pendingSelectedProPlan || state.user.accountPlan || "pro-starter";
    state.user.subscriptionStatus = "active";
    state.user.subscriptionStarted = new Date().toISOString();
    if(window.SB && SB.enabled() && state.user.provider === "supabase"){
      await SB.upsertProfile({
        account_type:"business",
        account_plan:state.user.accountPlan,
        subscription_status:"active",
        subscription_started:state.user.subscriptionStarted
      });
    }
    usersByEmail[state.user.email.toLowerCase()] = state.user;
    persistState();
    await applyAutomaticIncludedBoosts();
    showToast(t().paymentSuccess);
    closeModal("paymentModal");
    const next = pendingAfterPayment;
    pendingPaymentExistingUser = false;
    pendingAfterPayment = null;
    pendingSelectedProPlan = null;
    render();
    if(next === "post") openPostModal();
  }
  return false;
}

async function socialAuth(provider){
  const providerLabels = {google:"Google", apple:"Apple"};
  if(!providerLabels[provider]){
    showToast(state.lang==="fr" ? "Ce mode de connexion n'est pas disponible." : "This sign-in method is not available.");
    return;
  }
  if(!(window.SB && SB.enabled())){
    showToast(state.lang==="fr" ? "Connexion sociale indisponible hors ligne." : "Social login unavailable offline.");
    return;
  }
  const enabledProviders = window.SUPABASE_OAUTH_PROVIDERS || {};
  if(!enabledProviders[provider]){
    const providerName = providerLabels[provider];
    showToast(state.lang==="fr"
      ? `${providerName} login doit d'abord être activé dans Supabase.`
      : `${providerName} login must be enabled in Supabase first.`);
    return;
  }
  const { error } = await SB.signInWithOAuth(provider);
  if(error) showToast(error.message || (state.lang==="fr" ? "Connexion impossible." : "Could not sign in."));
  // succès: Supabase redirige vers ce même onglet; onAuthChange() reprend la main au retour.
}

function startProSocialAuth(provider){
  sessionStorage.setItem("bst-auth-intent", "pro");
  sessionStorage.setItem("bst-auth-provider", provider);
  socialAuth(provider);
}

function startProGoogleAuth(){
  startProSocialAuth("google");
}

function continuePendingProGoogle(){
  if(sessionStorage.getItem("bst-auth-intent") !== "pro") return;
  const provider = sessionStorage.getItem("bst-auth-provider") || "google";
  const providerName = provider === "apple" ? "Apple" : "Google";
  sessionStorage.removeItem("bst-auth-intent");
  sessionStorage.removeItem("bst-auth-provider");
  closeModal("accountModal");
  openPricingInfo();
  showToast(state.lang === "fr" ? `Compte ${providerName} connecté. Choisissez maintenant votre abonnement Pro.` : `${providerName} account connected. Now choose your Pro subscription.`);
}

function continueSelectedProPlan(){
  const plan = sessionStorage.getItem("bst-selected-pro-plan");
  if(!plan || !ACCOUNT_PLANS[plan]) return;
  sessionStorage.removeItem("bst-selected-pro-plan");
  openPaymentModal({existingUser:true, plan});
}

async function confirmSignupCode(){
  if(!pendingSignupOtp) return;
  const code = document.getElementById("signupOtpCode").value.trim();
  const otpError = document.getElementById("signupOtpError");
  if(!code){ otpError.textContent = t().otpInvalid; return; }
  const { data, error } = await SB.verifyOtp(pendingSignupOtp.email, code);
  if(error || !(data && data.session && data.user)){
    otpError.textContent = (error && error.message) || t().otpInvalid;
    return;
  }
  const { name, accountType, accountPlan } = pendingSignupOtp;
  await SB.upsertProfile({ name, account_type: accountType, account_plan: accountPlan });
  await applySupabaseUser(data.user);
  pendingSignupOtp = null;
  showToast(t().otpConfirmed);
  const form = document.getElementById("signupOtpStep").closest("form");
  if(form) form.reset();
  document.getElementById("signupFields").hidden = false;
  document.getElementById("signupSubmitRow").hidden = false;
  document.getElementById("signupOtpStep").hidden = true;
  selectAccountPlan("personal-free", document.querySelector(".plan-card"));
  completeAuth();
}

async function resendSignupCode(){
  if(!pendingSignupOtp) return;
  const otpError = document.getElementById("signupOtpError");
  const { error } = await SB.resendSignupOtp(pendingSignupOtp.email);
  otpError.textContent = error ? (error.message || t().otpInvalid) : "";
  if(!error) showToast(t().otpResent);
}

async function loginAccount(e){
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const key = email.toLowerCase();
  const error = document.getElementById("loginError");
  const password = document.getElementById("loginPassword").value;

  if(window.SB && SB.enabled()){
    const { data, error: sbErr } = await SB.signIn(email, password);
    if(!sbErr && data && data.user){
      await applySupabaseUser(data.user);
      showToast(t().loginToast);
      e.target.reset();
      completeAuth();
      return false;
    }
    if(isLocalDevHost() && ADMIN_EMAILS.has(key)){
      state.user = createLocalAdminUser(key);
      usersByEmail[key] = state.user;
      persistState();
      showToast(t().loginToast);
      e.target.reset();
      completeAuth();
      return false;
    }
    // Pas de compte Supabase correspondant : on retombe sur les comptes
    // démo locaux (utile pour les comptes Pro créés avant la migration).
    if(!usersByEmail[key]){
      error.textContent = (sbErr && sbErr.message) || t().invalidLogin;
      return false;
    }
  }

  const existing = usersByEmail[key];
  if(!existing){
    error.textContent = t().invalidLogin;
    return false;
  }
  const passwordHash = await hashPassword(document.getElementById("loginPassword").value);
  if(existing.passwordHash && existing.passwordHash !== passwordHash){
    error.textContent = t().invalidLogin;
    return false;
  }
  state.user = normalizeUser(existing);
  if(!state.user.passwordHash) state.user.passwordHash = passwordHash;
  usersByEmail[key] = state.user;
  persistState();
  showToast(t().loginToast);
  e.target.reset();
  completeAuth();
  return false;
}

function buildPostForm(listing=null){
  const form = document.getElementById("postForm");
  if(form) form.reset();
  selectedPostPhotos = listing?.photos ? [...listing.photos] : [];
  selectedPostFiles = [];
  document.getElementById("photoPreview").innerHTML = "";
  document.getElementById("newPhotos").value = "";
  wirePostFormEvents();
  document.getElementById("newCat").innerHTML = CATS.filter(c=>c.id!=="all").map(c=>
    `<option value="${c.id}">${c[state.lang]}</option>`).join("");
  document.getElementById("newCond").innerHTML = CONDS.map(c=>
    `<option value="${c.id}">${c[state.lang]}</option>`).join("");
  buildPostSubcats();
  buildPostAreas();
  buildVehicleSelectors();
  if(listing) fillPostForm(listing);
  applyPostFieldProfile();
  renderPhotoPreview();
  setPostModalMode(!!listing);
}

function fillPostForm(l){
  document.getElementById("newTitle").value = l.t || "";
  document.getElementById("newCat").value = l.cat || "autres";
  buildPostSubcats();
  if(l.sub && !document.getElementById("newSubcatField").hidden) document.getElementById("newSubcat").value = l.sub;
  buildPostAreas();
  if(l.area) document.getElementById("newArea").value = l.area;
  syncPostSideFromArea();
  applyPostFieldProfile();
  if(document.getElementById("newPrice")) document.getElementById("newPrice").value = l.price || (l.cur === "usd" ? l.usd : l.eur) || "";
  if(document.getElementById("newCur")) document.getElementById("newCur").value = l.cur || (l.side === "nl" ? "usd" : "eur");
  if(l.cond && document.getElementById("newCond")) document.getElementById("newCond").value = l.cond;
  document.getElementById("newNegotiable").checked = !!l.negotiable;
  document.getElementById("newUrgent").checked = !!l.urgent;
  document.getElementById("newSafeMeet").checked = l.safeMeet !== false;
  document.getElementById("newDesc").value = l.desc || "";
  if(l.vehicle){
    document.getElementById("newVehicleYear").value = l.vehicle.year || "";
    document.getElementById("newVehicleKm").value = l.vehicle.km || "";
    document.getElementById("newVehicleColor").value = l.vehicle.color || "";
    document.getElementById("newVehicleFuel").value = l.vehicle.fuel || "gas";
    document.getElementById("newVehicleTransmission").value = l.vehicle.transmission || "automatic";
  }
}

function wirePostFormEvents(){
  if(window.__postFormEventsWired) return;
  window.__postFormEventsWired = true;
  document.getElementById("newCat")?.addEventListener("change", buildPostSubcats);
  document.getElementById("newSubcat")?.addEventListener("change", handlePostSubcatChange);
  document.getElementById("newArea")?.addEventListener("change", syncPostSideFromArea);
  const form = document.getElementById("postForm");
  if(form){
    form.addEventListener("input", scheduleDraftSave);
    form.addEventListener("change", scheduleDraftSave);
  }
}

/* ---------------- OFFLINE DRAFT (post flow) ----------------
 * Autosaves the in-progress listing (fields + compressed photos) to IndexedDB
 * so a dropped connection or a closed tab doesn't lose the work. Only for NEW
 * listings — never while editing an existing one. */
let draftSaveTimer = null;

function collectPostDraft(){
  const g = id => document.getElementById(id);
  return {
    t: g("newTitle")?.value || "",
    cat: g("newCat")?.value || "",
    sub: g("newSubcatField")?.hidden ? "" : (g("newSubcat")?.value || ""),
    area: g("newArea")?.value || "",
    price: g("newPrice") ? g("newPrice").value : "",
    cur: g("newCur")?.value || "",
    cond: g("newCond") ? g("newCond").value : "",
    negotiable: !!g("newNegotiable")?.checked,
    urgent: !!g("newUrgent")?.checked,
    safeMeet: !!g("newSafeMeet")?.checked,
    desc: g("newDesc")?.value || "",
    vehicle: g("newVehicleYear") ? {
      year: g("newVehicleYear").value, km: g("newVehicleKm").value,
      color: g("newVehicleColor").value, fuel: g("newVehicleFuel").value,
      transmission: g("newVehicleTransmission").value
    } : null,
    photos: Array.isArray(selectedPostPhotos) ? [...selectedPostPhotos] : []
  };
}

function draftHasContent(d){
  return !!(d && ((d.t && d.t.trim()) || (d.desc && d.desc.trim()) ||
    (d.price && String(d.price).trim()) || (d.photos && d.photos.length)));
}

function scheduleDraftSave(){
  if(editingListingId || !window.Drafts || !Drafts.enabled) return;
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(()=>{
    const d = collectPostDraft();
    if(draftHasContent(d)) Drafts.save(d);
  }, 700);
}

function maybeOfferDraftRestore(){
  const bar = document.getElementById("postDraftBar");
  if(!bar) return;
  bar.hidden = true;
  if(editingListingId || !window.Drafts || !Drafts.enabled) return;
  Drafts.peek().then(meta=>{
    if(!meta) return;
    const resume = document.getElementById("postDraftResume");
    const discard = document.getElementById("postDraftDiscard");
    const msg = document.getElementById("postDraftMsg");
    if(resume) resume.textContent = state.lang==="fr" ? "Reprendre" : "Resume";
    if(discard) discard.textContent = state.lang==="fr" ? "Supprimer" : "Discard";
    if(msg) msg.textContent = (state.lang==="fr"
      ? "Brouillon non publié — enregistré "
      : "Unpublished draft — saved ") + draftAgeText(meta.savedAt);
    bar.hidden = false;
  });
}

function draftAgeText(ts){
  const mins = Math.max(0, Math.round((Date.now() - (ts||0)) / 60000));
  if(mins < 1) return state.lang==="fr" ? "à l'instant" : "just now";
  if(mins < 60) return state.lang==="fr" ? `il y a ${mins} min` : `${mins} min ago`;
  const h = Math.round(mins/60);
  if(h < 24) return state.lang==="fr" ? `il y a ${h} h` : `${h}h ago`;
  const dys = Math.round(h/24);
  return state.lang==="fr" ? `il y a ${dys} j` : `${dys}d ago`;
}

async function restoreSavedDraft(){
  if(!window.Drafts) return;
  const d = await Drafts.load();
  const bar = document.getElementById("postDraftBar");
  if(bar) bar.hidden = true;
  if(!d) return;
  fillPostForm(d);
  selectedPostPhotos = Array.isArray(d.photos) ? [...d.photos] : [];
  selectedPostFiles = [];
  renderPhotoPreview();
  if(selectedPostPhotos.length && Drafts.dataUrlToFile){
    Promise.all(selectedPostPhotos.map((u,i)=>Drafts.dataUrlToFile(u, `photo-${i+1}.jpg`)))
      .then(files=>{ selectedPostFiles = files.filter(Boolean); });
  }
  showToast(state.lang==="fr" ? "Brouillon restauré" : "Draft restored");
}

function dismissSavedDraft(){
  const bar = document.getElementById("postDraftBar");
  if(bar) bar.hidden = true;
  if(window.Drafts) Drafts.clear();
}

function clearPostDraft(){
  clearTimeout(draftSaveTimer);
  if(window.Drafts) Drafts.clear();
}

function buildPostSubcats(){
  const cat = document.getElementById("newCat").value;
  const field = document.getElementById("newSubcatField");
  const select = document.getElementById("newSubcat");
  const data = SUBCATS[cat];
  field.hidden = !data;
  select.required = !!data;
  select.innerHTML = data ? data.groups.map(group=>`<optgroup label="${group[state.lang]}">
    ${group.items.map(item=>`<option value="${item.id}">${item[state.lang]}</option>`).join("")}
  </optgroup>`).join("") : "";
  buildPostAreas();
  applyPostFieldProfile();
}

function handlePostSubcatChange(){
  buildPostAreas();
  applyPostFieldProfile();
}

function setPostFieldVisibility(fieldId, visible, requiredControlId){
  const field = document.getElementById(fieldId);
  if(!field) return;
  field.hidden = !visible;
  field.querySelectorAll("input,select,textarea").forEach(control=>{
    control.disabled = !visible;
    control.required = visible && control.id === requiredControlId;
  });
}

function setPostOptionVisibility(optionId, controlId, visible){
  const option = document.getElementById(optionId);
  const control = document.getElementById(controlId);
  if(option) option.hidden = !visible;
  if(control) control.disabled = !visible;
}

function applyPostFieldProfile(){
  const cat = document.getElementById("newCat")?.value || "";
  const sub = document.getElementById("newSubcatField")?.hidden ? "" : document.getElementById("newSubcat")?.value || "";
  const profile = postFieldProfile(cat, sub);
  refreshPostAreasForProfile(profile);
  setPostFieldVisibility("postPhotosField", profile.photos);
  setPostFieldVisibility("postPriceField", profile.price, "newPrice");
  setPostFieldVisibility("postCurrencyField", profile.price);
  setPostFieldVisibility("postConditionField", profile.condition, "newCond");
  setPostOptionVisibility("postNegotiableOption", "newNegotiable", profile.negotiable);
  setPostOptionVisibility("postUrgentOption", "newUrgent", profile.urgent);
  setPostOptionVisibility("postSafeMeetOption", "newSafeMeet", profile.safeMeet);
  document.getElementById("postOptionsField").hidden = !(profile.negotiable || profile.urgent || profile.safeMeet);
  toggleVehicleFields(cat, sub);

  const service = !profile.price;
  document.getElementById("newTitle").placeholder = service
    ? (state.lang === "fr" ? "Ex: Plombier disponible à Marigot" : "Ex: Plumber available in Marigot")
    : t().titlePh;
  document.getElementById("newDesc").placeholder = service
    ? (state.lang === "fr" ? "Décrivez le service, vos disponibilités, votre expérience et la zone couverte." : "Describe the service, availability, experience, and area covered.")
    : t().descPh;
}

function refreshPostAreasForProfile(profile){
  const area = document.getElementById("newArea");
  if(!area) return;
  const current = area.value;
  area.innerHTML = postAreaOptions();
  const validValues = [...area.options].map(option=>option.value);
  if(validValues.includes(current)) area.value = current;
  syncPostSideFromArea();
}

function buildVehicleSelectors(){
  const fuel = document.getElementById("newVehicleFuel");
  const transmission = document.getElementById("newVehicleTransmission");
  if(fuel) fuel.innerHTML = vehicleFuelOptions().map(([id,label])=>`<option value="${id}">${label}</option>`).join("");
  if(transmission) transmission.innerHTML = vehicleTransmissionOptions().map(([id,label])=>`<option value="${id}">${label}</option>`).join("");
}

function toggleVehicleFields(cat, sub){
  const section = document.getElementById("vehicleFields");
  if(!section) return;
  const enabled = usesVehicleFields(cat, sub);
  section.hidden = !enabled;
  section.classList.toggle("show", enabled);
  section.querySelectorAll("input,select,textarea").forEach(el=>{
    el.required = enabled && ["newVehicleYear","newVehicleKm","newVehicleColor"].includes(el.id);
    if(!enabled) el.value = "";
  });
}

function postAreaOptions(){
  return `<optgroup label="${t().frSide}">${AREAS.fr.map(a=>`<option value="${a}">${a}</option>`).join("")}</optgroup>
    <optgroup label="${t().nlSide}">${AREAS.nl.map(a=>`<option value="${a}">${a}</option>`).join("")}</optgroup>`;
}

function syncPostSideFromArea(){
  const area = document.getElementById("newArea")?.value || "";
  const side = document.getElementById("newSide");
  if(!side) return;
  if(AREAS.fr.includes(area)) side.value = "fr";
  else if(AREAS.nl.includes(area)) side.value = "nl";
  else side.value = "";
}

function buildPostAreas(){
  const area = document.getElementById("newArea");
  const current = area.value;
  area.innerHTML = postAreaOptions();
  const allAreas = [...AREAS.fr, ...AREAS.nl];
  if(current && allAreas.includes(current)){
    area.value = current;
  } else if(allAreas.includes(state.area)){
    area.value = state.area;
  } else {
    area.value = AREAS.fr[0];
  }
  syncPostSideFromArea();
}

function deliveryLabel(v){
  const labels = {
    pickup:t().pickupOnly,
    delivery:t().deliveryPossible,
    meetup:t().meetupPossible
  };
  return labels[v] || "";
}

function meetupLabel(v){
  const labels = {
    public:t().publicMeetup,
    seller:t().sellerPlace,
    buyer:t().buyerPlace
  };
  return labels[v] || "";
}

async function handlePhotoUpload(e){
  const picked = [...e.target.files].filter(file=>file.type.startsWith("image/")).slice(0, 8);
  if(e.target.files.length > 8) showToast(t().tooManyPhotos);
  selectedPostPhotos = [];
  selectedPostFiles = [];
  const preview = document.getElementById("photoPreview");
  preview.innerHTML = "";
  if(!picked.length) return;
  // Compress/resize on-device before anything is stored or uploaded: keeps a
  // listing upload in the low-MB range instead of 30–90 MB from phone cameras.
  preview.innerHTML = `<p style="padding:12px 4px;color:var(--mute);font-size:13px">${state.lang==="fr" ? "Optimisation des photos…" : "Optimizing photos…"}</p>`;
  let results = null;
  try {
    if(window.ImgUtils) results = await ImgUtils.compressMany(picked, { maxEdge:1600, quality:0.82 });
  } catch(err){ console.warn("[post] compression KO, envoi des originaux:", err); }
  if(results){
    selectedPostFiles = results.map(r=>r.file);
    selectedPostPhotos = results.map(r=>r.dataUrl);
  } else {
    selectedPostFiles = picked;
    selectedPostPhotos = await Promise.all(picked.map(file => new Promise(resolve=>{
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    })));
  }
  renderPhotoPreview();
  scheduleDraftSave();
}

function renderPhotoPreview(){
  document.getElementById("photoPreview").innerHTML = selectedPostPhotos.map((src,i)=>`
    <figure>
      <img src="${src}" alt="Photo ${i+1}">
      <button type="button" class="photo-remove" data-click="removePostPhoto" data-click-args='${dataArgs([i])}' aria-label="${state.lang==="fr" ? "Supprimer la photo" : "Remove photo"}">x</button>
    </figure>`).join("");
}

function removePostPhoto(index){
  selectedPostPhotos.splice(index, 1);
  selectedPostFiles.splice(index, 1);
  renderPhotoPreview();
  scheduleDraftSave();
}

async function createListing(e){
  e.preventDefault();
  const editing = editingListingId ? L.find(item=>idKey(item.id)===idKey(editingListingId)) : null;
  if(editingListingId && (!editing || (!isOwnListing(editing) && !isAdminUser()))){
    showToast(state.lang==="fr" ? "Modification impossible." : "Could not edit this listing.");
    return false;
  }
  const listingLimit = listingLimitFor(state.user);
  if(!editing && Number.isFinite(listingLimit) && publicationUsageCountFor(state.user) >= listingLimit){
    showToast(publicationLimitMessage(listingLimit, true));
    closeModal("postModal");
    return false;
  }
  const cat = document.getElementById("newCat").value;
  const sub = document.getElementById("newSubcatField").hidden ? "" : document.getElementById("newSubcat").value;
  const profile = postFieldProfile(cat, sub);
  if(profile.photosRequired && !selectedPostPhotos.length){
    showToast(t().photoRequired);
    document.getElementById("newPhotos").focus();
    return false;
  }
  const cur = profile.price ? document.getElementById("newCur").value : (state.cur || "usd");
  const price = profile.price ? (parseFloat(document.getElementById("newPrice").value) || 0) : 0;
  const area = document.getElementById("newArea").value;
  const side = AREAS.nl.includes(area) ? "nl" : "fr";
  const vehicle = profile.vehicle ? {
    year:document.getElementById("newVehicleYear").value.trim(),
    km:document.getElementById("newVehicleKm").value.trim(),
    color:document.getElementById("newVehicleColor").value.trim(),
    fuel:document.getElementById("newVehicleFuel").value,
    transmission:document.getElementById("newVehicleTransmission").value,
    body:"",
    mechanical:"",
    docs:""
  } : null;
  const listing = {
    ...(editing || {}),
    id:editing ? editing.id : Date.now(),
    createdAt:editing?.createdAt || new Date().toISOString(),
    ownerId:editing?.ownerId || state.user.id,
    sellerId:editing?.sellerId || (state.user.provider === "supabase" ? state.user.id : undefined),
    sellerName:editing?.sellerName || state.user.name,
    t:document.getElementById("newTitle").value.trim(),
    cat, side, area,
    sub,
    cond:profile.condition ? document.getElementById("newCond").value : "",
    cur, price,
    eur:cur==="eur" ? price : Math.round(price * .92),
    usd:cur==="usd" ? price : Math.round(price * 1.08),
    delivery:null,
    meetup:null,
    negotiable:profile.negotiable && document.getElementById("newNegotiable").checked,
    safeMeet:profile.safeMeet && document.getElementById("newSafeMeet").checked,
    noPrice:!profile.price,
    salary:cat === "job",
    ph:0, pics:profile.photos ? selectedPostPhotos.length : 0,
    photos:profile.photos ? [...selectedPostPhotos] : [],
    desc:document.getElementById("newDesc").value.trim(),
    vehicle,
    pro:editing?.pro ?? hasActiveProSubscription(state.user),
    urgent:profile.urgent && document.getElementById("newUrgent").checked,
    feat:editing?.feat ?? true
  };

  // Supabase : upload des photos dans Storage puis insertion en base.
  // En cas d'échec on retombe sur l'annonce locale (data URL) sans bloquer.
  let published = null;
  if(window.SB && SB.enabled() && state.user && state.user.provider === "supabase"){
    const submitBtn = e.target.querySelector("button[type=submit]");
    if(submitBtn){ submitBtn.disabled = true; }
    try {
      const urls = profile.photos && selectedPostFiles.length ? await SB.uploadPhotos(selectedPostFiles) : [];
      if(urls.length) listing.photos = urls;
      published = editing ? await SB.updateListing(listing) : await SB.insertListing(listing);
    } catch(err){ console.warn("[post] Supabase KO, fallback local:", err); }
    if(submitBtn){ submitBtn.disabled = false; }
    if(editing && !published){
      showToast(state.lang==="fr" ? "Annonce non modifiée. Réessayez." : "Listing not updated. Please try again.");
      return false;
    }
  }

  const finalListing = published || listing;
  if(editing){
    const lIndex = L.findIndex(item=>idKey(item.id)===idKey(editing.id));
    if(lIndex >= 0) L[lIndex] = finalListing;
    const uIndex = userListings.findIndex(item=>idKey(item.id)===idKey(editing.id));
    if(uIndex >= 0) userListings[uIndex] = finalListing;
    else if(!published) userListings.unshift(finalListing);
    persistState();
  } else {
    // Add to local state regardless of local-fallback vs. real Supabase
    // publish — otherwise the profile's own-listings count and "My
    // listings" stay stale until the next full hydrate (e.g. re-login).
    userListings.unshift(finalListing);
    L.unshift(finalListing);
    persistState();
  }
  e.target.reset();
  selectedPostPhotos = [];
  selectedPostFiles = [];
  editingListingId = null;
  clearPostDraft();
  setPostModalMode(false);
  document.getElementById("photoPreview").innerHTML = "";
  closeModal("postModal");
  await applyAutomaticIncludedBoosts({silent:!hasActiveProSubscription(state.user)});
  render();
  showToast(editing ? (state.lang==="fr" ? "Annonce modifiée" : "Listing updated") : t().listingPublished);
  setTimeout(()=>openListing(finalListing.id), 250);
  return false;
}

/* ---------------- BUILDERS ---------------- */
function buildAreas(){
  const ogfr = document.getElementById("og-fr"), ognl = document.getElementById("og-nl");
  const all = document.querySelector("#area option[value='']");
  all.textContent = t().allIsland;
  ogfr.label = t().frSide;
  ognl.label = t().nlSide;
  ogfr.innerHTML = AREAS.fr.map(a=>`<option value="${a}">${a}</option>`).join("");
  ognl.innerHTML = AREAS.nl.map(a=>`<option value="${a}">${a}</option>`).join("");
}
function buildCats(){
  const visibleCats = CATS.filter(c=>c.id === "all" || !adminCategoryStatus[c.id]?.hidden);
  document.getElementById("catrail").innerHTML = visibleCats.map(c=>
    `<button type="button" class="cat" aria-pressed="${c.id===state.cat}" data-click="setCat" data-click-args='${dataArgs([c.id, "__THIS__"])}'>
      <img src="${G[c.id].img}" alt="" loading="lazy">
      <span>${c[state.lang]}</span>
    </button>`
  ).join("");
  renderSubcats();
}

function renderSubcats(){
  const panel = document.getElementById("subcatPanel");
  const groups = document.getElementById("subcatGroups");
  const data = SUBCATS[state.cat];
  if(!data){
    panel.classList.remove("show");
    groups.innerHTML = "";
    return;
  }
  panel.classList.add("show");
  document.getElementById("subcatTitle").textContent = data[state.lang];
  document.querySelector(".subcat-head span").innerHTML =
    `${t().subcatHint} <button type="button" class="subcat-reset" data-click="setSubcat" data-click-args='${dataArgs(['', "__THIS__"])}'>${state.lang==="fr"?"Tout afficher":"Show all"}</button>`;
  groups.innerHTML = data.groups.map(group=>`
    <div class="subcat-group">
      <strong>${group[state.lang]}</strong>
      <div class="subcat-links">
        ${group.items.map(item=>`<button type="button" class="subcat-chip" aria-pressed="${state.subcat===item.id}" data-click="setSubcat" data-click-args='${dataArgs([item.id, "__THIS__"])}'>${item[state.lang]}</button>`).join("")}
      </div>
    </div>`).join("");
}
function buildFilters(){
  const visibleCats = CATS.filter(c=>c.id === "all" || !adminCategoryStatus[c.id]?.hidden);
  document.getElementById("filterCat").innerHTML = visibleCats.map(c=>
    `<option value="${c.id}" ${state.cat===c.id?"selected":""}>${c[state.lang]}</option>`).join("");
  const subcatData = SUBCATS[state.cat];
  const subcatGroup = document.getElementById("filterSubcatGroup");
  subcatGroup.hidden = !subcatData;
  document.getElementById("filterSubcat").innerHTML = subcatData ? `
    <option value="">${t().allSubcategories}</option>
    ${subcatData.groups.map(group=>`<optgroup label="${group[state.lang]}">
      ${group.items.map(item=>`<option value="${item.id}" ${state.subcat===item.id?"selected":""}>${item[state.lang]}</option>`).join("")}
    </optgroup>`).join("")}` : "";
  document.getElementById("filterArea").innerHTML = `
    <option value="">${t().allIsland}</option>
    <optgroup label="${t().frSide}">${AREAS.fr.map(a=>`<option value="${a}" ${state.area===a?"selected":""}>${a}</option>`).join("")}</optgroup>
    <optgroup label="${t().nlSide}">${AREAS.nl.map(a=>`<option value="${a}" ${state.area===a?"selected":""}>${a}</option>`).join("")}</optgroup>`;
}
function buildSort(){
  const opts = [["recent",t().sort_recent],["pxup",t().sort_pxup],["pxdn",t().sort_pxdn],["near",t().sort_near]];
  document.getElementById("sort").innerHTML = opts.map(([v,lbl])=>
    `<option value="${v}" ${v===state.sort?"selected":""}>${t().sortBy}: ${lbl}</option>`
  ).join("");
}
function toggleSet(setName, val, on){
  on ? state[setName].add(val) : state[setName].delete(val);
  render();
}

document.addEventListener("keydown", e=>{
  if(e.key === "Escape"){
    document.querySelectorAll(".modal.open").forEach(m=>closeModal(m.id));
    toggleFilters(false);
  }
});

document.querySelectorAll(".modal").forEach(modal=>{
  modal.addEventListener("click", e=>{
    if(e.target === modal){
      if(modal.id === "paymentModal") cancelPaymentFlow();
      else closeModal(modal.id);
    }
  });
});

let adminAutoOpenDone = false;

function wantsAdminFromUrl(){
  const params = new URLSearchParams(window.location.search || "");
  if(params.has("listing")) return false;
  return params.has("admin") || location.hash === "#admin" || /^\/admin\/?$/.test(location.pathname);
}

function openAdminFromUrl(){
  if(!wantsAdminFromUrl() || adminAutoOpenDone) return;
  adminAutoOpenDone = true;
  setTimeout(()=>openAdmin(), 250);
}

function openListingFromUrl(){
  const id = new URLSearchParams(window.location.search).get("listing");
  if(!id) return;
  const exists = L.some(l=>idKey(l.id)===idKey(id));
  if(exists) setTimeout(()=>openListing(id, false), 120);
}

window.addEventListener("popstate", openListingFromUrl);

Object.assign(window, {
  openAdmin,
  openPricingInfo,
  openListingFromAdmin,
  renderAdmin,
  toggleFeaturedAdmin,
  markListingStatusAdmin,
  removeListingAdmin,
  resolveReportAdmin,
  toggleBanUser,
  toggleAdminRole,
  toggleCategoryAdmin
});
window.__bstState = state;

/* ---------------- INIT ---------------- */
loadLocalState(); applyLocalAdminTestMode(); restoreListingsIfNeeded(); applyAutomaticIncludedBoosts({silent:true}); buildAreas(); buildCats(); buildFilters(); buildSort(); setLang(state.lang); setCurrency(state.cur); render(); openListingFromUrl(); openAdminFromUrl(); handleListingRenewalActionFromUrl(); handleUnsubscribeFromUrl();

/* Supabase : si configuré, remplace les annonces de démo par celles de la base. */
if (window.SB && SB.enabled() && !new URLSearchParams(location.search || "").has("local")) {
  if(location.hostname !== "localhost" && location.hostname !== "127.0.0.1") loadSupabasePublicSettings();

  SB.hydrate().then(function (ok) {
    if (ok) console.info("[Supabase] annonces chargées depuis la base.");
    return applyAutomaticIncludedBoosts({silent:true}).then(function(count){ if(count) render(); return ok; });
  });

  /* Session : restaure l'utilisateur au chargement et suit connexion/déconnexion.
     Le setTimeout évite le deadlock connu de supabase-js quand on rappelle
     le client depuis l'intérieur du callback onAuthStateChange. */
  SB.onAuthChange(function (user) {
    setTimeout(function () {
      if (user) {
        applySupabaseUser(user).then(function () {
          applyAutomaticIncludedBoosts({silent:true}).then(function(){ render(); });
          if(window.SXM) SXM.sync();
          refreshMessageBadge();
          refreshBackendNotifications();
          if(window.Push && Push.syncEndpoint) Push.syncEndpoint();
          refreshPushControl();
          handleListingRenewalActionFromUrl();
          continuePendingProGoogle();
          continueSelectedProPlan();
          openAdminFromUrl();
          var pm = document.getElementById("profileModal");
          if (pm && pm.classList.contains("open") && typeof renderProfile === "function") renderProfile();
        });
      } else if (state.user && state.user.provider === "supabase") {
        state.user = null;
        setUnreadMessageCount(0);
        persistState();
        applyAutomaticIncludedBoosts({silent:true}).then(()=>render());
      }
    }, 0);
  });

  /* Realtime : messages entrants. RLS limite déjà la diffusion aux participants,
     on ignore donc simplement nos propres envois (sender === moi). */
  SB.subscribeInbox(function (m) {
    if (!state.user || m.recipient_id !== state.user.id) return;
    var l = L.find(function (x) { return String(x.id) === String(m.listing_id); });
    var id = l ? l.id : m.listing_id;
    var thread = chatThreads[id];
    if (thread) {
      var bubble = sbMsgToBubble(m);
      thread.messages.push(bubble);
      thread.updated = state.lang === "fr" ? "maintenant" : "now";
      var log = document.getElementById("chatLog-" + id);
      if (log) {
        log.insertAdjacentHTML("beforeend", bubbleRowHTML(bubble, thread.seller || (l ? sellerName(l) : "")));
        scrollChatToBottom(id);
      }
    }
    // Boîte de réception ouverte : on met à jour le volet en direct.
    var convKey = (m.listing_id || "0") + ":" + m.sender_id;
    var conv = inboxConvs.find(function (c) { return c.key === convKey; });
    if (conv) {
      conv.messages.push(m);
      conv.preview = m.body;
      conv.at = m.created_at;
      if (activeConvKey === convKey && document.querySelector("#messagesModal.open")) {
        m.read = true;
        if (SB.markMessageRead) SB.markMessageRead(m.id);
        renderInboxLog(conv);
      } else {
        conv.unread = (conv.unread || 0) + 1;
      }
      if (document.querySelector("#messagesModal.open")) renderInboxRail();
    } else if (document.querySelector("#messagesModal.open") && typeof loadInbox === "function") {
      loadInbox();
    }
    setUnreadMessageCount(unreadMessageCount + 1);
    var fromName = m.sender_name || (l ? sellerName(l) : (state.lang === "fr" ? "un utilisateur" : "a user"));
    var alreadyReading = activeConvKey === convKey && document.querySelector("#messagesModal.open");
    if (!alreadyReading && typeof pushNotification === "function") {
      pushNotification({
        kind: "message",
        title: (state.lang === "fr" ? "Nouveau message de " : "New message from ") + fromName,
        text: m.body,
        at: m.created_at,
        listingId: l ? l.id : m.listing_id,
        convKey: convKey
      });
    }
    showToast((state.lang === "fr" ? "Nouveau message de " : "New message from ") + fromName);
  });
}
