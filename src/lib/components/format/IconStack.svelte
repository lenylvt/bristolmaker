<script lang="ts">
	import type { Component } from 'svelte';

	type IconItem = {
		id: string;
		icon: Component;
	};

	type Props = {
		state: string;
		items: IconItem[];
		class?: string;
	};

	let { state, items, class: className = '' }: Props = $props();
</script>

<div class="t-icon-swap icon-stack {className}" data-state={state}>
	{#each items as item (item.id)}
		<span class="t-icon" data-icon={item.id}>
			<item.icon />
		</span>
	{/each}
</div>

<style>
	.icon-stack {
		position: relative;
		display: inline-grid;
		width: 0.875rem;
		height: 0.875rem;
	}

	.icon-stack :global(svg) {
		width: 0.875rem;
		height: 0.875rem;
	}
</style>
