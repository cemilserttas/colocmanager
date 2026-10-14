/**
 * Calculates the next turn index in a round-robin rotation.
 * Wraps around to 0 when reaching the end of the rotation list.
 *
 * @param currentIndex - The current member index in the rotation
 * @param totalMembers - Total number of participating members
 * @returns The next 0-based turn index
 */
export function getNextTurnIndex(currentIndex: number, totalMembers: number): number {
  if (totalMembers <= 0) {
    return 0;
  }
  return (currentIndex + 1) % totalMembers;
}

/**
 * Retrieves the user ID of the current assignee in the rotation.
 *
 * @param rotationOrder - Array of user IDs in their designated rotation order
 * @param currentTurnIndex - The current 0-based turn index
 * @returns The user ID of the current assignee, or an empty string if rotation is empty
 */
export function getCurrentAssignee(rotationOrder: string[], currentTurnIndex: number): string {
  if (!rotationOrder || rotationOrder.length === 0) {
    return '';
  }
  const safeIndex = ((currentTurnIndex % rotationOrder.length) + rotationOrder.length) % rotationOrder.length;
  return rotationOrder[safeIndex] ?? '';
}

/**
 * Removes a user from a rotation order list and adjusts the current turn index accordingly.
 *
 * - If user is not found, returns current rotation order and clamped index.
 * - If removing results in an empty rotation, returns index 0.
 * - If the removed user was before the current turn, current index shifts down by 1.
 * - If the removed user was at the current turn, the turn stays at the same index
 *   (now pointing to the next roommate), or wraps to 0 if it was the last element.
 * - If the removed user was after the current turn, current index remains unchanged.
 *
 * @param rotationOrder - Array of user IDs in rotation
 * @param userId - ID of the user to remove
 * @param currentTurnIndex - The active turn index prior to removal
 * @returns Object with updated rotationOrder array and new turn index
 */
export function removeFromRotation(
  rotationOrder: string[],
  userId: string,
  currentTurnIndex: number
): { newOrder: string[]; newIndex: number } {
  const removedIndex = rotationOrder.indexOf(userId);

  if (removedIndex === -1) {
    const fallbackIndex = rotationOrder.length > 0
      ? Math.max(0, Math.min(currentTurnIndex, rotationOrder.length - 1))
      : 0;
    return {
      newOrder: [...rotationOrder],
      newIndex: fallbackIndex,
    };
  }

  const newOrder = rotationOrder.filter((_, idx) => idx !== removedIndex);

  if (newOrder.length === 0) {
    return { newOrder: [], newIndex: 0 };
  }

  let newIndex = currentTurnIndex;

  if (removedIndex < currentTurnIndex) {
    newIndex = currentTurnIndex - 1;
  } else if (removedIndex === currentTurnIndex) {
    newIndex = currentTurnIndex >= newOrder.length ? 0 : currentTurnIndex;
  } else {
    newIndex = currentTurnIndex;
  }

  newIndex = Math.max(0, Math.min(newIndex, newOrder.length - 1));

  return { newOrder, newIndex };
}

/**
 * Appends a user to the end of a rotation order.
 * If the user is already present, returns a shallow copy of the existing order to avoid duplicates.
 *
 * @param rotationOrder - Existing array of user IDs
 * @param userId - ID of the user to append
 * @returns New array containing the updated rotation order
 */
export function addToRotation(rotationOrder: string[], userId: string): string[] {
  if (rotationOrder.includes(userId)) {
    return [...rotationOrder];
  }
  return [...rotationOrder, userId];
}
