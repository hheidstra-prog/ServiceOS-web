# Project Briefing: Shopify for Services

## Voor Claude Code Development

---

## 1. Project Overzicht

### Wat bouwen we?
Een all-in-one platform voor dienstverleners (ZZP'ers, freelancers, kleine bureaus) waarmee ze hun hele business kunnen runnen: van klant binnenhalen tot factuur betaald.

### De elevator pitch
> "Shopify verkoopt producten. Wij verkopen diensten. Eén platform, alles geregeld."

### Waarom bestaat dit?
Dienstverleners gebruiken nu 5-10 losse tools: Calendly voor booking, Word voor offertes, Excel voor klanten, Mollie voor betaling, email voor communicatie. Dat is chaos. Wij brengen alles samen in één plek.

---

## 2. Core Filosofie

### AI-First, niet AI-Added
Dit is geen traditionele SaaS waar we later "AI features" aan toevoegen. AI zit in de kern van hoe het product werkt.

**Voorbeeld van het verschil:**

Traditionele aanpak (NIET wat wij bouwen):
```
Gebruiker klikt: Klanten → Klant A → Nieuwe offerte → Template kiezen → 
Velden invullen → Prijzen invoeren → Preview → Versturen
```

Onze aanpak:
```
Gebruiker typt: "Stuur Klant A een offerte voor website onderhoud, 
3 maanden, 500 per maand"

Systeem doet de rest.
```

### Chat-First Interface
De primaire interface is een chat/command interface. Gebruikers praten met hun business.

- "Wat staat er nog open deze maand?"
- "Maak een factuur voor het project van Bakker"
- "Herinner Van Dijk aan z'n openstaande offerte"

### Geen Complexiteit voor de Gebruiker
- Geen workflow builders
- Geen drag-and-drop configuratie
- Geen "power user" features die normale mensen overweldigen

Als iets complex is, lost AI het op - niet de gebruiker.

### Fallback UI
Voor mensen die willen klikken/browsen is er een traditionele UI. Maar die is secundair aan de chat interface.

---

## 3. Doelgroep

### Primair: Nederlandse ZZP'ers en Freelancers
- Consultants
- Designers
- Developers
- Coaches
- Fotografen
- Marketing specialisten
- Virtueel assistenten

### Kenmerken
- Technisch niet onderlegd (geen developers)
- Tijd = geld, willen geen tijd besteden aan admin
- Gewend te betalen voor tools die werken
- Werken voornamelijk op laptop (web-first)
- Nederlandse markt eerst, daarna Europa

### Niet onze doelgroep (nu)
- Enterprise / grote bedrijven
- E-commerce (producten)
- Restaurants / horeca
- Internationale bedrijven (nog niet)

---

## 4. Functionele Requirements - MVP

### 4.1 Onboarding
AI-gestuurd gesprek dat het account opzet:
- Wie ben je? (naam, bedrijf, KvK indien van toepassing)
- Wat bied je aan? (diensten, uurtarieven of vaste prijzen)
- Wat is je stijl? (formeel/informeel, tone of voice voor gegenereerde teksten)

Output: volledig geconfigureerd account met diensten, prijzen, en templates.

### 4.2 Klantenbeheer
- Klantoverzicht (naam, bedrijf, contact, notities)
- Historie per klant (offertes, facturen, projecten)
- Simpele pipeline/status tracking:
  - Lead
  - Offerte verstuurd
  - Offerte geaccepteerd
  - Contract getekend
  - In uitvoering
  - Afgerond
  - Gefactureerd
  - Betaald

### 4.3 Booking / Scheduling
- Publieke booking link (te delen via LinkedIn, email, website)
- Beschikbaarheid instellen
- Verschillende afspraaktypes (intake, consult, workshop)
- Kalender sync (Google Calendar minimaal)
- Automatische bevestigingen en herinneringen

### 4.4 Offertes
- Templates (aanpasbaar per gebruiker)
- AI-assisted schrijven: 
  - Gebruiker geeft input ("website redesign voor bakker, 3 pagina's, 2500 euro")
  - AI genereert professionele offerte
- Digitaal versturen
- Klant kan online bekijken en akkoord geven
- Status tracking (verstuurd, bekeken, geaccepteerd, afgewezen)
- Automatische herinneringen bij geen reactie

### 4.5 Contracten
- Templates (juridisch correct voor NL)
- Koppeling aan geaccepteerde offerte (data automatisch overnemen)
- E-signing (digitale handtekening, rechtsgeldig)
- Status tracking
- Automatische herinneringen

### 4.6 Facturatie
- Templates (voldoen aan NL fiscale eisen)
- Automatisch gegenereerd uit contract/project of handmatig
- BTW-berekening (21%, 9%, 0%, verlegd)
- Factuurnummering (automatisch, configureerbaar)
- Betalingstermijn instellen
- Mollie integratie:
  - iDEAL
  - Creditcard
  - Bancontact (voor België)
- Automatische betalingsherinneringen
- Status tracking (verstuurd, bekeken, betaald, te laat)

### 4.7 AI Assistent
De rode draad door het hele systeem:

**Acties uitvoeren:**
- "Stuur klant X een offerte voor Y"
- "Maak een factuur voor project Z"
- "Plan een intake met nieuwe lead"

**Informatie geven:**
- "Hoeveel omzet heb ik deze maand?"
- "Welke facturen staan nog open?"
- "Wanneer heb ik Klant A voor het laatst gesproken?"

**Slim assisteren:**
- Offerteteksten schrijven
- Herinneringen formuleren
- Suggesties doen ("Je hebt 3 maanden niet gefactureerd aan Klant B")

### 4.8 Automatische Processen (onder de motorkap)
Geen workflow builder voor de gebruiker, wel automatisering:
- Herinnering versturen als offerte X dagen onbeantwoord
- Herinnering versturen als factuur over betalingstermijn
- Notificatie als klant offerte bekijkt
- Contract klaarzetten als offerte geaccepteerd

---

## 5. NL-Specifieke Requirements

### Mollie Integratie
- iDEAL als primaire betaalmethode
- Creditcard, Bancontact als secundair
- Webhook afhandeling voor betalingsbevestigingen

### BTW Logica
- Standaard 21%
- Laag tarief 9% (optie)
- 0% / vrijgesteld (optie)
- BTW verlegd (voor B2B)
- BTW-nummer validatie

### Factuur Eisen
Nederlandse facturen moeten bevatten:
- Factuurnummer (uniek, opvolgend)
- Factuurdatum
- NAW gegevens verzender (incl. KvK, BTW-nummer)
- NAW gegevens ontvanger
- Omschrijving dienst
- Bedrag excl. BTW
- BTW percentage en bedrag
- Totaal incl. BTW
- Betalingstermijn
- IBAN

### Taal
- Interface: Nederlands
- Alle gegenereerde teksten: Nederlands
- Later: meertalig (Engels, Duits) voor uitbreiding

---

## 6. User Flows

### Flow 1: Nieuwe Gebruiker Onboarding
```
1. Gebruiker maakt account
2. AI start gesprek: "Welkom! Laten we je account opzetten. Wat voor diensten bied je aan?"
3. Gesprek doorloopt: diensten, prijzen, bedrijfsgegevens
4. AI genereert: templates, service catalogus, profiel
5. Gebruiker is klaar om te starten
```

### Flow 2: Nieuwe Lead → Betaalde Klant
```
1. Lead boekt intake via booking link
2. Systeem maakt klantrecord, stuurt bevestiging
3. Na intake: gebruiker zegt "Stuur offerte voor [beschrijving]"
4. AI genereert offerte, gebruiker reviewt, verstuurt
5. Klant accepteert offerte online
6. Systeem genereert contract, stuurt naar klant
7. Klant tekent digitaal
8. Project wordt "In uitvoering"
9. Na afronding: gebruiker zegt "Factureer project X"
10. AI genereert factuur, verstuurt
11. Klant betaalt via iDEAL
12. Mollie webhook → factuur op "Betaald"
```

### Flow 3: Dagelijks Gebruik
```
Gebruiker opent app, typt:
- "Goedemorgen, wat staat er vandaag op de planning?"

AI antwoordt:
- "Je hebt 2 afspraken vandaag: 10:00 intake met Van Dijk, 14:00 review met Bakker. 
   Er staan 3 facturen open waarvan 1 over de betalingstermijn."

Gebruiker: "Stuur Jansen een herinnering voor die factuur"

AI: "Ik heb een vriendelijke herinnering gestuurd naar Jansen voor factuur #2024-042 
     van €1.250. Wil je de tekst zien?"
```

---

## 7. Toekomstige Fases (niet voor MVP)

### Fase 2: Website Generatie
- AI genereert complete website op basis van onboarding
- Headless architectuur
- Booking, diensten, contact geïntegreerd
- Aanpasbaar via chat ("Maak de header groter")

### Fase 3: Uitbreidingen
- Boekhoudkoppelingen (Moneybird, e-Boekhouden, Exact)
- Email integratie (communicatie vanuit platform)
- Geavanceerde rapportages
- KvK integratie (auto-fill bedrijfsgegevens)

### Fase 4: Schaal
- Multi-user / team support
- Multi-brand (meerdere bedrijven per account)
- Belgische/Duitse markt
- Mobile app (native)
- API voor derden

---

## 8. Concurrentie & Positionering

### Directe concurrenten
- **HoneyBook** - $140M ARR, $2.4B waardering, US-focused
- **Dubsado** - Power users, steile learning curve
- **Bonsai** - Freelancer focus

### Onze differentiatie
1. **AI-native** - niet achteraf toegevoegd
2. **Chat-first** - praten, niet klikken
3. **Europa/NL focus** - Mollie, BTW, Nederlandse taal
4. **Simpliciteit** - geen learning curve
5. **Website generatie** - uniek in de markt (fase 2)

### Wat we NIET zijn
- Geen boekhoudsoftware (wel koppeling later)
- Geen projectmanagement tool
- Geen CRM voor sales teams
- Geen enterprise oplossing

---

## 9. Technische Uitgangspunten

### Stack
- Next.js (zoals alle LaunchMinds projecten)
- PostgreSQL
- Standaard deployment setup

### AI Integratie
- Claude API voor alle AI functionaliteit
- Context-aware: AI kent de gebruiker, klanten, diensten, historie
- Conversation history voor follow-up vragen

### Architectuur Principes
- API-first (headless ready voor fase 2 website)
- Multi-tenant from day 1
- Webhook-driven voor externe integraties (Mollie, Calendar)

---

## 10. Success Criteria MVP

### Functioneel
- [ ] Gebruiker kan via chat een complete offerte versturen
- [ ] Gebruiker kan via chat een factuur maken en versturen
- [ ] Klant kan offerte accepteren en contract tekenen
- [ ] Klant kan factuur betalen via iDEAL
- [ ] Automatische herinneringen werken

### Gebruikerservaring
- [ ] Onboarding < 10 minuten
- [ ] Eerste offerte versturen < 2 minuten
- [ ] Zero learning curve - intuïtief

### Technisch
- [ ] Mollie integratie volledig werkend
- [ ] Google Calendar sync werkend
- [ ] E-signing rechtsgeldig
- [ ] BTW-berekening correct

---

## 11. Naam

Nog te bepalen. Werktitel: "Shopify for Services" of intern codenaam te kiezen.

---

## 12. Belangrijke Ontwerpbeslissingen

### Chat vs. UI Balance
- Chat is primair voor acties
- UI is voor overzicht/browse (klanten bekijken, historiek)
- Beide leiden tot dezelfde data en acties

### Template Systeem
- Systeem-templates als startpunt
- Gebruiker kan aanpassen
- AI gebruikt templates + context voor generatie

### Status Tracking
- Simpele, lineaire pipeline
- Geen complexe workflows
- Statussen zijn suggesties, niet afdwingbaar

### Authenticatie
- Email + password
- Magic link optie
- Later: SSO voor team accounts

---

*Dit document dient als basis briefing voor development met Claude Code. Technische details zoals datamodel, API design, en component structuur worden tijdens development bepaald.*
