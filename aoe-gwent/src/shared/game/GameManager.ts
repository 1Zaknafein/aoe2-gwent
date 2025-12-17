import { Card, CardType, PlayingRowContainer } from "../../entities/card";
import { CardEffect } from "../../entities/card/Card";
import { WeatherRowContainer } from "../../entities/card/WeatherRowContainer";
import { Player } from "../../entities/player/Player";
import { CardDatabase, GamePhase } from "../../local-server";
import {
	ActionType,
	GameData,
	PlayerAction,
} from "../../local-server/GameTypes";
import { PlayerID } from "../types";

/**
 * Handles what's happening during game.
 */
export class GameManager {
	public readonly gameData: GameData;

	private readonly _player: Player;
	private readonly _enemy: Player;

	private readonly _allPlayingRowContainers: PlayingRowContainer[];

	private _playerScores: Map<PlayerID, number> = new Map();

	constructor(player: Player, enemy: Player) {
		this._player = player;
		this._enemy = enemy;

		this.gameData = {
			phase: GamePhase.WAITING_FOR_ROUND_START,
			roundNumber: 0,
			currentTurn: this._player.id,
			roundWinner: null,
			gameWinner: null,
		};

		this._allPlayingRowContainers = [
			this._player.melee,
			this._player.ranged,
			this._player.siege,
			this._enemy.melee,
			this._enemy.ranged,
			this._enemy.siege,
		];
	}

	/**
	 * Start the game. Initializes decks and decides starting player.
	 */
	public startGame(): void {
		this._player.deck.push(...CardDatabase.generateRandomDeck(20));
		this._enemy.deck.push(...CardDatabase.generateRandomDeck(20));

		this._playerScores.set(this._player.id, 0);
		this._playerScores.set(this._enemy.id, 0);

		this._player.hand.addCardsBatch(this._player.deck.splice(0, 10));
		this._enemy.hand.addCardsBatch(this._enemy.deck.splice(0, 10));
		this._enemy.hand.hideCards();
	}

	/**
	 * Start a new round.
	 */
	public startRound(): void {
		const startingPlayer =
			Math.random() < 0.5 ? this._player.id : this._enemy.id;

		this.gameData.roundNumber += 1;

		this.gameData.currentTurn = startingPlayer;
		this.gameData.phase =
			startingPlayer === this._player.id
				? GamePhase.PLAYER_TURN
				: GamePhase.ENEMY_TURN;
	}

	public handleRoundEnd(): void {
		this._player.hasPassed = false;
		this._enemy.hasPassed = false;

		let roundWinner = null;

		if (this._player.score > this._enemy.score) {
			const currentScore = this._playerScores.get(this._player.id)!;
			this._playerScores.set(this._player.id, currentScore + 1);

			roundWinner = this._player.id;
		} else if (this._enemy.score > this._player.score) {
			const currentScore = this._playerScores.get(this._enemy.id)!;
			this._playerScores.set(this._enemy.id, currentScore + 1);

			roundWinner = this._enemy.id;
		} else {
			// If it's a tie, both players get a point
			const playerCurrentScore = this._playerScores.get(this._player.id)!;
			this._playerScores.set(this._player.id, playerCurrentScore + 1);

			const enemyCurrentScore = this._playerScores.get(this._enemy.id)!;
			this._playerScores.set(this._enemy.id, enemyCurrentScore + 1);
		}

		// Game is BO3, players get a score point for winning a round.
		const playerScore = this._playerScores.get(this._player.id)!;
		const enemyScore = this._playerScores.get(this._enemy.id)!;

		this.gameData.roundWinner = roundWinner;

		this.removeCardsFromBoard();

		if (playerScore >= 2 || enemyScore >= 2) {
			this.gameData.phase = GamePhase.GAME_END;
			this.gameData.gameWinner =
				playerScore >= 2 ? this._player.id : this._enemy.id;

			return;
		}

		this.gameData.phase = GamePhase.WAITING_FOR_ROUND_START;
		this.gameData.currentTurn = this._player.id;
	}

