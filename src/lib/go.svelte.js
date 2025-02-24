import { Buffer } from 'buffer';

export class GoGame {
	size = $state(19);
	currentPlayer = $state(1);
	board = $state([]);
	captures = $state({ black: 0, white: 0 });
	moveCount = $state(0);
	history = $state([]);
	gameEnded = $state(false);
	comments = $state([]);
	redoHistory = $state([]);

	constructor(size = 19) {
		this.size = size;
		this.board = Array(size).fill().map(() => Array(size).fill(0));
		this.loadFromLocalStorage();
	}

	loadFromLocalStorage() {
		try {
			const savedState = localStorage.getItem('goGameState');
			if (savedState) {
				const state = JSON.parse(savedState);
				this.board = state.board;
				this.currentPlayer = state.currentPlayer;
				this.moveCount = state.moveCount;
				this.captures = state.captures;
				this.history = state.history;
				this.comments = state.comments || [];
				this.redoHistory = state.redoHistory || [];
			}
		} catch (e) {
			console.warn('Failed to load game state:', e);
		}
	}

	saveToLocalStorage() {
		try {
			const state = {
				board: this.board,
				currentPlayer: this.currentPlayer,
				moveCount: this.moveCount,
				captures: this.captures,
				history: this.history,
				comments: this.comments,
				redoHistory: this.redoHistory
			};
			localStorage.setItem('goGameState', JSON.stringify(state));
		} catch (e) {
			console.warn('Failed to save game state:', e);
		}
	}

	play(x, y) {
		if (this.gameEnded) return false;
		if (this.isValidMove(x, y)) {
			const capturedStones = this.getCapturedStones(x, y);
			this.board[y][x] = this.currentPlayer;
			this.removeCapturedStones(capturedStones);
			this.addToHistory(x, y, capturedStones);
			this.togglePlayer();
			this.moveCount += 1;
			this.saveToLocalStorage();
			return true;
		}
		return false;
	}

	addComment(x, y, comment) {
		const newComment = {
			x,
			y,
			comment,
			moveNumber: this.moveCount,
			player: this.currentPlayer,
			timestamp: Date.now()
		};
		this.comments.push(newComment);
		this.saveToLocalStorage();
	}

	handleBoardClick(x, y) {
		if (this.board[y][x] !== 0) {
			return {
				type: 'comment',
				position: { x, y }
			};
		}
		return {
			type: 'move',
			position: { x, y }
		};
	}

	isValidMove(x, y) {
		if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
		if (this.board[y][x] !== 0) return false;
		if (this.isKoViolation(x, y)) return false;

		// Get potential captures
		const capturedStones = this.getCapturedStones(x, y);

		// Place a stone temporarily to check for suicide
		this.board[y][x] = this.currentPlayer;
		const isSuicide = this.getGroup(x, y).every(
			([gx, gy]) => this.getLiberties(gx, gy) === 0
		);
		this.board[y][x] = 0;

		// The move is valid if it's not suicide or if it captures opponent stones
		return !isSuicide || capturedStones.length > 0;
	}

