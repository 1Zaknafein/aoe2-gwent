/**
 * Client-side mapping of card IDs to face texture names for rendering
 */
export class CardFaceTextures {
	private static readonly textureMap: Record<number, string> = {
		1: "knight",
		2: "crossbowman",
		3: "mangonel",
		4: "light_cavalry",
		5: "teutonic_knight",
		6: "archer",
	};

	/**
	 * Get face texture name for a card ID
	 * @param cardId The card ID from server
	 * @returns Texture name for PIXI rendering
	 */
	public static getTexture(cardId: number): string {
		return this.textureMap[cardId] || "card_back";
	}

	/**
	 * Check if texture exists for card ID
	 * @param cardId The card ID to check
	 * @returns True if texture mapping exists
	 */
	public static hasTexture(cardId: number): boolean {
		return cardId in this.textureMap;
	}
}
