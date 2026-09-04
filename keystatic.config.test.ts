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
