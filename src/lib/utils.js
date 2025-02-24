import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}