	getCapturedStones(x, y) {
		const opponent = this.currentPlayer === 1 ? 2 : 1;
		const directions = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1]
		];
		let capturedStones = [];

		// Temporarily place the stone
		this.board[y][x] = this.currentPlayer;
		for (const [dx, dy] of directions) {
			const nx = x + dx;
			const ny = y + dy;
			if (this.isValidPosition(nx, ny) && this.board[ny][nx] === opponent) {
				const group = this.getGroup(nx, ny);
				if (group.every(([gx, gy]) => this.getLiberties(gx, gy) === 0)) {
					capturedStones = capturedStones.concat(group);
				}
			}
		}
		// Remove the temporary stone
		this.board[y][x] = 0;
		return capturedStones;
	}

	removeCapturedStones(capturedStones) {
		capturedStones.forEach(([cx, cy]) => {
			this.board[cy][cx] = 0;
			this.captures[this.currentPlayer === 1 ? 'black' : 'white']++;
		});
	}

	traverseConnected(x, y, options = {}) {
		const { shouldTraverse = () => true, onNeighbor = () => { } } = options;
		const positions = [];
		const visited = new Set();
		const stack = [[x, y]];

		while (stack.length > 0) {
			const [cx, cy] = stack.pop();
			const key = `${cx},${cy}`;
			if (visited.has(key) || !shouldTraverse(cx, cy)) continue;
			visited.add(key);
			positions.push([cx, cy]);

			const directions = [
				[-1, 0],
				[1, 0],
				[0, -1],
				[0, 1]
			];
			for (const [dx, dy] of directions) {
				const nx = cx + dx;
				const ny = cy + dy;
				if (this.isValidPosition(nx, ny)) {
					onNeighbor(nx, ny);
					if (!visited.has(`${nx},${ny}`)) {
						stack.push([nx, ny]);
					}
				}
			}
		}
		return positions;
	}

	getGroup(x, y) {
		const color = this.board[y][x];
		return this.traverseConnected(x, y, {
			shouldTraverse: (cx, cy) => this.board[cy][cx] === color
		});
	}

	getLiberties(x, y) {
		const directions = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1]
		];
		return directions.filter(([dx, dy]) => {
			const nx = x + dx;
			const ny = y + dy;
			return this.isValidPosition(nx, ny) && this.board[ny][nx] === 0;
		}).length;
	}

	isValidPosition(x, y) {
		// Minimal fix: prevent out-of-bounds usage
		return x >= 0 && x < this.size && y >= 0 && y < this.size;
	}

	togglePlayer() {
		// Minimal fix to switch player
		this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
	}

	addToHistory(x, y, capturedStones) {
		this.history.push({
			x,
			y,
			player: this.currentPlayer,
			captured: capturedStones.map(([cx, cy]) => ({ x: cx, y: cy })),
			isPass: x === null && y === null
		});
	}

	checkConsecutivePasses() {
		if (this.history.length < 2) return false;
		const lastMove = this.history[this.history.length - 1];
		const secondLastMove = this.history[this.history.length - 2];
		return lastMove.isPass && secondLastMove.isPass;
	}

	isKoViolation(x, y) {
		if (this.history.length < 2) return false;
		const lastMove = this.history[this.history.length - 1];

		// Check if the current move is capturing exactly one stone
		const potentialCaptures = this.getCapturedStones(x, y);
		if (potentialCaptures.length !== 1) return false;

		// Check if the last move was also a single-stone capture
		if (lastMove.captured.length !== 1) return false;

		// Check if this move is recapturing the stone placed in the last move
		return (
			x === lastMove.captured[0].x &&
			y === lastMove.captured[0].y &&
			lastMove.x === potentialCaptures[0][0] &&
			lastMove.y === potentialCaptures[0][1]
		);
	}

	endGame() {
		this.gameEnded = true;
		this.saveToLocalStorage();
	}

	clearComments() {
		this.comments = [];
		this.saveToLocalStorage();
	}

	undo() {
		if (this.history.length === 0) return false;

		const lastMove = this.history.pop();

		// Store comments with the move before removing them
		lastMove.comments = this.comments.filter(comment =>
			comment.moveNumber === this.moveCount
		);

		// Remove comments for this move
		this.comments = this.comments.filter(comment =>
			comment.moveNumber !== this.moveCount
		);

		this.redoHistory.push(lastMove);

		// Restore board state and captures
		if (lastMove.isPass) {
			this.togglePlayer();
		} else {
			this.board[lastMove.y][lastMove.x] = 0;
			// Restore captured stones
			lastMove.captured.forEach(({ x, y }) => {
				this.board[y][x] = lastMove.capturedColor || this.currentPlayer;  // Use stored color
			});
			// Update captures count for the correct player
			if (lastMove.captured.length > 0) {
				const capturedBy = lastMove.player === 1 ? 'black' : 'white';
				this.captures[capturedBy] -= lastMove.captured.length;
			}
			this.togglePlayer();
		}

		this.moveCount--;
		this.saveToLocalStorage();
		return true;
	}

	redo() {
		if (this.redoHistory.length === 0) return false;

		const nextMove = this.redoHistory.pop();

		// Restore comments
		if (nextMove.comments) {
			this.comments = [...this.comments, ...nextMove.comments];
		}

		// Restore board state and captures
		if (nextMove.isPass) {
			this.togglePlayer();
		} else {
			this.board[nextMove.y][nextMove.x] = this.currentPlayer;
			// Remove captured stones
			nextMove.captured.forEach(({ x, y }) => {
				this.board[y][x] = 0;
			});
			// Update captures count for the correct player
			if (nextMove.captured.length > 0) {
				const capturedBy = nextMove.player === 1 ? 'black' : 'white';
				this.captures[capturedBy] += nextMove.captured.length;
			}
			this.togglePlayer();
		}

		this.moveCount++;
		this.history.push(nextMove);
		this.saveToLocalStorage();
		return true;
	}

	calculateChineseScore() {
		let blackStones = 0;
		let whiteStones = 0;
		let blackTerritory = 0;
		let whiteTerritory = 0;
		const visited = new Set();

		// Count placed stones
		for (let y = 0; y < this.size; y++) {
			for (let x = 0; x < this.size; x++) {
				const stone = this.board[y][x];
				if (stone === 1) blackStones++;
				else if (stone === 2) whiteStones++;
			}
		}

		// Calculate territory
		for (let y = 0; y < this.size; y++) {
			for (let x = 0; x < this.size; x++) {
				const key = `${x},${y}`;
				if (this.board[y][x] === 0 && !visited.has(key)) {
					const territory = this.getTerritory(x, y);
					for (const [tx, ty] of territory.positions) {
						visited.add(`${tx},${ty}`);
					}
					if (territory.owner === 1) {
						blackTerritory += territory.size;
					} else if (territory.owner === 2) {
						whiteTerritory += territory.size;
					}
				}
			}
		}

		return {
			black: blackStones + blackTerritory,
			white: whiteStones + whiteTerritory + 7.5 // Komi
		};
	}

	getTerritory(x, y) {
		const surroundingColors = new Set();
		const positions = this.traverseConnected(x, y, {
			shouldTraverse: (cx, cy) => this.board[cy][cx] === 0,
			onNeighbor: (nx, ny) => {
				const neighbor = this.board[ny][nx];
				if (neighbor !== 0) surroundingColors.add(neighbor);
			}
		});

		return {
			positions,
			size: positions.length,
			owner: surroundingColors.size === 1 ? Array.from(surroundingColors)[0] : null
		};
	}

	pass() {
		if (this.gameEnded) return false;

		this.addToHistory(null, null, []);
		this.togglePlayer();
		this.moveCount++;

		if (this.checkConsecutivePasses()) {
			this.endGame();
		}

		this.saveToLocalStorage();
		return true;
	}

	reset() {
		this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
		this.currentPlayer = 1;
		this.moveCount = 0;
		this.captures = { black: 0, white: 0 };
		this.history = [];
		this.comments = [];
		this.gameEnded = false;
		this.redoHistory = [];
		this.saveToLocalStorage();
	}
}