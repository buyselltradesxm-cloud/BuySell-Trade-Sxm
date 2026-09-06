# SMTP pro pour Buy Sell Trade SXM

Ce fichier explique quoi faire pour que Supabase envoie correctement les emails de confirmation, reset password et invitations.

## Pourquoi on fait ca

Quand quelqu'un cree un compte avec email + password, Supabase doit envoyer un email de confirmation.

Le SMTP par defaut de Supabase est seulement pour tester. En production, il peut bloquer les emails, surtout pour les emails qui ne sont pas dans ton equipe Supabase. Donc pour un vrai site public, il faut brancher un SMTP pro.

Projet Supabase actuel: `npjkbhkmyfppmosforls`.

## Le choix recommande

Pour ce projet, le plus simple est Resend.

Valeurs SMTP Resend:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: ta cle API Resend
- Sender email: `noreply@buyselltradesxm.com`
- Sender name: `Buy Sell Trade SXM`

## Etapes debutant

1. Cree un compte Resend.
2. Dans Resend, ajoute le domaine `buyselltradesxm.com`.
3. Resend va te donner des records DNS, souvent SPF, DKIM et parfois DMARC.
4. Va chez Hostinger, dans DNS du domaine `buyselltradesxm.com`.
5. Ajoute exactement les records DNS donnes par Resend.
6. Retourne dans Resend et clique sur Verify.
7. Quand le domaine est verified, cree une API key Resend.
8. Dans Supabase, branche le SMTP avec la commande plus bas.

## Commande pour brancher Supabase

Dans PowerShell, mets les secrets seulement dans le terminal. Ne les ecris jamais dans un fichier public.

```powershell
$env:SUPABASE_ACCESS_TOKEN="your-supabase-access-token"
$env:SMTP_PASS="your-resend-api-key"
$env:SMTP_SENDER_EMAIL="noreply@buyselltradesxm.com"
npm run supabase:enable-smtp
```

Optionnel, si tu veux changer les valeurs par defaut:

```powershell
$env:SUPABASE_PROJECT_REF="npjkbhkmyfppmosforls"
$env:SMTP_HOST="smtp.resend.com"
$env:SMTP_PORT="465"
$env:SMTP_USER="resend"
$env:SMTP_SENDER_NAME="Buy Sell Trade SXM"
$env:SMTP_MAX_FREQUENCY="30"
```

## Emails pro a prevoir

Ces emails pourront etre envoyes quand Stripe et les webhooks seront branches:

- Paiement reussi: le compte Pro est active.
- Paiement echoue: le compte Pro reste bloque ou repasse inactif.
- Abonnement bientot renouvele: rappel avant la prochaine date de paiement.
- Abonnement annule: l'utilisateur garde l'acces jusqu'a la fin de la periode payee.
- Abonnement expire: le compte repasse en mode non actif et ne peut plus publier en Pro.
- Boost active: l'annonce est mise en avant apres paiement confirme.

## Worker email_queue

Le site cree maintenant des emails dans `email_queue`, par exemple quand une annonce arrive a 30 jours.

Pour envoyer ces emails réellement avec Resend:

```powershell
$env:SUPABASE_URL="https://npjkbhkmyfppmosforls.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:RESEND_API_KEY="your-resend-api-key"
$env:EMAIL_FROM="Buy Sell Trade SXM <noreply@buyselltradesxm.com>"
$env:SITE_URL="https://buyselltradesxm.com"
npm run emails:send-queue
```

Pour tester sans envoyer de vrai email:

```powershell
$env:EMAIL_DRY_RUN="1"
npm run emails:send-queue:dry
```

Important: `SUPABASE_SERVICE_ROLE_KEY` et `RESEND_API_KEY` ne doivent jamais etre mis dans GitHub.

Le worker:

- prend les emails `pending` dans `email_queue`
- les passe en `processing`
- envoie via Resend
- marque `sent` si tout va bien
- marque `failed` ou `dead` si l'envoi echoue trop souvent

## Automatisation GitHub

Le fichier `.github/workflows/email-queue-worker.yml` lance le worker toutes les 15 minutes.

Pour l'activer, ajoute ces secrets dans GitHub:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

GitHub > repository `BuySell-Trade-Sxm` > Settings > Secrets and variables > Actions > New repository secret.

Sans ces secrets, l'action se lance mais n'envoie rien.

## Test apres activation

1. Va sur `https://buyselltradesxm.com`.
2. Ouvre Login.
3. Cree un compte avec une adresse email normale.
4. Verifie que l'email de confirmation arrive.
5. Clique le lien de confirmation.
6. Reviens sur le site et connecte-toi.

## Important securite

- Ne mets jamais `SUPABASE_ACCESS_TOKEN`, `SMTP_PASS` ou une cle Resend dans GitHub.
- Utilise `noreply@buyselltradesxm.com` seulement apres verification du domaine dans Resend.
- Garde la confirmation email active dans Supabase.
- Plus tard, ajoute CAPTCHA pour eviter que des bots creent trop de comptes.
