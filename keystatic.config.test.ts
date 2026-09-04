import { describe, expect, it } from "vitest";
import keystaticConfig from "./keystatic.config";

const timeField = keystaticConfig.collections.events.schema.time;

describe("Keystatic-Feld Uhrzeit", () => {
  // Keystatic prueft `validation.pattern` auch fuer den Leerstring; ein Muster
  // ohne Leerwert-Alternative blockiert deshalb das Speichern jedes Termins
  // ohne Uhrzeit.
  it("laesst sich leer speichern", () => {
    expect(() => timeField.validate("", undefined)).not.toThrow();
  });

  it.each(["00:00", "9:30", "18:00", "23:59"])("akzeptiert %s", (value) => {
    expect(() => timeField.validate(value, undefined)).not.toThrow();
  });

  it.each(["25:99", "18:60", "18:00 Uhr", "1800"])("lehnt %s ab", (value) => {
    expect(() => timeField.validate(value, undefined)).toThrow(/HH:MM/);
  });
});

describe("Keystatic-Collection Vorstand", () => {
  // Die Vorstandsdateien sind .mdoc; ohne contentField liest Keystatic sie
  // nicht und die Admin-Liste bleibt leer.
  it("liest die Markdoc-Dateien ueber ein contentField", () => {
    expect(keystaticConfig.collections.board.format).toEqual({ contentField: "content" });
    expect(keystaticConfig.collections.board.schema.content.kind).toBe("form");
  });
});

describe("Keystatic-Feld Foto im Vorstand", () => {
  // Vorher war das Foto ein Textfeld mit Schluessel auf ein ESM-Bundle; ohne
  // Asset-Feld gibt es im Admin keinen Upload.
  it("ist ein Asset-Feld mit Upload-Verzeichnis", () => {
    const photo = keystaticConfig.collections.board.schema.photo;
    expect(photo.formKind).toBe("asset");
    expect(photo.directory).toBe("src/assets/board");
  });
});
describe.each(["news", "events"] as const)("Keystatic-Feld Anhaenge in %s", (name) => {
  const attachments = keystaticConfig.collections[name].schema.attachments;

  it("ist eine Liste von Datei-Objekten", () => {
    expect(attachments.kind).toBe("array");
    expect(attachments.element.kind).toBe("object");
    expect(attachments.element.fields.file.formKind).toBe("asset");
    expect(attachments.element.fields.file.directory).toBe(`public/files/${name}`);
  });

  // Ein Anhang ohne Datei waere ein toter Download-Link auf der Seite.
  it("verlangt eine Datei je Eintrag", () => {
    expect(() => attachments.element.fields.file.validate(null)).toThrow();
  });

  it("beschriftet Listeneintraege mit der Beschriftung", () => {
    const itemLabel = attachments.itemLabel;
    expect(itemLabel).toBeDefined();
    expect(
      itemLabel?.({
        fields: { label: { value: " Ausschreibung " }, file: { value: null } },
      } as never),
    ).toBe("Ausschreibung");
  });
});
