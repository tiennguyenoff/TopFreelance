/**
 * ProfileUndoHelper.js
 * Simple undo stack helper for profile form editing
 * Routes LinkedStack usage through a controller layer so views don't import models directly
 */

import { LinkedStack } from '../models/LinkedStack.js';

/**
 * Create a new undo stack for profile editing
 * @returns {Object} Undo stack with push, pop, peek, size methods
 */
export function createProfileUndoStack() {
  const stack = new LinkedStack();

  return {
    /**
     * Push an undo action onto the stack
     * @param {Object} action - { field, label, prev }
     */
    push(action) {
      stack.push(action);
    },

    /**
     * Pop and return the last undo action
     * @returns {Object|null} The popped action or null if empty
     */
    pop() {
      return stack.pop();
    },

    /**
     * Peek at the top action without removing it
     * @returns {Object|null}
     */
    peek() {
      return stack.peek();
    },

    /**
     * Get the current stack size
     * @returns {number}
     */
    get size() {
      return stack.size;
    },

    /**
     * Check if stack is empty
     * @returns {boolean}
     */
    toArray() {
      return stack.toArray();
    },

    isEmpty() {
      return stack.isEmpty();
    },

    /**
     * Clear all undo actions
     */
    clear() {
      stack.clear();
    }
  };
}
