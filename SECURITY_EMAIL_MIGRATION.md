# Urgence: changer l'email proprietaire

Ancien email compromis:

`buyselltradesxm@gmail.com`

## Objectif

Il faut enlever cet email de tous les endroits ou il peut controler le projet.

## Ordre recommande

### 1. Gmail

- Essaye de recuperer le compte tout de suite.
- Change le mot de passe.
- Active 2FA avec une app d'authentification.
- Deconnecte toutes les sessions inconnues.
- Verifie les adresses de recuperation et numeros de telephone.
- Supprime les regles de transfert inconnues.

### 2. GitHub

- Ajoute un nouvel email securise sur ton compte GitHub.
- Mets le nouvel email comme primary email.
- Change le mot de passe GitHub.
- Active 2FA.
- Verifie les SSH keys, personal access tokens et applications connectees.
- Si le repo est lie a un compte qui utilise l'ancien email, retire l'ancien email du compte.

### 3. Supabase

- Connecte-toi avec un compte securise.
- Ajoute le nouvel email comme owner/admin si besoin.
- Retire ou downgrade l'ancien email.
- Dans la table `profiles`, mets `role = 'user'` pour l'ancien email.
- Dans Auth Users, verifie que l'ancien email n'a plus de pouvoir admin.

### 4. Google Cloud

- Ajoute un nouveau compte securise comme Owner du projet.
- Retire `buyselltradesxm@gmail.com` des permissions IAM.
- Verifie OAuth consent screen et OAuth clients.
- Regenere les secrets OAuth si tu penses que l'ancien email a pu les voir.

### 5. Hostinger / domaine

- Change le mot de passe Hostinger.
- Active 2FA.
- Change l'email du compte proprietaire.
- Verifie les DNS du domaine `buyselltradesxm.com`.
- Verifie que personne n'a ajoute un email, utilisateur, transfert, ou DNS inconnu.

## Dans le code

L'ancien email a deja ete retire de:

- la liste admin de `index.html`
- la liste admin de `marketplace.html`
- le script SQL admin `supabase/admin-fix.sql`
- les pages publiques `privacy.html` et `terms.html`

## SQL d'urgence Supabase

Dans Supabase SQL Editor, lance ce bloc pour retirer le role admin a l'ancien email:

```sql
update public.profiles
set role = 'user'
where lower(email) = 'buyselltradesxm@gmail.com';
```

Puis verifie:

```sql
select id, email, role
from public.profiles
where lower(email) = 'buyselltradesxm@gmail.com';
```

## Nouveaux emails conseilles

Pour le futur, evite d'utiliser un Gmail personnel comme compte proprietaire unique.

Utilise plutot:

- `admin@buyselltradesxm.com` pour l'admin public/business
- un Gmail personnel securise avec 2FA comme recovery
- au moins deux comptes owner/admin differents pour ne jamais etre bloque
