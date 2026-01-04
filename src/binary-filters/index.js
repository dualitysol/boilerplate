/**
 * Binary Filters - Main Export
 * 
 * Ultra-fast entity matching using binary encoding
 */

export { 
  BinaryFilterBuilder,
  BinaryFilterMatcher,
  BinaryFilter,
  FilterVariant
} from './BinaryFilterBuilder.js';

export {
  BitwiseOps,
  BinaryFilterCache,
  BatchMatcher,
  FilterMigration,
  FilterAnalyzer
} from './utilities.js';

export default {
  BinaryFilterBuilder,
  BinaryFilterMatcher,
  BinaryFilter,
  FilterVariant,
  BitwiseOps,
  BinaryFilterCache,
  BatchMatcher,
  FilterMigration,
  FilterAnalyzer
};
