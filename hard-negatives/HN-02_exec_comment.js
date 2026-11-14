/**
 * Hard Negative HN-02: Use of 'exec'-like function names in a comment, test, or unrelated variable
 * Why it is safe: Not a call to child_process.exec or shell evaluation; purely variable naming
 * representing non-shell business domain execution (e.g. executing a discount calculation step).
 */

// Note: Do not confuse business rule execStep with child_process.exec!
// child_process.exec is banned in this repository.

function calculateDiscountExecutionPipeline(items, couponCode) {
  const execPlan = {
    step1_validate_items: true,
    step2_exec_pricing_rules: true,
    step3_finalize_totals: true
  };

  let total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  if (execPlan.step2_exec_pricing_rules && couponCode === 'FRESH10') {
    total = Math.round(total * 0.9);
  }
  return total;
}

module.exports = { calculateDiscountExecutionPipeline };
