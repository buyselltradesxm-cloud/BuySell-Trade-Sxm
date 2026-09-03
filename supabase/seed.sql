-- ============================================================
--  Donnees de demonstration — a coller dans SQL Editor APRES schema.sql
--  Annonces d exemple, sans seller_id.
-- ============================================================

insert into listings
  (id, title, category, subcategory, side, area, condition, currency,
   price_eur, price_usd, delivery, negotiable, is_pro, is_urgent,
   is_featured, price_dropped, is_salary)
values
  (1, 'Scooter Piaggio Liberty 125, révisé, 2 casques', 'scoot', 'scooter-sale', 'fr', 'Marigot', 'tbe', 'eur', 850, 920, 'meetup', true, false, true, true, false, false),
  (2, 'T2 vue lagon, meublé, dispo 1er du mois', 'immo', 'rent-apartment', 'nl', 'Simpson Bay', 'bon', 'usd', 1250, 1350, 'meetup', false, true, false, true, false, false),
  (3, 'Hobie Cat 16 avec remorque, voiles OK', 'bat', null, 'nl', 'Simpson Bay', 'bon', 'eur', 3200, 3450, null, false, false, false, true, false, false),
  (4, 'iPhone 13 128 Go, batterie 89%, sous coque', 'elec', 'phones', 'fr', 'Grand Case', 'tbe', 'eur', 360, 390, 'meetup', true, false, true, true, true, false),
  (5, 'Canapé rotin 3 places + coussins déperlants', 'meub', null, 'nl', 'Cole Bay', 'bon', 'usd', 210, 225, 'delivery', true, false, false, false, false, false),
  (6, 'Yamaha 4x4 Kodiak 450, entretien à jour', 'scoot', 'motorbike-sale', 'nl', 'Dutch Quarter', 'tbe', 'usd', 4800, 5150, null, false, false, false, false, false, false),
  (7, 'Frigo américain Samsung, froid ventilé', 'menag', null, 'fr', 'Cul-de-Sac', 'bon', 'eur', 290, 315, 'delivery', false, false, false, false, false, false),
  (8, 'Serveur / barman expérimenté - Baie Orientale', 'job', 'hospitality', 'fr', 'Baie Orientale', 'neuf', 'eur', 0, 0, null, false, true, true, false, false, true),
  (9, 'Kitesurf Duotone 10m + barre, pack complet', 'lois', null, 'nl', 'Cupecoy', 'tbe', 'usd', 640, 690, null, false, false, false, false, false, false),
  (10, 'Suzuki Jimny 2019, clim, 62 000 km', 'voit', 'car-sale', 'nl', 'Philipsburg', 'tbe', 'usd', 14500, 15600, 'pickup', true, true, false, false, true, false),
  (11, 'MacBook Air M1, 8/256, clavier AZERTY', 'elec', 'laptops', 'fr', 'Marigot', 'tbe', 'eur', 560, 605, 'meetup', true, false, false, false, false, false),
  (12, 'Studio Grand Case, pieds dans l''eau, courte durée', 'immo', 'rent-apartment', 'fr', 'Grand Case', 'bon', 'eur', 900, 970, null, false, true, false, false, false, false),
  (13, 'Annexe 3,10 m + moteur Tohatsu 9.8, révisé', 'bat', null, 'nl', 'Simpson Bay', 'bon', 'eur', 2100, 2260, null, false, false, false, false, false, false),
  (14, 'Lot 6 chaises teck jardin + table pliante', 'meub', null, 'fr', 'Sandy Ground', 'corr', 'eur', 120, 130, null, false, false, false, false, false, false),
  (15, 'Groupe électrogène Honda 2 kVA, insonorisé', 'pro', null, 'nl', 'Cole Bay', 'tbe', 'usd', 430, 465, null, false, true, true, false, false, false),
  (16, 'Vélo électrique VTC, 2 batteries, phare neuf', 'lois', null, 'fr', 'Quartier d''Orléans', 'bon', 'eur', 520, 560, null, false, false, false, false, true, false),
  (17, 'Climatiseur split 12000 BTU, pose incluse', 'menag', null, 'nl', 'Maho', 'neuf', 'usd', 340, 365, 'delivery', false, true, false, false, false, false),
  (18, 'Ménage villas & check-out, équipe dispo', 'serv', null, 'nl', 'Cupecoy', 'neuf', 'usd', 0, 0, 'delivery', false, true, false, false, false, true),
  (19, 'PS5 + 2 manettes + 4 jeux, boîte d''origine', 'elec', 'gaming', 'fr', 'Marigot', 'tbe', 'eur', 380, 410, null, false, false, true, false, false, false),
  (20, 'Renault Clio IV 2016, CT OK, 1re main', 'voit', 'car-sale', 'fr', 'Cul-de-Sac', 'bon', 'eur', 6200, 6700, null, false, false, false, false, false, false),
  (21, 'Paddle gonflable 10''6 + pagaie carbone', 'lois', null, 'nl', 'Simpson Bay', 'tbe', 'usd', 250, 270, null, false, false, false, false, false, false),
  (22, 'Meuble TV manguier massif, 1,60 m', 'meub', null, 'fr', 'Baie Orientale', 'tbe', 'eur', 180, 195, null, false, false, false, false, false, false),
  (23, 'Compresseur plongée Bauer, 225 bar, révisé', 'pro', null, 'nl', 'Philipsburg', 'bon', 'usd', 2600, 2800, null, false, true, false, false, false, false),
  (24, 'Table à langer + transat + parc, lot bébé', 'meub', null, 'fr', 'Grand Case', 'bon', 'eur', 90, 98, null, false, false, false, false, false, false),
  (25, 'Jantes 17" + pneus été 205/45, jeu de 4', 'voit', 'auto-parts', 'nl', 'Cole Bay', 'corr', 'usd', 220, 238, null, false, false, false, false, false, false),
  (26, 'Cours de français & anglais, particuliers', 'serv', null, 'fr', 'Marigot', 'neuf', 'eur', 0, 0, null, false, false, false, false, false, true),
  (27, 'Hyundai i10 automatique à louer - journée ou semaine', 'locvoit', null, 'nl', 'Maho', 'tbe', 'usd', 42, 45, 'pickup', false, true, false, false, false, false),
  (28, '2 billets concert local samedi soir', 'billet', null, 'fr', 'Marigot', 'neuf', 'eur', 35, 38, null, false, false, true, false, false, false),
  (29, 'Bon plan: lot parasol + 2 chaises plage', 'bonplan', null, 'nl', 'Mullet Bay', 'bon', 'usd', 55, 60, null, false, false, false, false, false, false),
  (30, 'Cartons de déménagement propres, lot complet', 'autres', null, 'fr', 'Concordia', 'bon', 'eur', 20, 22, null, false, false, false, false, false, false),
  (31, 'Colombo de poulet maison - portion à emporter', 'food', 'prepared-food', 'fr', 'Marigot', 'neuf', 'eur', 12, 13, 'pickup', false, true, false, true, false, false),
  (32, 'Panier de fruits et légumes locaux', 'food', 'fresh-produce', 'nl', 'Philipsburg', 'neuf', 'usd', 23, 25, 'delivery', false, true, false, false, false, false),
  (33, 'Viennoiseries fraîches - boîte de 8', 'food', 'bakery', 'fr', 'Grand Case', 'neuf', 'eur', 16, 18, 'pickup', false, true, false, false, false, false)
on conflict (id) do nothing;

-- recale le compteur d id apres insertion d ids explicites
select setval(pg_get_serial_sequence('listings','id'), (select max(id) from listings));
