<script>
	import { GoGame } from '$lib/go.svelte.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	const size = 19;
	let game = $state(new GoGame(size));
	let commentInput = $state('');
	let selectedPosition = $state(null);
	let showCommentBox = $state(false);
	let chineseScores = $derived.by(() => {
		game.board;
		return game.calculateChineseScore();
	});

	const cellSize = 30;
	const boardSize = size * cellSize;
	const totalSize = boardSize + 40;

	function handleClick(x, y) {
		const result = game.handleBoardClick(x, y);

		if (result.type === 'comment') {
			selectedPosition = { x, y };
			showCommentBox = true;
		} else {
			game.play(x, y);
		}
	}

	function submitComment() {
		if (selectedPosition && commentInput.trim()) {
			game.addComment(selectedPosition.x, selectedPosition.y, commentInput);
			commentInput = '';
			showCommentBox = false;
			selectedPosition = null;
		}
	}

	function isStarPoint(x, y) {
		const starPoints = [3, 9, 15];
		return starPoints.includes(x) && starPoints.includes(y);
	}

	function handlePass() {
		game.pass();
	}
</script>

<div class="mx-auto grid h-[90vh] grid-cols-[auto_250px_450px] gap-6">
	<!-- Left Column: Board -->
	<div class="relative h-[90vh] border-[0.5px] bg-white p-4">
		{#if game.gameEnded}
			<div class="absolute inset-0 flex items-center justify-center bg-black/50">Game Ends</div>
		{/if}
		<svg width={totalSize} height={totalSize}>
			<rect x="0" y="0" width={totalSize} height={totalSize} fill="white" />
			<g transform="translate(20, 20)">
				{#each game.board as row, y}
					{#each row as cell, x}
						<g transform="translate({x * cellSize}, {y * cellSize})">
							{#if x < size - 1}
								<line
									x1={cellSize / 2}
									y1={cellSize / 2}
									x2={cellSize * 1.5}
									y2={cellSize / 2}
									stroke="black"
									stroke-width="1"
								/>
							{/if}
							{#if y < size - 1}
								<line
									x1={cellSize / 2}
									y1={cellSize / 2}
									x2={cellSize / 2}
									y2={cellSize * 1.5}
									stroke="black"
									stroke-width="1"
								/>
							{/if}
							{#if isStarPoint(x, y)}
								<circle cx={cellSize / 2} cy={cellSize / 2} r="3" fill="black" />
							{/if}
							{#if cell !== 0}
								<circle
									cx={cellSize / 2}
									cy={cellSize / 2}
									r={cellSize * 0.45}
									fill={cell === 2 ? 'white' : 'black'}
									stroke="black"
									stroke-width="1"
									onclick={() => handleClick(x, y)}
								/>
							{:else}
								<circle
									cx={cellSize / 2}
									cy={cellSize / 2}
									r={cellSize * 0.45}
									class="fill-transparent hover:fill-gray-200"
									stroke="none"
									onclick={() => handleClick(x, y)}
								/>
							{/if}
						</g>
					{/each}
				{/each}
			</g>
		</svg>
	</div>

	<!-- Middle Column: Game Status -->
	<div>
		<Card.Root class="border-[0.5px]">
			<Card.Header>
				<Card.Title>Game Status</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span>Current Player:</span>
						<Badge variant={game.currentPlayer === 1 ? 'default' : 'secondary'}>
							{game.currentPlayer === 1 ? 'Black' : 'White'}
						</Badge>
					</div>
					<div class="flex items-center justify-between">
						<span>Move Count:</span>
						<span>{game.moveCount}</span>
					</div>
					<div class="flex items-center justify-between">
						<span>Captured Stones:</span>
						<div>
							<Badge variant="outline" class="mr-2">
								Black: {game.captures.black}
							</Badge>
							<Badge variant="outline">
								White: {game.captures.white}
							</Badge>
						</div>
					</div>
					<div class="flex items-center justify-between">
						<span>Scores:</span>
						<div>
							<Badge variant="outline" class="mr-2">
								Black: {chineseScores.black}
							</Badge>
							<Badge variant="outline">
								White: {chineseScores.white}
							</Badge>
						</div>
					</div>
				</div>
			</Card.Content>
			<Card.Footer class="flex flex-wrap justify-between gap-2">
				<Button variant="outline" onclick={handlePass}>Pass</Button>
				<Button
					variant="outline"
					onclick={() => {
						game.undo();
					}}>Undo</Button
				>
				<Button
					variant="outline"
					onclick={() => {
						game.reset();
					}}>Reset</Button
				>
				<Button
					variant="outline"
					onclick={() => {
						game.redo();
					}}>Redo</Button
				>
			</Card.Footer>
		</Card.Root>
	</div>

	<!-- Right Column: Comments -->
	<div>
		<Card.Root class="h-[90vh] border-[0.5px]">
			<Card.Header>
				<Card.Title>Comments</Card.Title>
			</Card.Header>
			<Card.Content class="h-[calc(90vh-100px)] overflow-y-auto">
				{#if showCommentBox}
					<div class="mb-4">
						<textarea
							bind:value={commentInput}
							class="w-full border p-2"
							placeholder="Add your comment..."
							rows="3"
						></textarea>
						<div class="mt-2 flex justify-end space-x-2">
							<Button
								variant="outline"
								onclick={() => {
									showCommentBox = false;
									selectedPosition = null;
									commentInput = '';
								}}>Cancel</Button
							>
							<Button variant="outline" onclick={submitComment}>Add Comment</Button>
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					{#each game.comments as comment}
						<div class="border p-3">
							<div>Move {comment.moveNumber} - {comment.player === 2 ? 'Black' : 'White'}</div>
							<div>Position: ({comment.x}, {comment.y})</div>
							<div>{comment.comment}</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
