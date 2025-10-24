/**
 * 🧩 Skin Table Mapper
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Defines the 2D coordinates for player skin parts
 *           with clear structure for inner and outer layers
 * ----------------------------------------------------------
 */

'use strict';

/* ╔════════════════════════════════════════════════════╗
   ║ 👤 HEAD COORDINATES                                   ║
   ╚════════════════════════════════════════════════════╝ */
const head = {
	inner: [
		[8, 8, 8, 8],    // Front
		[24, 8, 8, 8],   // Back
		[0, 8, 8, 8],    // Left
		[16, 8, 8, 8],   // Right
		[8, 0, 8, 8],    // Top
		[16, 0, 8, 8],   // Bottom
	],
	outer: [
		[40, 8, 8, 8],   // Overlay Front
		[56, 8, 8, 8],   // Overlay Back
		[32, 8, 8, 8],   // Overlay Left
		[48, 8, 8, 8],   // Overlay Right
		[40, 0, 8, 8],   // Overlay Top
		[48, 0, 8, 8],   // Overlay Bottom
	],
};

/* ╔════════════════════════════════════════════════════╗
   ║ 🧍 BODY COORDINATES                                   ║
   ╚════════════════════════════════════════════════════╝ */
const body = {
	inner: [
		[20, 20, 8, 12],   // Front
		[32, 20, 8, 12],   // Back
		[16, 20, 4, 12],   // Left Arm
		[28, 20, 4, 12],   // Right Arm
		[20, 16, 8, 4],    // Top
		[28, 16, 8, 4],    // Bottom
	],
	outer: [
		[20, 36, 8, 12],   // Overlay Front
		[32, 36, 8, 12],   // Overlay Back
		[16, 36, 4, 12],   // Overlay Left Arm
		[28, 36, 4, 12],   // Overlay Right Arm
		[20, 32, 8, 4],    // Overlay Top
		[28, 32, 8, 4],    // Overlay Bottom
	],
};

/* ╔════════════════════════════════════════════════════╗
   ║ 🚀 EXPORT                                           ║
   ╚════════════════════════════════════════════════════╝ */