	public endGame(): void {
		this._playerScores.set(this._player.id, 0);
		this._playerScores.set(this._enemy.id, 0);

		// Clear all player card and score data.
		this._player.reset();
		this._enemy.reset();

		this.gameData.phase = GamePhase.WAITING_FOR_ROUND_START;
		this.gameData.roundNumber = 0;
		this.gameData.roundWinner = null;
	}

	/**
	 * Handle player action and update game state accordingly.
	 * Needs to be awaited in action states, after which updated game state can be accessed.
	 * @param player Player that is taking the action.
	 * @param action Player action to handle.
	 */
	public async handleAction(action: PlayerAction): Promise<void> {
		switch (action.type) {
			case ActionType.PLACE_CARD:
				await this.handlePlaceCardAction(action);
				break;

			case ActionType.PASS_TURN:
				this.handlePassTurnAction(action.player);
				break;
			default:
				throw new Error(`Unknown action type: ${action.type}`);
		}
	}

	private async handlePlaceCardAction(action: PlayerAction): Promise<void> {
		// TODO Handle cards with special effects (eg. weather cards, summoning cards, etc.)
		const { player, card, targetRow } = action;

		if (!card || !targetRow) {
			throw new Error(
				"Place card action missing card or targetRow" +
					card?.cardData +
					" " +
					targetRow?.label
			);
		}

		await player.hand.transferCardTo(card, targetRow);

		if (
			card.cardData.type === CardType.WEATHER &&
			targetRow instanceof WeatherRowContainer
		) {
			this.handleWeatherEffect(card);
		}

		// New cards can affect both player and enemy scores, so update both.
		this._player.updateScore();
		this._enemy.updateScore();

		const otherPlayer =
			player.id === this._player.id ? this._enemy : this._player;

		// Switch turn to other player if they haven't passed. Otherwise, current player continues.
		if (!otherPlayer.hasPassed) {
			this.gameData.currentTurn = otherPlayer.id;
		}
	}

	private handlePassTurnAction(player: Player): void {
		player.hasPassed = true;

		const otherPlayer =
			player.id === this._player.id ? this._enemy : this._player;

		if (!otherPlayer.hasPassed) {
			this.gameData.currentTurn = otherPlayer.id;
		}

		if (this._player.hasPassed && this._enemy.hasPassed) {
			this.gameData.phase = GamePhase.ROUND_END;
		}
	}

	private handleWeatherEffect(weatherCard: Card): void {
		const effect = weatherCard.cardData.effect;

		if (!effect) {
			throw new Error("Weather card missing effect data");
		}

		switch (effect) {
			case CardEffect.FREEZE:
				this._player.melee.applyWeatherEffect();
				this._enemy.melee.applyWeatherEffect();
				break;
			case CardEffect.FOG:
				this._player.ranged.applyWeatherEffect();
				this._enemy.ranged.applyWeatherEffect();
				break;
			case CardEffect.RAIN:
				this._player.siege.applyWeatherEffect();
				this._enemy.siege.applyWeatherEffect();
				break;
			case CardEffect.CLEAR:
				for (const row of this._allPlayingRowContainers) {
					row.clearWeatherEffect();
				}
				this._player.weather.removeAllCards();
				break;
		}
	}

	private removeCardsFromBoard(): void {
		this._player.weather.removeAllCards();

		for (const rowContainer of this._allPlayingRowContainers) {
			rowContainer.clearWeatherEffect();
		}

		this._player.melee.transferAllCardsTo(this._player.discarded);
		this._enemy.melee.transferAllCardsTo(this._enemy.discarded);

		this._player.ranged.transferAllCardsTo(this._player.discarded);
		this._enemy.ranged.transferAllCardsTo(this._enemy.discarded);

		this._player.siege.transferAllCardsTo(this._player.discarded);
		this._enemy.siege.transferAllCardsTo(this._enemy.discarded);
	}
}
