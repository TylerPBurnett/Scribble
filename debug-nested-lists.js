/**
 * Debug script to test nested list processing
 * This simulates what happens in the Tiptap editor during save/load cycles
 */

console.log('=== TIPTAP NESTED LIST DEBUG ===\n');

// Test HTML structures that should work
const testCases = [
  {
    name: "Simple nested bullet list",
    html: `<ul><li><p>Level 1</p><ul><li><p>Level 2</p></li></ul></li></ul>`
  },
  {
    name: "Complex nested bullet list", 
    html: `<ul><li><p>First level item 1</p><ul><li><p>Second level item 1</p><ul><li><p>Third level item 1</p></li><li><p>Third level item 2</p></li></ul></li><li><p>Second level item 2</p></li></ul></li><li><p>First level item 2</p></li></ul>`
  },
  {
    name: "Mixed list types",
    html: `<ol><li><p>Ordered item 1</p><ul><li><p>Nested bullet item</p></li></ul></li><li><p>Ordered item 2</p></li></ol>`
  },
  {
    name: "Task list with nesting",
    html: `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Task 1</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Nested task</p></div></li></ul></div></li></ul>`
  }
];

// Simple HTML structure analysis without DOM
function analyzeHTMLStructure(html) {
  // Count nesting levels by looking at tag patterns
  const ulMatches = html.match(/<ul[^>]*>/g) || [];
  const olMatches = html.match(/<ol[^>]*>/g) || [];
  const liMatches = html.match(/<li[^>]*>/g) || [];
  
  console.log(`Found ${ulMatches.length} <ul> elements`);
  console.log(`Found ${olMatches.length} <ol> elements`);
  console.log(`Found ${liMatches.length} <li> elements`);
  
  // Look for nested patterns
  const nestedPatterns = html.match(/<li[^>]*>[\s\S]*?<ul[^>]*>/g) || [];
  console.log(`Found ${nestedPatterns.length} nested list patterns`);
  
  return {
    lists: ulMatches.length + olMatches.length,
    items: liMatches.length,
    nested: nestedPatterns.length
  };
}

// Test each case
testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. Testing: ${testCase.name}`);
  console.log('=' .repeat(50));
  
  console.log('\nOriginal HTML:');
  console.log(testCase.html);
  
  console.log('\nStructure Analysis:');
  const analysis = analyzeHTMLStructure(testCase.html);
  console.log(`Total lists: ${analysis.lists}, Items: ${analysis.items}, Nested patterns: ${analysis.nested}`);
});

console.log('\n\n=== ANALYSIS COMPLETE ===\n');

console.log('\n=== POTENTIAL ISSUES IDENTIFIED ===\n');
console.log('1. CSS class applications may not persist after setContent()');
console.log('2. EnhancedListHandling decorations need to be reapplied');  
console.log('3. List item depth calculation might be incorrect in EnhancedListHandling');
console.log('4. ProseMirror schema might be modifying the list structure');
console.log('5. Race condition between setContent and decoration application');

console.log('\n=== RECOMMENDED FIXES ===\n');
console.log('1. Add explicit decoration refresh after setContent()');
console.log('2. Improve nesting level calculation in EnhancedListHandling');
console.log('3. Add CSS preservation during HTML parsing');
console.log('4. Ensure proper timing of extension initialization');
