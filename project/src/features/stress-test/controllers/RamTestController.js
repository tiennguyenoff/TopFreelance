/**
 * RamTestController.js
 * Pure controller logic for RAM stress testing - data generation, index building, and memory sampling
 */

import { JobFactory, SKILL_TAGS } from '../../job-catalog/models/JobFactory.js';
import { AVLTree } from '../../job-index/models/AVLTree.js';
import { SkillHashTable } from '../../skill-search/models/SkillHashTable.js';

/**
 * Create a fresh test data structure with jobs array, AVL tree, and hash table
 * @returns {{ jobs: Array, avl: AVLTree, hash: SkillHashTable }}
 */
export function createTestData() {
  return {
    jobs: [],
    avl: new AVLTree(),
    hash: new SkillHashTable(31, 0.75)
  };
}

/**
 * Generate and index a batch of jobs
 * @param {Object} data - The test data structure from createTestData()
 * @param {number} batchSize - Number of jobs to generate
 * @param {number} seed - Random seed
 * @param {number} startId - Starting ID for the batch
 * @returns {{ jobs: Array, duration: number }}
 */
export function generateAndIndexBatch(data, batchSize, seed, startId) {
  const t0 = performance.now();
  const chunk = JobFactory.generateJobs(batchSize, seed, startId);

  for (let i = 0; i < chunk.length; i++) {
    const job = chunk[i];
    data.jobs.push(job);              // mảng gốc giữ đối tượng duy nhất
    data.avl.insert(data.jobs.length, job); // AVL chỉ giữ con trỏ
    data.hash.insert(job);            // bảng băm chỉ giữ con trỏ
  }

  const duration = performance.now() - t0;
  return { jobs: chunk, duration };
}

/**
 * Sample AVL tree search performance
 * @param {AVLTree} avl - The AVL tree to test
 * @param {number} jobCount - Total number of jobs indexed
 * @param {number} samples - Number of searches to perform
 * @returns {number} Average search time in microseconds
 */
export function sampleAvlSearch(avl, jobCount, samples = 2000) {
  const t0 = performance.now();
  for (let k = 0; k < samples; k++) {
    avl.search(1 + Math.floor(Math.random() * jobCount));
  }
  return ((performance.now() - t0) * 1000) / samples;
}

/**
 * Sample hash table search performance
 * @param {SkillHashTable} hash - The hash table to test
 * @param {number} samples - Number of searches to perform
 * @returns {number} Average search time in microseconds
 */
export function sampleHashSearch(hash, samples = 2000) {
  const t0 = performance.now();
  for (let k = 0; k < samples; k++) {
    hash.search(SKILL_TAGS[k % SKILL_TAGS.length]);
  }
  return ((performance.now() - t0) * 1000) / samples;
}

/**
 * Estimate bytes per job from memory usage
 * @param {number} currentHeapMb - Current heap size in MB
 * @param {number} baseHeapMb - Baseline heap size in MB
 * @param {number} jobCount - Number of jobs in memory
 * @returns {number} Estimated bytes per job
 */
export function estimateBytesPerJob(currentHeapMb, baseHeapMb, jobCount) {
  if (!jobCount) return 900; // default estimate
  return Math.max(200, ((currentHeapMb - baseHeapMb) * 1048576) / jobCount);
}
