export interface BreadcrumbItem {
	/** Sichtbarer Text des Breadcrumb-Eintrags. */
	label: string;
	/**
	 * Ziel des Eintrags. Der letzte Eintrag (die aktuelle Seite) sollte kein
	 * `href` haben, damit er nicht als Link, sondern als aktuelle Position
	 * dargestellt wird.
	 */
	href?: string;
}
