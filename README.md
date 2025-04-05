# TV Odernheim Website

Dies ist die offizielle Website des Turnverein Odernheim. Die Website wurde mit Astro und Tailwind CSS erstellt.

## 🚀 Projektstruktur

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro
│       ├── kurse.astro
│       ├── verein.astro
│       ├── impressum.astro
│       └── datenschutz.astro
└── package.json
```

## 🧞 Befehle

Alle Befehle werden vom Root-Verzeichnis des Projekts ausgeführt:

| Befehl                | Aktion                                           |
| :------------------- | :----------------------------------------------- |
| `npm install`        | Installiert die Abhängigkeiten                   |
| `npm run dev`        | Startet den Entwicklungsserver auf `localhost:4321`|
| `npm run build`      | Erstellt die Production-Version unter `./dist/`  |
| `npm run preview`    | Lokale Vorschau der Production-Version          |

## 👀 Entwicklung

1. Klone das Repository
2. Installiere die Abhängigkeiten mit `npm install`
3. Starte den Entwicklungsserver mit `npm run dev`
4. Öffne `localhost:4321` in deinem Browser

## 🚀 Deployment

Die Website wird als statische Seite generiert. Nach dem Build-Prozess (`npm run build`) findest du die fertigen Dateien im `dist/`-Verzeichnis.

## 📝 Lizenz

Dieses Projekt ist urheberrechtlich geschützt. Alle Rechte vorbehalten. 