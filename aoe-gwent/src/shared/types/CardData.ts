import { CardType } from "./CardTypes";

/**
 * Shared card data interface for both client and server
 * Represents a card without texture information (client gets textures from CardFaceTextures)
 */
export interface CardData {
	id: number;
	name: string;
	score: number;
	type: CardType;
}
