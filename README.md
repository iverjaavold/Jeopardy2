# Kontor-Jeopardy

Jeopardy-spill med poengtavle, «den røde knappen» for lagene og live-visning. En liten Node-server på Render serverer appen og synker spillet mellom alle enhetene.

## Mappestruktur

```
jeopardy-app/
├── index.html            Selve siden (HTML-oppsett, modaler og skjermer)
├── server.js             Server: serverer appen, lagrer spill og sender live-oppdateringer
├── package.json          Startkommando for serveren
├── render.yaml           Oppsett for Render
├── README.md
├── assets/
│   └── havnevag.jpg      Bakgrunnsbilde
├── css/
│   ├── base.css          Grunnstil og layout
│   ├── theme.css         Fargerikt designlag oppå grunnstilen
│   └── components.css    Trykkresultat, spørsmålsredigering og ekstra poeng
└── js/
    ├── questions.js      Standardspørsmålene – rediger dem her
    ├── state.js          Felles variabler (lag, poeng, spillkode osv.)
    ├── backend.js        Snakker med serveren (lagring og live-oppdateringer)
    ├── editor.js         «Endre spørsmål»-vinduet
    ├── navigation.js     Forside, bli med, valg, regler, vert/seer-modus
    ├── buzzer.js         Den røde knappen og trykkelisten
    ├── game.js           Spillebrett, spørsmål, timer og poeng
    ├── extra-points.js   «Ekstra poeng»-vinduet
    ├── sync.js           Lagre, laste og live-oppdatere spillet
    └── main.js           Oppstart og globale tastetrykk
```

## Kjøre appen lokalt

Installer [Node.js](https://nodejs.org) (versjon 18 eller nyere), og kjør:

```
node server.js
```

Åpne `http://localhost:3000`.

Skriptene i `index.html` må lastes i den rekkefølgen de står i, fordi de deler variabler og funksjoner.

## Publisere på Render (flere spillere samtidig)

1. Lag et nytt repo på GitHub, og last opp alle filene i denne mappen (også `server.js`, `package.json` og `render.yaml`).
2. Gå til Render og velg **New → Blueprint**. Koble til GitHub-repoet.
3. Render leser `render.yaml` og oppretter webtjenesten `kontor-jeopardy`.
4. Del adressen (for eksempel `https://kontor-jeopardy.onrender.com`) med lagene.

Når du endrer filene i repoet, publiserer Render den nye versjonen automatisk.

**Om gratisplanen:**
- Serveren sover etter 15 minutter uten trafikk. Første besøk etterpå tar opptil et minutt. Åpne siden litt før spillet starter.
- Spill uten aktivitet på 12 timer ryddes bort automatisk.
- Spillene lagres bare i minnet. De forsvinner når serveren sover, starter på nytt eller publiseres på nytt. Mens dere spiller, lagres spillet hele tiden, og det holder serveren våken.

## Endre spørsmål

- **Permanent:** endre `js/questions.js`.
- **Fra appen:** trykk «✏️ Endre spørsmål». Endringene lagres i nettleseren.
